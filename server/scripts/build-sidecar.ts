#!/usr/bin/env bun
//
// Cross-platform sidecar build. Detects the host OS + arch, maps it to the
// Bun target name and Tauri's sidecar filename convention, then compiles
// src/index.ts into the binary Tauri spawns as its external sidecar.
//
// Tauri's externalBin convention is <base>-<target-triple>[<ext>]:
//   macOS ARM64:  alacrity-server-aarch64-apple-darwin
//   macOS x64:    alacrity-server-x86_64-apple-darwin
//   Linux ARM64:  alacrity-server-aarch64-unknown-linux-gnu
//   Linux x64:    alacrity-server-x86_64-unknown-linux-gnu
//   Windows x64:  alacrity-server-x86_64-pc-windows-msvc.exe
//
// Run via `bun run --cwd server build:sidecar`, or directly:
//   bun server/scripts/build-sidecar.ts

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

interface PlatformTargets {
  bunTarget: string;       // --target flag for `bun build --compile`
  tauriTriple: string;     // filename suffix expected by Tauri externalBin
  extension: string;       // file extension (.exe on Windows, else empty)
}

function detectTargets(): PlatformTargets {
  const os = process.platform;
  const arch = process.arch;

  if (os === 'darwin' && arch === 'arm64') {
    return { bunTarget: 'bun-darwin-arm64', tauriTriple: 'aarch64-apple-darwin', extension: '' };
  }
  if (os === 'darwin' && arch === 'x64') {
    return { bunTarget: 'bun-darwin-x64', tauriTriple: 'x86_64-apple-darwin', extension: '' };
  }
  if (os === 'linux' && arch === 'arm64') {
    return { bunTarget: 'bun-linux-arm64', tauriTriple: 'aarch64-unknown-linux-gnu', extension: '' };
  }
  if (os === 'linux' && arch === 'x64') {
    return { bunTarget: 'bun-linux-x64', tauriTriple: 'x86_64-unknown-linux-gnu', extension: '' };
  }
  if (os === 'win32' && arch === 'x64') {
    return { bunTarget: 'bun-windows-x64', tauriTriple: 'x86_64-pc-windows-msvc', extension: '.exe' };
  }
  throw new Error(`Unsupported host platform: ${os}/${arch}. Add a mapping in build-sidecar.ts.`);
}

function main() {
  const targets = detectTargets();
  // Resolve the output path relative to the script's location so it works
  // regardless of the cwd that invoked us.
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const serverDir = resolve(scriptDir, '..');
  const binariesDir = resolve(serverDir, '..', 'src-tauri', 'binaries');
  if (!existsSync(binariesDir)) mkdirSync(binariesDir, { recursive: true });

  const outfile = resolve(
    binariesDir,
    `alacrity-server-${targets.tauriTriple}${targets.extension}`,
  );
  const entrypoint = resolve(serverDir, 'src', 'index.ts');

  const args = [
    'build',
    '--compile',
    '--target', targets.bunTarget,
    entrypoint,
    '--outfile', outfile,
  ];

  console.log(`[build-sidecar] ${process.platform}/${process.arch} → ${targets.tauriTriple}`);
  console.log(`[build-sidecar] outfile: ${outfile}`);

  const result = spawnSync('bun', args, {
    stdio: 'inherit',
    cwd: serverDir,
  });

  if (result.status !== 0) {
    console.error(`[build-sidecar] bun build exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

main();
