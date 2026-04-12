-- Scan WRAM for daycare data
-- wDayCareMan is a flag byte: bit 7=active, bit 6=egg ready, bit 0=mon1 present
-- Followed by: nickname(11) + OT(11) + box_struct(32, species at byte 0)
-- So species1 is at wDayCareMan + 1 + 11 + 11 = +23

-- Search for a byte with bit7+bit0 set, followed 23 bytes later by species 132 (Ditto) or 4 (Charmander)
local hits = {}
for addr = 0xD000, 0xDFFF do
    local flag = emu:read8(addr)
    if (flag & 0x81) == 0x81 then  -- bit 7 and bit 0 both set
        local species = emu:read8(addr + 23)
        if species == 132 or species == 4 then
            local nextFlag = emu:read8(addr + 23 + 32) -- wDayCareLady after box_struct
            local species2 = emu:read8(addr + 23 + 32 + 3 + 22) -- +3 for lady+steps+mother, +22 for nick+OT
            print(string.format("HIT: 0x%04X flag=0x%02X species1=%d nextFlag=0x%02X species2=%d",
                addr, flag, species, nextFlag, species2))
        end
    end
end
print("Scan done")
