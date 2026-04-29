/**
 * Internal helper: downscale all PNGs in a directory to max NxN.
 *
 * Spawned as a separate process by scripts/fetch-sprites.ts so each batch of
 * sharp work runs against a fresh JavaScriptCore allocator. Bun has an
 * intermittent allocator panic (`pas_segregated_page_deallocate_with_page`)
 * after ~2-3k sharp iterations in a single process on macOS; isolating per
 * batch keeps the working set small enough to avoid the corruption window.
 *
 * Usage: bun run scripts/_resize-pngs.ts <dir> <maxSize>
 *
 * Idempotent: files already ≤ maxSize are skipped via metadata check, so
 * retries after a panicked partial run pick up only the remaining files.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
const maxSize = parseInt(process.argv[3] ?? '', 10);
if (!dir || !Number.isFinite(maxSize)) {
  console.error('usage: bun run scripts/_resize-pngs.ts <dir> <maxSize>');
  process.exit(2);
}

const entries = await readdir(dir);
let resized = 0;
let skipped = 0;
for (const name of entries) {
  if (!name.endsWith('.png')) continue;
  const p = join(dir, name);
  const buf = await readFile(p);
  const meta = await sharp(buf).metadata();
  if ((meta.width ?? 0) <= maxSize) { skipped++; continue; }
  await sharp(buf).resize(maxSize, maxSize, { fit: 'inside' }).toFile(p);
  resized++;
}
console.log(`[resize] ${dir}: resized=${resized} skipped=${skipped}`);
