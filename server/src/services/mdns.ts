import { Bonjour, type Service } from 'bonjour-service';

let bonjour: Bonjour | null = null;
let service: Service | null = null;

export function startMdns(port: number): void {
  try {
    bonjour = new Bonjour();
    service = bonjour.publish({
      name: 'Alacrity',
      type: 'http',
      port,
      txt: { path: '/' },
    });
    console.log(`[mdns] Published alacrity.local on port ${port}`);
  } catch (err) {
    console.error('[mdns] publish failed:', err);
  }
}

export function stopMdns(): void {
  if (service) {
    try { service.stop?.(() => {}); } catch {}
    service = null;
  }
  if (bonjour) {
    try { bonjour.destroy(); } catch {}
    bonjour = null;
  }
}
