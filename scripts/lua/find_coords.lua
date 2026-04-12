-- Scan WRAM for player coordinates
-- Take a snapshot, then after player moves, compare to find which bytes changed by exactly 1
-- Usage: load script, stand still for 2 seconds, then take ONE step in any direction

local snapshot = {}
local snapshotTaken = false
local watchFrame = 0
local moved = false

-- Take snapshot after 120 frames of standing still
-- Then detect which bytes changed by exactly 1 after movement

local KEY_NAMES = { [64]="UP", [128]="DOWN", [32]="LEFT", [16]="RIGHT" }

callbacks:add("frame", function()
    watchFrame = watchFrame + 1

    if watchFrame == 120 and not snapshotTaken then
        -- Snapshot WRAM
        for addr = 0xC000, 0xDFFF do
            snapshot[addr] = emu:read8(addr)
        end
        snapshotTaken = true
        print("=== SNAPSHOT TAKEN - now take ONE step ===")
    end

    if snapshotTaken and watchFrame > 180 and watchFrame % 30 == 0 and not moved then
        -- Check for changes
        local changes = {}
        for addr = 0xC000, 0xDFFF do
            local old = snapshot[addr]
            local new = emu:read8(addr)
            local diff = new - old
            if diff == 1 or diff == -1 then
                table.insert(changes, string.format("0x%04X: %d -> %d (diff=%d)", addr, old, new, diff))
            end
        end

        if #changes > 0 and #changes < 30 then
            print(string.format("=== %d bytes changed by ±1 ===", #changes))
            for _, c in ipairs(changes) do print("  " .. c) end
            moved = true
        end
    end
end)

print("Stand still for 2 seconds, then take ONE step in any direction...")
