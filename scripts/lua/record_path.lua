--[[
  Path Recorder — records directional inputs with frame timing

  Usage:
  1. Load this script
  2. Walk the exact path you want to automate
  3. Press START when done — it prints the recorded sequence

  Records: direction, hold duration, pauses between steps
]]

local KEY_A     = 1
local KEY_B     = 2
local KEY_START = 8
local KEY_UP    = 64
local KEY_DOWN  = 128
local KEY_LEFT  = 32
local KEY_RIGHT = 16

local DIR_NAMES = {
    [KEY_UP] = "UP", [KEY_DOWN] = "DOWN",
    [KEY_LEFT] = "LEFT", [KEY_RIGHT] = "RIGHT",
}

local recording = {}
local currentDir = 0
local dirStartFrame = 0
local frame = 0
local lastInputFrame = 0
local done = false
local prevKeys = 0

callbacks:add("frame", function()
    frame = frame + 1
    if done then return end

    local keys = emu:getKeys()

    -- Detect START press to finish recording
    if (keys & KEY_START) ~= 0 and (prevKeys & KEY_START) == 0 then
        -- End current direction if any
        if currentDir ~= 0 then
            table.insert(recording, {
                dir = DIR_NAMES[currentDir],
                frames = frame - dirStartFrame,
            })
        end
        done = true

        -- Print the recorded path
        print("=== RECORDED PATH ===")
        print(string.format("Total steps: %d", #recording))
        print("")
        print("-- Paste into hunt script:")
        print("local PATH_TO_MAN = {")
        for i, step in ipairs(recording) do
            print(string.format('    { dir = KEY_%s, frames = %d },', step.dir, step.frames))
        end
        print("}")
        print("")

        -- Also print human-readable version
        print("-- Human readable:")
        for i, step in ipairs(recording) do
            local tiles = math.floor(step.frames / 16)
            print(string.format("  %d: %s for %d frames (~%d tiles)", i, step.dir, step.frames, tiles))
        end
        print("=== END RECORDING ===")
        return
    end

    -- Track directional input
    local dir = 0
    if (keys & KEY_UP) ~= 0 then dir = KEY_UP
    elseif (keys & KEY_DOWN) ~= 0 then dir = KEY_DOWN
    elseif (keys & KEY_LEFT) ~= 0 then dir = KEY_LEFT
    elseif (keys & KEY_RIGHT) ~= 0 then dir = KEY_RIGHT
    end

    if dir ~= currentDir then
        -- Direction changed — save previous if it was a real direction
        if currentDir ~= 0 then
            table.insert(recording, {
                dir = DIR_NAMES[currentDir],
                frames = frame - dirStartFrame,
            })
        end
        currentDir = dir
        dirStartFrame = frame
    end

    prevKeys = keys
end)

print("=== PATH RECORDER ===")
print("Walk the path you want to record.")
print("Press START when done to print the sequence.")
print("")
print("Record the path FROM your walking spot TO the daycare man to pick up the egg.")
