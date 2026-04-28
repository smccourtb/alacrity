/* @alacrity games=Crystal modes=wild */
/*
 * Lightweight Gen 2 Wild Encounter Shiny Hunter — uses libmgba core directly
 * No Qt, no rendering, no audio — just CPU emulation + memory reads
 *
 * Usage: ./shiny_hunter_wild <instance_id> <rom_path> <sav_path> <log_path> <save_state_dir> <target_species> <walk_dir>
 *
 * walk_dir: "ns" (north/south) or "ew" (east/west)
 * target_species: e.g. "Ditto", "Abra", or "any" for any shiny
 *
 * Gen 2 Crystal memory addresses (enemy battle struct):
 *   0xD20C - Enemy DVs: Attack(hi) | Defense(lo)
 *   0xD20D - Enemy DVs: Speed(hi) | Special(lo)
 *   0xD218 - Enemy Max HP (high byte)
 *   0xD219 - Enemy Max HP (low byte)
 *   0xD22D - Battle type flag (1 = in battle)
 *   0xD206 - Enemy species (Crystal internal index)
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

/* Silent logger */
static void _nullLog(struct mLogger* log, int cat, enum mLogLevel level, const char* fmt, va_list args) {
    (void)log; (void)cat; (void)level; (void)fmt; (void)args;
}
static struct mLogger s_nullLogger = { .log = _nullLog };

/* Gen 2 Crystal memory addresses */
#define ADDR_BATTLE_FLAG  0xD22D
#define ADDR_ENEMY_SPECIES 0xD206
#define ADDR_ENEMY_DV1    0xD20C  /* Atk(hi) | Def(lo) */
#define ADDR_ENEMY_DV2    0xD20D  /* Spd(hi) | Spc(lo) */
#define ADDR_ENEMY_HP_HI  0xD218
#define ADDR_ENEMY_HP_LO  0xD219

/*
 * Gen 2 species index -> name (Crystal uses national dex order for internal IDs)
 * Gen 2 internal index IS the national dex number (1-251)
 */
static const char* GEN2_SPECIES[256] = {
    [1]="Bulbasaur",  [2]="Ivysaur",    [3]="Venusaur",   [4]="Charmander",
    [5]="Charmeleon", [6]="Charizard",   [7]="Squirtle",   [8]="Wartortle",
    [9]="Blastoise",  [10]="Caterpie",   [11]="Metapod",   [12]="Butterfree",
    [13]="Weedle",    [14]="Kakuna",     [15]="Beedrill",  [16]="Pidgey",
    [17]="Pidgeotto",  [18]="Pidgeot",   [19]="Rattata",   [20]="Raticate",
    [21]="Spearow",   [22]="Fearow",     [23]="Ekans",     [24]="Arbok",
    [25]="Pikachu",   [26]="Raichu",     [27]="Sandshrew", [28]="Sandslash",
    [29]="Nidoran F", [30]="Nidorina",   [31]="Nidoqueen", [32]="Nidoran M",
    [33]="Nidorino",  [34]="Nidoking",   [35]="Clefairy",  [36]="Clefable",
    [37]="Vulpix",    [38]="Ninetales",  [39]="Jigglypuff",[40]="Wigglytuff",
    [41]="Zubat",     [42]="Golbat",     [43]="Oddish",    [44]="Gloom",
    [45]="Vileplume",  [46]="Paras",     [47]="Parasect",  [48]="Venonat",
    [49]="Venomoth",  [50]="Diglett",    [51]="Dugtrio",   [52]="Meowth",
    [53]="Persian",   [54]="Psyduck",    [55]="Golduck",   [56]="Mankey",
    [57]="Primeape",  [58]="Growlithe",  [59]="Arcanine",  [60]="Poliwag",
    [61]="Poliwhirl", [62]="Poliwrath",  [63]="Abra",      [64]="Kadabra",
    [65]="Alakazam",  [66]="Machop",     [67]="Machoke",   [68]="Machamp",
    [69]="Bellsprout",[70]="Weepinbell", [71]="Victreebel", [72]="Tentacool",
    [73]="Tentacruel",[74]="Geodude",    [75]="Graveler",  [76]="Golem",
    [77]="Ponyta",    [78]="Rapidash",   [79]="Slowpoke",  [80]="Slowbro",
    [81]="Magnemite", [82]="Magneton",   [83]="Farfetchd", [84]="Doduo",
    [85]="Dodrio",    [86]="Seel",       [87]="Dewgong",   [88]="Grimer",
    [89]="Muk",       [90]="Shellder",   [91]="Cloyster",  [92]="Gastly",
    [93]="Haunter",   [94]="Gengar",     [95]="Onix",      [96]="Drowzee",
    [97]="Hypno",     [98]="Krabby",     [99]="Kingler",   [100]="Voltorb",
    [101]="Electrode",[102]="Exeggcute", [103]="Exeggutor",[104]="Cubone",
    [105]="Marowak",  [106]="Hitmonlee", [107]="Hitmonchan",[108]="Lickitung",
    [109]="Koffing",  [110]="Weezing",   [111]="Rhyhorn",  [112]="Rhydon",
    [113]="Chansey",  [114]="Tangela",   [115]="Kangaskhan",[116]="Horsea",
    [117]="Seadra",   [118]="Goldeen",   [119]="Seaking",  [120]="Staryu",
    [121]="Starmie",  [122]="Mr. Mime",  [123]="Scyther",  [124]="Jynx",
    [125]="Electabuzz",[126]="Magmar",   [127]="Pinsir",   [128]="Tauros",
    [129]="Magikarp", [130]="Gyarados",  [131]="Lapras",   [132]="Ditto",
    [133]="Eevee",    [134]="Vaporeon",  [135]="Jolteon",  [136]="Flareon",
    [137]="Porygon",  [138]="Omanyte",   [139]="Omastar",  [140]="Kabuto",
    [141]="Kabutops", [142]="Aerodactyl",[143]="Snorlax",  [144]="Articuno",
    [145]="Zapdos",   [146]="Moltres",   [147]="Dratini",  [148]="Dragonair",
    [149]="Dragonite",[150]="Mewtwo",    [151]="Mew",      [152]="Chikorita",
    [153]="Bayleef",  [154]="Meganium",  [155]="Cyndaquil", [156]="Quilava",
    [157]="Typhlosion",[158]="Totodile", [159]="Croconaw", [160]="Feraligatr",
    [161]="Sentret",  [162]="Furret",    [163]="Hoothoot", [164]="Noctowl",
    [165]="Ledyba",   [166]="Ledian",    [167]="Spinarak", [168]="Ariados",
    [169]="Crobat",   [170]="Chinchou",  [171]="Lanturn",  [172]="Pichu",
    [173]="Cleffa",   [174]="Igglybuff", [175]="Togepi",   [176]="Togetic",
    [177]="Natu",     [178]="Xatu",      [179]="Mareep",   [180]="Flaaffy",
    [181]="Ampharos", [182]="Bellossom", [183]="Marill",   [184]="Azumarill",
    [185]="Sudowoodo",[186]="Politoed",  [187]="Hoppip",   [188]="Skiploom",
    [189]="Jumpluff", [190]="Aipom",     [191]="Sunkern",  [192]="Sunflora",
    [193]="Yanma",    [194]="Wooper",    [195]="Quagsire", [196]="Espeon",
    [197]="Umbreon",  [198]="Murkrow",   [199]="Slowking", [200]="Misdreavus",
    [201]="Unown",    [202]="Wobbuffet", [203]="Girafarig",[204]="Pineco",
    [205]="Forretress",[206]="Dunsparce",[207]="Gligar",   [208]="Steelix",
    [209]="Snubbull", [210]="Granbull",  [211]="Qwilfish", [212]="Scizor",
    [213]="Shuckle",  [214]="Heracross", [215]="Sneasel",  [216]="Teddiursa",
    [217]="Ursaring", [218]="Slugma",    [219]="Magcargo",  [220]="Swinub",
    [221]="Piloswine",[222]="Corsola",   [223]="Remoraid", [224]="Octillery",
    [225]="Delibird", [226]="Mantine",   [227]="Skarmory", [228]="Houndour",
    [229]="Houndoom", [230]="Kingdra",   [231]="Phanpy",   [232]="Donphan",
    [233]="Porygon2", [234]="Stantler",  [235]="Smeargle", [236]="Tyrogue",
    [237]="Hitmontop",[238]="Smoochum",  [239]="Elekid",   [240]="Magby",
    [241]="Miltank",  [242]="Blissey",   [243]="Raikou",   [244]="Entei",
    [245]="Suicune",  [246]="Larvitar",  [247]="Pupitar",  [248]="Tyranitar",
    [249]="Lugia",    [250]="Ho-Oh",     [251]="Celebi",
};

static const char* species_name(int idx) {
    if (idx < 1 || idx > 251 || !GEN2_SPECIES[idx]) return "Unknown";
    return GEN2_SPECIES[idx];
}

/* Find species index by name (case-insensitive) */
static int species_by_name(const char* name) {
    for (int i = 1; i <= 251; i++) {
        if (GEN2_SPECIES[i] && strcasecmp(GEN2_SPECIES[i], name) == 0) return i;
    }
    return -1;
}

/* Key bitmasks */
#define KEY_A     (1 << GB_KEY_A)
#define KEY_B     (1 << GB_KEY_B)
#define KEY_START (1 << GB_KEY_START)
#define KEY_UP    (1 << GB_KEY_UP)
#define KEY_DOWN  (1 << GB_KEY_DOWN)
#define KEY_LEFT  (1 << GB_KEY_LEFT)
#define KEY_RIGHT (1 << GB_KEY_RIGHT)

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

/* Hunt condition checking — reads from environment variables */
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
    min_atk_dv = env_int("MIN_ATK", 0);
    min_def_dv = env_int("MIN_DEF", 0);
    min_spd_dv = env_int("MIN_SPD", 0);
    min_spc_dv = env_int("MIN_SPC", 0);
    exact_atk = env_int("EXACT_ATK", 0);
    gender_threshold = env_int("GENDER_THRESHOLD", -2);

    const char* g = getenv("TARGET_GENDER");
    if (g && strcasecmp(g, "male") == 0) want_gender = 1;
    else if (g && strcasecmp(g, "female") == 0) want_gender = 2;
    else want_gender = 0;
}

static int matches_conditions(int atk, int def, int spd, int spc) {
    if (exact_atk && min_atk_dv > 0) {
        if (atk != min_atk_dv) return 0;
    } else if (atk < min_atk_dv) return 0;
    if (def < min_def_dv || spd < min_spd_dv || spc < min_spc_dv) return 0;
    if (want_shiny && !(is_shiny_atk(atk) && def == 10 && spd == 10 && spc == 10)) return 0;
    if (want_perfect) {
        if (want_shiny) {
            if (atk != 15) return 0;
        } else {
            if (!(atk == 15 && def == 15 && spd == 15 && spc == 15)) return 0;
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
    if (argc < 8) {
        fprintf(stderr, "Usage: %s <instance_id> <rom_path> <sav_path> <log_path> <save_state_dir> <target_species> <walk_dir>\n", argv[0]);
        fprintf(stderr, "  target_species: e.g. \"Ditto\", \"Abra\", or \"any\"\n");
        fprintf(stderr, "  walk_dir: \"ns\" (north/south) or \"ew\" (east/west)\n");
        return 1;
    }

    int instance_id = atoi(argv[1]);
    const char* rom_path = argv[2];
    const char* sav_path = argv[3];
    const char* log_path = argv[4];
    const char* state_dir = argv[5];
    const char* target_name = argv[6];
    const char* walk_dir = argv[7];

    int target_any = (strcasecmp(target_name, "any") == 0);
    int target_id = target_any ? -1 : species_by_name(target_name);
    if (!target_any && target_id < 0) {
        fprintf(stderr, "Unknown species: %s\n", target_name);
        return 1;
    }

    int dir_key1, dir_key2;
    if (strcasecmp(walk_dir, "ns") == 0) {
        dir_key1 = KEY_UP;
        dir_key2 = KEY_DOWN;
    } else if (strcasecmp(walk_dir, "ew") == 0) {
        dir_key1 = KEY_LEFT;
        dir_key2 = KEY_RIGHT;
    } else {
        fprintf(stderr, "walk_dir must be 'ns' or 'ew'\n");
        return 1;
    }

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

    /* Create and init core */
    struct mCore* core = GBCoreCreate();
    if (!core || !core->init(core)) {
        fprintf(stderr, "Failed to create mGBA core\n");
        return 1;
    }

    mCoreInitConfig(core, NULL);

    static uint32_t videobuf[160 * 144];
    core->setVideoBuffer(core, (color_t*)videobuf, 160);

    /* Copy ROM and SAV to tmp */
    char tmp_rom[512], tmp_sav[512];
    snprintf(tmp_rom, sizeof(tmp_rom), "/tmp/shiny_wild_%d.gbc", instance_id);
    snprintf(tmp_sav, sizeof(tmp_sav), "/tmp/shiny_wild_%d.sav", instance_id);

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
    int encounters = 0;
    int skipped = 0;

    logmsg("Gen 2 wild shiny hunter running! target=%s walk=%s (instance %d)",
        target_any ? "any" : target_name, walk_dir, instance_id);

    while (running) {
        /* === PHASE 1: BOOT — Start through title, A to continue, wait for load === */
        int title_delay = rand_range(400, 1400);
        int menu_delay = rand_range(120, 540);
        int load_wait = rand_range(200, 700);

        core->reset(core);

        /* Spam Start to get past title screen */
        for (int f = 0; f < title_delay && running; f++) {
            core->setKeys(core, (f % 16) < 8 ? KEY_START : 0);
            core->runFrame(core);
        }
        /* Spam A to select Continue and load game */
        for (int f = 0; f < menu_delay && running; f++) {
            core->setKeys(core, (f % 16) < 8 ? KEY_A : 0);
            core->runFrame(core);
        }
        /* Wait for game to fully load, spam B to dismiss any text */
        for (int f = 0; f < load_wait && running; f++) {
            core->setKeys(core, (f % 20) < 10 ? KEY_B : 0);
            core->runFrame(core);
        }
        if (!running) break;

        /* === PHASE 2: WALK — one step each direction to trigger encounters === */
        /* Gen 2 requires actually stepping onto a tile to roll encounter checks.
         * Walk one step north, one step south (or east/west) to stay in place. */
        int max_steps = 5000;  /* safety limit */

        for (int s = 0; s < max_steps && running; s++) {
            int dir = (s % 2 == 0) ? dir_key1 : dir_key2;

            /* Hold direction for 20 frames (one full step in Gen 2) */
            for (int f = 0; f < 20 && running; f++) {
                core->setKeys(core, dir);
                core->runFrame(core);

                int battle = core->busRead8(core, ADDR_BATTLE_FLAG);
                if (battle == 1) goto in_battle;
            }
            /* Brief pause between steps — randomized to diverge emulator RNG */
            int pause = 4 + rand_range(0, 6);
            for (int f = 0; f < pause && running; f++) {
                core->setKeys(core, 0);
                core->runFrame(core);

                int battle = core->busRead8(core, ADDR_BATTLE_FLAG);
                if (battle == 1) goto in_battle;
            }
        }

        /* If we walked 5000 steps with no encounter, reset */
        logmsg("No encounter after extended walking, resetting");
        continue;

    in_battle:
        core->setKeys(core, 0);

        /* Wait for enemy data to populate */
        {
            int valid = 0;
            for (int f = 0; f < 120 && running; f++) {
                core->setKeys(core, 0);
                core->runFrame(core);

                int hp = core->busRead8(core, ADDR_ENEMY_HP_HI) * 256 +
                         core->busRead8(core, ADDR_ENEMY_HP_LO);
                if (hp > 0) { valid = 1; break; }
            }
            if (!valid || !running) continue;
        }

        /* Read enemy species */
        int enemy_species = core->busRead8(core, ADDR_ENEMY_SPECIES);
        const char* enemy_name = species_name(enemy_species);
        encounters++;

        /* Check if target species */
        if (!target_any && enemy_species != target_id) {
            skipped++;
            /* Flee: hold right + press B spam to run away, then continue walking */
            for (int f = 0; f < 300 && running; f++) {
                /* Select RUN option (bottom-right in Gen 2 battle menu) */
                if (f < 30) {
                    core->setKeys(core, KEY_DOWN | KEY_RIGHT);
                } else {
                    core->setKeys(core, (f % 12) < 6 ? KEY_A : 0);
                }
                core->runFrame(core);

                /* Check if battle ended */
                int battle = core->busRead8(core, ADDR_BATTLE_FLAG);
                if (battle != 1 && f > 60) break;
            }
            /* Wait for overworld to settle */
            for (int f = 0; f < 60 && running; f++) {
                core->setKeys(core, 0);
                core->runFrame(core);
            }
            if (skipped % 10 == 0) {
                logmsg("Skipped %d non-%s encounters (%d total)", skipped, target_name, encounters);
            }
            continue;  /* Back to walking */
        }

        /* Target species found — check DVs */
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
            logmsg("!!! %s %s after %d attempts (%d encounters)! Atk:%d Def:%d Spd:%d Spc:%d !!!",
                label, enemy_name, attempts, encounters, atk, def, spd, spc);
            core->setKeys(core, 0);
            mCoreSaveState(core, 1, SAVESTATE_ALL);
            char state_path[512];
            snprintf(state_path, sizeof(state_path), "%s/%s_%s_A%d_D%d_Sp%d_Sc%d.ss1",
                state_dir, label, enemy_name, atk, def, spd, spc);
            for (char* p = state_path; *p; p++) { if (*p == ' ') *p = '_'; }
            struct VFile* sf = VFileOpen(state_path, O_CREAT | O_WRONLY);
            if (sf) { mCoreSaveStateNamed(core, sf, SAVESTATE_ALL); sf->close(sf); }
            goto done;
        } else {
            logmsg("Attempt %d: %s Atk:%d Def:%d Spd:%d Spc:%d (%d encounters)",
                attempts, enemy_name, atk, def, spd, spc, encounters);
            /* Reset to try again from save */
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
