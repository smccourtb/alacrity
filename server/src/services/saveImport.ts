/**
 * saveImport — copy save files from an external source directory into
 * Alacrity's owned libraryDir/imported/, deduping by sha256, then call
 * syncSaves() to reconcile the new files into save_files / playthroughs /
 * collection_saves.
 *
 * Originals are never modified or moved. Removing a source from
 * config.importSources does NOT delete previously-imported files.
 *
 * Symlinks are rejected during the walk — we don't follow them, ever. This
 * prevents a source directory containing `evil.sav -> /etc/passwd` from
 * reading or copying unexpected content.
 */

import { createReadStream, lstatSync, readdirSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname, sep, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { paths } from '../paths.js';
import { syncSaves, type SyncSavesResult } from './syncSaves.js';

const SAVE_EXTS = ['.sav', '.dat', '.srm', '.bak'];

export interface ImportResult {
  copied: number;
  skippedDuplicate: number;
  errors: { path: string; reason: string }[];
}

/**
 * Recursively walk `dir`, returning absolute paths to files whose lowercased
 * name ends with one of SAVE_EXTS. Symlinks (files and directories) are
 * rejected via `lstat`. Permission errors on a subdirectory are caught and
 * the rest of the walk continues — the unreadable subtree is just skipped.
 */
function walkDir(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out; // unreadable directory — skip subtree, don't abort
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);

    // Reject symlinks outright via lstat — do not follow under any circumstances.
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isSymbolicLink()) continue;

    if (lst.isDirectory()) {
      out.push(...walkDir(full));
    } else if (lst.isFile()) {
      const lower = entry.name.toLowerCase();
      if (SAVE_EXTS.some(ext => lower.endsWith(ext))) {
        out.push(full);
      }
    }
  }
  return out;
}

/**
 * sha256 a file by streaming — bounded memory regardless of file size.
 */
async function sha256OfFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

/**
 * Build an in-memory sha256 set for everything currently under
 * libraryDir/imported/. Used as the dedup index for a single import pass.
 */
async function buildImportedHashIndex(): Promise<Set<string>> {
  const importedDir = join(paths.libraryDir, 'imported');
  const set = new Set<string>();
  try {
    statSync(importedDir);
  } catch {
    return set; // not created yet — no prior imports to dedup against
  }
  for (const file of walkDir(importedDir)) {
    try {
      set.add(await sha256OfFile(file));
    } catch {
      // unreadable file in our own library — skip it, will not block dedup
    }
  }
  return set;
}

/**
 * Derive a unique per-source directory name inside libraryDir/imported/.
 * Prefers the source's basename for readability, but appends a short hash
 * of the full absolute path so that two sources with the same basename
 * (e.g. /a/Checkpoint and /b/Checkpoint) don't collide.
 */
function sourceLabel(srcDir: string): string {
  const base = basename(srcDir.replace(/\/+$/, '')) || 'source';
  const tag = createHash('sha1').update(srcDir).digest('hex').slice(0, 8);
  return `${base}-${tag}`;
}

export async function importSavesFromSource(srcDir: string): Promise<ImportResult> {
  let stat;
  try {
    stat = statSync(srcDir);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${srcDir}`);
    }
    throw new Error(`Cannot read directory: ${srcDir} (${err.message})`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${srcDir}`);
  }

  const result: ImportResult = { copied: 0, skippedDuplicate: 0, errors: [] };

  const seenHashes = await buildImportedHashIndex();
  const candidates = walkDir(srcDir);

  const destRoot = join(paths.libraryDir, 'imported', sourceLabel(srcDir));
  const destRootAbsolute = resolve(destRoot);

  for (const src of candidates) {
    try {
      const hash = await sha256OfFile(src);
      if (seenHashes.has(hash)) {
        result.skippedDuplicate++;
        continue;
      }

      const rel = relative(srcDir, src);
      const dest = join(destRoot, rel);

      // Containment check: defensive against any future walkDir change that
      // could let an entry escape srcDir. dest must sit strictly under destRoot.
      const destAbsolute = resolve(dest);
      if (destAbsolute !== destRootAbsolute && !destAbsolute.startsWith(destRootAbsolute + sep)) {
        result.errors.push({ path: src, reason: 'refused: resolved path escapes destination' });
        continue;
      }

      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);

      seenHashes.add(hash);
      result.copied++;
    } catch (err: any) {
      result.errors.push({ path: src, reason: err.message });
    }
  }

  // Partial-success contract: if any files copied at all, we reconcile so
  // the user sees progress even when some files errored. The alternative
  // (reject the whole import if one file fails) would make large
  // network-mount imports fragile. Errors are returned alongside counts
  // so the caller can surface both.
  if (result.copied > 0) {
    try {
      const syncResult: SyncSavesResult = syncSaves();
      // Surface nested reconciler errors through our own ImportResult so
      // they don't get lost in console noise.
      for (const err of syncResult.reconcileErrors) {
        result.errors.push({ path: '<reconcile>', reason: err });
      }
    } catch (err: any) {
      result.errors.push({ path: '<syncSaves>', reason: err.message });
    }
  }

  return result;
}
