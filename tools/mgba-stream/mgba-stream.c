/*
 * mgba-stream — Stream a GB/GBC/GBA ROM via libmgba + VP8/RTP
 *
 * Usage: mgba-stream <rom> <save> <video-rtp-port> [audio-rtp-port]
 *
 * Loads a ROM via libmgba, runs emulation at 60fps, encodes each frame
 * as VP8 via libvpx, and sends RTP packets to localhost on the given UDP port.
 * Reads JSON input lines from stdin (non-blocking) to control button state.
 *
 * Input format (stdin, one JSON object per line):
 *   {"key":"a","type":"down"}          — button press
 *   {"key":"a","type":"up"}            — button release
 *   {"action":"speed","multiplier":3}  — speed (1=normal, 3=3x, 0=MAX)
 *   {"action":"reset"}                 — soft reset
 *
 * Buttons: a, b, select, start, right, left, up, down, r, l
 */

#include <mgba/core/core.h>
#include <mgba/core/log.h>
#include <mgba/core/blip_buf.h>
#include <mgba/gb/core.h>
#include <mgba/gba/core.h>
#include <mgba-util/vfs.h>

#include <vpx/vpx_encoder.h>
#include <vpx/vp8cx.h>
#include <vpx/vpx_image.h>

#include <opus/opus.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <stdarg.h>
#include <stdint.h>
#include <fcntl.h>
#include <unistd.h>
#include <signal.h>
#include <time.h>
#include <poll.h>
#include <errno.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>

/* ---------- Silent logger ---------- */

static void _nullLog(struct mLogger* log, int cat, enum mLogLevel level,
                     const char* fmt, va_list args) {
    (void)log; (void)cat; (void)level; (void)fmt; (void)args;
}
static struct mLogger s_nullLogger = { .log = _nullLog };

/* ---------- Signal handling ---------- */

static volatile int running = 1;

static void handle_signal(int sig) {
    (void)sig;
    running = 0;
}

/* ---------- Platform detection ---------- */

enum Platform { PLAT_GB, PLAT_GBA };

static enum Platform detect_platform(const char* rom_path) {
    const char* dot = strrchr(rom_path, '.');
    if (dot) {
        if (strcasecmp(dot, ".gba") == 0) return PLAT_GBA;
    }
    return PLAT_GB;  /* .gb, .gbc, or anything else → GB core */
}

/* ---------- Button mapping ---------- */

/* GB and GBA key enums share the same values (0-9) */
#define KEY_A      (1 << 0)
#define KEY_B      (1 << 1)
#define KEY_SELECT (1 << 2)
#define KEY_START  (1 << 3)
#define KEY_RIGHT  (1 << 4)
#define KEY_LEFT   (1 << 5)
#define KEY_UP     (1 << 6)
#define KEY_DOWN   (1 << 7)
#define KEY_R      (1 << 8)
#define KEY_L      (1 << 9)

static int key_from_name(const char* name) {
    if (strcmp(name, "a") == 0)      return KEY_A;
    if (strcmp(name, "b") == 0)      return KEY_B;
    if (strcmp(name, "select") == 0) return KEY_SELECT;
    if (strcmp(name, "start") == 0)  return KEY_START;
    if (strcmp(name, "right") == 0)  return KEY_RIGHT;
    if (strcmp(name, "left") == 0)   return KEY_LEFT;
    if (strcmp(name, "up") == 0)     return KEY_UP;
    if (strcmp(name, "down") == 0)   return KEY_DOWN;
    if (strcmp(name, "r") == 0)      return KEY_R;
    if (strcmp(name, "l") == 0)      return KEY_L;
    return 0;
}

/* ---------- Minimal JSON field extraction ---------- */

/* Extract a string value for a given key from a JSON line.
 * Writes into buf (up to bufsz-1 chars). Returns 1 on success. */
static int json_str(const char* json, const char* key, char* buf, int bufsz) {
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char* p = strstr(json, needle);
    if (!p) return 0;
    p += strlen(needle);
    /* skip whitespace and colon */
    while (*p == ' ' || *p == ':' || *p == '\t') p++;
    if (*p != '"') return 0;
    p++;
    int i = 0;
    while (*p && *p != '"' && i < bufsz - 1) {
        buf[i++] = *p++;
    }
    buf[i] = '\0';
    return 1;
}

/* Extract an integer value for a given key. Returns 1 on success. */
static int json_int(const char* json, const char* key, int* out) {
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char* p = strstr(json, needle);
    if (!p) return 0;
    p += strlen(needle);
    while (*p == ' ' || *p == ':' || *p == '\t') p++;
    if (*p != '-' && (*p < '0' || *p > '9')) return 0;
    *out = atoi(p);
    return 1;
}

/* ---------- RTP packet sender ---------- */

#define RTP_MTU         1200
#define RTP_HEADER_SIZE 12
#define VP8_PD_SIZE     1    /* VP8 payload descriptor: 1 byte */
#define RTP_PAYLOAD_MAX (RTP_MTU - RTP_HEADER_SIZE - VP8_PD_SIZE)
#define RTP_PT          96   /* Dynamic payload type for VP8 */
#define RTP_CLOCK_RATE  90000
#define RTP_TS_INC      (RTP_CLOCK_RATE / 60)  /* 1500 */

static uint16_t rtp_seq = 0;
static uint32_t rtp_ts  = 0;
static uint32_t rtp_ssrc;

static void rtp_write_header(uint8_t* buf, int marker) {
    buf[0] = 0x80;                                  /* V=2, no padding/ext/csrc */
    buf[1] = (uint8_t)(RTP_PT | (marker ? 0x80 : 0));
    buf[2] = (uint8_t)(rtp_seq >> 8);
    buf[3] = (uint8_t)(rtp_seq & 0xFF);
    buf[4] = (uint8_t)(rtp_ts >> 24);
    buf[5] = (uint8_t)(rtp_ts >> 16);
    buf[6] = (uint8_t)(rtp_ts >> 8);
    buf[7] = (uint8_t)(rtp_ts & 0xFF);
    buf[8]  = (uint8_t)(rtp_ssrc >> 24);
    buf[9]  = (uint8_t)(rtp_ssrc >> 16);
    buf[10] = (uint8_t)(rtp_ssrc >> 8);
    buf[11] = (uint8_t)(rtp_ssrc & 0xFF);
}

/* Send one encoded VP8 frame, fragmenting into RTP packets as needed. */
static void rtp_send_frame(int sock, struct sockaddr_in* dest,
                           const uint8_t* data, size_t len) {
    size_t offset = 0;
    int first = 1;

    while (offset < len) {
        size_t chunk = len - offset;
        int last = 0;
        if (chunk <= (size_t)RTP_PAYLOAD_MAX) {
            last = 1;
        } else {
            chunk = RTP_PAYLOAD_MAX;
        }

        uint8_t pkt[RTP_MTU];
        rtp_write_header(pkt, last);

        /* VP8 payload descriptor (1 byte):
         * Bit 4 (0x10) = S bit, set on first packet of partition */
        pkt[RTP_HEADER_SIZE] = first ? 0x10 : 0x00;

        memcpy(pkt + RTP_HEADER_SIZE + VP8_PD_SIZE, data + offset, chunk);

        size_t pkt_len = RTP_HEADER_SIZE + VP8_PD_SIZE + chunk;
        sendto(sock, pkt, pkt_len, 0,
               (struct sockaddr*)dest, sizeof(*dest));

        rtp_seq++;
        offset += chunk;
        first = 0;
    }

    rtp_ts += RTP_TS_INC;
}

/* ---------- Audio RTP sender ---------- */

#define AUDIO_SAMPLE_RATE  48000
#define OPUS_FRAME_MS      20      /* 20ms Opus frames */
#define OPUS_FRAME_SAMPLES (AUDIO_SAMPLE_RATE * OPUS_FRAME_MS / 1000)  /* 960 */
#define AUDIO_RTP_PT       111     /* Opus dynamic payload type */
#define AUDIO_RTP_CLOCK    48000

static uint16_t audio_rtp_seq  = 0;
static uint32_t audio_rtp_ts   = 0;
static uint32_t audio_rtp_ssrc;

static void audio_rtp_send(int sock, struct sockaddr_in* dest,
                           const uint8_t* data, int len) {
    uint8_t pkt[12 + 1500];

    /* RTP header */
    pkt[0] = 0x80;
    pkt[1] = (uint8_t)(AUDIO_RTP_PT | 0x80);  /* marker bit always set for Opus */
    pkt[2] = (uint8_t)(audio_rtp_seq >> 8);
    pkt[3] = (uint8_t)(audio_rtp_seq & 0xFF);
    pkt[4] = (uint8_t)(audio_rtp_ts >> 24);
    pkt[5] = (uint8_t)(audio_rtp_ts >> 16);
    pkt[6] = (uint8_t)(audio_rtp_ts >> 8);
    pkt[7] = (uint8_t)(audio_rtp_ts & 0xFF);
    pkt[8]  = (uint8_t)(audio_rtp_ssrc >> 24);
    pkt[9]  = (uint8_t)(audio_rtp_ssrc >> 16);
    pkt[10] = (uint8_t)(audio_rtp_ssrc >> 8);
    pkt[11] = (uint8_t)(audio_rtp_ssrc & 0xFF);

    if (len > 1400) len = 1400;
    memcpy(pkt + 12, data, (size_t)len);

    sendto(sock, pkt, (size_t)(12 + len), 0,
           (struct sockaddr*)dest, sizeof(*dest));

    audio_rtp_seq++;
    audio_rtp_ts += OPUS_FRAME_SAMPLES;
}

/* ---------- RGBA → I420 conversion ---------- */

static void rgba_to_i420(const uint32_t* rgba, int src_stride,
                         int w, int h, vpx_image_t* img) {
    uint8_t* y_plane  = img->planes[VPX_PLANE_Y];
    uint8_t* u_plane  = img->planes[VPX_PLANE_U];
    uint8_t* v_plane  = img->planes[VPX_PLANE_V];
    int y_stride = img->stride[VPX_PLANE_Y];
    int u_stride = img->stride[VPX_PLANE_U];
    int v_stride = img->stride[VPX_PLANE_V];

    for (int row = 0; row < h; row++) {
        for (int col = 0; col < w; col++) {
            uint32_t px = rgba[row * src_stride + col];
            /* mGBA color_t is 0xAABBGGRR on little-endian (ABGR32) */
            int r = (px >>  0) & 0xFF;
            int g = (px >>  8) & 0xFF;
            int b = (px >> 16) & 0xFF;

            uint8_t Y = (uint8_t)(((  66 * r + 129 * g +  25 * b + 128) >> 8) + 16);
            y_plane[row * y_stride + col] = Y;

            if ((row & 1) == 0 && (col & 1) == 0) {
                uint8_t U = (uint8_t)((( -38 * r -  74 * g + 112 * b + 128) >> 8) + 128);
                uint8_t V = (uint8_t)((( 112 * r -  94 * g -  18 * b + 128) >> 8) + 128);
                u_plane[(row >> 1) * u_stride + (col >> 1)] = U;
                v_plane[(row >> 1) * v_stride + (col >> 1)] = V;
            }
        }
    }
}

/* ---------- Timing helpers ---------- */

static uint64_t now_ns(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000ULL + (uint64_t)ts.tv_nsec;
}

/* Precise sleep: usleep for the bulk, then spin-wait for the last ~1ms.
 * usleep has ~1-4ms jitter on Linux; spin-waiting eliminates it. */
static void precise_sleep_until(uint64_t target_ns) {
    uint64_t now = now_ns();
    if (now >= target_ns) return;
    uint64_t remaining = target_ns - now;
    /* Sleep for the bulk if >2ms remain (leave margin for scheduler jitter) */
    if (remaining > 2000000ULL) {
        usleep((useconds_t)((remaining - 1500000ULL) / 1000));
    }
    /* Spin-wait for the final stretch */
    while (now_ns() < target_ns) {
        /* tight spin */
    }
}

/* ---------- Main ---------- */

int main(int argc, char* argv[]) {
    if (argc < 4) {
        fprintf(stderr, "Usage: %s <rom> <save> <video-rtp-port> [audio-rtp-port]\n", argv[0]);
        return 1;
    }

    const char* rom_path  = argv[1];
    const char* save_path = argv[2];
    int rtp_port          = atoi(argv[3]);
    int audio_port        = (argc >= 5) ? atoi(argv[4]) : 0;

    if (rtp_port <= 0 || rtp_port > 65535) {
        fprintf(stderr, "Invalid RTP port: %s\n", argv[3]);
        return 1;
    }

    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    /* Detect platform from extension */
    enum Platform plat = detect_platform(rom_path);
    /* Encode dimensions (what we send over RTP) */
    int width  = (plat == PLAT_GBA) ? 240 : 160;
    int height = (plat == PLAT_GBA) ? 160 : 144;
    /* Buffer dimensions — GB/GBC needs 256x224 for SGB border rendering.
     * The renderer writes the full SGB frame; we encode only the center. */
    int buf_width  = (plat == PLAT_GBA) ? 240 : 256;
    int buf_height = (plat == PLAT_GBA) ? 160 : 224;
    /* Offset to the 160x144 GB screen within the 256x224 SGB frame */
    int offset_x = (buf_width - width) / 2;   /* 48 for GB, 0 for GBA */
    int offset_y = (buf_height - height) / 2;  /* 40 for GB, 0 for GBA */

    fprintf(stderr, "mgba-stream: %s %dx%d (buf %dx%d) → RTP port %d\n",
            plat == PLAT_GBA ? "GBA" : "GB/GBC", width, height,
            buf_width, buf_height, rtp_port);

    /* ---------- Init mGBA core ---------- */
    mLogSetDefaultLogger(&s_nullLogger);

    struct mCore* core = (plat == PLAT_GBA) ? GBACoreCreate() : GBCoreCreate();
    if (!core || !core->init(core)) {
        fprintf(stderr, "Failed to create mGBA core\n");
        return 1;
    }

    mCoreInitConfig(core, NULL);

    uint32_t* videobuf = calloc((size_t)(buf_width * buf_height), sizeof(uint32_t));
    if (!videobuf) { fprintf(stderr, "Out of memory\n"); return 1; }
    core->setVideoBuffer(core, (color_t*)videobuf, buf_width);

    /* Load ROM */
    struct VFile* rom = VFileOpen(rom_path, O_RDONLY);
    if (!rom || !core->loadROM(core, rom)) {
        fprintf(stderr, "Failed to load ROM: %s\n", rom_path);
        return 1;
    }

    /* Load save */
    struct VFile* sav = VFileOpen(save_path, O_CREAT | O_RDWR);
    if (sav) core->loadSave(core, sav);

    core->reset(core);

    /* ---------- Init VP8 encoder ---------- */
    vpx_codec_ctx_t codec;
    vpx_codec_enc_cfg_t cfg;

    if (vpx_codec_enc_config_default(vpx_codec_vp8_cx(), &cfg, 0) != VPX_CODEC_OK) {
        fprintf(stderr, "Failed to get VP8 default config\n");
        return 1;
    }

    cfg.g_w = (unsigned int)width;
    cfg.g_h = (unsigned int)height;
    cfg.rc_target_bitrate   = 800;          /* kbps */
    cfg.g_timebase.num      = 1;
    cfg.g_timebase.den      = 60;
    cfg.rc_end_usage        = VPX_CBR;
    cfg.g_lag_in_frames     = 0;
    cfg.g_error_resilient   = VPX_ERROR_RESILIENT_DEFAULT;
    cfg.kf_max_dist         = 60;           /* keyframe every ~1s */
    cfg.kf_min_dist         = 0;
    cfg.g_threads           = 1;

    if (vpx_codec_enc_init(&codec, vpx_codec_vp8_cx(), &cfg, 0) != VPX_CODEC_OK) {
        fprintf(stderr, "Failed to init VP8 encoder: %s\n",
                vpx_codec_error(&codec));
        return 1;
    }

    /* Realtime tuning */
    vpx_codec_control(&codec, VP8E_SET_CPUUSED, 8);

    vpx_image_t raw;
    if (!vpx_img_alloc(&raw, VPX_IMG_FMT_I420,
                       (unsigned int)width, (unsigned int)height, 1)) {
        fprintf(stderr, "Failed to alloc VPX image\n");
        return 1;
    }

    /* ---------- Init UDP socket ---------- */
    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) { perror("socket"); return 1; }

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family      = AF_INET;
    dest.sin_port        = htons((uint16_t)rtp_port);
    dest.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    /* RTP SSRC — random */
    {
        struct timespec ts;
        clock_gettime(CLOCK_MONOTONIC, &ts);
        rtp_ssrc = (uint32_t)(ts.tv_nsec ^ (ts.tv_sec * 2654435761U));
        audio_rtp_ssrc = rtp_ssrc ^ 0xDEADBEEF;
    }

    /* ---------- Init audio (Opus encoder + RTP socket) ---------- */
    OpusEncoder* opus = NULL;
    int audio_sock = -1;
    struct sockaddr_in audio_dest;
    /* Interleaved stereo buffer for blip_read_samples */
    int16_t* audio_interleaved = NULL;
    /* Accumulation buffer — collect samples until we have a full Opus frame */
    int16_t* audio_accum = NULL;
    int audio_accum_pos = 0;
    uint8_t opus_out[1400];

    if (audio_port > 0) {
        /* Set mGBA audio buffer and resample rate to 48kHz for Opus */
        core->setAudioBufferSize(core, OPUS_FRAME_SAMPLES);
        blip_set_rates(core->getAudioChannel(core, 0),
                       core->frequency(core), AUDIO_SAMPLE_RATE);
        blip_set_rates(core->getAudioChannel(core, 1),
                       core->frequency(core), AUDIO_SAMPLE_RATE);

        /* Create Opus encoder: 48kHz, mono, low-delay tuning */
        int opus_err;
        opus = opus_encoder_create(AUDIO_SAMPLE_RATE, 1, OPUS_APPLICATION_AUDIO, &opus_err);
        if (opus_err != OPUS_OK || !opus) {
            fprintf(stderr, "Failed to create Opus encoder: %s\n", opus_strerror(opus_err));
            return 1;
        }
        opus_encoder_ctl(opus, OPUS_SET_BITRATE(64000));
        opus_encoder_ctl(opus, OPUS_SET_SIGNAL(OPUS_SIGNAL_MUSIC));

        /* Audio UDP socket */
        audio_sock = socket(AF_INET, SOCK_DGRAM, 0);
        if (audio_sock < 0) { perror("audio socket"); return 1; }
        memset(&audio_dest, 0, sizeof(audio_dest));
        audio_dest.sin_family      = AF_INET;
        audio_dest.sin_port        = htons((uint16_t)audio_port);
        audio_dest.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

        /* Audio buffers */
        audio_interleaved = malloc(sizeof(int16_t) * OPUS_FRAME_SAMPLES * 2);
        audio_accum = calloc(OPUS_FRAME_SAMPLES, sizeof(int16_t));

        fprintf(stderr, "mgba-stream: audio → RTP port %d (Opus 48kHz mono)\n", audio_port);
    }

    /* ---------- Set stdin non-blocking ---------- */
    {
        int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
        fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);
    }

    /* ---------- Main loop state ---------- */
    int key_state   = 0;   /* current held buttons bitmask */
    int speed_mult  = 1;   /* 1=normal, 3=3x, 0=MAX */
    int frame_count = 0;
    char stdin_buf[4096];
    int stdin_len = 0;

    const uint64_t frame_ns = 16742706ULL;  /* ~16.74ms = 1e9/59.7275 */
    uint64_t next_frame_ns = now_ns();

    fprintf(stderr, "mgba-stream: running\n");

    while (running) {

        /* ---------- Poll stdin for input ---------- */
        struct pollfd pfd = { .fd = STDIN_FILENO, .events = POLLIN };
        while (poll(&pfd, 1, 0) > 0 && (pfd.revents & POLLIN)) {
            /* Guard: drop buffer if it fills without a newline (malformed input) */
            if (stdin_len >= (int)(sizeof(stdin_buf) - 2)) {
                stdin_len = 0;
            }
            ssize_t n = read(STDIN_FILENO, stdin_buf + stdin_len,
                             sizeof(stdin_buf) - (size_t)stdin_len - 1);
            if (n == 0) {
                /* stdin closed — parent died */
                fprintf(stderr, "mgba-stream: stdin closed, exiting\n");
                running = 0;
                break;
            }
            if (n < 0) break;  /* EAGAIN or error */
            stdin_len += (int)n;
            stdin_buf[stdin_len] = '\0';

            /* Process complete lines */
            char* line_start = stdin_buf;
            char* newline;
            while ((newline = strchr(line_start, '\n')) != NULL) {
                *newline = '\0';
                char* line = line_start;
                line_start = newline + 1;

                /* Parse JSON line */
                char val[32];

                if (json_str(line, "action", val, sizeof(val))) {
                    if (strcmp(val, "speed") == 0) {
                        int mult;
                        if (json_int(line, "multiplier", &mult)) {
                            speed_mult = mult;
                            fprintf(stderr, "mgba-stream: speed=%d\n", speed_mult);
                        }
                    } else if (strcmp(val, "reset") == 0) {
                        /* Soft reset: A+B+Start+Select for a few frames, then release */
                        core->setKeys(core, KEY_A | KEY_B | KEY_START | KEY_SELECT);
                        for (int f = 0; f < 4; f++) core->runFrame(core);
                        core->setKeys(core, 0);
                        core->reset(core);
                        fprintf(stderr, "mgba-stream: reset\n");
                    }
                } else if (json_str(line, "key", val, sizeof(val))) {
                    int bit = key_from_name(val);
                    if (bit) {
                        char type[16];
                        if (json_str(line, "type", type, sizeof(type))) {
                            if (strcmp(type, "down") == 0) {
                                key_state |= bit;
                            } else if (strcmp(type, "up") == 0) {
                                key_state &= ~bit;
                            }
                        }
                    }
                }
            }

            /* Shift remaining partial line to front of buffer */
            int remaining = stdin_len - (int)(line_start - stdin_buf);
            if (remaining > 0) {
                memmove(stdin_buf, line_start, (size_t)remaining);
            }
            stdin_len = remaining;
        }

        if (!running) break;

        /* ---------- Run emulation frame(s) ---------- */
        core->setKeys(core, key_state);

        if (speed_mult == 1) {
            /* Normal speed: 1 frame */
            core->runFrame(core);
        } else if (speed_mult > 1) {
            /* Nx speed: run N frames, encode only last */
            for (int i = 0; i < speed_mult; i++) {
                core->setKeys(core, key_state);
                core->runFrame(core);
            }
        } else {
            /* MAX (multiplier=0): run as many frames as possible in ~14ms */
            uint64_t budget_end = now_ns() + 14000000ULL;
            int ran = 0;
            while (now_ns() < budget_end) {
                core->setKeys(core, key_state);
                core->runFrame(core);
                ran++;
            }
            if (ran == 0) {
                core->setKeys(core, key_state);
                core->runFrame(core);
            }
        }

        /* ---------- Encode and send the current frame ---------- */
        /* Point to the inner game screen within the (possibly larger) SGB buffer */
        const uint32_t* frame_origin = videobuf + offset_y * buf_width + offset_x;
        rgba_to_i420(frame_origin, buf_width, width, height, &raw);

        vpx_codec_err_t err = vpx_codec_encode(&codec, &raw,
                                                (vpx_codec_pts_t)frame_count,
                                                1, 0, VPX_DL_REALTIME);
        if (err != VPX_CODEC_OK) {
            fprintf(stderr, "mgba-stream: encode error: %s\n",
                    vpx_codec_error(&codec));
        } else {
            vpx_codec_iter_t iter = NULL;
            const vpx_codec_cx_pkt_t* pkt;
            while ((pkt = vpx_codec_get_cx_data(&codec, &iter)) != NULL) {
                if (pkt->kind == VPX_CODEC_CX_FRAME_PKT) {
                    rtp_send_frame(sock, &dest,
                                   pkt->data.frame.buf,
                                   pkt->data.frame.sz);
                }
            }
        }

        frame_count++;

        /* ---------- Read and encode audio ---------- */
        if (opus && audio_sock >= 0) {
            struct blip_t* left  = core->getAudioChannel(core, 0);
            struct blip_t* right = core->getAudioChannel(core, 1);
            int avail = blip_samples_avail(left);

            /* During fast-forward, multiple frames accumulate in the blip buffer.
             * Drain ALL available samples to prevent overflow. At 1x speed we
             * encode and send them all; at >1x we still drain but the Opus
             * frames sent will just play at normal speed (audio stays real-time). */
            while (avail > 0) {
                int chunk = avail;
                if (chunk > OPUS_FRAME_SAMPLES) chunk = OPUS_FRAME_SAMPLES;
                blip_read_samples(left,  audio_interleaved,     chunk, 1);
                blip_read_samples(right, audio_interleaved + 1, chunk, 1);

                /* Mix to mono and accumulate into Opus frame buffer */
                for (int i = 0; i < chunk; i++) {
                    int32_t l = audio_interleaved[i * 2];
                    int32_t r = audio_interleaved[i * 2 + 1];
                    audio_accum[audio_accum_pos++] = (int16_t)((l + r) / 2);

                    /* Full Opus frame — encode and send */
                    if (audio_accum_pos >= OPUS_FRAME_SAMPLES) {
                        int enc_len = opus_encode(opus, audio_accum, OPUS_FRAME_SAMPLES,
                                                  opus_out, sizeof(opus_out));
                        if (enc_len > 0) {
                            audio_rtp_send(audio_sock, &audio_dest, opus_out, enc_len);
                        }
                        audio_accum_pos = 0;
                    }
                }

                avail -= chunk;
            }
        }

        /* ---------- Frame pacing ---------- */
        /* Always pace visual output at ~60fps. At Nx speed, we run N game
         * frames per visual frame but still sleep to maintain smooth delivery.
         * Only MAX (0) skips pacing entirely. */
        if (speed_mult != 0) {
            next_frame_ns += frame_ns;
            precise_sleep_until(next_frame_ns);
        } else {
            /* MAX: reset target so we don't try to "catch up" later */
            next_frame_ns = now_ns();
        }
    }

    /* ---------- Cleanup ---------- */
    fprintf(stderr, "mgba-stream: shutting down (%d frames)\n", frame_count);

    vpx_codec_destroy(&codec);
    vpx_img_free(&raw);
    close(sock);
    if (opus) opus_encoder_destroy(opus);
    if (audio_sock >= 0) close(audio_sock);
    free(audio_interleaved);
    free(audio_accum);
    core->deinit(core);
    free(videobuf);

    return 0;
}
