/**
 * Refreshes Gen 1 + Gen 2 guide data from pret into the seed JSON files.
 * Safe to re-run. Preserves user-edited fields (descriptions, positions,
 * icons) via mergeIntoRegionSeed's USER_FIELDS set.
 *
 * Collects parsed data across all pret repos targeting the same seed file
 * first, unioning the `games` list per identity, then does a single merge
 * pass per location_key. This prevents the last-write-wins clobber that
 * would drop gold/silver coverage when crystal is processed last.
 *
 *   bun run server/src/scripts/reseed-guide.ts
 */
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { ensurePretRepo } from './lib/pret-fetch.js';
import { parseTrainersFromPret } from './lib/pret-trainer-parser.js';
import { parseItemsFromPret } from './lib/pret-item-parser.js';
import { parseShopsFromPret, type ParsedShop } from './lib/pret-shop-parser.js';
import { mergeIntoRegionSeed } from './lib/seed-merge.js';
import { TRAINER_NAME_OVERRIDES } from './lib/trainer-name-overrides.js';

const SEED_DIR = join(import.meta.dir, '../seeds/data');
const MAPPING = JSON.parse(await readFile(join(SEED_DIR, 'pret-location-mapping.json'), 'utf-8'));

interface Target {
  pretName: 'pokered' | 'pokeyellow' | 'pokegold' | 'pokecrystal';
  seedFile: string;
  games: string[];
}

const TARGETS: Target[] = [
  { pretName: 'pokered',     seedFile: 'kanto-gen1.json', games: ['red','blue'] },
  { pretName: 'pokeyellow',  seedFile: 'kanto-gen1.json', games: ['yellow'] },
  { pretName: 'pokegold',    seedFile: 'johto-gen2.json', games: ['gold','silver'] },
  { pretName: 'pokecrystal', seedFile: 'johto-gen2.json', games: ['crystal'] },
];

function titleCase(upperSnake: string): string {
  return upperSnake
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// Pretty-print pret class names, collapsing the M/F suffix into a friendlier
// label. GRUNTM → "Team Rocket Grunt", GRUNTF → "Team Rocket Grunt",
// EXECUTIVEM → "Team Rocket Executive", EXECUTIVEF → "Team Rocket Executive".
const CLASS_OVERRIDES: Record<string, string> = {
  GRUNTM: 'Team Rocket Grunt',
  GRUNTF: 'Team Rocket Grunt',
  EXECUTIVEM: 'Team Rocket Executive',
  EXECUTIVEF: 'Team Rocket Executive',
};
function prettyClass(c: string): string {
  return CLASS_OVERRIDES[c] ?? titleCase(c);
}

function unionGames(a: string[], b: string[]): string[] {
  const set = new Set([...a, ...b]);
  const order = ['red','blue','yellow','gold','silver','crystal'];
  return order.filter(g => set.has(g)).concat([...set].filter(g => !order.includes(g)));
}

interface TrainerEntry {
  trainer_class: string;
  trainer_name: string;
  party: Array<{ species: string; level: number }>;
  games: string[];
}
interface ItemEntry {
  item_name: string;
  method: 'field' | 'hidden' | 'ground' | 'gift';
  tm_number?: number | null;
  move_name?: string;
  games: string[];
}
interface ShopEntry {
  shop_name: string;
  mart_type: ParsedShop['mart_type'];
  inventory: Array<{ item_name: string; price?: number; games?: string[] }>;
  games: string[];
}

// seedFile → location_key → { trainers, items, tms, shops }
type PerFile = Map<string, Map<string, { trainers: TrainerEntry[]; items: ItemEntry[]; tms: ItemEntry[]; shops: ShopEntry[] }>>;
const buckets: PerFile = new Map();

function bucketFor(seedFile: string, locationKey: string) {
  let byFile = buckets.get(seedFile);
  if (!byFile) { byFile = new Map(); buckets.set(seedFile, byFile); }
  let entry = byFile.get(locationKey);
  if (!entry) { entry = { trainers: [], items: [], tms: [], shops: [] }; byFile.set(locationKey, entry); }
  return entry;
}

let totalUnmapped = 0;

for (const t of TARGETS) {
  console.log(`\n[parse] ${t.pretName}`);
  const root = await ensurePretRepo(t.pretName);
  const trainers = await parseTrainersFromPret(root);
  const items = await parseItemsFromPret(root);
  const shops = await parseShopsFromPret(root);
  const mapping = MAPPING[t.pretName] ?? {};

  let tCount = 0, iCount = 0, tmCount = 0, sCount = 0, unmapped = 0;

  for (const tr of trainers) {
    const hit = mapping[tr.map_name];
    if (!hit) { unmapped++; continue; }
    const bucket = bucketFor(t.seedFile, hit.location_key);
    const tc = prettyClass(tr.trainer_class);
    // Canonical override (e.g. HG/SS Rocket-exec names) keyed by pret instance
    // — pret's anonymous "EXECUTIVE@" / "GRUNT@" db-strings can't identify
    // anyone. Without an override, any class collapsed by CLASS_OVERRIDES
    // (GRUNTM/F, EXECUTIVEM/F) must be tagged M/F so that e.g. GRUNTM_1 and
    // GRUNTF_1 don't dedupe into the same row.
    let tn = TRAINER_NAME_OVERRIDES[tr.instance] ?? titleCase(tr.trainer_name);
    if (!TRAINER_NAME_OVERRIDES[tr.instance] && /^(GRUNT|EXECUTIVE)[MF]$/.test(tr.trainer_class)) {
      const letter = tr.trainer_class.endsWith('M') ? 'M' : 'F';
      tn = tn.replace(/^(Grunt|Executive)/, `$1 ${letter}`);
    }
    const existing = bucket.trainers.find(e => e.trainer_class === tc && e.trainer_name === tn);
    if (existing) {
      existing.games = unionGames(existing.games, t.games);
    } else {
      bucket.trainers.push({ trainer_class: tc, trainer_name: tn, party: tr.party, games: [...t.games] });
    }
    tCount++;
  }

  for (const it of items) {
    const hit = mapping[it.map_name];
    if (!hit) { unmapped++; continue; }
    const bucket = bucketFor(t.seedFile, hit.location_key);
    if (it.method === 'tm') {
      const existing = bucket.tms.find(e => e.item_name === it.display_name);
      if (existing) existing.games = unionGames(existing.games, t.games);
      else bucket.tms.push({
        tm_number: it.tm_number,
        move_name: it.display_name.replace(/^(Tm|Hm)\s*/i, ''),
        item_name: it.display_name,
        method: 'ground',
        games: [...t.games],
      });
      tmCount++;
    } else {
      // 'visible' is a legacy label from the gen2 export; treat it as 'field'
      // — same concept, one canonical method name.
      const method: ItemEntry['method'] = it.method === 'hidden' ? 'hidden'
        : it.method === 'gift' ? 'gift'
        : 'field';
      const existing = bucket.items.find(e => e.item_name === it.display_name && e.method === method);
      if (existing) existing.games = unionGames(existing.games, t.games);
      else bucket.items.push({ item_name: it.display_name, method, games: [...t.games] });
      iCount++;
    }
  }

  for (const sh of shops) {
    const hit = mapping[sh.map_name];
    if (!hit) { unmapped++; continue; }
    const bucket = bucketFor(t.seedFile, hit.location_key);
    const existing = bucket.shops.find(e => e.shop_name === sh.shop_name);
    const inv = sh.items.map(i => ({
      item_name: titleCase(i.item_name),
      price: i.price,
      games: [...t.games],
    }));
    if (existing) {
      existing.games = unionGames(existing.games, t.games);
      // Merge inventory: union by item_name, expanding per-game coverage.
      for (const ni of inv) {
        const ex = existing.inventory.find(x => x.item_name === ni.item_name && (x.price ?? null) === (ni.price ?? null));
        if (ex) ex.games = unionGames(ex.games ?? [], t.games);
        else existing.inventory.push(ni);
      }
    } else {
      bucket.shops.push({
        shop_name: sh.shop_name,
        mart_type: sh.mart_type,
        inventory: inv,
        games: [...t.games],
      });
    }
    sCount++;
  }

  console.log(`[parse]   trainers: ${tCount}, items: ${iCount}, tms: ${tmCount}, shops: ${sCount}, unmapped: ${unmapped}`);
  totalUnmapped += unmapped;
}

console.log(`\n[merge] writing to seed files...`);
for (const [seedFile, byLoc] of buckets) {
  const seedPath = join(SEED_DIR, seedFile);
  let locCount = 0;
  for (const [locationKey, entries] of byLoc) {
    if (entries.trainers.length) {
      await mergeIntoRegionSeed(seedPath, locationKey, 'trainers', entries.trainers,
        (a, b) => a.trainer_class === b.trainer_class && a.trainer_name === b.trainer_name);
    }
    if (entries.items.length) {
      await mergeIntoRegionSeed(seedPath, locationKey, 'items', entries.items,
        (a, b) => a.item_name === b.item_name && a.method === b.method);
    }
    if (entries.tms.length) {
      await mergeIntoRegionSeed(seedPath, locationKey, 'tms', entries.tms,
        (a, b) => (a.tm_number != null && a.tm_number === b.tm_number) || a.item_name === b.item_name);
    }
    if (entries.shops.length) {
      await mergeIntoRegionSeed(seedPath, locationKey, 'shops', entries.shops,
        (a, b) => a.shop_name === b.shop_name);
    }
    locCount++;
  }
  console.log(`[merge] ${seedFile}: ${locCount} locations updated`);
}

console.log(`\n[reseed] done (${totalUnmapped} unmapped pret refs skipped). Restart the server to pick up the new data.`);

// Note: flag_index linkage is a separate post-seed pass. The seed only writes
// the JSON files; the DB needs to be re-seeded from those JSONs (server boot
// or manual seed run), then `link-flags-to-markers.ts` populates flag_index
// against the live DB rows. Run that after the server has reseeded.
console.log(`[reseed] next step: restart server (auto-seeds), then:`);
console.log(`         bun run server/src/scripts/link-flags-to-markers.ts`);
