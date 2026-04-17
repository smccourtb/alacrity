import { getServerBase } from '../lib/tauri.js';

export interface NetworkInfoResponse {
  ip: string | null;
  hostname: string;
  port: number;
}

export async function fetchNetworkInfo(): Promise<NetworkInfoResponse> {
  const base = getServerBase();
  const url = base ? `${base}/api/network-info` : '/api/network-info';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`network-info: ${res.status}`);
  return res.json();
}
