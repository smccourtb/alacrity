--[[
  Gen 2 Egg Shiny Hunter (Pokemon Crystal) — Continuous Mode

  Collects eggs without resetting. RNG naturally advances between eggs.
  When party is full, checks all eggs and resets if none are shiny.

  Save setup:
    - Shiny Ditto + target deposited at Route 34 Daycare
    - Player standing in the fenced area near daycare (walking spot)
    - Party: 1 Pokemon only (5 egg slots before full)
    - No egg currently waiting (eggReady=0)

  Memory addresses (Crystal, verified):
    0xDCD7 - Party count
    0xDCD8 - Party species list
    0xDCDF - Party mon 1 data (48 bytes per mon, DVs at +0x15/+0x16)
    0xDEF5 - wDayCareMan flag (bit 6=egg ready)
]]

local instanceId = tonumber(os.getenv("INSTANCE_ID") or "0")
math.randomseed(os.time() * 1000 + instanceId * 137)

local wantShiny = tonumber(os.getenv("TARGET_SHINY") or "1") == 1
local wantPerfect = tonumber(os.getenv("TARGET_PERFECT") or "0") == 1
local targetGender = (os.getenv("TARGET_GENDER") or "any"):lower()
local genderThreshold = tonumber(os.getenv("GENDER_THRESHOLD") or "-2")
local minAtk = tonumber(os.getenv("MIN_ATK") or "0")
local minDef = tonumber(os.getenv("MIN_DEF") or "0")
local minSpd = tonumber(os.getenv("MIN_SPD") or "0")
local minSpc = tonumber(os.getenv("MIN_SPC") or "0")

local logPath = os.getenv("MGBA_LOG_FILE")
local logFile = logPath and io.open(logPath, "a") or nil

local function log(msg)
    print(msg)
    if logFile then
        logFile:write(os.date("%H:%M:%S ") .. msg .. "\n")
        logFile:flush()
    end
end

-- ── Memory addresses ──────────────────────────────────────────────────────────

local PARTY_COUNT   = 0xDCD7
local PARTY_SPECIES = 0xDCD8
local PARTY_START   = 0xDCDF
local DV_OFFSET_1   = 0x15
local DV_OFFSET_2   = 0x16
local MON_SIZE      = 0x30
local DAYCARE_MAN   = 0xDEF5

-- ── Keys ──────────────────────────────────────────────────────────────────────

local KEY_A     = 1
local KEY_B     = 2
local KEY_START = 8
local KEY_UP    = 64
local KEY_DOWN  = 128
local KEY_LEFT  = 32
local KEY_RIGHT = 16

-- ── Paths to daycare man ──────────────────────────────────────────────────────
-- First egg: from original save walking spot (2 left to entrance)
local PATH_FIRST = {
    { dir = KEY_LEFT,  frames = 20 },
    { dir = KEY_LEFT,  frames = 20 },
    { dir = KEY_UP,    frames = 20 },
    { dir = KEY_UP,    frames = 20 },
    { dir = KEY_DOWN,  frames = 20 },
    { dir = KEY_DOWN,  frames = 20 },
    { dir = KEY_RIGHT, frames = 20 },
    { dir = KEY_RIGHT, frames = 20 },
}
-- Subsequent eggs: same enter/exit trick, 2 right to reach man
local PATH_REPEAT = {
    { dir = KEY_LEFT,  frames = 20 },
    { dir = KEY_UP,    frames = 20 },
    { dir = KEY_UP,    frames = 20 },
    { dir = KEY_DOWN,  frames = 20 },
    { dir = KEY_DOWN,  frames = 20 },
    { dir = KEY_RIGHT, frames = 20 },
    { dir = KEY_RIGHT, frames = 20 },
}
local PATH_PAUSE = 4

-- ── DV checks ─────────────────────────────────────────────────────────────────

local function isShinyAtk(atk)
    return atk==2 or atk==3 or atk==6 or atk==7 or atk==10 or atk==11 or atk==14 or atk==15
end

local function isShinyDVs(atk, def, spd, spc)
    return isShinyAtk(atk) and def==10 and spd==10 and spc==10
end

local function matchesConditions(atk, def, spd, spc)
    if atk < minAtk or def < minDef or spd < minSpd or spc < minSpc then return false end
    if wantShiny and not isShinyDVs(atk, def, spd, spc) then return false end
    if wantPerfect then
        if wantShiny then
            if atk ~= 15 then return false end
        else
            if not (atk == 15 and def == 15 and spd == 15 and spc == 15) then return false end
        end
    end
    if targetGender == "male" and genderThreshold >= 0 and atk <= genderThreshold then return false end
    if targetGender == "female" then
        if genderThreshold < 0 then return false end
        if genderThreshold > 15 then return true end
        if atk > genderThreshold then return false end
    end
    return true
end

local function hitLabel(atk, def, spd, spc)
    if atk == 15 and def == 10 and spd == 10 and spc == 10 then return "BEST SHINY" end
    if isShinyDVs(atk, def, spd, spc) then return "SHINY" end
    if atk == 15 and def == 15 and spd == 15 and spc == 15 then return "PERFECT DVs" end
    return "HIT"
end

local function readPartyMonDVs(slot)
    local base = PARTY_START + (slot - 1) * MON_SIZE
    local b1 = emu:read8(base + DV_OFFSET_1)
    local b2 = emu:read8(base + DV_OFFSET_2)
    local atk = (b1 >> 4) & 0xF
    local def = b1 & 0xF
    local spd = (b2 >> 4) & 0xF
    local spc = b2 & 0xF
    return atk, def, spd, spc
end

-- ── State machine ─────────────────────────────────────────────────────────────

local state = "boot"
local frame = 0
local attempts = 0
local eggsThisCycle = 0
local walkStep = 0
local initialPartyCount = 0
local maxParty = 6
local pathStep = 1
local pathFrame = 0
local hitSlot = 0

local titleDelay = 600 + math.random(400)
local menuDelay  = 180 + math.random(180)
local loadWait   = 300 + math.random(180)

local function resetToTitle()
    titleDelay = 600 + math.random(400)
    menuDelay  = 180 + math.random(180)
    loadWait   = 300 + math.random(180)
    state = "boot"
    frame = 0
    walkStep = 0
    pathStep = 1
    pathFrame = 0
    eggsThisCycle = 0
    emu:reset()
end

callbacks:add("frame", function()
    frame = frame + 1

    -- ── BOOT ────────────────────────────────────────────────────────────────
    if state == "boot" then
        if frame < titleDelay then
            if frame % 16 < 8 then emu:setKeys(KEY_START) else emu:setKeys(0) end
        elseif frame < titleDelay + menuDelay then
            if (frame - titleDelay) % 16 < 8 then emu:setKeys(KEY_A) else emu:setKeys(0) end
        elseif frame < titleDelay + menuDelay + loadWait then
            if (frame - titleDelay - menuDelay) % 20 < 10 then emu:setKeys(KEY_B) else emu:setKeys(0) end
        else
            initialPartyCount = emu:read8(PARTY_COUNT)
            if initialPartyCount > 6 then initialPartyCount = 1 end
            eggsThisCycle = 0
            state = "walk_for_egg"
            frame = 0
            walkStep = 0
            log(string.format("Game loaded, party=%d, walking for egg...", initialPartyCount))
        end

    -- ── WALK: up/down until egg ready ───────────────────────────────────────
    elseif state == "walk_for_egg" then
        local dir = (walkStep % 2 == 0) and KEY_DOWN or KEY_UP
        local stepFrame = frame % 24

        if stepFrame < 20 then
            emu:setKeys(dir)
        else
            emu:setKeys(0)
            if stepFrame == 23 then
                walkStep = walkStep + 1
            end
        end

        -- Check egg ready on even steps (back at start tile)
        if walkStep > 0 and walkStep % 2 == 0 and stepFrame == 23 then
            local dcManFlag = emu:read8(DAYCARE_MAN)
            local eggReady = (dcManFlag >> 6) & 1
            if eggReady == 1 then
                log(string.format("Egg ready after %d steps (egg #%d this cycle)", walkStep, eggsThisCycle + 1))
                state = "navigate_to_man"
                frame = 0
                pathStep = 1
                pathFrame = 0
                emu:setKeys(0)
            end
        end

        if walkStep > 8000 then
            log("No egg after extended walking — resetting")
            resetToTitle()
        end

    -- ── NAVIGATE TO MAN ─────────────────────────────────────────────────────
    elseif state == "navigate_to_man" then
        local activePath = eggsThisCycle == 0 and PATH_FIRST or PATH_REPEAT
        if pathStep > #activePath then
            state = "talk_to_man"
            frame = 0
            emu:setKeys(0)
            log("Reached daycare man, talking...")
            return
        end

        local step = activePath[pathStep]
        pathFrame = pathFrame + 1

        if pathFrame <= step.frames then
            emu:setKeys(step.dir)
        elseif pathFrame <= step.frames + PATH_PAUSE then
            emu:setKeys(0)
        else
            pathStep = pathStep + 1
            pathFrame = 0
        end

    -- ── TALK: mash A to accept egg ──────────────────────────────────────────
    elseif state == "talk_to_man" then
        if frame % 16 < 8 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
        end

        local currentParty = emu:read8(PARTY_COUNT)
        if currentParty > 6 then currentParty = 0 end

        if currentParty > initialPartyCount + eggsThisCycle then
            eggsThisCycle = eggsThisCycle + 1
            log("Egg received! Dismissing dialog...")
            state = "dismiss_dialog"
            frame = 0
        end

        if frame > 900 then
            log("Egg pickup timed out — resetting")
            resetToTitle()
        end

    -- ── DISMISS DIALOG: mash A/B through "take good care of it" etc ────────
    elseif state == "dismiss_dialog" then
        if frame % 20 < 10 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(KEY_B)
        end
        -- Give plenty of time for all dialog to clear
        if frame > 300 then
            state = "check_egg"
            frame = 0
            emu:setKeys(0)
        end

    -- ── CHECK EGG ───────────────────────────────────────────────────────────
    elseif state == "check_egg" then
        if frame < 30 then return end

        local eggSlot = initialPartyCount + eggsThisCycle
        local atk, def, spd, spc = readPartyMonDVs(eggSlot)

        local b1 = emu:read8(PARTY_START + (eggSlot - 1) * MON_SIZE + DV_OFFSET_1)
        local b2 = emu:read8(PARTY_START + (eggSlot - 1) * MON_SIZE + DV_OFFSET_2)
        if frame < 120 and ((b1 == 0 and b2 == 0) or (b1 == 0xFF and b2 == 0xFF)) then
            return
        end

        attempts = attempts + 1
        local dvStr = string.format("Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc)

        if matchesConditions(atk, def, spd, spc) then
            local label = hitLabel(atk, def, spd, spc)
            log(string.format("!!! %s EGG #%d after %d total attempts! %s !!!", label, eggsThisCycle, attempts, dvStr))
            hitSlot = eggSlot
            state = "hatch"
            frame = 0
            walkStep = 0
        else
            log(string.format("Egg %d: %s", attempts, dvStr))
            -- Can we fit more eggs? Party limit is 6
            if initialPartyCount + eggsThisCycle >= maxParty then
                log(string.format("Party full after %d eggs this cycle — resetting", eggsThisCycle))
                resetToTitle()
            else
                -- Stay put and keep walking for next egg
                state = "walk_for_egg"
                frame = 0
                walkStep = 0
                log("Continuing for next egg...")
            end
        end

    -- ── HATCH: walk to hatch the shiny egg ──────────────────────────────────
    elseif state == "hatch" then
        local dir = (walkStep % 2 == 0) and KEY_DOWN or KEY_UP
        local stepFrame = frame % 24

        -- Mix in A presses every few steps to dismiss "Huh?" hatch dialog
        if stepFrame < 16 then
            emu:setKeys(dir)
        elseif stepFrame < 20 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
            if stepFrame == 23 then
                walkStep = walkStep + 1
            end
        end

        local currentSpecies = emu:read8(PARTY_SPECIES + hitSlot - 1)
        if currentSpecies ~= 0xFD and currentSpecies ~= 0 and walkStep > 20 then
            log(string.format("Egg hatching! Species: %d", currentSpecies))
            state = "hatch_dialog"
            frame = 0
        end

        if walkStep > 15000 then
            log("Hatch walk exceeded maximum — saving anyway")
            state = "save_hit"
            frame = 0
        end

    -- ── HATCH DIALOG ────────────────────────────────────────────────────────
    elseif state == "hatch_dialog" then
        if frame % 16 < 8 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
        end

        if frame > 600 then
            state = "save_hit"
            frame = 0
        end

    -- ── SAVE HIT ────────────────────────────────────────────────────────────
    elseif state == "save_hit" then
        local atk, def, spd, spc = readPartyMonDVs(hitSlot)
        local label = hitLabel(atk, def, spd, spc)
        local dvStr = string.format("Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc)
        log(string.format("!!! %s HATCHED after %d eggs! %s !!!", label, attempts, dvStr))
        emu:saveStateSlot(1)
        state = "done"
        emu:pause()

    -- ── DONE: do nothing ────────────────────────────────────────────────────
    elseif state == "done" then
        emu:setKeys(0)
    end
end)

log(string.format("Gen 2 egg shiny hunter running! (instance %d)", instanceId))
log("Continuous mode: collecting up to 5 eggs per cycle, ~1/64 odds per egg")
