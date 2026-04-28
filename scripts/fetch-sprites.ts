/**
 * Populates client/public/sprites/ with bundled assets.
 * Idempotent: safe to re-run; skips unchanged files.
 *
 * Sources:
 *   - PokeAPI/sprites (MIT): front sprites (per-game + HOME + official-artwork + dream-world)
 *   - msikma/pokesprite (MIT): box icons + item sprites
 *
 * Run: bun run fetch-sprites
 */
import { mkdir, cp, readdir, copyFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { $ } from 'bun';
import sharp from 'sharp';

const ROOT = join(import.meta.dir, '..');
const OUT = join(ROOT, 'client/public/sprites');
const TMP = join(ROOT, '.sprite-cache');
const POKEAPI = join(TMP, 'pokeapi-sprites');
const PKSPRITE = join(TMP, 'pokesprite');

async function ensureRepo(url: string, dest: string, sparsePaths?: string[]) {
  if (existsSync(dest)) {
    console.log(`[fetch] ${basename(dest)} present, pulling latest`);
    await $`git -C ${dest} pull`.quiet();
    return;
  }
  console.log(`[fetch] cloning ${url}`);
  await mkdir(TMP, { recursive: true });
  if (sparsePaths && sparsePaths.length) {
    await $`git clone --depth=1 --filter=blob:none --sparse ${url} ${dest}`.quiet();
    await $`git -C ${dest} sparse-checkout set ${sparsePaths}`.quiet();
  } else {
    await $`git clone --depth=1 ${url} ${dest}`.quiet();
  }
}

async function copyDir(src: string, dst: string) {
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true, force: false });
}

async function copyVersionsNoBack(src: string, dst: string) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'back') continue;
    const srcP = join(src, e.name);
    const dstP = join(dst, e.name);
    if (e.isDirectory()) {
      await copyVersionsNoBack(srcP, dstP);
    } else {
      await copyFile(srcP, dstP);
    }
  }
}

async function copyFilteredFlat(srcDir: string, dstDir: string, predicate: (name: string) => boolean) {
  await mkdir(dstDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!predicate(e.name)) continue;
    await copyFile(join(srcDir, e.name), join(dstDir, e.name));
  }
}

async function downscalePngs(dir: string, maxSize: number) {
  const entries = await readdir(dir);
  for (const name of entries) {
    if (!name.endsWith('.png')) continue;
    const p = join(dir, name);
    const buf = await readFile(p);
    const meta = await sharp(buf).metadata();
    if ((meta.width ?? 0) <= maxSize) continue;
    await sharp(buf).resize(maxSize, maxSize, { fit: 'inside' }).toFile(p);
  }
}

async function copyPokeAPI() {
  const src = join(POKEAPI, 'sprites/pokemon');
  const dst = join(OUT, 'pokemon');

  await copyVersionsNoBack(join(src, 'versions'), join(dst, 'versions'));

  await mkdir(join(dst, 'home'), { recursive: true });
  await mkdir(join(dst, 'home/shiny'), { recursive: true });
  await copyFilteredFlat(join(src, 'other/home'), join(dst, 'home'), n => /^\d+\.png$/.test(n));
  await copyFilteredFlat(join(src, 'other/home/shiny'), join(dst, 'home/shiny'), n => /^\d+\.png$/.test(n));
  await downscalePngs(join(dst, 'home'), 200);
  await downscalePngs(join(dst, 'home/shiny'), 200);

  const artDst = join(dst, 'official-artwork');
  await copyFilteredFlat(join(src, 'other/official-artwork'), artDst, n => /^\d+\.png$/.test(n));
  await downscalePngs(artDst, 200);

  await copyFilteredFlat(join(src, 'other/dream-world'), join(dst, 'dream-world'), n => /^\d+\.svg$/.test(n));
}

async function copyPokeSprite() {
  const src = PKSPRITE;

  const manifest = JSON.parse(await readFile(join(src, 'data/pokemon.json'), 'utf-8')) as Record<string, any>;
  const slugToId = new Map<string, string>();
  for (const [id, entry] of Object.entries(manifest)) {
    const slug = entry?.slug?.eng;
    // Manifest keys are zero-padded (e.g. "025"); strip padding so the output
    // filename matches Sprite.tsx's `/sprites/pokemon/box/${id}.png` (unpadded).
    const numeric = String(parseInt(id, 10));
    if (typeof slug === 'string') slugToId.set(slug, numeric);
  }
  await mkdir(join(OUT, 'pokemon/box'), { recursive: true });
  await mkdir(join(OUT, 'pokemon/box/shiny'), { recursive: true });
  for (const variant of ['regular', 'shiny'] as const) {
    const srcDir = join(src, 'pokemon-gen8', variant);
    const dstDir = variant === 'regular' ? join(OUT, 'pokemon/box') : join(OUT, 'pokemon/box/shiny');
    const files = await readdir(srcDir);
    for (const f of files) {
      if (!f.endsWith('.png')) continue;
      const slug = f.slice(0, -4);
      const id = slugToId.get(slug);
      if (!id) continue;
      await copyFile(join(srcDir, f), join(dstDir, `${id}.png`));
    }
  }

  const itemsRoot = join(src, 'items');
  await mkdir(join(OUT, 'items'), { recursive: true });
  await cp(itemsRoot, join(OUT, 'items'), { recursive: true, force: false });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await ensureRepo('https://github.com/PokeAPI/sprites.git', POKEAPI, [
    'sprites/pokemon/versions',
    'sprites/pokemon/other/home',
    'sprites/pokemon/other/official-artwork',
    'sprites/pokemon/other/dream-world',
  ]);
  await ensureRepo('https://github.com/msikma/pokesprite.git', PKSPRITE, [
    'pokemon-gen8',
    'items',
    'data',
  ]);
  await copyPokeAPI();
  await copyPokeSprite();
  console.log('[fetch] done. Output:', OUT);
}

main().catch(err => { console.error(err); process.exit(1); });
