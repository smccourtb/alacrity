-- Debug v16: A-only everywhere, Up at a late fixed time

local logPath = os.getenv("MGBA_LOG_FILE") or "/tmp/debug_gen1.log"
local logFile = io.open(logPath, "w")

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
local prevParty = 0
local didUp = false
local UP_FRAME = 1200  -- 20 seconds in, should definitely be past title+continue+loading

callbacks:add("frame", function()
    frame = frame + 1

    local partyCount = emu:read8(0xD162)
    if partyCount > 6 then partyCount = 0 end

    if frame == 60 then
        prevParty = 0
    end

    if frame % 120 == 0 then
        log(string.format("f=%d party=%d map=%d facing=0x%02X didUp=%s",
            frame, partyCount, emu:read8(0xD35D), emu:read8(0xC109), tostring(didUp)))
    end

    if not didUp then
        if frame < UP_FRAME then
            -- Spam A only — gets through title, continue, loading text
            if (frame % 16) < 8 then
                emu:setKeys(KEY_A)
            else
                emu:setKeys(0)
            end
        elseif frame < UP_FRAME + 30 then
            -- Hold Up
            emu:setKeys(KEY_UP)
            if frame == UP_FRAME then log("=== PRESSING UP NOW ===") end
        elseif frame == UP_FRAME + 30 then
            emu:setKeys(0)
            didUp = true
            log(string.format("=== UP DONE, facing=0x%02X ===", emu:read8(0xC109)))
            frame = 0
        end
    else
        -- A mash
        if (frame % 20) < 10 then
            emu:setKeys(KEY_A)
        else
            emu:setKeys(0)
        end

        if partyCount > prevParty and prevParty >= 0 then
            log(string.format("!!! GOT POKEMON! party: %d -> %d", prevParty, partyCount))
            local b1 = emu:read8(0xD185)
            local b2 = emu:read8(0xD186)
            local atk = (b1 >> 4) & 0xF
            local def = b1 & 0xF
            local spd = (b2 >> 4) & 0xF
            local spc = b2 & 0xF
            log(string.format("DVs: Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc))
            emu:pause()
        end
    end
end)

log("Debug v16 - A only for 20sec, then Up, then A mash")
