/**
 * Clones/updates pret repos into .data-cache/pret-<name>/ for import scripts.
 * Uses shell git via Bun's $ utility to avoid native-binding crashes.
 */
import { $ } from 'bun';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_ROOT = join(import.meta.dir, '../../../../.data-cache');

export async function ensurePretRepo(name: 'pokered' | 'pokeyellow' | 'pokegold' | 'pokecrystal'): Promise<string> {
  await mkdir(CACHE_ROOT, { recursive: true });
  const dest = join(CACHE_ROOT, `pret-${name}`);
  if (existsSync(dest)) {
    console.log(`[pret] ${name} present, pulling latest`);
    await $`git -C ${dest} pull`.quiet();
    return dest;
  }
  console.log(`[pret] cloning pret/${name}`);
  await $`git clone --depth=1 https://github.com/pret/${name}.git ${dest}`.quiet();
  return dest;
}
