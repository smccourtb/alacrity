import os from 'os';

export interface NetworkInfo {
  ip: string | null;   // best-guess primary LAN IPv4, null if none found
  hostname: string;    // OS hostname
}

/**
 * Pick the first non-internal IPv4 address. Prefers common private ranges
 * (192.168, 10, 172.16–31) over VPN / link-local addresses.
 */
export function getNetworkInfo(): NetworkInfo {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];
  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family !== 'IPv4' || a.internal) continue;
      candidates.push(a.address);
    }
  }
  const isPrivate = (ip: string) =>
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  const preferred = candidates.find(isPrivate) ?? candidates[0] ?? null;
  return { ip: preferred, hostname: os.hostname() };
}
