/* @alacrity games=Crystal modes=stationary */
/*
 * Gen 2 Stationary Shiny Hunter (Pokemon Crystal)
 * Uses libmgba core directly — no Qt, no rendering, no audio
 *
 * Ported from scripts/lua/shiny_hunt_gen2.lua (dropped with the Qt/Lua path).
 * Flow: soft-reset → title → continue save → spam A to trigger the stationary
 * battle → read enemy DVs → match? save state; else reset.
 *
 * Usage: ./shiny_hunter_gen2 <instance_id> <rom_path> <sav_path> <log_path> [save_state_dir]
 *
 * Crystal memory addresses (enemy battle struct):
 *   0xD20C - Enemy DVs: Attack(hi) | Defense(lo)
 *   0xD20D - Enemy DVs: Speed(hi)  | Special(lo)
 *   0xD218 - Enemy Max HP (high byte)
 *   0xD219 - Enemy Max HP (low byte)
 *   0xD22D - Battle type flag (1 = in battle)
 *
 * Shiny DVs: Def=10, Spd=10, Spc=10, Atk in {2,3,6,7,10,11,14,15}
 */

#include <mgba/core/core.h>
#include <mgba/core/log.h>
#include <mgba/core/serialize.h>
#include <mgba/gb/core.h>
#include <mgba/internal/gb/input.h>
#include <mgba-util/vfs.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <time.h>
#include <fcntl.h>
#include <unistd.h>
#include <signal.h>
#include <strings.h>

static void _nullLog(struct mLogger* log, int cat, enum mLogLevel level, const char* fmt, va_list args) {
    (void)log; (void)cat; (void)level; (void)fmt; (void)args;
}
static struct mLogger s_nullLogger = { .log = _nullLog };

/* Crystal memory addresses */
#define ADDR_BATTLE_FLAG   0xD22D
#define ADDR_ENEMY_DV1     0xD20C
#define ADDR_ENEMY_DV2     0xD20D
#define ADDR_ENEMY_HP_HI   0xD218
#define ADDR_ENEMY_HP_LO   0xD219

#define KEY_A      (1 << 0)
#define KEY_B      (1 << 1)
#define KEY_START  (1 << 3)

static volatile int running = 1;
static FILE* logfp = NULL;

static void handle_signal(int sig) {
    (void)sig;
    running = 0;
}

static void logmsg(const char* fmt, ...) {
    time_t now = time(NULL);
    struct tm* lt = localtime(&now);
    char timestr[16];
    strftime(timestr, sizeof(timestr), "%H:%M:%S", lt);

    va_list ap;
    va_start(ap, fmt);
    if (logfp) {
        fprintf(logfp, "%s ", timestr);
        vfprintf(logfp, fmt, ap);
        fprintf(logfp, "\n");
        fflush(logfp);
    }
    va_end(ap);
}

static int is_shiny_atk(int atk) {
    return atk == 2 || atk == 3 || atk == 6 || atk == 7 ||
           atk == 10 || atk == 11 || atk == 14 || atk == 15;
}

static int rand_range(int min, int max) {
    return min + rand() % (max - min + 1);
}

static int env_int(const char* name, int def) {
    const char* v = getenv(name);
    return v ? atoi(v) : def;
}

static int want_shiny = 1;
static int want_perfect = 0;
static int want_gender = 0;  /* 0=any, 1=male, 2=female */
static int gender_threshold = -2;
static int min_atk_dv = 0, min_def_dv = 0, min_spd_dv = 0, min_spc_dv = 0;
static int exact_atk = 0;

static void load_conditions(void) {
    want_shiny = env_int("TARGET_SHINY", 1);
    want_perfect = env_int("TARGET_PERFECT", 0);
    const char* g = getenv("TARGET_GENDER");
    if (g) {
        if (strcasecmp(g, "male") == 0) want_gender = 1;
        else if (strcasecmp(g, "female") == 0) want_gender = 2;
    }
    gender_threshold = env_int("GENDER_THRESHOLD", -2);
    min_atk_dv = env_int("MIN_ATK", 0);
    min_def_dv = env_int("MIN_DEF", 0);
    min_spd_dv = env_int("MIN_SPD", 0);
    min_spc_dv = env_int("MIN_SPC", 0);
    exact_atk = env_int("EXACT_ATK", 0);
}

static int matches_conditions(int atk, int def, int spd, int spc) {
    if (exact_atk && min_atk_dv > 0) {
        if (atk != min_atk_dv) return 0;
    } else if (atk < min_atk_dv) return 0;
    if (def < min_def_dv || spd < min_spd_dv || spc < min_spc_dv) return 0;
    int is_shiny = is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10;
    int is_perfect = atk == 15 && def == 15 && spd == 15 && spc == 15;
    if (want_shiny && !is_shiny) return 0;
    if (want_perfect) {
        if (want_shiny) {
            if (atk != 15) return 0;
        } else {
            if (!is_perfect) return 0;
        }
    }
    if (want_gender == 1 && gender_threshold >= 0 && atk <= gender_threshold) return 0;
    if (want_gender == 2) {
        if (gender_threshold < 0) return 0;
        if (gender_threshold > 15) return 1;
        if (atk > gender_threshold) return 0;
    }
    return 1;
}

static const char* hit_label(int atk, int def, int spd, int spc) {
    int is_shiny = is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10;
    int is_best = atk == 15 && def == 10 && spd == 10 && spc == 10;
    int is_perfect = atk == 15 && def == 15 && spd == 15 && spc == 15;
    if (is_best) return "BEST_SHINY";
    if (is_shiny) return "SHINY";
    if (is_perfect) return "PERFECT_DVs";
    return "HIT";
}

int main(int argc, char* argv[]) {
    if (argc < 5) {
        fprintf(stderr, "Usage: %s <instance_id> <rom_path> <sav_path> <log_path> [save_state_dir]\n", argv[0]);
        return 1;
    }

    int instance_id = atoi(argv[1]);
    const char* rom_path = argv[2];
    const char* sav_path = argv[3];
    const char* log_path = argv[4];
    const char* state_dir = argc >= 6 ? argv[5] : ".";

    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    {
        struct timespec ts;
        clock_gettime(CLOCK_MONOTONIC, &ts);
        srand((unsigned)(ts.tv_nsec ^ (ts.tv_sec * 1000003) ^ (instance_id * 2654435761U)));
    }

    load_conditions();
    mLogSetDefaultLogger(&s_nullLogger);

    logfp = fopen(log_path, "a");
    if (!logfp) {
        fprintf(stderr, "Cannot open log: %s\n", log_path);
        return 1;
    }

    struct mCore* core = GBCoreCreate();
    if (!core || !core->init(core)) {
        fprintf(stderr, "Failed to create mGBA core\n");
        return 1;
    }

    mCoreInitConfig(core, NULL);

    static uint32_t videobuf[160 * 144];
    core->setVideoBuffer(core, (color_t*)videobuf, 160);

    /* Copy ROM and SAV to tmp so each instance has its own writable files */
    char tmp_rom[512], tmp_sav[512];
    snprintf(tmp_rom, sizeof(tmp_rom), "/tmp/shiny_gen2_%d.gbc", instance_id);
    snprintf(tmp_sav, sizeof(tmp_sav), "/tmp/shiny_gen2_%d.sav", instance_id);

    {
        FILE* src = fopen(rom_path, "rb");
        FILE* dst = fopen(tmp_rom, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy ROM\n"); return 1; }
        char buf[8192]; size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
        fclose(src); fclose(dst);
    }
    {
        FILE* src = fopen(sav_path, "rb");
        FILE* dst = fopen(tmp_sav, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy SAV\n"); return 1; }
        char buf[8192]; size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
        fclose(src); fclose(dst);
    }

    struct VFile* rom = VFileOpen(tmp_rom, O_RDONLY);
    if (!rom || !core->loadROM(core, rom)) {
        fprintf(stderr, "Failed to load ROM\n");
        return 1;
    }

    struct VFile* sav = VFileOpen(tmp_sav, O_CREAT | O_RDWR);
    if (sav) core->loadSave(core, sav);

    core->reset(core);

    int attempts = 0;

    logmsg("Gen 2 stationary shiny hunter running! (instance %d)", instance_id);

    while (running) {
        /* === PHASE 1: BOOT — Start through title, A to continue, wait for load === */
        int title_delay = rand_range(400, 1400);
        int menu_delay = rand_range(120, 540);
        int load_wait = rand_range(200, 700);

        core->reset(core);

        for (int f = 0; f < title_delay && running; f++) {
            core->setKeys(core, (f % 16) < 8 ? KEY_START : 0);
            core->runFrame(core);
        }
        for (int f = 0; f < menu_delay && running; f++) {
            core->setKeys(core, (f % 16) < 8 ? KEY_A : 0);
            core->runFrame(core);
        }
        for (int f = 0; f < load_wait && running; f++) {
            core->setKeys(core, (f % 20) < 10 ? KEY_B : 0);
            core->runFrame(core);
        }
        if (!running) break;

        /* === PHASE 2: TRIGGER — spam A to talk to the stationary encounter === */
        /* The save should be staged right in front of the NPC / legendary.
         * We spam A (with occasional B to dismiss any stray menus) until the
         * battle flag flips. Mirrors the state machine in shiny_hunt_gen2.lua. */
        int max_trigger_frames = 12000;  /* ~200s at 60fps — plenty for slow intros */
        int hit_battle = 0;
        for (int f = 0; f < max_trigger_frames && running; f++) {
            int mod = f % 40;
            if (mod < 10) core->setKeys(core, KEY_A);
            else if (mod < 20) core->setKeys(core, 0);
            else if (mod < 30) core->setKeys(core, KEY_B);
            else core->setKeys(core, 0);

            core->runFrame(core);

            if (core->busRead8(core, ADDR_BATTLE_FLAG) == 1) {
                hit_battle = 1;
                break;
            }
        }

        if (!hit_battle) {
            if (running) logmsg("No battle after %d frames, resetting", max_trigger_frames);
            continue;
        }

        core->setKeys(core, 0);

        /* Wait for enemy data to populate */
        int valid = 0;
        for (int f = 0; f < 120 && running; f++) {
            core->setKeys(core, 0);
            core->runFrame(core);
            int hp = core->busRead8(core, ADDR_ENEMY_HP_HI) * 256 +
                     core->busRead8(core, ADDR_ENEMY_HP_LO);
            if (hp > 0) { valid = 1; break; }
        }
        if (!valid || !running) continue;

        int b1 = core->busRead8(core, ADDR_ENEMY_DV1);
        int b2 = core->busRead8(core, ADDR_ENEMY_DV2);

        if ((b1 == 0 && b2 == 0) || (b1 == 0xFF && b2 == 0xFF)) {
            logmsg("Invalid DVs, resetting");
            continue;
        }

        int atk = (b1 >> 4) & 0xF;
        int def = b1 & 0xF;
        int spd = (b2 >> 4) & 0xF;
        int spc = b2 & 0xF;

        attempts++;

        if (matches_conditions(atk, def, spd, spc)) {
            const char* label = hit_label(atk, def, spd, spc);
            logmsg("!!! %s after %d attempts! Atk:%d Def:%d Spd:%d Spc:%d !!!",
                label, attempts, atk, def, spd, spc);
            core->setKeys(core, 0);
            mCoreSaveState(core, 1, SAVESTATE_ALL);
            char state_path[512];
            snprintf(state_path, sizeof(state_path), "%s/%s_A%d_D%d_Sp%d_Sc%d.ss1",
                state_dir, label, atk, def, spd, spc);
            struct VFile* sf = VFileOpen(state_path, O_CREAT | O_WRONLY);
            if (sf) { mCoreSaveStateNamed(core, sf, SAVESTATE_ALL); sf->close(sf); }
            goto done;
        } else {
            logmsg("Attempt %d: Atk:%d Def:%d Spd:%d Spc:%d", attempts, atk, def, spd, spc);
            continue;
        }
    }

done:
    if (running) {
        logmsg("Hit found, idling (instance %d)", instance_id);
        while (running) sleep(1);
    }

    core->deinit(core);
    if (logfp) fclose(logfp);
    unlink(tmp_rom);
    unlink(tmp_sav);
    return 0;
}
