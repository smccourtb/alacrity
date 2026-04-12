# Shiny Hunt Guide

Complete reference for setting up and running shiny hunts with Alacrity.

---

## How Shiny Detection Works

Gen 1-2 shininess is determined by DVs (Determinant Values), the predecessor to IVs. Each Pokemon has 4 DVs (0-15): Attack, Defense, Speed, Special.

**Shiny DVs:**
- Defense = 10, Speed = 10, Special = 10 (exact)
- Attack ∈ {2, 3, 6, 7, 10, 11, 14, 15} (8 of 16 possible values)

**Probability:** 8/16 × 1/16 × 1/16 × 1/16 = **1/8192**

The hunt scripts check for three tiers:
| Label | Criteria | Notes |
|---|---|---|
| BEST SHINY | Atk=15, Def=10, Spd=10, Spc=10 | Best possible shiny (1/65536) |
| SHINY | Atk valid, Def=10, Spd=10, Spc=10 | Any shiny (1/8192) |
| PERFECT DVs | All 15s | Not shiny, but perfect stats (1/65536) |

---

## Hunt Engines

Two ways to run hunts: **mGBA (Lua)** and **Core (C++ binaries)**.

### mGBA Engine (Lua Scripts)

Uses `mgba-qt` running headless (`QT_QPA_PLATFORM=offscreen`) with Lua scripts for automation. The Qt rendering pipeline still runs even offscreen, so there's more overhead per instance.

- **Executable:** `~/mgba/build/qt/mgba-qt`
- **FPS target:** 600000 (effectively uncapped)
- **Typical instances:** ~30
- **Config via env vars:** `INSTANCE_ID`, `MGBA_LOG_FILE`, `HUNT_MODE`, `TARGET_SPECIES`, `WALK_DIR`

### Core Engine (C++ Binaries)

Uses libmgba directly with no GUI, rendering, or audio. Just CPU emulation + memory reads. Much lower overhead per instance.

- **Executables:** `scripts/shiny_hunter_core` (gifts/static), `scripts/shiny_hunter_wild` (wild encounters)
- **FPS:** Unlimited (no rendering bottleneck)
- **Typical instances:** 16+ (practical on 16-core machine)
- **Config via CLI args:** `<instance_id> <rom_path> <sav_path> <log_path> [save_state_dir] [target_species] [walk_dir]`
- **File isolation:** Each instance copies ROM/SAV to `/tmp/shiny_core_<i>.gbc` so there are no file conflicts

### When to Use Which

| Scenario | Engine | Why |
|---|---|---|
| New script development/testing | mGBA | Can disable offscreen to watch the script run |
| Gen 1 gifts (Pikachu, starters, etc.) | Core | Lower overhead, more instances |
| Gen 2 static battles (Lugia, etc.) | Either | Both work well |
| Gen 2 wild encounters | Core | `shiny_hunter_wild` handles walking + fleeing natively |
| Debugging memory addresses | mGBA | Lua console + `debug_gen1.lua` available |

---

## Hunt Scripts

### Gen 1 Gift — `shiny_hunt_gen1.lua` / `shiny_hunter_core`

For stationary gift Pokemon (Pikachu in Yellow, starters, Eevee, Lapras, Magikarp, etc.). The Pokemon is received from an NPC, so the loop is: boot → walk to NPC → mash A through dialogue → read DVs → reset.

**Memory addresses (Yellow):**
- `0xD162` — Party count (detect when Pokemon is received)
- `0xD185` — DV byte 1: Atk(hi) | Def(lo)
- `0xD186` — DV byte 2: Spd(hi) | Spc(lo)

**Loop phases:**
1. **Boot** (900-3900 frames) — A-spam through title, continue, loading
2. **Face Up** (30-210 frames) — Walk to the Pokeball/NPC with random delay
3. **Mash** (up to 7200 frames) — A-spam through dialogue until party count increases
4. **Wait DVs** (up to 600 frames) — B-spam through nickname prompt, wait for DV bytes to be non-zero

**RNG spread:** Three independent random delays rerolled every reset cycle — boot duration, face-up wait, mash rhythm (16-28 frame A-press intervals). Combined with instance-specific RNG seeding (`time()*1000 + instance*137`), this gives good DV spread across instances.

### Gen 2 Static — `shiny_hunt_gen2.lua`

For legendary encounters (Lugia, Ho-Oh, Suicune, etc.). Player loads a save positioned in front of the Pokemon, initiates battle, reads enemy DVs.

**Memory addresses (Crystal):**
- `0xD20C` — Enemy DV byte 1: Atk(hi) | Def(lo)
- `0xD20D` — Enemy DV byte 2: Spd(hi) | Spc(lo)
- `0xD218-D219` — Enemy Max HP (confirms battle struct loaded)
- `0xD22D` — Battle flag (1 = in battle)

**Loop phases:**
1. **Title** (90-690 frames) — START to skip intro
2. **Menu** (30-330 frames) — A to select Continue
3. **Game** (60-3660 frames) — Wait/mash to trigger encounter
4. **Battle** — Wait for battle flag, validate HP > 0 and DVs aren't garbage, check shiny

### Gen 2 Wild — `shiny_hunt_gen2_wild.lua` / `shiny_hunter_wild`

For wild encounters (Ditto, Abra, etc.). Player walks back and forth in grass until a battle triggers, checks species, flees if wrong target, checks DVs if correct.

**Additional memory:**
- `0xD206` — Enemy species (national dex number)

**Extra env vars / CLI args:**
- `TARGET_SPECIES` — Species name to hunt (e.g., "Ditto") or "any" for any shiny
- `WALK_DIR` — "ns" (north/south) or "ew" (east/west)

**Loop phases:**
1. **Boot** — Same as static but with three separate delays (title/menu/load)
2. **Walk** — Step one direction (20 frames walk + 4 frames pause), then opposite. Up to 5000 steps before timeout reset.
3. **Battle check** — If wrong species: flee (DOWN+RIGHT to select RUN, ~300 frames). If target species: check DVs.
4. **Reset** — On non-shiny target or walk timeout, reroll all delays and restart

Tracks both `attempts` (target species encounters) and `encounters` (total battles).

---

## Setting Up a New Hunt

### 1. Prepare the Save File

The hunt needs a save file positioned correctly:
- **Gift hunts:** Standing in front of the Pokeball/NPC, ready to receive
- **Static battles:** Standing in front of the legendary, ready to interact
- **Wild hunts:** Standing in the encounter area (tall grass, cave, etc.)

Play through the game normally in mGBA-qt to set this up. Save in-game at the right spot, then keep the `.sav` file.

### 2. Test the Script with mGBA-qt (GUI)

Before running headless, verify the script works visually:

```bash
# Launch mGBA with GUI + script to watch it run
~/mgba/build/qt/mgba-qt /path/to/rom.gbc --script /path/to/script.lua
```

Set these env vars before launching so the script works:
```bash
export INSTANCE_ID=1
export MGBA_LOG_FILE=/tmp/test_hunt.log
export HUNT_MODE=gift          # or battle, wild
export TARGET_SPECIES=Ditto    # wild hunts only
export WALK_DIR=ns             # wild hunts only
```

**What to watch for:**
- Does the boot sequence get through the title screen cleanly?
- Does the A-mash trigger the right dialogue/interaction?
- Does it detect the Pokemon being received (party count increase or battle flag)?
- Do the DVs read correctly (check the log file)?
- Does it reset and loop properly?

**Common issues:**
- Wrong frame timings — The randomized delays may not cover the right range for your specific save position. Adjust the min/max in the script.
- Memory addresses differ between games — Red/Blue use different offsets than Yellow for some addresses. Crystal differs from Gold/Silver.
- `emu:pause()` doesn't work reliably in headless mode (known issue, see TODO).

### 3. Test with Debug Script

For Gen 1, use `debug_gen1.lua` to diagnose timing issues:
```bash
~/mgba/build/qt/mgba-qt /path/to/rom.gbc --script scripts/lua/debug_gen1.lua
```

This logs frame count, party size, map ID, and player direction every 120 frames. Useful for figuring out how many frames each phase takes.

### 4. Run a Small Headless Test

Test with 1-2 instances headless before scaling up:

```bash
# mGBA engine (1 instance, headless)
QT_QPA_PLATFORM=offscreen INSTANCE_ID=1 MGBA_LOG_FILE=/tmp/test.log \
  ~/mgba/build/qt/mgba-qt /path/to/rom.gbc --script /path/to/script.lua -C fpsTarget=600000

# Core engine (1 instance)
./scripts/shiny_hunter_core 1 /path/to/rom.gbc /path/to/rom.sav /tmp/test.log .
```

Tail the log to confirm attempts are rolling:
```bash
tail -f /tmp/test.log
```

You should see lines like:
```
11:06:34 Attempt 1: Atk:14 Def:0 Spd:11 Spc:13
11:06:38 Attempt 2: Atk:7 Def:3 Spd:1 Spc:8
...
```

If DV values look reasonable (varying across attempts, 0-15 range) and attempts keep incrementing, the script is working.

### 5. Create a Preset (Optional)

If this will be a recurring hunt target, add a preset in `server/src/routes/hunts.ts` in the `/presets` GET handler. Presets fill in ROM path, save path, script, mode, and default instance count.

### 6. Launch the Full Hunt

Use the Hunt Dashboard in the web UI:
- Select a preset or fill in custom config
- Choose engine (core or mgba)
- Set instance count (16 for core, 30 for mgba is typical)
- Click Start

Or POST to `/api/hunts` directly with the full payload.

---

## Monitoring a Hunt

### Dashboard

The Hunt Dashboard polls `/api/hunts/:id/status` every 2 seconds. Shows:
- Total attempts across all instances
- Per-instance attempt counts
- Shiny probability (cumulative odds based on total attempts at 1/8192)
- Hit details when found

### Log Stream

Real-time log viewer streams via SSE (`/api/hunts/:id/stream`). Shows the last 500 messages from all instances. Each instance's log is prefixed with its number.

### Notifications

On shiny hit, a push notification is sent via ntfy.sh to topic `shiny-farm-{username}-{hostname}`. Subscribe on your phone to get notified when a shiny is found.

---

## Post-Shiny Workflow

### 1. Open in mGBA-qt

Click "Open" on the hit instance in the dashboard. This:
- Copies the save + state to an `open_N/` directory (preserving the original)
- Launches mGBA-qt with the save state auto-loaded via `-t` flag
- You're now in the game at the exact moment the shiny was found

### 2. Play and Prepare for Transfer

In mGBA-qt:
- The shiny Pokemon is in your party (gifts) or in battle (static/wild)
- For gifts: it's already received, you can save immediately
- For battles: catch it, then save
- **Nature control (Gen 1→7+ transfers):** Nature is determined by `total EXP mod 25` at transfer time. Use Rare Candies to hit the right level for your desired nature (see `notes/gen1-transfer-pikachu.md` for the full table)
- Save in-game (Start → Save)

### 3. Push to 3DS

Click "Push to 3DS" in the dashboard. This:
- Reads the edited save from `open_N/rom.sav`
- Parses the DV info from the state filename
- Builds a Checkpoint-compatible backup name (e.g., `Yellow - Pikachu - Shiny - A15_D10_Sp10_Sc10`)
- FTP uploads to the 3DS at `192.168.40.36:5000`

**Prerequisites:**
- 3DS must be on the same network with FTP enabled (via ftpd or Checkpoint's built-in server)
- Checkpoint must be installed on the 3DS

### 4. Restore on 3DS

On the 3DS:
1. Open Checkpoint
2. Select the game (e.g., Pokemon Yellow VC)
3. Find the new backup in the list
4. Restore it

### 5. Transfer to Modern Games (Gen 1)

Gen 1 VC → Poke Transporter → Pokemon Bank → Pokemon Home → modern games.

What happens on transfer:
- **Shiny status:** Preserved (DVs map to shiny in Gen 7+)
- **Ability:** Hidden Ability (all Gen 1 VC transfers get HA)
- **IVs:** 3 guaranteed 31, other 3 random (original DVs are NOT converted)
- **Ball:** Poke Ball
- **Origin mark:** Game Boy icon

### 6. Multiple Transfers from Same Shiny

You can reload the same save state multiple times to transfer the same shiny with different natures. Each time:
1. Open the instance again (the original state file is preserved)
2. Rare Candy to a different level for a different nature
3. Save in-game
4. Push to 3DS with a different backup name
5. Transfer

---

## Hunt Directory Structure

```
hunts/hunt_<ID>/
├── instance_1/
│   ├── rom.gbc                                          # ROM copy
│   ├── rom.sav                                          # Save copy
│   └── BEST_SHINY_Pikachu_A15_D10_Sp10_Sc10.ss1       # State on hit
├── instance_2/
│   └── ...
├── logs/
│   ├── instance_1.log                                   # Attempt log
│   └── instance_2.log
└── open_1/                                              # Created on "Open"
    ├── rom.gbc                                          # Symlink (read-only)
    ├── rom.sav                                          # Copy (editable)
    └── rom.ss1                                          # Copy of hit state
```

**State file naming:** `<LABEL>_<Species>_A<atk>_D<def>_Sp<spd>_Sc<spc>.ss1`
- `SHINY_Pikachu_A2_D10_Sp10_Sc10.ss1`
- `BEST_SHINY_Pikachu_A15_D10_Sp10_Sc10.ss1`
- `PERFECT_DVs_Pikachu_A15_D15_Sp15_Sc15.ss1`

---

## Writing a New Hunt Script (Lua)

If you need to hunt a new type of encounter that existing scripts don't cover:

### Template Structure

```lua
-- Environment
local INSTANCE = tonumber(os.getenv("INSTANCE_ID")) or 1
local LOG_FILE = os.getenv("MGBA_LOG_FILE")

-- Logging
local logFile = LOG_FILE and io.open(LOG_FILE, "a") or nil
local function log(msg)
    local ts = os.date("%H:%M:%S")
    local line = ts .. " " .. msg .. "\n"
    io.write(line)
    if logFile then logFile:write(line); logFile:flush() end
end

-- Shiny check
local SHINY_ATK = {[2]=true,[3]=true,[6]=true,[7]=true,[10]=true,[11]=true,[14]=true,[15]=true}
local function checkDVs(byte1, byte2)
    local atk = bit32.rshift(byte1, 4)
    local def = bit32.band(byte1, 0xF)
    local spd = bit32.rshift(byte2, 4)
    local spc = bit32.band(byte2, 0xF)
    return atk, def, spd, spc
end

-- RNG seeding
math.randomseed(os.time() * 1000 + INSTANCE * 137)

-- Main hunt loop (runs in callbacks)
local attempts = 0
local phase = "boot"

callbacks:add("frame", function()
    -- Advance frames, read memory, check DVs
    -- Use emu:read8(addr) to read memory
    -- Use emu:reset() to soft reset
    -- Use emu:saveStateSlot(1) to save state on hit
end)
```

### Key mGBA Lua APIs

```lua
emu:read8(address)          -- Read 1 byte from memory
emu:read16(address)         -- Read 2 bytes
emu:reset()                 -- Soft reset the game
emu:saveStateSlot(1)        -- Save state to slot 1
emu:setKeys(keys)           -- Set button state for this frame
                            -- Keys: 0x1=A, 0x2=B, 0x4=Select, 0x8=Start,
                            --        0x10=Right, 0x20=Left, 0x40=Up, 0x80=Down
callbacks:add("frame", fn)  -- Register per-frame callback
```

### Testing Workflow for New Scripts

1. **Find memory addresses** — Use pret disassembly docs (pokered, pokecrystal) to find the relevant addresses for your game/encounter type
2. **Write the script** with conservative (slow) timings first
3. **Run with GUI** to watch behavior: `mgba-qt rom.gbc --script your_script.lua`
4. **Use debug_gen1.lua as reference** for logging frame-by-frame state
5. **Tighten timings** once the loop works — randomize delays for RNG spread
6. **Test headless** with 1-2 instances
7. **Verify log output** matches expected format (especially the `!!!` hit marker)
8. **Scale up** to full instance count

---

## Troubleshooting

**No attempts incrementing:**
- Check the log file exists and is being written to
- Verify the ROM and save file paths are correct
- For mGBA: ensure the Lua script path is correct and the script has no syntax errors

**All attempts show same DVs:**
- RNG isn't being spread. Check that boot delays are randomized and instance IDs are unique.

**Script gets stuck at title screen:**
- Boot frame count too low. Increase the max boot frames.
- Different ROM revision may have different intro timing.

**Party count never increases (Gen 1 gifts):**
- Player isn't positioned correctly in the save. Reload in GUI and verify position.
- A-mash timing may be wrong for the dialogue sequence.

**Battle flag never triggers (Gen 2):**
- Wild hunts: walk direction may not be entering grass. Try the other direction.
- Static: save might not be close enough to trigger the encounter.

**Hit detected but no state file:**
- mGBA Lua `emu:saveStateSlot(1)` saves to internal slot, not a named file. Named files are only created by the C++ core hunters.
- For mGBA hunts, the state is in `rom.ss1` (slot 1 file).

**3DS push fails:**
- Verify 3DS is on the network with FTP running
- Check the IP/port (default 192.168.40.36:5000)
- Ensure Checkpoint is installed and has write access
