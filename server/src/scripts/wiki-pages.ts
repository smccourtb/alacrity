/**
 * wiki-pages.ts
 *
 * Shared mapping from location_key to Bulbapedia page name(s).
 * Used by enrich-trainer-names.ts and wiki-prose enrichment scripts.
 *
 * Convention:
 *   - Cities: Pallet_Town, Viridian_City, etc.
 *   - Routes: Kanto_Route_1
 *   - Caves/dungeons: Cerulean_Cave, Diglett%27s_Cave, Seafoam_Islands, etc.
 *   - URL encoding: %27 for apostrophe, %C3%A9 for é
 */

export const LOCATION_TO_PAGES: Record<string, string[]> = {
  // Routes with trainers
  "route-3": ["Kanto_Route_3"],
  "route-4": ["Kanto_Route_4"],
  "route-6": ["Kanto_Route_6"],
  "route-8": ["Kanto_Route_8"],
  "route-9": ["Kanto_Route_9"],
  "route-10": ["Kanto_Route_10"],
  "route-11": ["Kanto_Route_11"],
  "route-12": ["Kanto_Route_12"],
  "route-13": ["Kanto_Route_13"],
  "route-14": ["Kanto_Route_14"],
  "route-15": ["Kanto_Route_15"],
  "route-16": ["Kanto_Route_16"],
  "route-17": ["Kanto_Route_17"],
  "route-18": ["Kanto_Route_18"],
  "route-19": ["Kanto_Route_19"],
  "route-20": ["Kanto_Route_20"],
  "route-21": ["Kanto_Route_21"],
  "route-22": ["Kanto_Route_22"],
  "route-24": ["Kanto_Route_24"],
  "route-25": ["Kanto_Route_25"],

  // Routes without trainers (walkthrough content only)
  "route-1": ["Kanto_Route_1"],
  "route-2-north": ["Kanto_Route_2"],
  "route-2-south": ["Kanto_Route_2"],
  "route-5": ["Kanto_Route_5"],
  "route-7": ["Kanto_Route_7"],
  "route-23": ["Kanto_Route_23"],

  // Dungeons/caves with trainers
  "viridian-forest": ["Viridian_Forest"],
  "mt-moon": ["Mt._Moon"],
  "rock-tunnel": ["Rock_Tunnel"],
  "ss-anne": ["S.S._Anne"],
  "victory-road": ["Victory_Road_(Kanto)"],
  "pokemon-tower": ["Pokémon_Tower"],
  "pokemon-mansion": ["Pokémon_Mansion"],

  // Dungeons/areas without trainers
  "cerulean-cave": ["Cerulean_Cave"],
  "digletts-cave": ["Diglett's_Cave"],
  "seafoam-islands": ["Seafoam_Islands"],
  "power-plant": ["Kanto_Power_Plant"],
  "safari-zone": ["Kanto_Safari_Zone"],
  "fighting-dojo": ["Fighting_Dojo"],
  "rocket-hideout": ["Rocket_Hideout"],
  "silph-co": ["Silph_Co."],

  // Cities (mapped to their gym + notable building pages)
  "pallet-town": ["Pallet_Town"],
  "viridian-city": ["Viridian_City"],
  "pewter-city": ["Pewter_Gym"],
  "cerulean-city": ["Cerulean_Gym"],
  "vermilion-city": ["Vermilion_Gym"],
  "celadon-city": ["Celadon_Gym", "Rocket_Hideout"],
  "fuchsia-city": ["Fuchsia_Gym"],
  "saffron-city": ["Saffron_Gym", "Silph_Co."],
  "lavender-town": ["Lavender_Town"],
  "cinnabar-island": ["Cinnabar_Gym"],

  // Gyms (standalone location_keys — same pages as parent city)
  "pewter-gym": ["Pewter_Gym"],
  "cerulean-gym": ["Cerulean_Gym"],
  "vermilion-gym": ["Vermilion_Gym"],
  "celadon-gym": ["Celadon_Gym"],
  "fuchsia-gym": ["Fuchsia_Gym"],
  "saffron-gym": ["Saffron_Gym"],
  "cinnabar-gym": ["Cinnabar_Gym"],
  "viridian-gym": ["Viridian_Gym"],

  // Plateau
  "indigo-plateau": ["Indigo_Plateau"],

  // ── Johto routes ──
  "route-29": ["Johto_Route_29"],
  "route-30": ["Johto_Route_30"],
  "route-31": ["Johto_Route_31"],
  "route-32": ["Johto_Route_32"],
  "route-33": ["Johto_Route_33"],
  "route-34": ["Johto_Route_34"],
  "route-35": ["Johto_Route_35"],
  "route-36": ["Johto_Route_36"],
  "route-37": ["Johto_Route_37"],
  "route-38": ["Johto_Route_38"],
  "route-39": ["Johto_Route_39"],
  "route-40": ["Johto_Route_40"],
  "route-41": ["Johto_Route_41"],
  "route-42": ["Johto_Route_42"],
  "route-43": ["Johto_Route_43"],
  "route-44": ["Johto_Route_44"],
  "route-45": ["Johto_Route_45"],
  "route-46": ["Johto_Route_46"],
  "route-26": ["Kanto_Route_26"],
  "route-27": ["Kanto_Route_27"],
  "route-28": ["Kanto_Route_28"],

  // ── Johto cities & towns ──
  "new-bark-town": ["New_Bark_Town"],
  "cherrygrove-city": ["Cherrygrove_City"],
  "violet-city": ["Violet_City", "Violet_Gym"],
  "azalea-town": ["Azalea_Town", "Azalea_Gym"],
  "goldenrod-city": ["Goldenrod_City", "Goldenrod_Gym", "Goldenrod_Radio_Tower"],
  "ecruteak-city": ["Ecruteak_City", "Ecruteak_Gym"],
  "olivine-city": ["Olivine_City", "Olivine_Gym"],
  "cianwood-city": ["Cianwood_City", "Cianwood_Gym"],
  "mahogany-town": ["Mahogany_Town", "Mahogany_Gym", "Team_Rocket_HQ"],
  "blackthorn-city": ["Blackthorn_City", "Blackthorn_Gym"],
  "lake-of-rage": ["Lake_of_Rage"],

  // ── Johto dungeons & landmarks ──
  "sprout-tower": ["Sprout_Tower"],
  "slowpoke-well": ["Slowpoke_Well"],
  "union-cave": ["Union_Cave"],
  "ilex-forest": ["Ilex_Forest"],
  "national-park": ["National_Park"],
  "ruins-of-alph": ["Ruins_of_Alph"],
  "burned-tower": ["Burned_Tower"],
  "tin-tower": ["Bell_Tower"],
  "whirl-islands": ["Whirl_Islands"],
  "mt-mortar": ["Mt._Mortar"],
  "ice-path": ["Ice_Path"],
  "dark-cave": ["Dark_Cave"],
  "dragons-den": ["Dragon's_Den"],
  "tohjo-falls": ["Tohjo_Falls"],
  "victory-road-gsc": ["Victory_Road_(Kanto)"],
  "mt-silver": ["Mt._Silver"],
  "indigo-plateau-gsc": ["Indigo_Plateau"],
  "goldenrod-game-corner": ["Goldenrod_Game_Corner"],
};
