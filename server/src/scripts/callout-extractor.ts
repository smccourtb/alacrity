export interface Callout {
  type: 'prerequisite' | 'warning' | 'tip' | 'choice';
  text: string;
}

// Abbreviations that should not end a sentence
const ABBREVS = ['Prof', 'Mt', 'St', 'Lt', 'Dr', 'Mr', 'Mrs', 'Ms', 'Jr', 'Sr', 'vs', 'etc'];
const ABBREV_PATTERN = new RegExp(`\\b(${ABBREVS.join('|')})\\.`, 'g');
const ABBREV_PLACEHOLDER = '\x00';

function splitSentences(prose: string): string[] {
  // Temporarily replace abbreviation periods to avoid splitting on them
  let text = prose.replace(ABBREV_PATTERN, (_, abbrev) => `${abbrev}${ABBREV_PLACEHOLDER}`);

  // Split on sentence-ending punctuation followed by whitespace + capital or end of string
  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/);

  return raw
    .map(s => s.replace(new RegExp(ABBREV_PLACEHOLDER, 'g'), '.').trim())
    .filter(s => s.length >= 10);
}

// HM move names
const HM_MOVES = ['Cut', 'Surf', 'Strength', 'Flash', 'Fly', 'Rock Smash', 'Waterfall', 'Whirlpool', 'Dive'];
const HM_PATTERN = new RegExp(`\\b(${HM_MOVES.join('|')})\\b`, 'i');
const REQUIREMENT_LANGUAGE = /\b(requires?|need|must have|can't without|cannot without|needed)\b/i;
const KEY_ITEMS = /\b(Silph Scope|Pok[eé] Flute|Poke Flute|Card Key|Bicycle|Coin Case|Devon Scope|Acro Bike|Mach Bike|Good Rod|Super Rod|Old Rod|HM\d+|TM\d+)\b/i;
const ACCESSIBILITY = /\bonly (accessible|available|reachable|obtainable)\s+(after|with|once|when)\b/i;

const PREREQUISITE_PATTERNS = [
  (s: string) => HM_PATTERN.test(s) && REQUIREMENT_LANGUAGE.test(s),
  (s: string) => KEY_ITEMS.test(s) && REQUIREMENT_LANGUAGE.test(s),
  (s: string) => ACCESSIBILITY.test(s),
];

// Warning patterns
const RIVAL_BATTLE = /\b(rival|your rival)\b/i;
const GYM_LEADER = /\bgym leader\b/i;
const ELITE_FOUR = /\belite four\b/i;
const BOSS_NAMES = /\b(Giovanni|Maxie|Archie|Cyrus|Ghetsis|Lysandre|Lusamine|Necrozma|Team Rocket|Team Magma|Team Aqua|Team Galactic|Team Plasma|Team Flare)\b/i;
const BATTLE_LANGUAGE = /\b(battle|fight|fight you|challenge|defeat|face|against)\b/i;
const SAVE_BEFORE = /\bsave (before|first)\b/i;
const NO_RETURN = /\b(point of no return|cannot return|can't return|missable|one-time only|no going back)\b/i;

const WARNING_PATTERNS = [
  (s: string) => RIVAL_BATTLE.test(s) && BATTLE_LANGUAGE.test(s),
  (s: string) => GYM_LEADER.test(s),
  (s: string) => ELITE_FOUR.test(s),
  (s: string) => BOSS_NAMES.test(s) && BATTLE_LANGUAGE.test(s),
  (s: string) => SAVE_BEFORE.test(s),
  (s: string) => NO_RETURN.test(s),
];

// Tip patterns
const HIDDEN_ITEM = /\bhidden (item|machine|TM|HM)\b/i;
const INVISIBLE_ITEM = /\binvisible (item|ball|candy|machine|TM|HM)\b/i;
const DONT_MISS = /\b(don't miss|do not miss|easily missed|easy to miss)\b/i;
const RARE_ITEM = /\b(Rare Candy|rare item|rare [Pp]ok[eé]mon)\b/i;
const SECRET_PATH = /\b(secret (path|entrance|passage|door)|hidden (path|entrance|passage))\b/i;

const TIP_PATTERNS = [
  (s: string) => HIDDEN_ITEM.test(s),
  (s: string) => INVISIBLE_ITEM.test(s),
  (s: string) => DONT_MISS.test(s),
  (s: string) => RARE_ITEM.test(s),
  (s: string) => SECRET_PATH.test(s),
];

// Choice patterns
const CHOOSE_ONE = /\bchoose (one|between|from)\b/i;
const PICK_ONE = /\bpick (one|between)\b/i;
const EITHER_OR = /\beither\b.{1,60}\bor\b/i;
const STARTER_POKEMON = /\b(Bulbasaur|Charmander|Squirtle|Chikorita|Cyndaquil|Totodile|Treecko|Torchic|Mudkip|Turtwig|Chimchar|Piplup|Snivy|Tepig|Oshawott|Chespin|Fennekin|Froakie|Rowlet|Litten|Popplio)\b/i;
const FOSSIL_POKEMON = /\b(Dome Fossil|Helix Fossil|Old Amber|Kabuto|Omanyte|Aerodactyl|Root Fossil|Claw Fossil|Skull Fossil|Armor Fossil|Cover Fossil|Plume Fossil|Jaw Fossil|Sail Fossil)\b/i;
const STARTER_CHOICE = /\b(starter|fossil|gift)\b/i;
const CHOOSE_SELECT = /\b(choose|select|pick)\b/i;

const CHOICE_PATTERNS = [
  (s: string) => CHOOSE_ONE.test(s),
  (s: string) => PICK_ONE.test(s),
  (s: string) => EITHER_OR.test(s),
  (s: string) => STARTER_POKEMON.test(s) && CHOOSE_SELECT.test(s),
  (s: string) => FOSSIL_POKEMON.test(s) && CHOOSE_SELECT.test(s),
  (s: string) => STARTER_CHOICE.test(s) && CHOOSE_SELECT.test(s),
];

function matchesAny(sentence: string, patterns: Array<(s: string) => boolean>): boolean {
  return patterns.some(p => p(sentence));
}

export function extractCallouts(prose: string): Callout[] {
  const sentences = splitSentences(prose);
  const seen = new Set<string>();
  const callouts: Callout[] = [];

  for (const sentence of sentences) {
    const text = sentence.slice(0, 200);

    // Dedup by normalized text
    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;

    let type: Callout['type'] | null = null;

    // Priority: prerequisite → warning → tip → choice
    if (matchesAny(sentence, PREREQUISITE_PATTERNS)) {
      type = 'prerequisite';
    } else if (matchesAny(sentence, WARNING_PATTERNS)) {
      type = 'warning';
    } else if (matchesAny(sentence, TIP_PATTERNS)) {
      type = 'tip';
    } else if (matchesAny(sentence, CHOICE_PATTERNS)) {
      type = 'choice';
    }

    if (type !== null) {
      seen.add(key);
      callouts.push({ type, text });
    }
  }

  return callouts;
}
