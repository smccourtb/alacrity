/**
 * freeze-manifest.ts — verify and freeze the dependency manifest before release.
 *
 * For each (emulator, platform) entry:
 *   1. Download the file at downloadUrl
 *   2. Compute SHA256
 *   3. If the manifest has a placeholder, fill it in
 *   4. If the manifest has a real SHA256 that doesn't match, fail
 *   5. Fill in sizeBytes if placeholder
 *
 * Run before tagging a release. Modifies the manifest in place; commit the result.
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const MANIFEST_PATH = join(
  process.cwd(),
  'server/src/data/dependency-manifest.json'
);

interface Manifest {
  manifestVersion: number;
  emulators: Record<string, {
    version: string;
    platforms: Record<string, {
      downloadUrl: string;
      sha256: string;
      sizeBytes?: number;
    }>;
  }>;
}

async function downloadAndHash(url: string): Promise<{ hash: string; bytes: number }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText} fetching ${url}`);

  if (!resp.body) throw new Error(`No response body for ${url}`);

  const hash = createHash('sha256');
  let bytes = 0;

  const reader = resp.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
    bytes += value.length;
  }

  return { hash: hash.digest('hex'), bytes };
}

function isPlaceholder(value: string): boolean {
  return value === 'PLACEHOLDER_FROZEN_AT_RELEASE' || value === 'PLACEHOLDER_TBD_AT_RELEASE';
}

async function main() {
  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  const manifest: Manifest = JSON.parse(raw);

  let modified = false;
  const failures: string[] = [];

  for (const [emulatorId, entry] of Object.entries(manifest.emulators)) {
    for (const [triple, platform] of Object.entries(entry.platforms)) {
      const key = `${emulatorId}.${triple}`;

      // Skip entries that still have placeholder URLs — they aren't ready to freeze.
      if (platform.downloadUrl.includes('PLACEHOLDER')) {
        failures.push(`${key}: downloadUrl still contains PLACEHOLDER — update to real URL first`);
        continue;
      }

      console.log(`\n[${key}] Downloading ${platform.downloadUrl}`);
      try {
        const { hash, bytes } = await downloadAndHash(platform.downloadUrl);
        console.log(`[${key}] SHA256: ${hash}  bytes: ${bytes}`);

        if (isPlaceholder(platform.sha256)) {
          platform.sha256 = hash;
          modified = true;
        } else if (platform.sha256.toLowerCase() !== hash.toLowerCase()) {
          failures.push(
            `${key}: SHA256 mismatch. manifest=${platform.sha256}, actual=${hash}. ` +
            `Upstream file was modified or URL points at a moving tag.`
          );
        }

        if (!platform.sizeBytes || platform.sizeBytes === 0) {
          platform.sizeBytes = bytes;
          modified = true;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${key}: ${message}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('\n===== FAILURES =====');
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  if (modified) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    console.log('\n✓ Manifest frozen. Commit the changes.');
  } else {
    console.log('\n✓ Manifest is already frozen.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
