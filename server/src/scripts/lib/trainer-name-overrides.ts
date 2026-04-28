/**
 * Canonical names for pret trainer instances whose pret-internal name is
 * anonymous ("GRUNT@", "EXECUTIVE@", "SCIENTIST@"). Keyed by pret instance
 * identifier (e.g. "EXECUTIVEM_1"). Pret's asm files never store the
 * canonical names used by the fandom — they come from external sources
 * (Bulbapedia, guides). Mapping is based on party composition + known
 * encounter locations.
 *
 * Grunts are left anonymous; only the named Rockets are overridden.
 */
export const TRAINER_NAME_OVERRIDES: Record<string, string> = {
  // GSC keeps Rocket executives anonymous — Archer/Proton/Petrel/Ariana are
  // HG/SS retcons. Leaving this empty to match the GSC walkthrough we're
  // building. Add entries here keyed by pret instance id if you ever want to
  // surface the HG/SS names.
};
