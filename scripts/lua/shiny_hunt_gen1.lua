--[[
  Gen 1 Shiny Hunter — Gift Pokemon (Pokemon Yellow)

  Flow: reset -> A spam through title/continue/loading -> Up to face pokeball
  -> A mash through dialogue -> detect party gain -> wait for DVs -> check
  -> reset if not shiny

  Source: https://bluemoonfalls.com/pages/shinies/gen-1-shiny-hunting

  Shiny DVs: Def=10, Spd=10, Spc=10, Atk in {2,3,6,7,10,11,14,15}
  Best shiny: Atk:15 Def:10 Spd:10 Spc:10

  Memory addresses (Pokemon Yellow, from pret/pokeyellow):
    0xD162 - wPartyCount
    0xD185 - wPartyMon1DVs (Atk/Def nibbles)
    0xD186 - wPartyMon1DVs (Spd/Spc nibbles)
    0xC109 - wSpritePlayerFacingDirection
]]

local instanceId = tonumber(os.getenv("INSTANCE_ID") or "0")
math.randomseed(os.time() * 1000 + instanceId * 137)

local logPath = os.getenv("MGBA_LOG_FILE")
local logFile = logPath and io.open(logPath, "a") or nil

local function log(msg)
    print(msg)
    if logFile then
        logFile:write(os.date("%H:%M:%S ") .. msg .. "\n")
        logFile:flush()
    end
end

local KEY_A  = 1
local KEY_UP = 64

local frame = 0
local attempts = 0
local phase = "boot"
local prevParty = 0
local gotPokemon = false

-- Randomize multiple phases to spread RNG across the full DV space
-- Each independent random delay multiplies the number of unique RNG states
-- 3000 * 180 * variable mash = hundreds of thousands of unique outcomes
local bootFrames = 900 + math.random(3000)
local faceUpExtra = math.random(180)
local mashInterval = 16 + math.random(12) -- vary A-press rhythm (16-28)

-- Hunt conditions from environment variables
local wantShiny = tonumber(os.getenv("TARGET_SHINY") or "1") == 1
local wantPerfect = tonumber(os.getenv("TARGET_PERFECT") or "0") == 1
local targetGender = (os.getenv("TARGET_GENDER") or "any"):lower()
local genderThreshold = tonumber(os.getenv("GENDER_THRESHOLD") or "-2")
local minAtk = tonumber(os.getenv("MIN_ATK") or "0")
local minDef = tonumber(os.getenv("MIN_DEF") or "0")
local minSpd = tonumber(os.getenv("MIN_SPD") or "0")
local minSpc = tonumber(os.getenv("MIN_SPC") or "0")

local function isShinyAtk(atk)
    return atk==2 or atk==3 or atk==6 or atk==7 or atk==10 or atk==11 or atk==14 or atk==15
end

local function isShinyDVs(atk, def, spd, spc)
    return isShinyAtk(atk) and def==10 and spd==10 and spc==10
end

local function isBestShinyDVs(atk, def, spd, spc)
    return atk==15 and def==10 and spd==10 and spc==10
end

local function isPerfectDVs(atk, def, spd, spc)
    return atk==15 and def==15 and spd==15 and spc==15
end

local function matchesConditions(atk, def, spd, spc)
    if atk < minAtk or def < minDef or spd < minSpd or spc < minSpc then return false end
    if wantShiny and not isShinyDVs(atk, def, spd, spc) then return false end
    if wantPerfect then
        if wantShiny then
            if atk ~= 15 then return false end  -- best shiny: 15/10/10/10
        else
            if not isPerfectDVs(atk, def, spd, spc) then return false end
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
    if isBestShinyDVs(atk, def, spd, spc) then return "BEST SHINY" end
    if isShinyDVs(atk, def, spd, spc) then return "SHINY" end
    if isPerfectDVs(atk, def, spd, spc) then return "PERFECT DVs" end
    return "HIT"
end

local function resetAndRetry()
    bootFrames = 900 + math.random(3000)
    faceUpExtra = math.random(180)
    mashInterval = 16 + math.random(12)
    phase = "boot"
    frame = 0
    gotPokemon = false
    prevParty = 0
    emu:reset()
end

callbacks:add("frame", function()
    frame = frame + 1

    local partyCount = emu:read8(0xD162)
    if partyCount > 6 then partyCount = 0 end

    if phase == "boot" then
        -- Spam A to get through title screen, Continue menu, and loading
        if (frame % 16) < 8 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
        end

        if frame >= bootFrames then
            phase = "face_up"
            frame = 0
            prevParty = partyCount
        end

    elseif phase == "face_up" then
        -- Hold Up to face the pokeball, with random extra wait for RNG spread
        if frame <= 30 then
            emu:setKeys(KEY_UP)
        elseif frame <= 60 + faceUpExtra then
            emu:setKeys(0)
        else
            phase = "mash"
            frame = 0
        end

    elseif phase == "mash" then
        -- A-only mash through dialogue to receive Pokemon (variable rhythm)
        if (frame % mashInterval) < (mashInterval / 2) then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
        end

        -- Detect party gain
        if not gotPokemon and partyCount > prevParty then
            gotPokemon = true
            frame = 0
            phase = "wait_dvs"
        end

        -- Safety: if we've been mashing for 2 minutes with no result, reset
        if frame > 7200 then
            log(string.format("Attempt timeout, resetting (instance %d)", instanceId))
            resetAndRetry()
        end

    elseif phase == "wait_dvs" then
        -- Press B to decline nickname prompt while waiting for DVs
        if (frame % 20) < 10 then
            emu:setKeys(2) -- KEY_B
        else
            emu:setKeys(0)
        end

        -- Read DVs — wait until they're non-zero
        local b1 = emu:read8(0xD185)
        local b2 = emu:read8(0xD186)

        if b1 ~= 0 or b2 ~= 0 then
            local atk = (b1 >> 4) & 0xF
            local def = b1 & 0xF
            local spd = (b2 >> 4) & 0xF
            local spc = b2 & 0xF

            attempts = attempts + 1
            local dvStr = string.format("Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc)

            if matchesConditions(atk, def, spd, spc) then
                local label = hitLabel(atk, def, spd, spc)
                log(string.format("!!! %s after %d attempts! %s !!!", label, attempts, dvStr))
                emu:setKeys(0)
                emu:saveStateSlot(1)
                phase = "done"
            else
                log(string.format("Attempt %d: %s", attempts, dvStr))
                resetAndRetry()
            end
        end

        -- If DVs still zero after 600 frames, something went wrong
        if frame > 600 then
            log("DVs never populated, resetting")
            resetAndRetry()
        end
    end
end)

log(string.format("Gen 1 shiny hunter running! bootFrames=%d (instance %d)", bootFrames, instanceId))
