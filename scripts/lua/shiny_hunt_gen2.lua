--[[
  Gen 2 Shiny Hunter (Pokemon Gold/Silver/Crystal)

  Shiny odds: 1/8192
  Shiny DVs: Def=10, Spd=10, Spc=10, Atk in {2,3,6,7,10,11,14,15}
  Best shiny: Atk:15 Def:10 Spd:10 Spc:10
  Perfect DVs: 15/15/15/15 (impossible to also be shiny)

  Memory addresses (enemy battle struct):
    0xD20C - Enemy DVs: Attack & Defense
    0xD20D - Enemy DVs: Speed & Special
    0xD218 - Enemy Max HP (high byte)
    0xD219 - Enemy Max HP (low byte)
    0xD22D - Battle type flag
]]

-- Seed with time + instance ID for unique RNG per instance
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

local KEY_A     = 1
local KEY_B     = 2
local KEY_START = 8

local STATE_TITLE  = "title"
local STATE_MENU   = "menu"
local STATE_GAME   = "game"
local STATE_BATTLE = "battle"

local state      = STATE_TITLE
local frame      = 0
local checked    = false
local attempts   = 0

-- Randomize delays at every stage to maximize RNG spread
local titleDelay = 0
local menuDelay  = 0
local waitFrames = 0

local function rollDelays()
    titleDelay = 90 + math.random(600)
    menuDelay  = 30 + math.random(300)
    waitFrames = 60 + math.random(3600)
end
rollDelays()

local function pressKey(key) emu:setKeys(key) end
local function releaseKeys() emu:setKeys(0) end

-- Hunt conditions from environment variables
local wantShiny = tonumber(os.getenv("TARGET_SHINY") or "1") == 1
local wantPerfect = tonumber(os.getenv("TARGET_PERFECT") or "0") == 1
local targetGender = (os.getenv("TARGET_GENDER") or "any"):lower()
local genderThreshold = tonumber(os.getenv("GENDER_THRESHOLD") or "-2")
local minAtk = tonumber(os.getenv("MIN_ATK") or "0")
local minDef = tonumber(os.getenv("MIN_DEF") or "0")
local minSpd = tonumber(os.getenv("MIN_SPD") or "0")
local minSpc = tonumber(os.getenv("MIN_SPC") or "0")
local exactAtk = tonumber(os.getenv("EXACT_ATK") or "0") == 1

local function isShinyAtk(atk)
    return atk==2 or atk==3 or atk==6 or atk==7 or atk==10 or atk==11 or atk==14 or atk==15
end

local function isShinyDVs(atk, def, spd, spc)
    return isShinyAtk(atk) and def==10 and spd==10 and spc==10
end

local function isPerfectDVs(atk, def, spd, spc)
    return atk==15 and def==15 and spd==15 and spc==15
end

local function isBestShinyDVs(atk, def, spd, spc)
    return atk==15 and def==10 and spd==10 and spc==10
end

local function matchesConditions(atk, def, spd, spc)
    if exactAtk and minAtk > 0 then
        if atk ~= minAtk then return false end
    elseif atk < minAtk then return false end
    if def < minDef or spd < minSpd or spc < minSpc then return false end
    if wantShiny and not isShinyDVs(atk, def, spd, spc) then return false end
    if wantPerfect then
        if wantShiny then
            if atk ~= 15 then return false end
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

callbacks:add("frame", function()
    frame = frame + 1

    if state == STATE_TITLE then
        if frame == titleDelay then pressKey(KEY_START)
        elseif frame == titleDelay + 10 then
            releaseKeys()
            state = STATE_MENU
            frame = 0
        end

    elseif state == STATE_MENU then
        if frame == menuDelay then pressKey(KEY_A)
        elseif frame == menuDelay + 10 then
            releaseKeys()
            state = STATE_GAME
            frame = 0
        end

    elseif state == STATE_GAME then
        local battleFlag = emu:read8(0xD22D)
        if battleFlag == 1 then
            releaseKeys()
            state = STATE_BATTLE
            checked = false
        elseif frame > waitFrames then
            if frame % 20 == 0 then pressKey(KEY_A)
            elseif frame % 20 == 10 then releaseKeys()
            elseif frame % 40 == 30 then pressKey(KEY_B)
            end
        else
            releaseKeys()
        end

    elseif state == STATE_BATTLE then
        releaseKeys()
        if checked then return end

        local maxHP = emu:read8(0xD218) * 256 + emu:read8(0xD219)
        if maxHP == 0 then return end

        local b1 = emu:read8(0xD20C)
        local b2 = emu:read8(0xD20D)
        if (b1 == 0 and b2 == 0) or (b1 == 0xFF and b2 == 0xFF) then return end

        checked = true
        attempts = attempts + 1

        local atk = (b1 >> 4) & 0xF
        local def = b1 & 0xF
        local spd = (b2 >> 4) & 0xF
        local spc = b2 & 0xF

        local dvStr = string.format("Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc)

        if matchesConditions(atk, def, spd, spc) then
            local label = hitLabel(atk, def, spd, spc)
            log(string.format("!!! %s after %d attempts! %s !!!", label, attempts, dvStr))
            emu:saveStateSlot(1)
            emu:pause()
        else
            log(string.format("Attempt %d: %s", attempts, dvStr))
            rollDelays()
            state = STATE_TITLE
            frame = 0
            emu:reset()
        end
    end
end)

log(string.format("Gen 2 shiny hunter running! (instance %d)", instanceId))
