/*
 * Lightweight Gen 1 Shiny Hunter — uses libmgba core directly
 * No Qt, no rendering, no audio — just CPU emulation + memory reads
 *
 * Usage: ./shiny_hunter_core <instance_id> <rom_path> <sav_path> <log_path> [save_state_dir]
 *
 * Shiny DVs (Gen 1→2 transfer): Def=10, Spd=10, Spc=10, Atk in {2,3,6,7,10,11,14,15}
 * Memory: 0xD162=wPartyCount, 0xD185-0xD186=wPartyMon1DVs
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

/* Silent logger — suppress all mGBA debug/warning output */
static void _nullLog(struct mLogger* log, int cat, enum mLogLevel level, const char* fmt, va_list args) {
    (void)log; (void)cat; (void)level; (void)fmt; (void)args;
}
static struct mLogger s_nullLogger = { .log = _nullLog };

/* Pokemon Yellow memory addresses */
#define ADDR_PARTY_COUNT 0xD162
#define ADDR_MON1_SPECIES 0xD163  /* First entry in party species list */
#define ADDR_DV_BYTE1    0xD185  /* Atk(hi) | Def(lo) */
#define ADDR_DV_BYTE2    0xD186  /* Spd(hi) | Spc(lo) */

/*
 * Gen 1 internal index -> species name
 * Gen 1 uses a non-sequential internal ID scheme (not national dex order).
 * Index 0 is unused/MissingNo, valid Pokemon are scattered across 0x01-0xBE.
 */
static const char* GEN1_SPECIES[256] = {
    [0x01]="Rhydon",     [0x02]="Kangaskhan", [0x03]="Nidoran M",  [0x04]="Clefairy",
    [0x05]="Spearow",    [0x06]="Voltorb",    [0x07]="Nidoking",   [0x08]="Slowbro",
    [0x09]="Ivysaur",    [0x0A]="Exeggutor",  [0x0B]="Lickitung",  [0x0C]="Exeggcute",
    [0x0D]="Grimer",     [0x0E]="Gengar",     [0x0F]="Nidoran F",  [0x10]="Nidoqueen",
    [0x11]="Cubone",     [0x12]="Rhyhorn",    [0x13]="Lapras",     [0x14]="Arcanine",
    [0x15]="Mew",        [0x16]="Gyarados",   [0x17]="Shellder",   [0x18]="Tentacool",
    [0x19]="Gastly",     [0x1A]="Scyther",    [0x1B]="Staryu",     [0x1C]="Blastoise",
    [0x1D]="Pinsir",     [0x1E]="Tangela",    [0x21]="Growlithe",  [0x22]="Onix",
    [0x23]="Fearow",     [0x24]="Pidgey",     [0x25]="Slowpoke",   [0x26]="Kadabra",
    [0x27]="Graveler",   [0x28]="Chansey",    [0x29]="Machoke",    [0x2A]="Mr. Mime",
    [0x2B]="Hitmonlee",  [0x2C]="Hitmonchan", [0x2D]="Arbok",      [0x2E]="Parasect",
    [0x2F]="Psyduck",    [0x30]="Drowzee",    [0x31]="Golem",      [0x33]="Magmar",
    [0x35]="Electabuzz", [0x36]="Magneton",   [0x37]="Koffing",    [0x39]="Mankey",
    [0x3A]="Seel",       [0x3B]="Diglett",    [0x3C]="Tauros",     [0x40]="Farfetchd",
    [0x41]="Venonat",    [0x42]="Dragonite",  [0x46]="Doduo",      [0x47]="Poliwag",
    [0x48]="Jynx",       [0x49]="Moltres",    [0x4A]="Articuno",   [0x4B]="Zapdos",
    [0x4C]="Ditto",      [0x4D]="Meowth",     [0x4E]="Krabby",     [0x52]="Vulpix",
    [0x53]="Ninetales",  [0x54]="Pikachu",    [0x55]="Raichu",     [0x58]="Dratini",
    [0x59]="Dragonair",  [0x5A]="Kabuto",     [0x5B]="Kabutops",   [0x5C]="Horsea",
    [0x5D]="Seadra",     [0x60]="Sandshrew",  [0x61]="Sandslash",  [0x62]="Omanyte",
    [0x63]="Omastar",    [0x64]="Jigglypuff", [0x65]="Wigglytuff", [0x66]="Eevee",
    [0x67]="Flareon",    [0x68]="Jolteon",    [0x69]="Vaporeon",   [0x6A]="Machop",
    [0x6B]="Zubat",      [0x6C]="Ekans",      [0x6D]="Paras",      [0x6E]="Poliwhirl",
    [0x6F]="Poliwrath",  [0x70]="Weedle",     [0x71]="Kakuna",     [0x72]="Beedrill",
    [0x74]="Dodrio",     [0x75]="Primeape",   [0x76]="Dugtrio",    [0x77]="Venomoth",
    [0x78]="Dewgong",    [0x7B]="Caterpie",   [0x7C]="Metapod",    [0x7D]="Butterfree",
    [0x7E]="Machamp",    [0x80]="Golduck",    [0x81]="Hypno",      [0x82]="Golbat",
    [0x83]="Mewtwo",     [0x84]="Snorlax",    [0x85]="Magikarp",   [0x88]="Muk",
    [0x8A]="Kingler",    [0x8B]="Cloyster",   [0x8D]="Electrode",  [0x8E]="Clefable",
    [0x8F]="Weezing",    [0x90]="Persian",    [0x91]="Marowak",    [0x93]="Haunter",
    [0x94]="Abra",       [0x95]="Alakazam",   [0x96]="Pidgeotto",  [0x97]="Pidgeot",
    [0x98]="Starmie",    [0x99]="Bulbasaur",  [0x9A]="Venusaur",   [0x9D]="Tentacruel",
    [0xA3]="Goldeen",    [0xA4]="Seaking",    [0xA5]="Ponyta",     [0xA6]="Rapidash",
    [0xA7]="Rattata",    [0xA8]="Raticate",   [0xA9]="Nidorino",   [0xAA]="Nidorina",
    [0xAB]="Geodude",    [0xAC]="Porygon",    [0xAD]="Aerodactyl", [0xB0]="Magnemite",
    [0xB1]="Charmander", [0xB2]="Squirtle",   [0xB3]="Charmeleon", [0xB4]="Wartortle",
    [0xB5]="Charizard",  [0xB9]="Oddish",     [0xBA]="Gloom",      [0xBB]="Vileplume",
    [0xBC]="Bellsprout",  [0xBD]="Weepinbell", [0xBE]="Victreebel",
};

static const char* species_name(int idx) {
    if (idx < 0 || idx > 255 || !GEN1_SPECIES[idx]) return "Unknown";
    return GEN1_SPECIES[idx];
}

/* Key bitmasks (1 << GBKey enum) */
#define KEY_A  (1 << GB_KEY_A)
#define KEY_B  (1 << GB_KEY_B)
#define KEY_UP (1 << GB_KEY_UP)

static volatile int running = 1;
static FILE* logfp = NULL;

static void handle_signal(int sig) {
    (void)sig;
    running = 0;
}

static void logmsg(const char* fmt, ...) {
    time_t now = time(NULL);
    struct tm* t = localtime(&now);
    char timebuf[16];
    strftime(timebuf, sizeof(timebuf), "%H:%M:%S", t);

    va_list ap;

    if (logfp) {
        fprintf(logfp, "%s ", timebuf);
        va_start(ap, fmt);
        vfprintf(logfp, fmt, ap);
        va_end(ap);
        fprintf(logfp, "\n");
        fflush(logfp);
    }

    printf("%s ", timebuf);
    va_start(ap, fmt);
    vprintf(fmt, ap);
    va_end(ap);
    printf("\n");
}

static int is_shiny_atk(int atk) {
    return atk==2||atk==3||atk==6||atk==7||atk==10||atk==11||atk==14||atk==15;
}

static int rand_range(int min, int max) {
    return min + (rand() % (max - min + 1));
}

/* Hunt condition checking — reads from environment variables:
 *   TARGET_SHINY: "0" or "1" (default 1)
 *   TARGET_GENDER: "any", "male", "female" (default "any")
 *   GENDER_THRESHOLD: DV threshold; Atk <= threshold = female (default -2 = no check)
 *   MIN_ATK, MIN_DEF, MIN_SPD, MIN_SPC: minimum DV values (default 0)
 */
static int env_int(const char* name, int def) {
    const char* v = getenv(name);
    return v ? atoi(v) : def;
}

static int want_shiny = 1;
static int want_perfect = 0;
static int want_gender = 0;  /* 0=any, 1=male, 2=female */
static int gender_threshold = -2;
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
    /* Check minimum DVs */
    if (atk < min_atk_dv || def < min_def_dv || spd < min_spd_dv || spc < min_spc_dv) return 0;

    /* Check shiny requirement */
    if (want_shiny && !(is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10)) return 0;

    /* Check perfect DVs requirement — context-dependent:
     * With shiny: best shiny = Atk 15, Def/Spd/Spc already locked to 10
     * Without shiny: true perfect = all 15 */
    if (want_perfect) {
        if (want_shiny) {
            if (atk != 15) return 0;  /* best shiny: 15/10/10/10 */
        } else {
            if (!(atk == 15 && def == 15 && spd == 15 && spc == 15)) return 0;
        }
    }

    /* Check gender requirement */
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
    const char* state_dir = argc > 5 ? argv[5] : ".";

    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    srand((unsigned)(time(NULL) * 1000 + instance_id * 137));
    load_conditions();

    /* Silence mGBA internal logging */
    mLogSetDefaultLogger(&s_nullLogger);

    logfp = fopen(log_path, "a");
    if (!logfp) {
        fprintf(stderr, "Cannot open log: %s\n", log_path);
        return 1;
    }

    /* Create and init core */
    struct mCore* core = GBCoreCreate();
    if (!core || !core->init(core)) {
        fprintf(stderr, "Failed to create mGBA core\n");
        return 1;
    }

    mCoreInitConfig(core, NULL);

    /* Provide a dummy video buffer (required by renderer) */
    static uint32_t videobuf[160 * 144];
    core->setVideoBuffer(core, (color_t*)videobuf, 160);

    /* Load ROM (copy to tmp so each instance has its own) */
    char tmp_rom[512], tmp_sav[512];
    snprintf(tmp_rom, sizeof(tmp_rom), "/tmp/shiny_core_%d.gbc", instance_id);
    snprintf(tmp_sav, sizeof(tmp_sav), "/tmp/shiny_core_%d.sav", instance_id);

    /* Copy ROM */
    {
        FILE* src = fopen(rom_path, "rb");
        FILE* dst = fopen(tmp_rom, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy ROM\n"); return 1; }
        char buf[8192];
        size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) fwrite(buf, 1, n, dst);
        fclose(src); fclose(dst);
    }
    /* Copy SAV */
    {
        FILE* src = fopen(sav_path, "rb");
        FILE* dst = fopen(tmp_sav, "wb");
        if (!src || !dst) { fprintf(stderr, "Cannot copy SAV\n"); return 1; }
        char buf[8192];
        size_t n;
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
    int boot_frames, face_extra, mash_interval;

    logmsg("Gen 1 shiny hunter (core) running! (instance %d)", instance_id);

    while (running) {
        /* === PHASE 1: BOOT — A-spam through title/continue/load === */
        boot_frames = rand_range(900, 3900);
        face_extra = rand_range(0, 180);
        mash_interval = rand_range(16, 28);

        core->reset(core);

        for (int f = 0; f < boot_frames && running; f++) {
            core->setKeys(core, (f % 16) < 8 ? KEY_A : 0);
            core->runFrame(core);
        }
        if (!running) break;

        int prev_party = core->busRead8(core, ADDR_PARTY_COUNT);
        if (prev_party > 6) prev_party = 0;

        /* === PHASE 2: FACE UP — walk to pokeball === */
        for (int f = 0; f < 30 && running; f++) {
            core->setKeys(core, KEY_UP);
            core->runFrame(core);
        }
        for (int f = 0; f < 30 + face_extra && running; f++) {
            core->setKeys(core, 0);
            core->runFrame(core);
        }
        if (!running) break;

        /* === PHASE 3: MASH — dialogue to receive pokemon === */
        int got_pokemon = 0;
        int mash_frame = 0;
        for (mash_frame = 0; mash_frame < 7200 && running; mash_frame++) {
            int half = mash_interval / 2;
            core->setKeys(core, (mash_frame % mash_interval) < half ? KEY_A : 0);
            core->runFrame(core);

            int party = core->busRead8(core, ADDR_PARTY_COUNT);
            if (party > 6) party = 0;
            if (!got_pokemon && party > prev_party) {
                got_pokemon = 1;
                break;
            }
        }
        if (!running) break;
        if (!got_pokemon) {
            logmsg("Attempt timeout, resetting (instance %d)", instance_id);
            continue;
        }

        /* === PHASE 4: WAIT FOR DVs === */
        int found_dvs = 0;
        for (int f = 0; f < 600 && running; f++) {
            core->setKeys(core, (f % 20) < 10 ? KEY_B : 0);
            core->runFrame(core);

            int b1 = core->busRead8(core, ADDR_DV_BYTE1);
            int b2 = core->busRead8(core, ADDR_DV_BYTE2);
            if (b1 != 0 || b2 != 0) {
                int atk = (b1 >> 4) & 0xF;
                int def = b1 & 0xF;
                int spd = (b2 >> 4) & 0xF;
                int spc = b2 & 0xF;

                attempts++;
                int species_id = core->busRead8(core, ADDR_MON1_SPECIES);
                const char* name = species_name(species_id);

                if (matches_conditions(atk, def, spd, spc)) {
                    const char* label = hit_label(atk, def, spd, spc);
                    logmsg("!!! %s %s after %d attempts! Atk:%d Def:%d Spd:%d Spc:%d !!!", label, name, attempts, atk, def, spd, spc);
                    core->setKeys(core, 0);
                    mCoreSaveState(core, 1, SAVESTATE_ALL);
                    char state_path[512];
                    snprintf(state_path, sizeof(state_path), "%s/%s_%s_A%d_D%d_Sp%d_Sc%d.ss1",
                        state_dir, label, name, atk, def, spd, spc);
                    for (char* p = state_path; *p; p++) { if (*p == ' ') *p = '_'; }
                    struct VFile* sf = VFileOpen(state_path, O_CREAT | O_WRONLY);
                    if (sf) { mCoreSaveStateNamed(core, sf, SAVESTATE_ALL); sf->close(sf); }
                    goto done;
                } else {
                    logmsg("Attempt %d: %s Atk:%d Def:%d Spd:%d Spc:%d", attempts, name, atk, def, spd, spc);
                }
                found_dvs = 1;
                break;
            }
        }
        if (!found_dvs && running) {
            logmsg("DVs never populated, resetting");
        }
    }

done:
    /* Keep running after hit so the process stays alive for the monitor */
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
