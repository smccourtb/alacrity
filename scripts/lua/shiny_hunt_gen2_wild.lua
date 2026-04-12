--[[
  Gen 2 Wild Encounter Shiny Hunter (Pokemon Crystal)

  Flow: boot -> walk back and forth in grass -> battle -> check species/DVs
  -> if wrong species: flee -> keep walking
  -> if right species + shiny DVs: save state
  -> if right species + not shiny: reset

  Memory addresses (Crystal):
    0xD20C - Enemy DVs: Attack & Defense
    0xD20D - Enemy DVs: Speed & Special
    0xD218 - Enemy Max HP (high byte)
    0xD219 - Enemy Max HP (low byte)
    0xD22D - Battle type flag (1 = in battle)
    0xD206 - Enemy species (national dex number)
]]

local instanceId = tonumber(os.getenv("INSTANCE_ID") or "0")
math.randomseed(os.time() * 1000 + instanceId * 137)

local targetName = os.getenv("TARGET_SPECIES") or "Ditto"
local walkDir = os.getenv("WALK_DIR") or "ns"

-- Hunt conditions from environment variables
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

-- Gen 2 species lookup (national dex order)
local SPECIES = {
    [132]="Ditto", [63]="Abra", [25]="Pikachu", [133]="Eevee",
    [16]="Pidgey", [19]="Rattata", [41]="Zubat", [74]="Geodude",
    [129]="Magikarp", [130]="Gyarados", [147]="Dratini",
    [161]="Sentret", [163]="Hoothoot", [165]="Ledyba",
    [167]="Spinarak", [175]="Togepi", [179]="Mareep",
    [183]="Marill", [194]="Wooper", [187]="Hoppip",
}

local function speciesName(id)
    return SPECIES[id] or string.format("Pokemon#%d", id)
end

-- Find target species ID
local targetId = nil
local targetAny = (targetName:lower() == "any")
if not targetAny then
    for id, name in pairs(SPECIES) do
        if name:lower() == targetName:lower() then
            targetId = id
            break
        end
    end
end

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

local KEY_A     = 1
local KEY_B     = 2
local KEY_START = 8
local KEY_UP    = 64
local KEY_DOWN  = 128
local KEY_LEFT  = 32
local KEY_RIGHT = 16

local dir1 = KEY_UP
local dir2 = KEY_DOWN
if walkDir == "ew" then
    dir1 = KEY_LEFT
    dir2 = KEY_RIGHT
end

local state = "boot"  -- always start with boot — mGBA loads save but still goes through title
local frame = 0
local attempts = 0
local encounters = 0
local skipped = 0
local walkStep = 0

-- Title phase needs to cover GBC boot + Nintendo + Game Freak + intro + title screen
local titleDelay = 600 + math.random(400)
local menuDelay = 180 + math.random(180)
local loadWait = 300 + math.random(180)

callbacks:add("frame", function()
    frame = frame + 1

    if state == "boot" then
        -- Spam buttons through each phase (like the C version) instead of single presses.
        -- Crystal boot: GBC logo -> Nintendo -> Game Freak -> intro cutscene -> title -> menu
        if frame < titleDelay then
            -- Phase 1: spam START to skip intro + advance past title screen
            if frame % 16 < 8 then
                emu:setKeys(KEY_START)
            else
                emu:setKeys(0)
            end
        elseif frame < titleDelay + menuDelay then
            -- Phase 2: spam A to select Continue on the main menu
            if (frame - titleDelay) % 16 < 8 then
                emu:setKeys(KEY_A)
            else
                emu:setKeys(0)
            end
        elseif frame < titleDelay + menuDelay + loadWait then
            -- Phase 3: spam B to dismiss any post-load dialogs
            if (frame - titleDelay - menuDelay) % 20 < 10 then
                emu:setKeys(KEY_B)
            else
                emu:setKeys(0)
            end
        else
            state = "walk"
            frame = 0
            walkStep = 0
            log("Walking started")
        end

    elseif state == "walk" then
        -- Walk one step each direction, alternating
        local dir = (walkStep % 2 == 0) and dir1 or dir2
        local stepFrame = frame % 24  -- 20 frames walk + 4 frames pause

        if stepFrame < 20 then
            emu:setKeys(dir)
        else
            emu:setKeys(0)
            if stepFrame == 23 then
                walkStep = walkStep + 1
            end
        end

        -- Check for battle
        local battle = emu:read8(0xD22D)
        if battle == 1 then
            emu:setKeys(0)
            state = "battle"
            frame = 0
        end

        -- Safety: if walking too long, reset
        if walkStep > 5000 then
            log("No encounter after extended walking, resetting")
            titleDelay = 600 + math.random(400)
            menuDelay = 180 + math.random(180)
            loadWait = 300 + math.random(180)
            state = "boot"
            frame = 0
            walkStep = 0
            emu:reset()
        end

    elseif state == "battle" then
        emu:setKeys(0)

        -- Wait for enemy data
        local maxHP = emu:read8(0xD218) * 256 + emu:read8(0xD219)
        if maxHP == 0 then return end

        local b1 = emu:read8(0xD20C)
        local b2 = emu:read8(0xD20D)
        if (b1 == 0 and b2 == 0) or (b1 == 0xFF and b2 == 0xFF) then return end

        local enemySpecies = emu:read8(0xD206)
        local enemyName = speciesName(enemySpecies)
        encounters = encounters + 1

        -- Wrong species — reset immediately
        if not targetAny and enemySpecies ~= targetId then
            skipped = skipped + 1
            log(string.format("Skipped %s (#%d enc, %d non-%s)", enemyName, encounters, skipped, targetName))
            titleDelay = 600 + math.random(400)
            menuDelay = 180 + math.random(180)
            loadWait = 300 + math.random(180)
            state = "boot"
            frame = 0
            walkStep = 0
            emu:reset()
            return
        end

        -- Target species — check DVs
        local atk = (b1 >> 4) & 0xF
        local def = b1 & 0xF
        local spd = (b2 >> 4) & 0xF
        local spc = b2 & 0xF

        attempts = attempts + 1

        local dvStr = string.format("Atk:%d Def:%d Spd:%d Spc:%d", atk, def, spd, spc)

        if matchesConditions(atk, def, spd, spc) then
            local label = hitLabel(atk, def, spd, spc)
            log(string.format("!!! %s %s after %d attempts (%d encounters)! %s !!!",
                label, enemyName, attempts, encounters, dvStr))
            emu:saveStateSlot(1)
            emu:pause()
        else
            log(string.format("Attempt %d: %s %s (%d encounters)", attempts, enemyName, dvStr, encounters))
            titleDelay = 600 + math.random(400)
            menuDelay = 180 + math.random(180)
            loadWait = 300 + math.random(180)
            state = "boot"
            frame = 0
            walkStep = 0
            emu:reset()
        end

    end
end)

log(string.format("Gen 2 wild shiny hunter running! target=%s walk=%s (instance %d)",
    targetName, walkDir, instanceId))
