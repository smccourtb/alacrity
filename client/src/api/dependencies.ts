import { getServerBase } from '../lib/tauri.js';

function depsBase(): string {
  const server = getServerBase();
  return `${server || ''}/api/dependencies`;
}

export interface DependencyInstallState {
  kind: 'ok' | 'not-installed' | 'out-of-date' | 'custom' | 'unavailable';
  installedVersion?: string;
  pinnedVersion?: string;
  installed?: string;
  pinned?: string;
  path?: string;
}

export interface DependencyPlatform {
  downloadUrl: string;
  sizeBytes: number | null;
  archive: string;
  requiresWine: boolean;
}

export interface DependencyDescriptor {
  id: string;
  displayName: string;
  version: string;
  license: string;
  licenseUrl: string;
  homepageUrl: string;
  description: string;
  coreAbiLock: boolean;
  coreAbiLockMessage?: string;
  platform: DependencyPlatform | null;
  installed: {
    path: string;
    installedVersion: string | null;
    managedInstall: boolean;
  } | null;
  state: DependencyInstallState;
}

export interface DependenciesResponse {
  emulators: DependencyDescriptor[];
}

export interface InstallProgressEvent {
  stage: 'downloading' | 'verifying' | 'extracting' | 'finalizing' | 'done' | 'error';
  bytesDownloaded?: number;
  bytesTotal?: number | null;
  percent?: number | null;
  message?: string;
  retryable?: boolean;
}

export interface InstallDoneEvent {
  emulatorId: string;
  version: string;
  path: string;
}

export interface ProgressHandlers {
  onProgress?: (data: InstallProgressEvent) => void;
  onDone?: (data: InstallDoneEvent) => void;
  onError?: (data: { message: string; retryable?: boolean }) => void;
}

export const dependenciesApi = {
  async list(): Promise<DependenciesResponse> {
    const resp = await fetch(depsBase());
    if (!resp.ok) throw new Error(`Failed to fetch dependencies: ${resp.status}`);
    return resp.json();
  },

  async install(id: string): Promise<void> {
    const resp = await fetch(`${depsBase()}/${id}/install`, { method: 'POST' });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Install failed: ${resp.status}`);
    }
  },

  async uninstall(id: string): Promise<void> {
    const resp = await fetch(`${depsBase()}/${id}/uninstall`, { method: 'POST' });
    if (!resp.ok) throw new Error(`Uninstall failed: ${resp.status}`);
  },

  async useCustom(id: string, path: string): Promise<void> {
    const resp = await fetch(`${depsBase()}/${id}/use-custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!resp.ok) throw new Error(`Failed to set custom path: ${resp.status}`);
  },

  async useManaged(id: string): Promise<void> {
    const resp = await fetch(`${depsBase()}/${id}/use-managed`, { method: 'POST' });
    if (!resp.ok) throw new Error(`Failed to switch to managed: ${resp.status}`);
  },

  async wineDetected(): Promise<{ detected: boolean; path: string | null }> {
    const resp = await fetch(`${depsBase()}/wine-detected`);
    if (!resp.ok) throw new Error('Failed to detect Wine');
    return resp.json();
  },

  /**
   * Subscribe to install progress for an emulator via SSE.
   * Returns an unsubscribe function.
   */
  subscribeProgress(id: string, handlers: ProgressHandlers): () => void {
    const es = new EventSource(`${depsBase()}/${id}/progress`);
    if (handlers.onProgress) {
      es.addEventListener('progress', (e) => handlers.onProgress!(JSON.parse((e as MessageEvent).data)));
    }
    if (handlers.onDone) {
      es.addEventListener('done', (e) => {
        handlers.onDone!(JSON.parse((e as MessageEvent).data));
        es.close();
      });
    }
    if (handlers.onError) {
      es.addEventListener('error', (e) => {
        const data = (e as MessageEvent).data;
        if (data) handlers.onError!(JSON.parse(data));
        es.close();
      });
    }
    return () => es.close();
  },
};
