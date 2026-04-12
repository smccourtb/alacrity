--[[
  Debug script for Gen 2 Egg Hunting (Pokemon Crystal)

  Purpose: Verify memory addresses for egg breeding automation.
  Monitors party data, daycare egg flag, and step counter.

  Run this in mGBA with a Crystal save where:
  - Shiny Ditto + target are deposited at the Route 34 Daycare
  - Player is standing near the Daycare Man outside

  Usage: Open in mGBA GUI (not headless) to watch the log output
  while you manually walk around and interact with the daycare man.

  Crystal Memory Map (party):
    0xDCD7 - Party count
    0xDCD8 - Party species list (6 slots + 0xFF terminator)
    0xDCDF - Party mon 1 data start (48 bytes per mon)
      +0x00  Species
      +0x15  DVs byte 1 (Atk:high nybble, Def:low nybble)
      +0x16  DVs byte 2 (Spd:high nybble, Spc:low nybble)

  Crystal Memory Map (daycare/egg):
    0xDEF3 - Daycare mon 1 species  (0 = empty)
    0xDF23 - Daycare mon 2 species  (0 = empty)
    0xDF53 - Egg status / step counter to next egg
    0xDF54 - Egg available flag (1 = egg ready to collect)

  Crystal Memory Map (overworld):
    0xDCB5 - Map group
    0xDCB6 - Map number
    0xD4D2 - Player X position
    0xD4D3 - Player Y position
    0xD4DC - Player facing direction
]]

local logPath = os.getenv("MGBA_LOG_FILE") or "/tmp/debug_gen2_egg.log"
local logFile = io.open(logPath, "w")

local function log(msg)
    print(msg)
    if logFile then
        logFile:write(os.date("%H:%M:%S ") .. msg .. "\n")
        logFile:flush()
    end
end

-- Party addresses
local PARTY_COUNT   = 0xDCD7
local PARTY_SPECIES = 0xDCD8  -- 6 bytes
local PARTY_START   = 0xDCDF  -- 48 (0x30) bytes per mon
local DV_OFFSET_1   = 0x15    -- Atk/Def
local DV_OFFSET_2   = 0x16    -- Spd/Spc
local SPECIES_OFFSET = 0x00
local MON_SIZE      = 0x30    -- 48 bytes

-- Daycare / egg addresses (verified via WRAM scan)
local DAYCARE_MAN   = 0xDEF5  -- bit 7=active, bit 6=egg ready, bit 0=mon1 present
local DAYCARE_MON1  = 0xDEF5 + 23  -- 0xDF0C: breed mon 1 species (after nickname+OT)
local DAYCARE_LADY  = 0xDEF5 + 55  -- 0xDF2C: bit 7=active, bit 0=mon2 present
local STEPS_TO_EGG  = 0xDEF5 + 56  -- 0xDF2D
local DAYCARE_MON2  = 0xDEF5 + 80  -- 0xDF45: breed mon 2 species

-- Overworld
local MAP_GROUP     = 0xDCB5
local MAP_NUMBER    = 0xDCB6
local PLAYER_X      = 0xD4D2
local PLAYER_Y      = 0xD4D3
local PLAYER_DIR    = 0xD4DC

local frame = 0
local prevPartyCount = 0
local prevEggReady = 0

local function readPartyMonDVs(slot)
    -- slot is 1-indexed
    local base = PARTY_START + (slot - 1) * MON_SIZE
    local b1 = emu:read8(base + DV_OFFSET_1)
    local b2 = emu:read8(base + DV_OFFSET_2)
    local atk = (b1 >> 4) & 0xF
    local def = b1 & 0xF
    local spd = (b2 >> 4) & 0xF
    local spc = b2 & 0xF
    return atk, def, spd, spc
end

local function readPartyMonSpecies(slot)
    return emu:read8(PARTY_SPECIES + slot - 1)
end

local function isShinyDVs(atk, def, spd, spc)
    local shinyAtk = atk==2 or atk==3 or atk==6 or atk==7 or atk==10 or atk==11 or atk==14 or atk==15
    return shinyAtk and def==10 and spd==10 and spc==10
end

callbacks:add("frame", function()
    frame = frame + 1

    -- Log every 2 seconds (~120 frames at 60fps)
    if frame % 120 == 0 then
        local partyCount = emu:read8(PARTY_COUNT)
        if partyCount > 6 then partyCount = 0 end

        local dcManFlag = emu:read8(DAYCARE_MAN)
        local dc1 = emu:read8(DAYCARE_MON1)
        local dcLadyFlag = emu:read8(DAYCARE_LADY)
        local dc2 = emu:read8(DAYCARE_MON2)
        local eggSteps = emu:read8(STEPS_TO_EGG)
        local eggReady = (dcManFlag >> 6) & 1  -- bit 6 of wDayCareMan
        local mapG = emu:read8(MAP_GROUP)
        local mapN = emu:read8(MAP_NUMBER)
        local px = emu:read8(PLAYER_X)
        local py = emu:read8(PLAYER_Y)
        local dir = emu:read8(PLAYER_DIR)

        log(string.format(
            "f=%d | party=%d | dc1=%d dc2=%d | eggSteps=%d eggReady=%d | dcMan=0x%02X dcLady=0x%02X",
            frame, partyCount, dc1, dc2, eggSteps, eggReady, dcManFlag, dcLadyFlag
        ))

        -- Log DVs for all party members
        for i = 1, partyCount do
            local species = readPartyMonSpecies(i)
            local atk, def, spd, spc = readPartyMonDVs(i)
            local shiny = isShinyDVs(atk, def, spd, spc) and " *** SHINY ***" or ""
            log(string.format("  Party[%d]: species=%d DVs: Atk:%d Def:%d Spd:%d Spc:%d%s",
                i, species, atk, def, spd, spc, shiny))
        end

        -- Detect egg becoming available (bit 6 of wDayCareMan)
        if eggReady ~= prevEggReady then
            log(string.format("=== EGG READY CHANGED: %d -> %d ===", prevEggReady, eggReady))
            prevEggReady = eggReady
        end

        -- Detect species change in last party slot (egg hatch)
        local lastSpecies = emu:read8(PARTY_SPECIES + partyCount - 1)
        if lastSpecies ~= 0xFD and lastSpecies ~= 0 and prevPartyCount > 0 then
            -- Check if it was previously an egg
        end

        -- Detect party count change (egg pickup or hatch)
        if partyCount ~= prevPartyCount and prevPartyCount > 0 then
            log(string.format("=== PARTY COUNT CHANGED: %d -> %d ===", prevPartyCount, partyCount))
            if partyCount > prevPartyCount then
                -- New mon — log its DVs
                local atk, def, spd, spc = readPartyMonDVs(partyCount)
                local species = readPartyMonSpecies(partyCount)
                log(string.format("=== NEW MON: species=%d DVs: Atk:%d Def:%d Spd:%d Spc:%d ===",
                    species, atk, def, spd, spc))
                if isShinyDVs(atk, def, spd, spc) then
                    log("=== !!! SHINY DVs DETECTED !!! ===")
                end
            end
            prevPartyCount = partyCount
        end

        if prevPartyCount == 0 then prevPartyCount = partyCount end
    end
end)

log("=== Gen 2 Egg Debug Script ===")
log("Walk near daycare, collect eggs, and watch the log.")
log("This will monitor: party DVs, daycare state, egg readiness.")
log(string.format("Addresses: partyCount=0x%04X eggReady=0x%04X eggSteps=0x%04X",
    PARTY_COUNT, EGG_READY, EGG_STEP_CTR))
