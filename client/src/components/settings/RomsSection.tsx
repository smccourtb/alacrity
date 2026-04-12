import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DirectoryPicker } from './DirectoryPicker';
import { api } from '@/api/client';

export function RomsSection() {
  const [romsDir, setRomsDir] = useState<string>('');

  useEffect(() => {
    api.config.get().then((c) => setRomsDir(c.romsDir));
  }, []);

  const save = async () => {
    await api.config.update({ romsDir });
  };

  const reset = async () => {
    setRomsDir('$DATA/roms');
    await api.config.update({ romsDir: '$DATA/roms' });
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ROMs</CardTitle>
          <p className="text-sm text-muted-foreground">Where Alacrity looks for Pokémon game ROMs.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DirectoryPicker value={romsDir} onChange={setRomsDir} onReset={reset} />
          <Button size="sm" onClick={save}>Save</Button>
        </CardContent>
      </Card>
    </section>
  );
}
