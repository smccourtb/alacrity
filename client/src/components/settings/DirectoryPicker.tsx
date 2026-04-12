import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DirectoryPickerProps {
  value: string;
  onChange: (path: string) => void;
  onBrowse?: () => void;
  onReset?: () => void;
  label?: string;
}

export function DirectoryPicker({ value, onChange, onBrowse, onReset, label }: DirectoryPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
        {onBrowse && <Button variant="outline" size="sm" onClick={onBrowse}>Browse</Button>}
        {onReset && <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>}
      </div>
    </div>
  );
}
