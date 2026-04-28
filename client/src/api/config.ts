import { getServerBase } from '../lib/tauri.js';

function configBase(): string {
  const server = getServerBase();
  return `${server || ''}/api/config`;
}

export interface AlacrityConfig {
  version: 1;
  welcomeDismissed: boolean;
  welcomeDismissedAt: string | null;
  romsDir: string;
  biosDir: string;
  importSources: string[];
  ntfyServer: string;
  ntfyTopic: string;
  pokedexSpriteStyle: string;
  boxIconEverywhere: boolean;
}

export const configApi = {
  async get(): Promise<AlacrityConfig> {
    const resp = await fetch(configBase());
    if (!resp.ok) throw new Error(`Failed to fetch config: ${resp.status}`);
    return resp.json();
  },

  async update(partial: Partial<AlacrityConfig>): Promise<AlacrityConfig> {
    const resp = await fetch(configBase(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!resp.ok) throw new Error(`Failed to update config: ${resp.status}`);
    return resp.json();
  },

  async testNotification(): Promise<{ ok: boolean; url: string }> {
    const resp = await fetch(`${configBase()}/test-notification`, { method: 'POST' });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Test notification failed: ${resp.status}`);
    }
    return resp.json();
  },
};
