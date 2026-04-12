/**
 * One-time migration script — restructures saves/ directories.
 *
 * Run with:
 *   cd server && npx tsx src/scripts/migrateDirectories.ts
 *
 * Steps:
 *  1. Flatten library/3ds/ and library/pc/ into library/{game}/
 *  2. Import unique checkpoint saves into library/
 *  3. Rename checkpoint/ to backups/
 *  4. Restructure catches/ flat files into catches/{game}/{folder}/
 *  5. Deduplicate by SHA-256 checksum throughout
 *  6. Clean up old platform dirs (library/3ds/, library/pc/)
 */

import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'fs';
import { join, basename, extname, dirname } from 'path';
import { createHash } from 'crypto';
import { detectGame } from '../services/saveParser.js';

const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const SAVES_DIR = join(PROJECT_ROOT, 'saves');
const LIBRARY_DIR = join(SAVES_DIR, 'library');
const CHECKPOINT_DIR = join(SAVES_DIR, 'checkpoint');
const BACKUPS_DIR = join(SAVES_DIR, 'backups');
const CATCHES_DIR = join(SAVES_DIR, 'catches');

// ---------------------------------------------------------------------------
// Checksum deduplication
// ---------------------------------------------------------------------------

function fileChecksum(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const seenChecksums = new Map<string, string>(); // checksum → first dest path
let duplicatesSkipped = 0;
let filesCopied = 0;

/**
 * Copy src to dest if no byte-identical file has been seen before.
 * Returns true if the file was copied, false if it was a duplicate.
 */
function copyUnique(src: string, dest: string): boolean {
  let cs: string;
  try {
    cs = fileChecksum(src);
  } catch (e: any) {
    console.log(`  WARN: cannot read ${src}: ${e.message}`);
    return false;
  }

  if (seenChecksums.has(cs)) {
    console.log(`  SKIP duplicate: ${basename(src)} (same as ${seenChecksums.get(cs)})`);
    duplicatesSkipped++;
    return false;
  }

  mkdirSync(dirname(dest), { recursive: true });

  if (existsSync(dest)) {
    // Dest already exists — track it and consider it handled
    seenChecksums.set(cs, dest);
    console.log(`  SKIP already exists: ${dest}`);
    return false;
  }

  copyFileSync(src, dest);
  seenChecksums.set(cs, dest);
  filesCopied++;
  console.log(`  COPY: ${src} → ${dest}`);
  return true;
}

// ---------------------------------------------------------------------------
// Step 1: Flatten library/3ds/ and library/pc/ into library/{game}/
// ---------------------------------------------------------------------------

function flattenLibrary(): void {
  console.log('\n=== Step 1: Flatten library/3ds/ and library/pc/ ===');

  for (const platform of ['3ds', 'pc']) {
    const platformDir = join(LIBRARY_DIR, platform);
    if (!existsSync(platformDir)) {
      console.log(`  Skipping ${platform} — directory does not exist`);
      continue;
    }

    let gameDirs: string[];
    try {
      gameDirs = readdirSync(platformDir);
    } catch (e: any) {
      console.log(`  WARN: cannot read ${platformDir}: ${e.message}`);
      continue;
    }

    for (const gameDir of gameDirs) {
      const gamePath = join(platformDir, gameDir);
      let gstat: ReturnType<typeof statSync>;
      try {
        gstat = statSync(gamePath);
      } catch {
        continue;
      }
      if (!gstat.isDirectory()) continue;

      const detected = detectGame(gameDir);
      if (!detected) {
        console.log(`  WARN: cannot detect game for dir "${gameDir}" — skipping`);
        continue;
      }

      const destGameDir = join(LIBRARY_DIR, detected.game);
      console.log(`  Processing ${platform}/${gameDir} → library/${detected.game}/`);

      let entries: string[];
      try {
        entries = readdirSync(gamePath);
      } catch (e: any) {
        console.log(`  WARN: cannot read ${gamePath}: ${e.message}`);
        continue;
      }

      for (const entry of entries) {
        const entryPath = join(gamePath, entry);
        let estat: ReturnType<typeof statSync>;
        try {
          estat = statSync(entryPath);
        } catch {
          continue;
        }

        if (estat.isDirectory()) {
          // Structured backup dir: copy its contents recursively
          copyDirContents(entryPath, join(destGameDir, entry));
        } else {
          // Flat file — copy directly
          const ext = extname(entry).toLowerCase();
          if (!['.sav', '.dat', '.ss1', '.sgm'].includes(ext) && entry !== 'main') {
            continue;
          }
          copyUnique(entryPath, join(destGameDir, entry));
        }
      }
    }
  }
}

/**
 * Recursively copy all files from srcDir into destDir,
 * preserving subdirectory structure. Applies deduplication.
 */
function copyDirContents(srcDir: string, destDir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(srcDir);
  } catch (e: any) {
    console.log(`  WARN: cannot read ${srcDir}: ${e.message}`);
    return;
  }

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    let estat: ReturnType<typeof statSync>;
    try {
      estat = statSync(srcPath);
    } catch {
      continue;
    }

    if (estat.isDirectory()) {
      copyDirContents(srcPath, join(destDir, entry));
    } else {
      copyUnique(srcPath, join(destDir, entry));
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: Import unique checkpoint saves into library/
// ---------------------------------------------------------------------------

function importCheckpoints(): void {
  console.log('\n=== Step 2: Import checkpoint saves into library/ ===');

  if (!existsSync(CHECKPOINT_DIR)) {
    console.log('  Skipping — checkpoint/ does not exist');
    return;
  }

  let titleDirs: string[];
  try {
    titleDirs = readdirSync(CHECKPOINT_DIR);
  } catch (e: any) {
    console.log(`  WARN: cannot read ${CHECKPOINT_DIR}: ${e.message}`);
    return;
  }

  for (const titleDir of titleDirs) {
    const titlePath = join(CHECKPOINT_DIR, titleDir);
    let tstat: ReturnType<typeof statSync>;
    try {
      tstat = statSync(titlePath);
    } catch {
      continue;
    }
    if (!tstat.isDirectory()) continue;

    const detected = detectGame(titleDir);
    if (!detected) {
      console.log(`  WARN: cannot detect game for checkpoint dir "${titleDir}" — skipping`);
      continue;
    }

    let backups: string[];
    try {
      backups = readdirSync(titlePath);
    } catch (e: any) {
      console.log(`  WARN: cannot read ${titlePath}: ${e.message}`);
      continue;
    }

    for (const backup of backups) {
      const backupPath = join(titlePath, backup);
      let bstat: ReturnType<typeof statSync>;
      try {
        bstat = statSync(backupPath);
      } catch {
        continue;
      }
      if (!bstat.isDirectory()) continue;

      // Checkpoint saves use sav.dat (Gen 1/2/3) or main (DS/3DS)
      const savFile = (['sav.dat', 'main'] as const).find(f =>
        existsSync(join(backupPath, f)),
      );

      if (!savFile) {
        console.log(`  SKIP: ${titleDir}/${backup} — no sav.dat or main found`);
        continue;
      }

      const srcPath = join(backupPath, savFile);

      if (savFile === 'sav.dat') {
        // Convert to {label}.sav flat file
        const destPath = join(LIBRARY_DIR, detected.game, `${backup}.sav`);
        console.log(`  Checkpoint ${titleDir}/${backup}/sav.dat → library/${detected.game}/${backup}.sav`);
        copyUnique(srcPath, destPath);
      } else {
        // main — preserve directory structure: {game}/{label}/main
        const destPath = join(LIBRARY_DIR, detected.game, backup, 'main');
        console.log(`  Checkpoint ${titleDir}/${backup}/main → library/${detected.game}/${backup}/main`);
        copyUnique(srcPath, destPath);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 3: Rename checkpoint/ to backups/
// ---------------------------------------------------------------------------

function renameCheckpointToBackups(): void {
  console.log('\n=== Step 3: Rename checkpoint/ to backups/ ===');

  if (!existsSync(CHECKPOINT_DIR)) {
    console.log('  Skipping — checkpoint/ does not exist');
    return;
  }

  if (existsSync(BACKUPS_DIR)) {
    const entries = readdirSync(BACKUPS_DIR);
    if (entries.length > 0) {
      console.log(`  WARN: backups/ already exists and is non-empty (${entries.length} entries) — skipping rename`);
      return;
    }
    // backups/ exists but is empty — remove it so rename can proceed
    rmSync(BACKUPS_DIR, { recursive: true, force: true });
  }

  renameSync(CHECKPOINT_DIR, BACKUPS_DIR);
  console.log(`  Renamed: checkpoint/ → backups/`);
}

// ---------------------------------------------------------------------------
// Step 4: Restructure catches/ flat files into catches/{game}/{folder}/
// ---------------------------------------------------------------------------

/**
 * Parse the game name from a catches filename like:
 *   Crystal_Charmander_hunt3_A14_D10_Sp10_Sc10.sav
 * The game name is the first underscore-delimited segment. We then run
 * detectGame() on it to canonicalize it.
 */
function extractGameFromCatchFilename(filename: string): string | null {
  // Strip extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const firstSegment = nameWithoutExt.split('_')[0];
  const detected = detectGame(firstSegment);
  return detected?.game ?? null;
}

/**
 * Build a folder name from a catches filename by stripping the leading
 * game prefix:
 *   Crystal_Charmander_hunt3_A14_D10_Sp10_Sc10.sav → Charmander_hunt3_A14_D10_Sp10_Sc10
 */
function buildCatchFolderName(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split('_');
  // Drop first segment (game name)
  return parts.slice(1).join('_');
}

function restructureCatches(): void {
  console.log('\n=== Step 4: Restructure catches/ flat files ===');

  if (!existsSync(CATCHES_DIR)) {
    console.log('  Skipping — catches/ does not exist');
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(CATCHES_DIR);
  } catch (e: any) {
    console.log(`  WARN: cannot read ${CATCHES_DIR}: ${e.message}`);
    return;
  }

  for (const entry of entries) {
    const entryPath = join(CATCHES_DIR, entry);
    let estat: ReturnType<typeof statSync>;
    try {
      estat = statSync(entryPath);
    } catch {
      continue;
    }

    // Only move loose files, not directories that are already structured
    if (estat.isDirectory()) {
      console.log(`  SKIP directory (already structured): ${entry}`);
      continue;
    }

    const ext = extname(entry).toLowerCase();
    if (!['.sav', '.dat', '.ss1', '.sgm'].includes(ext)) {
      console.log(`  SKIP non-save file: ${entry}`);
      continue;
    }

    const gameName = extractGameFromCatchFilename(entry);
    if (!gameName) {
      console.log(`  WARN: cannot detect game from filename "${entry}" — skipping`);
      continue;
    }

    const folderName = buildCatchFolderName(entry);
    if (!folderName) {
      console.log(`  WARN: cannot build folder name from "${entry}" — skipping`);
      continue;
    }

    const destPath = join(CATCHES_DIR, gameName, `${folderName}`, 'catch.sav');
    console.log(`  ${entry} → catches/${gameName}/${folderName}/catch.sav`);

    mkdirSync(dirname(destPath), { recursive: true });

    if (!existsSync(destPath)) {
      copyFileSync(entryPath, destPath);
      filesCopied++;
    } else {
      console.log(`  SKIP already exists: ${destPath}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 6: Clean up old platform dirs in library/
// ---------------------------------------------------------------------------

function cleanup(): void {
  console.log('\n=== Step 6: Clean up library/3ds/ and library/pc/ ===');

  for (const platform of ['3ds', 'pc']) {
    const platformDir = join(LIBRARY_DIR, platform);
    if (!existsSync(platformDir)) {
      console.log(`  Skipping ${platform}/ — already gone`);
      continue;
    }
    rmSync(platformDir, { recursive: true, force: true });
    console.log(`  Removed: library/${platform}/`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== Alacrity Directory Migration ===');
console.log(`Project root: ${PROJECT_ROOT}`);
console.log(`Saves dir:    ${SAVES_DIR}`);

flattenLibrary();
importCheckpoints();
renameCheckpointToBackups();
restructureCatches();
cleanup();

console.log('\n=== Migration Complete ===');
console.log(`Files copied:        ${filesCopied}`);
console.log(`Duplicates skipped:  ${duplicatesSkipped}`);
