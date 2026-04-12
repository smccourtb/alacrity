import { Client } from 'basic-ftp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { paths } from '../paths.js';

const LIBRARY_DIR = paths.libraryDir;
const CHECKPOINT_DIR = '/3ds/Checkpoint/saves';
const PKSM_DIR = '/3ds/PKSM';

interface SyncResult {
  status: 'success' | 'error';
  files: string[];
  errors: string[];
}

export async function syncFrom3DS(ip: string, port: number = 5000): Promise<SyncResult> {
  const client = new Client(10000);
  const files: string[] = [];
  const errors: string[] = [];

  try {
    await client.access({ host: ip, port, secure: false });
    console.log(`Connected to 3DS at ${ip}:${port}`);

    // Sync Checkpoint saves → library/{GameName}/{BackupName}/
    try {
      const games = await client.list(CHECKPOINT_DIR);
      for (const game of games) {
        if (!game.isDirectory) continue;
        // Clean game name: "0x01710 Pokémon Red" → "Red"
        const cleanName = game.name.replace(/^0x[0-9a-fA-F]+\s+/, '').replace(/^Pokémon\s+/, '');
        const gamePath = `${CHECKPOINT_DIR}/${game.name}`;
        const gameLocal = join(LIBRARY_DIR, cleanName);
        mkdirSync(gameLocal, { recursive: true });

        const backups = await client.list(gamePath);
        for (const backup of backups) {
          if (!backup.isDirectory) continue;
          const backupPath = `${gamePath}/${backup.name}`;
          const backupLocal = join(gameLocal, backup.name);
          mkdirSync(backupLocal, { recursive: true });

          const saveFiles = await client.list(backupPath);
          for (const sf of saveFiles) {
            if (sf.isDirectory) continue;
            const remotePath = `${backupPath}/${sf.name}`;
            const localPath = join(backupLocal, sf.name);

            if (existsSync(localPath)) continue;

            try {
              await client.downloadTo(localPath, remotePath);
              files.push(`3ds/${cleanName}/${backup.name}/${sf.name}`);
            } catch (e: any) {
              errors.push(`Failed: ${remotePath} - ${e.message}`);
            }
          }
        }
      }
    } catch (e: any) {
      errors.push(`Checkpoint sync error: ${e.message}`);
    }

    // Sync PKSM banks → library/pksm/
    const pksmLocal = join(LIBRARY_DIR, 'pksm');
    mkdirSync(pksmLocal, { recursive: true });

    try {
      // Only grab bank files, not all of PKSM
      const bankDir = `${PKSM_DIR}/banks`;
      const bankFiles = await client.list(bankDir);
      for (const f of bankFiles) {
        if (f.isDirectory) continue;
        const remotePath = `${bankDir}/${f.name}`;
        const localPath = join(pksmLocal, f.name);

        if (existsSync(localPath)) continue;

        try {
          await client.downloadTo(localPath, remotePath);
          files.push(`pksm/${f.name}`);
        } catch (e: any) {
          errors.push(`Failed: ${remotePath} - ${e.message}`);
        }
      }
    } catch (e: any) {
      errors.push(`PKSM sync error: ${e.message}`);
    }

    return { status: errors.length === 0 ? 'success' : 'error', files, errors };
  } catch (e: any) {
    return { status: 'error', files, errors: [`Connection failed: ${e.message}`] };
  } finally {
    client.close();
  }
}

export async function pushTo3DS(
  ip: string,
  port: number,
  localSavePath: string,
  checkpointGameFolder: string,
  backupName: string,
): Promise<{ status: 'success' | 'error'; message: string }> {
  const client = new Client(10000);
  try {
    await client.access({ host: ip, port, secure: false });
    console.log(`Connected to 3DS at ${ip}:${port}`);

    const remotePath = `${CHECKPOINT_DIR}/${checkpointGameFolder}/${backupName}`;
    await client.ensureDir(remotePath);
    await client.uploadFrom(localSavePath, `${remotePath}/main`);

    return { status: 'success', message: `Uploaded to ${remotePath}/main` };
  } catch (e: any) {
    return { status: 'error', message: e.message };
  } finally {
    client.close();
  }
}

// Scan local network for 3DS FTP server
export async function discover3DS(ports: number[] = [5000, 5001, 21]): Promise<{ ip: string; port: number } | null> {
  const { networkInterfaces } = await import('os');
  const { Socket } = await import('net');
  const nets = networkInterfaces();
  let subnet = '';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        subnet = net.address.split('.').slice(0, 3).join('.');
        break;
      }
    }
    if (subnet) break;
  }

  if (!subnet) return null;

  // Fast TCP scan — just check if port is open, no FTP handshake
  function checkPort(ip: string, port: number): Promise<{ ip: string; port: number } | null> {
    return new Promise((resolve) => {
      const socket = new Socket();
      socket.setTimeout(500);
      socket.on('connect', () => { socket.destroy(); resolve({ ip, port }); });
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
      socket.on('error', () => { socket.destroy(); resolve(null); });
      socket.connect(port, ip);
    });
  }

  // Scan all IPs across all ports in parallel batches
  for (const port of ports) {
    const batch: Promise<{ ip: string; port: number } | null>[] = [];
    for (let i = 1; i <= 254; i++) {
      batch.push(checkPort(`${subnet}.${i}`, port));
    }
    const results = await Promise.all(batch);
    const found = results.find(r => r !== null);
    if (found) return found;
  }

  return null;
}
