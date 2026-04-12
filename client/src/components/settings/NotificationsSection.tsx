import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';

export function NotificationsSection() {
  const [topic, setTopic] = useState<string>('');
  const [server, setServer] = useState<string>('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    api.config.get().then((c) => {
      setTopic(c.ntfyTopic);
      setServer(c.ntfyServer);
    });
  }, []);

  const save = async () => {
    await api.config.update({ ntfyTopic: topic, ntfyServer: server });
  };

  const regenerate = async () => {
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const newTopic = `alacrity-${hex}`;
    setTopic(newTopic);
    await api.config.update({ ntfyTopic: newTopic });
  };

  const sendTest = async () => {
    setTestResult(null);
    try {
      await api.config.testNotification();
      setTestResult('Sent! Check your phone.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestResult(`Failed: ${message}`);
    }
    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Alacrity uses ntfy.sh to send shiny-hit notifications. Subscribe to your
            topic in the ntfy app on your phone to receive them.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <div className="flex gap-2">
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={regenerate}>Regenerate</Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Subscribe at: <code className="bg-muted px-1 py-0.5 rounded">{server}/{topic}</code>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={save}>Save</Button>
            <Button size="sm" variant="outline" onClick={sendTest}>Send test notification</Button>
          </div>

          {testResult && <div className="text-xs text-muted-foreground">{testResult}</div>}

          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            {advancedOpen ? 'Hide' : 'Show'} advanced settings
          </button>

          {advancedOpen && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Server</label>
              <Input value={server} onChange={(e) => setServer(e.target.value)} className="font-mono text-xs" />
              <div className="text-xs text-muted-foreground">
                Default is https://ntfy.sh. Change this if you self-host ntfy.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
