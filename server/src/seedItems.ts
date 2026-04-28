import type { Database } from 'bun:sqlite';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://pokeapi.co/api/v2/item';
const BATCH = 50;
const SPRITES_ROOT = join(import.meta.dir, '../../client/public/sprites/items');

const CATEGORY_MAP: Record<string, string> = {
  'standard-balls': 'standard-balls',
  'special-balls': 'standard-balls',
  'apricorn-balls': 'standard-balls',
  'medicine': 'medicine',
  'healing': 'medicine',
  'status-cures': 'medicine',
  'revival': 'medicine',
  'vitamins': 'medicine',
  'pp-recovery': 'medicine',
  'key-items': 'key-items',
  'plot-advancement': 'key-items',
  'gameplay': 'key-items',
  'event-items': 'key-items',
  'all-machines': 'machines',
  'all-mail': 'other',
  'stat-boosts': 'battle-items',
  'flutes': 'battle-items',
  'spelunking': 'battle-items',
};

function bucketCategory(pokeapiCategory: string, itemName: string): string {
  if (itemName.endsWith('-berry')) return 'berries';
  if (pokeapiCategory.endsWith('-berries') || pokeapiCategory === 'berries') return 'berries';
  return CATEGORY_MAP[pokeapiCategory] ?? 'other';
}

async function buildSpriteIndex(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  // Priority order: canonical subdir for each item kind wins.
  // Categories not listed fall through in alphabetical order after the priority list.
  const PRIORITY = [
    'ball', 'berry', 'apricorn',
    'medicine', 'key-item', 'evo-item', 'hold-item',
    'battle-item', 'tm', 'hm', 'tr',
    'mega-stone', 'z-crystals', 'plate', 'memory',
    'hm', 'flute', 'incense', 'mail', 'fossil', 'gem',
  ];
  let allSubdirs: string[];
  try {
    allSubdirs = (await readdir(SPRITES_ROOT, { withFileTypes: true }))
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort();
  } catch (err) {
    console.warn('[items] sprite index unavailable at', SPRITES_ROOT, err);
    return index;
  }
  const ordered = [
    ...PRIORITY.filter(p => allSubdirs.includes(p)),
    ...allSubdirs.filter(s => !PRIORITY.includes(s)),
  ];

  const SUFFIXED: Record<string, string> = {
    ball: '-ball',
    berry: '-berry',
    apricorn: '-apricorn',
  };

  for (const sub of ordered) {
    const dir = join(SPRITES_ROOT, sub);
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.endsWith('.png')) continue;
      const stem = f.slice(0, -4);
      const suffix = SUFFIXED[sub] ?? '';
      const pokeapiName = stem + suffix;
      const webPath = `/sprites/items/${sub}/${f}`;
      if (!index.has(pokeapiName)) index.set(pokeapiName, webPath);
    }
  }
  return index;
}

function parseRomanGen(name?: string): number | null {
  if (!name) return null;
  const m = name.match(/^generation-([ivx]+)$/);
  if (!m) return null;
  const roman = m[1];
  const table: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
  return table[roman] ?? null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function seedItems(db: Database) {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM items').get() as any).c;
  if (count > 0) {
    console.log(`[items] ${count} present, skipping seed`);
    return;
  }

  console.log('[items] seeding from PokeAPI');
  const spriteIndex = await buildSpriteIndex();
  console.log(`[items] ${spriteIndex.size} sprites indexed`);

  const list = await fetchJSON<{ results: { name: string; url: string }[] }>(`${API}?limit=2000`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO items (id, name, display_name, category, generation, sprite_path, short_effect, cost)
    VALUES ($id, $name, $display_name, $category, $generation, $sprite_path, $short_effect, $cost)
  `);

  let missing = 0;
  for (let i = 0; i < list.results.length; i += BATCH) {
    const batch = list.results.slice(i, i + BATCH);
    const details = await Promise.all(batch.map(r => fetchJSON<any>(r.url).catch(() => null)));
    const txn = db.transaction((rows: any[]) => {
      for (const d of rows) {
        if (!d) continue;
        const displayName = d.names?.find((n: any) => n.language.name === 'en')?.name ?? d.name;
        const effect = d.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect ?? null;
        const gen = parseRomanGen(d.generation?.name);
        const sprite = spriteIndex.get(d.name) ?? null;
        if (!sprite) missing++;
        insert.run({
          $id: d.id,
          $name: d.name,
          $display_name: displayName,
          $category: bucketCategory(d.category?.name ?? 'other', d.name),
          $generation: gen,
          $sprite_path: sprite,
          $short_effect: effect,
          $cost: d.cost ?? null,
        });
      }
    });
    txn(details);
    console.log(`[items] ${Math.min(i + BATCH, list.results.length)}/${list.results.length}`);
  }

  console.log(`[items] done (${missing} items without a bundled sprite)`);

  seedDecorationDolls(db);
}

// Gen-2 decorations aren't categorized as "items" by PokéAPI, so they never
// land in the items table from the main seed. Insert the ones Mom can buy
// using the Pokémon artwork as a stand-in sprite.
function seedDecorationDolls(db: Database): void {
  const rows = [
    { name: 'charmander-doll', display_name: 'Charmander Doll', sprite: '/sprites/pokemon/home/4.png' },
    { name: 'clefairy-doll', display_name: 'Clefairy Doll', sprite: '/sprites/pokemon/home/35.png' },
    { name: 'pikachu-doll', display_name: 'Pikachu Doll', sprite: '/sprites/pokemon/home/25.png' },
    { name: 'big-snorlax-doll', display_name: 'Big Snorlax Doll', sprite: '/sprites/pokemon/home/143.png' },
  ];
  const ins = db.prepare(`
    INSERT OR IGNORE INTO items (name, display_name, category, generation, sprite_path)
    VALUES (?, ?, 'decoration', 2, ?)
  `);
  for (const r of rows) ins.run(r.name, r.display_name, r.sprite);
}
