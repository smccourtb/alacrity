import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
  onReset?: () => void;
  label?: string;
}

// Detected at module load time — true in a Tauri webview, false in a plain
// browser (like Vite dev at http://localhost:5173 without the desktop shell).
const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function browseForDirectory(): Promise<string | null> {
  if (!inTauri) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({ directory: true, multiple: false });
  if (typeof result === 'string') return result;
  return null;
}

export function DirectoryPicker({ value, onChange, onReset, label }: DirectoryPickerProps) {
  const handleBrowse = async () => {
    const picked = await browseForDirectory();
    if (picked) onChange(picked);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
        {inTauri && <Button variant="outline" size="sm" onClick={handleBrowse}>Browse</Button>}
        {onReset && <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>}
      </div>
    </div>
  );
}
