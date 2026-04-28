/**
 * Merges parsed data into existing seed JSON files without clobbering
 * user-edited fields. User-editable fields (description, position, icon)
 * on existing entries are preserved across re-runs of the import.
 */
import { readFile, writeFile } from 'node:fs/promises';

const USER_FIELDS = new Set(['description', 'x', 'y', 'sprite_kind', 'sprite_ref']);

export async function mergeIntoRegionSeed(
  seedPath: string,
  locationKey: string,
  arrayKey: 'trainers' | 'items' | 'tms' | 'events' | 'shops',
  newEntries: any[],
  matcher: (seed: any, incoming: any) => boolean,
): Promise<void> {
  const raw = await readFile(seedPath, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.locations) data.locations = {};
  if (!data.locations[locationKey]) {
    data.locations[locationKey] = { items: [], trainers: [], tms: [], events: [], shops: [] };
  }
  const loc = data.locations[locationKey];
  if (!Array.isArray(loc[arrayKey])) loc[arrayKey] = [];
  const arr: any[] = loc[arrayKey];

  for (const incoming of newEntries) {
    const existing = arr.find(e => matcher(e, incoming));
    if (existing) {
      for (const k of Object.keys(incoming)) {
        if (!USER_FIELDS.has(k)) existing[k] = incoming[k];
      }
    } else {
      arr.push(incoming);
    }
  }

  await writeFile(seedPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}
