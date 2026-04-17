import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchNetworkInfo, type NetworkInfoResponse } from '@/api/networkInfo';

export function ConnectPhoneSection() {
  const [info, setInfo] = useState<NetworkInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNetworkInfo()
      .then(r => { if (!cancelled) setInfo(r); })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard API unavailable (non-secure context) */ }
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connect a Phone</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your phone's camera while on the same WiFi.
            It opens Alacrity in your phone browser.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              Could not read network info: {error}
            </div>
          )}
          {!error && !info && (
            <p className="text-sm text-muted-foreground">Loading network info…</p>
          )}
          {!error && info && !info.ip && (
            <p className="text-sm text-muted-foreground">
              No LAN address detected. Connect this machine to WiFi to pair a phone.
            </p>
          )}
          {!error && info?.ip && (
            <div className="flex items-start gap-6">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={`http://${info.ip}:${info.port}/stream`} size={180} />
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="font-medium">Open in browser</div>
                  <button
                    onClick={() => handleCopy(`http://${info.ip}:${info.port}/stream`)}
                    className="block w-full text-left rounded bg-muted hover:bg-muted/70 px-2 py-1 font-mono text-xs transition-colors"
                    title={copied ? 'Copied!' : 'Click to copy'}
                  >
                    {copied ? '✓ Copied' : `http://${info.ip}:${info.port}/stream`}
                  </button>
                </div>
                <div className="text-muted-foreground">
                  Hostname: <code className="font-mono">{info.hostname}</code>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
