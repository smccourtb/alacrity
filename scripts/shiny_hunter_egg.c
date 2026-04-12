/*
 * Gen 2 Egg Shiny Hunter — Continuous Mode (Pokemon Crystal)
 * Uses libmgba core directly — no Qt, no rendering, no audio
 *
 * Usage: ./shiny_hunter_egg <instance_id> <rom_path> <sav_path> <log_path> <save_state_dir>
 *
 * Save setup:
 *   - Shiny Ditto + target deposited at Route 34 Daycare
 *   - Player standing in fenced area near daycare (walking spot)
 *   - Party: 1 Pokemon (5 egg slots before full)
 *   - No egg waiting (eggReady=0)
 *
 * Continuous mode: collects up to 5 eggs per cycle, checks each.
 * Egg #1 per cycle is always predetermined (same DVs from save).
 * Eggs #2+ have different DVs because RNG advances during gameplay.
 * When party is full, resets and starts a new cycle.
 *
 * Crystal memory addresses (verified):
 *   0xDCD7 - Party count
 *   0xDCD8 - Party species list
 *   0xDCDF - Party mon 1 data (48 bytes per mon)
 *     +0x15  DVs byte 1 (Atk:high, Def:low)
 *     +0x16  DVs byte 2 (Spd:high, Spc:low)
 *   0xDEF5 - wDayCareMan flag (bit 6 = egg ready)
 *
 * Shiny DVs: Def=10, Spd=10, Spc=10, Atk in {2,3,6,7,10,11,14,15}
 * With shiny Ditto breeding: ~1/64 odds per egg
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

/* Silent logger */
static void _nullLog(struct mLogger* log, int cat, enum mLogLevel level, const char* fmt, va_list args) {
    (void)log; (void)cat; (void)level; (void)fmt; (void)args;
}
static struct mLogger s_nullLogger = { .log = _nullLog };

/* Crystal memory addresses */
#define ADDR_PARTY_COUNT   0xDCD7
#define ADDR_PARTY_SPECIES 0xDCD8
#define ADDR_PARTY_START   0xDCDF
#define ADDR_DV_OFFSET_1   0x15
#define ADDR_DV_OFFSET_2   0x16
#define ADDR_MON_SIZE      0x30
#define ADDR_DAYCARE_MAN   0xDEF5  /* bit 6 = egg ready */

/* Key bitmasks */
#define KEY_A     (1 << GB_KEY_A)
#define KEY_B     (1 << GB_KEY_B)
#define KEY_START (1 << GB_KEY_START)
#define KEY_UP    (1 << GB_KEY_UP)
#define KEY_DOWN  (1 << GB_KEY_DOWN)
#define KEY_LEFT  (1 << GB_KEY_LEFT)
#define KEY_RIGHT (1 << GB_KEY_RIGHT)

/* Navigation path step */
typedef struct { int dir; int frames; } PathStep;

/* Path from save walking spot to daycare man (first egg) */
static const PathStep PATH_FIRST[] = {
    { KEY_LEFT,  20 }, { KEY_LEFT,  20 },
    { KEY_UP,    20 }, { KEY_UP,    20 },  /* enter daycare */
    { KEY_DOWN,  20 }, { KEY_DOWN,  20 },  /* exit — man appears */
    { KEY_RIGHT, 20 }, { KEY_RIGHT, 20 },  /* walk to man */
};
#define PATH_FIRST_LEN (sizeof(PATH_FIRST) / sizeof(PATH_FIRST[0]))

/* Path for subsequent eggs (already near daycare, 1 left to entrance) */
static const PathStep PATH_REPEAT[] = {
    { KEY_LEFT,  20 },
    { KEY_UP,    20 }, { KEY_UP,    20 },  /* enter daycare */
    { KEY_DOWN,  20 }, { KEY_DOWN,  20 },  /* exit — man appears */
    { KEY_RIGHT, 20 }, { KEY_RIGHT, 20 },  /* walk to man */
};
#define PATH_REPEAT_LEN (sizeof(PATH_REPEAT) / sizeof(PATH_REPEAT[0]))

#define PATH_PAUSE 4
#define MAX_PARTY  6

static volatile int running = 1;
static FILE* logfp = NULL;

static void handle_signal(int sig) { (void)sig; running = 0; }

static void logmsg(const char* fmt, ...) {
    time_t now = time(NULL);
    struct tm* t = localtime(&now);
    char timebuf[16];
    strftime(timebuf, sizeof(timebuf), "%H:%M:%S", t);

    va_list ap;
    if (logfp) {
        fprintf(logfp, "%s ", timebuf);
        va_start(ap, fmt); vfprintf(logfp, fmt, ap); va_end(ap);
        fprintf(logfp, "\n"); fflush(logfp);
    }
    printf("%s ", timebuf);
    va_start(ap, fmt); vprintf(fmt, ap); va_end(ap);
    printf("\n");
}

static int rand_range(int min, int max) {
    return min + (rand() % (max - min + 1));
}

static int is_shiny_atk(int atk) {
    return atk==2||atk==3||atk==6||atk==7||atk==10||atk==11||atk==14||atk==15;
}

/* Hunt condition checking */
static int env_int(const char* name, int def) {
    const char* v = getenv(name);
    return v ? atoi(v) : def;
}

static int want_shiny = 1, want_perfect = 0;
static int want_gender = 0, gender_threshold = -2;
static int min_atk_dv = 0, min_def_dv = 0, min_spd_dv = 0, min_spc_dv = 0;

static void load_conditions(void) {
    want_shiny = env_int("TARGET_SHINY", 1);
    want_perfect = env_int("TARGET_PERFECT", 0);
    min_atk_dv = env_int("MIN_ATK", 0);
    min_def_dv = env_int("MIN_DEF", 0);
    min_spd_dv = env_int("MIN_SPD", 0);
    min_spc_dv = env_int("MIN_SPC", 0);
    gender_threshold = env_int("GENDER_THRESHOLD", -2);
    const char* g = getenv("TARGET_GENDER");
    if (g && strcasecmp(g, "male") == 0) want_gender = 1;
    else if (g && strcasecmp(g, "female") == 0) want_gender = 2;
    else want_gender = 0;
}

static int matches_conditions(int atk, int def, int spd, int spc) {
    if (atk < min_atk_dv || def < min_def_dv || spd < min_spd_dv || spc < min_spc_dv) return 0;
    if (want_shiny && !(is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10)) return 0;
    if (want_perfect) {
        if (want_shiny) { if (atk != 15) return 0; }
        else { if (!(atk == 15 && def == 15 && spd == 15 && spc == 15)) return 0; }
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
    if (atk == 15 && def == 10 && spd == 10 && spc == 10) return "BEST_SHINY";
    if (is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10) return "SHINY";
    if (atk == 15 && def == 15 && spd == 15 && spc == 15) return "PERFECT_DVs";
    return "HIT";
}

/* Helper: run N frames with given key */
static void run_frames(struct mCore* core, int n, int keys) {
    for (int f = 0; f < n && running; f++) {
        core->setKeys(core, keys);
        core->runFrame(core);
    }
}

/* Helper: spam a key pattern for N frames */
static void spam_key(struct mCore* core, int n, int key, int interval) {
    for (int f = 0; f < n && running; f++) {
        core->setKeys(core, (f % interval) < (interval / 2) ? key : 0);
        core->runFrame(core);
    }
}

/* Walk one step in a direction (20 frames hold + 4 frames pause) */
static void walk_step(struct mCore* core, int dir) {
    run_frames(core, 20, dir);
    run_frames(core, 4, 0);
}

/* Walk up/down pair (one step down, one step up) — returns to starting tile */
static void walk_pair(struct mCore* core) {
    walk_step(core, KEY_DOWN);
    walk_step(core, KEY_UP);
}

/* Check if egg is ready (bit 6 of wDayCareMan) */
static int egg_ready(struct mCore* core) {
    return (core->busRead8(core, ADDR_DAYCARE_MAN) >> 6) & 1;
}

/* Read party count */
static int party_count(struct mCore* core) {
    int c = core->busRead8(core, ADDR_PARTY_COUNT);
    return (c > 6) ? 0 : c;
}

/* Read DVs for a party slot (1-indexed) */
static void read_dvs(struct mCore* core, int slot, int* atk, int* def, int* spd, int* spc) {
    int base = ADDR_PARTY_START + (slot - 1) * ADDR_MON_SIZE;
    int b1 = core->busRead8(core, base + ADDR_DV_OFFSET_1);
    int b2 = core->busRead8(core, base + ADDR_DV_OFFSET_2);
    *atk = (b1 >> 4) & 0xF;
    *def = b1 & 0xF;
    *spd = (b2 >> 4) & 0xF;
    *spc = b2 & 0xF;
}

/* Execute a navigation path */
static void follow_path(struct mCore* core, const PathStep* path, int len) {
    for (int i = 0; i < len && running; i++) {
        run_frames(core, path[i].frames, path[i].dir);
        run_frames(core, PATH_PAUSE, 0);
    }
}

/* Mash A to talk to daycare man and accept egg.
 * Returns 1 if egg received (party count increased), 0 on timeout. */
static int pickup_egg(struct mCore* core, int expected_party) {
    for (int f = 0; f < 900 && running; f++) {
        core->setKeys(core, (f % 16) < 8 ? KEY_A : 0);
        core->runFrame(core);
        if (party_count(core) > expected_party) return 1;
    }
    return 0;
}

/* Dismiss post-egg dialog (mash A/B for 300 frames) */
static void dismiss_dialog(struct mCore* core) {
    for (int f = 0; f < 300 && running; f++) {
        core->setKeys(core, (f % 20) < 10 ? KEY_A : KEY_B);
        core->runFrame(core);
    }
    run_frames(core, 10, 0);
}

/* Walk to hatch a shiny egg. Mixes A presses to handle hatch dialog.
 * Returns species ID when hatched. */
static int hatch_egg(struct mCore* core, int slot) {
    for (int step = 0; step < 15000 && running; step++) {
        int dir = (step % 2 == 0) ? KEY_DOWN : KEY_UP;

        /* Walk with A presses mixed in for hatch dialog */
        for (int f = 0; f < 16 && running; f++) {
            core->setKeys(core, dir);
            core->runFrame(core);
        }
        for (int f = 0; f < 4 && running; f++) {
            core->setKeys(core, KEY_A);
            core->runFrame(core);
        }
        run_frames(core, 4, 0);

        /* Check if hatched (species != 0xFD) */
        if (step > 20) {
            int species = core->busRead8(core, ADDR_PARTY_SPECIES + slot - 1);
            if (species != 0xFD && species != 0) {
                /* Mash A through hatch animation */
                spam_key(core, 600, KEY_A, 16);
                return species;
            }
        }
    }
    return 0; /* timeout */
}

int main(int argc, char* argv[]) {
    if (argc < 6) {
        fprintf(stderr, "Usage: %s <instance_id> <rom_path> <sav_path> <log_path> <save_state_dir>\n", argv[0]);
        return 1;
    }

    int instance_id = atoi(argv[1]);
    const char* rom_path = argv[2];
    const char* sav_path = argv[3];
    const char* log_path = argv[4];
    const char* state_dir = argv[5];

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
    if (!logfp) { fprintf(stderr, "Cannot open log: %s\n", log_path); return 1; }

    struct mCore* core = GBCoreCreate();
    if (!core || !core->init(core)) { fprintf(stderr, "Failed to create mGBA core\n"); return 1; }
    mCoreInitConfig(core, NULL);

    static uint32_t videobuf[160 * 144];
    core->setVideoBuffer(core, (color_t*)videobuf, 160);

    /* Copy ROM and SAV to instance dir (avoids temp file collisions between concurrent hunts) */
    char tmp_rom[512], tmp_sav[512];
    snprintf(tmp_rom, sizeof(tmp_rom), "%s/tmp_rom.gbc", state_dir);
    snprintf(tmp_sav, sizeof(tmp_sav), "%s/tmp_rom.sav", state_dir);

    {
        FILE* src = fopen(rom_path, "rb"); FILE* dst = fopen(tmp_rom, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy ROM\n"); return 1; }
        char buf[8192]; size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
        fclose(src); fclose(dst);
    }
    {
        FILE* src = fopen(sav_path, "rb"); FILE* dst = fopen(tmp_sav, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy SAV\n"); return 1; }
        char buf[8192]; size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
        fclose(src); fclose(dst);
    }

    struct VFile* rom = VFileOpen(tmp_rom, O_RDONLY);
    if (!rom || !core->loadROM(core, rom)) { fprintf(stderr, "Failed to load ROM\n"); return 1; }
    struct VFile* sav = VFileOpen(tmp_sav, O_CREAT | O_RDWR);
    if (sav) core->loadSave(core, sav);

    core->reset(core);

    int total_eggs = 0;

    logmsg("Gen 2 egg shiny hunter (core) running! ~1/64 odds (instance %d)", instance_id);

    while (running) {
        /* === BOOT === */
        int title_delay = rand_range(600, 1400);
        int menu_delay  = rand_range(180, 540);
        int load_wait   = rand_range(300, 900);

        core->reset(core);

        spam_key(core, title_delay, KEY_START, 16);
        spam_key(core, menu_delay, KEY_A, 16);
        spam_key(core, load_wait, KEY_B, 20);

        if (!running) break;

        int initial_party = party_count(core);
        int eggs_this_cycle = 0;

        logmsg("Game loaded, party=%d, walking for egg...", initial_party);

        /* === EGG COLLECTION LOOP (up to MAX_PARTY - initial_party eggs) === */
        while (running && initial_party + eggs_this_cycle < MAX_PARTY) {

            /* Walk up/down until egg ready (check every 2 steps = 1 pair) */
            int pairs = 0;
            int found_egg = 0;
            while (pairs < 4000 && running) {
                walk_pair(core);
                pairs++;
                if (egg_ready(core)) {
                    found_egg = 1;
                    break;
                }
            }

            if (!found_egg) {
                logmsg("No egg after %d walk pairs — resetting", pairs);
                break;
            }

            logmsg("Egg ready after %d walk pairs (egg #%d this cycle)",
                   pairs, eggs_this_cycle + 1);

            /* Navigate to daycare man */
            if (eggs_this_cycle == 0) {
                follow_path(core, PATH_FIRST, PATH_FIRST_LEN);
            } else {
                follow_path(core, PATH_REPEAT, PATH_REPEAT_LEN);
            }

            /* Talk to man and pick up egg */
            int expected = initial_party + eggs_this_cycle;
            if (!pickup_egg(core, expected)) {
                logmsg("Egg pickup timed out — resetting");
                break;
            }

            eggs_this_cycle++;
            dismiss_dialog(core);

            /* Check egg DVs */
            int egg_slot = initial_party + eggs_this_cycle;
            int atk, def, spd, spc;
            read_dvs(core, egg_slot, &atk, &def, &spd, &spc);

            total_eggs++;

            if (matches_conditions(atk, def, spd, spc)) {
                const char* label = hit_label(atk, def, spd, spc);
                /* Log without !!! marker — the marker triggers killHuntProcesses,
                 * so we must hatch + save state BEFORE signaling the hit */
                logmsg("Shiny egg found! %s EGG #%d after %d total eggs Atk:%d Def:%d Spd:%d Spc:%d",
                       label, eggs_this_cycle, total_eggs, atk, def, spd, spc);

                /* Hatch it */
                int species = hatch_egg(core, egg_slot);

                /* Save state */
                core->setKeys(core, 0);
                mCoreSaveState(core, 1, SAVESTATE_ALL);
                char state_path[512];
                snprintf(state_path, sizeof(state_path), "%s/%s_Egg_A%d_D%d_Sp%d_Sc%d.ss1",
                         state_dir, label, atk, def, spd, spc);
                for (char* p = state_path; *p; p++) { if (*p == ' ') *p = '_'; }
                struct VFile* sf = VFileOpen(state_path, O_CREAT | O_WRONLY);
                if (sf) { mCoreSaveStateNamed(core, sf, SAVESTATE_ALL); sf->close(sf); }

                /* NOW signal the hit — state is saved, safe to be killed */
                logmsg("!!! %s HATCHED (species %d) after %d eggs! Atk:%d Def:%d Spd:%d Spc:%d !!!",
                       label, species, total_eggs, atk, def, spd, spc);
                goto done;
            } else {
                logmsg("Egg %d: Atk:%d Def:%d Spd:%d Spc:%d",
                       total_eggs, atk, def, spd, spc);
            }

            /* Continue walking for next egg (stay in place) */
        }

        logmsg("Cycle done (%d eggs checked) — resetting", eggs_this_cycle);
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
