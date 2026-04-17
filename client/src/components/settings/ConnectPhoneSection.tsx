import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchNetworkInfo, type NetworkInfoResponse } from '@/api/networkInfo';

export function ConnectPhoneSection() {
  const [info, setInfo] = useState<NetworkInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNetworkInfo()
      .then(r => { if (!cancelled) setInfo(r); })
      .catch(e => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Connect a Phone</h2>
        <p className="text-sm text-red-500">Could not read network info: {error}</p>
      </section>
    );
  }
  if (!info) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Connect a Phone</h2>
        <p className="text-sm opacity-60">Loading network info…</p>
      </section>
    );
  }

  if (!info.ip) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Connect a Phone</h2>
        <p className="text-sm opacity-70">
          No LAN address detected. Connect this machine to WiFi to pair a phone.
        </p>
      </section>
    );
  }

  const url = `http://${info.ip}:${info.port}/`;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Connect a Phone</h2>
        <p className="text-sm opacity-70">
          Scan this QR code with your phone's camera while on the same WiFi.
          It opens Alacrity in your phone browser.
        </p>
      </div>
      <div className="flex items-start gap-6">
        <div className="rounded bg-white p-3">
          <QRCodeSVG value={url} size={180} />
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-medium">Open in browser</div>
            <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">{url}</code>
          </div>
          <div className="opacity-60">
            Hostname: <code className="font-mono">{info.hostname}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
