/**
 * Pulls shop inventories for Gen 1/2 locations from Bulbapedia.
 * Writes a shops[] array onto each matched location in its region seed JSON.
 *
 *   bun run server/src/scripts/build-shop-seed.ts
 *
 * Best-effort parser: Bulbapedia uses inconsistent layouts across pages.
 * Locations where no shops are parsed are logged and skipped; those can
 * be filled in manually in the seed JSON.
 */
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const SEED_DIR = join(import.meta.dir, '../seeds/data');

interface ShopTarget {
  region: 'kanto' | 'johto';
  seedFile: string;
  location_key: string;
  page: string;
}

const SHOP_TARGETS: ShopTarget[] = [
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'viridian-city',             page: 'Viridian_City'             },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'pewter-city',               page: 'Pewter_City'               },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'cerulean-city',             page: 'Cerulean_City'             },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'vermilion-city',            page: 'Vermilion_City'            },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'lavender-town',             page: 'Lavender_Town'             },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'celadon-city',              page: 'Celadon_City'              },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'fuchsia-city',              page: 'Fuchsia_City'              },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'saffron-city',              page: 'Saffron_City'              },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'cinnabar-island',           page: 'Cinnabar_Island'           },
  { region: 'kanto', seedFile: 'kanto-gen1.json', location_key: 'indigo-plateau',            page: 'Indigo_Plateau'            },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'cherrygrove-city',          page: 'Cherrygrove_City'          },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'violet-city',               page: 'Violet_City'               },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'azalea-town',               page: 'Azalea_Town'               },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'goldenrod-city',            page: 'Goldenrod_City'            },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'goldenrod-game-corner',     page: 'Goldenrod_Game_Corner'     },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'ecruteak-city',             page: 'Ecruteak_City'             },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'olivine-city',              page: 'Olivine_City'              },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'cianwood-city',             page: 'Cianwood_City'             },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'mahogany-town',             page: 'Mahogany_Town'             },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'blackthorn-city',           page: 'Blackthorn_City'           },
  { region: 'johto', seedFile: 'johto-gen2.json', location_key: 'radio-tower',               page: 'Radio_Tower'               },
];

async function fetchWiki(page: string): Promise<string> {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&page=${encodeURIComponent(page)}&format=json&prop=wikitext`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${page}`);
  const json = await res.json() as any;
  return json?.parse?.wikitext?.['*'] ?? '';
}

/**
 * Parses Bulbapedia's `{{shop|...}}...{{shoprow|{{shopitem|ITEM|PRICE}}...}}...{{shopfooter}}`
 * layout. Only keeps shop blocks whose header matches one of the requested
 * generations (e.g., "Generation I", "Generation II").
 */
function parseShops(wikitext: string, games: string[], genFilter: RegExp): Array<{ shop_name: string; inventory: any[] }> {
  const shops: Array<{ shop_name: string; inventory: any[] }> = [];
  const shopHeaderRe = /\{\{shop\|([^}]+?)\}\}/gi;
  let h;
  while ((h = shopHeaderRe.exec(wikitext)) != null) {
    const headerArgs = h[1].trim();
    if (!genFilter.test(headerArgs)) continue;
    // Slice forward to the next shopfooter
    const start = h.index + h[0].length;
    const footerIdx = wikitext.indexOf('{{shopfooter', start);
    if (footerIdx < 0) continue;
    const body = wikitext.slice(start, footerIdx);
    const items: any[] = [];
    const itemRe = /\{\{shopitem\|([^|}]+)\|(\d+)/g;
    let im;
    while ((im = itemRe.exec(body)) != null) {
      const name = im[1].trim().replace(/\s*\(item\)$/i, '');
      items.push({ item_name: name, price: parseInt(im[2], 10), badge_gate: 0, games });
    }
    if (items.length === 0) continue;
    // Derive shop name: strip leading "Generation X" / "Generation Y (...)" from header
    const shopName = headerArgs
      .replace(/Generation\s+[IVX]+/i, '')
      .replace(/[()]/g, '')
      .replace(/^[\s\-–—]+/, '')
      .trim() || 'Poké Mart';
    shops.push({ shop_name: shopName, inventory: items });
  }
  return shops;
}

let failures = 0, totalShops = 0, totalItems = 0;

for (const target of SHOP_TARGETS) {
  try {
    console.log(`[shops] ${target.location_key} ← ${target.page}`);
    const wt = await fetchWiki(target.page);
    const games = target.region === 'kanto' ? ['red','blue','yellow'] : ['gold','silver','crystal'];
    const genFilter = target.region === 'kanto' ? /Generation\s+I\b/i : /Generation\s+II\b/i;
    const shops = parseShops(wt, games, genFilter);
    if (shops.length === 0) {
      console.log('  (no shops parsed — Bulbapedia layout may differ)');
      failures++;
      continue;
    }

    const seedPath = join(SEED_DIR, target.seedFile);
    const data = JSON.parse(await readFile(seedPath, 'utf-8'));
    if (!data.locations[target.location_key]) data.locations[target.location_key] = {};
    const existing: any[] = data.locations[target.location_key].shops ?? [];
    for (const s of shops) {
      const idx = existing.findIndex(e => e.shop_name === s.shop_name);
      if (idx >= 0) existing[idx] = { ...existing[idx], inventory: s.inventory };
      else existing.push(s);
    }
    data.locations[target.location_key].shops = existing;
    await writeFile(seedPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

    const itemCount = shops.reduce((n, s) => n + s.inventory.length, 0);
    totalShops += shops.length;
    totalItems += itemCount;
    console.log(`  ${shops.length} shops, ${itemCount} items`);
  } catch (err) {
    console.warn(`[shops] ${target.location_key} failed:`, (err as Error).message);
    failures++;
  }
}

console.log(`\n[shops] done — ${totalShops} shops, ${totalItems} items, ${failures} failures`);
