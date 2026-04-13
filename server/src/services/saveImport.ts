/**
 * saveImport — copy save files from an external source directory into
 * Alacrity's owned libraryDir/imported/, deduping by sha256, then call
 * syncSaves() to reconcile the new files into save_files / playthroughs /
 * collection_saves.
 *
 * Originals are never modified or moved. Removing a source from
 * config.importSources does NOT delete previously-imported files.
 */

import { existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { paths } from '../paths.js';
import { syncSaves } from './syncSaves.js';

const SAVE_EXTS = ['.sav', '.dat', '.srm', '.bak'];

export interface ImportResult {
  copied: number;
  skippedDuplicate: number;
  errors: { path: string; reason: string }[];
}

function walkDir(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full));
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (SAVE_EXTS.some(ext => lower.endsWith(ext))) {
        out.push(full);
      }
    }
  }
  return out;
}

function sha256OfFile(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Build an in-memory sha256 set for everything currently under
 * libraryDir/imported/. Used as the dedup index for a single import pass.
 */
function buildImportedHashIndex(): Set<string> {
  const importedDir = join(paths.libraryDir, 'imported');
  const set = new Set<string>();
  if (!existsSync(importedDir)) return set;
  for (const file of walkDir(importedDir)) {
    try {
      set.add(sha256OfFile(file));
    } catch {
      // unreadable file in our own library — skip it, will not block dedup
    }
  }
  return set;
}

export async function importSavesFromSource(srcDir: string): Promise<ImportResult> {
  if (!existsSync(srcDir)) {
    throw new Error(`Directory does not exist: ${srcDir}`);
  }
  let stat;
  try {
    stat = statSync(srcDir);
  } catch (err: any) {
    throw new Error(`Cannot read directory: ${srcDir} (${err.message})`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${srcDir}`);
  }

  const result: ImportResult = { copied: 0, skippedDuplicate: 0, errors: [] };

  const seenHashes = buildImportedHashIndex();

  let candidates: string[];
  try {
    candidates = walkDir(srcDir);
  } catch (err: any) {
    throw new Error(`Cannot read directory: ${srcDir} (${err.message})`);
  }

  const sourceLabel = basename(srcDir.replace(/\/+$/, '')) || 'source';
  const destRoot = join(paths.libraryDir, 'imported', sourceLabel);

  for (const src of candidates) {
    try {
      const hash = sha256OfFile(src);
      if (seenHashes.has(hash)) {
        result.skippedDuplicate++;
        continue;
      }

      const rel = relative(srcDir, src);
      const dest = join(destRoot, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);

      seenHashes.add(hash);
      result.copied++;
    } catch (err: any) {
      result.errors.push({ path: src, reason: err.message });
    }
  }

  // Reconcile only if we actually copied something, but always return the
  // result so the caller can show counts. syncSaves is sync but can be slow
  // on large libraries, so guard it.
  if (result.copied > 0) {
    try {
      syncSaves();
    } catch (err: any) {
      result.errors.push({ path: '<syncSaves>', reason: err.message });
    }
  }

  return result;
}
