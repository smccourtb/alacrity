import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DirectoryPicker } from './DirectoryPicker';
import { api } from '@/api/client';

export function BiosSection() {
  const [biosDir, setBiosDir] = useState<string>('');

  useEffect(() => {
    api.config.get().then((c) => setBiosDir(c.biosDir));
  }, []);

  const save = async () => {
    await api.config.update({ biosDir });
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">BIOS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Some emulators work better (or only) with real BIOS files. Alacrity can&apos;t
            download these — you&apos;ll need to source them yourself. Drop them in this
            directory and Alacrity will point emulators at them automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DirectoryPicker value={biosDir} onChange={setBiosDir} />
          <Button size="sm" onClick={save}>Save</Button>

          <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
            <div className="font-medium">Expected files by emulator:</div>
            <div>mGBA — gba_bios.bin</div>
            <div>melonDS — bios7.bin, bios9.bin, firmware.bin</div>
            <div>Azahar — aes_keys.txt</div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
