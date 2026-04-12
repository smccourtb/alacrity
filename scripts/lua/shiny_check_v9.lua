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
local battleFrame = 0
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
            battleFrame = 0
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

        -- Wait until Lugia's max HP is loaded (confirms battle struct is ready)
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

        local shinyAtk = (atk==2 or atk==3 or atk==6 or atk==7 or
                          atk==10 or atk==11 or atk==14 or atk==15)

        local isShiny = shinyAtk and def==10 and spd==10 and spc==10
        local isPerfect = atk==15 and def==15 and spd==15 and spc==15

        if isShiny then
            log(string.format("!!! SHINY LUGIA after %d attempts! Atk:%d Def:%d Spd:%d Spc:%d !!!",
                  attempts, atk, def, spd, spc))
            emu:saveStateSlot(1)
            log("Savestate saved to slot 1")
            emu:pause()
        elseif isPerfect then
            log(string.format("!!! PERFECT IVs LUGIA after %d attempts! Atk:%d Def:%d Spd:%d Spc:%d !!!",
                  attempts, atk, def, spd, spc))
            emu:saveStateSlot(1)
            log("Savestate saved to slot 1")
            emu:pause()
        else
            log(string.format("Attempt %d: Not shiny/perfect (Atk:%d Def:%d Spd:%d Spc:%d)",
                  attempts, atk, def, spd, spc))
            -- Re-roll all delays for next attempt
            rollDelays()
            state = STATE_TITLE
            frame = 0
            emu:reset()
        end
    end
end)

log(string.format("Auto shiny hunter running! (instance %d)", instanceId))
