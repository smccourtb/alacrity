import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { api } from '../api/client';

interface FilePickerProps {
  value: string;
  onChange: (path: string) => void;
  extensions?: string[];
  placeholder?: string;
  defaultDir?: string;
}

export default function FilePicker({ value, onChange, extensions = [], placeholder, defaultDir }: FilePickerProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<{ name: string; path: string; isDir: boolean }[]>([]);
  const [currentDir, setCurrentDir] = useState('');
  const [parentDir, setParentDir] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const browse = (dir: string) => {
    api.hunts.browse(dir, extensions).then(res => {
      setEntries(res.entries);
      setCurrentDir(res.path);
      setParentDir(res.parent);
      setOpen(true);
    }).catch(() => {});
  };

  // Derive which directory to browse from a path string
  const dirOf = (p: string) => {
    if (!p || !p.includes('/')) return defaultDir ?? '/home';
    return p.substring(0, p.lastIndexOf('/')) || '/';
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        className="font-mono text-xs"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          // Browse the directory as user types
          const typed = e.target.value;
          if (typed.endsWith('/')) browse(typed);
        }}
        placeholder={placeholder}
        onFocus={() => { if (!open && value) browse(dirOf(value)); }}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md text-xs">
          <div className="px-2 py-1 text-xs text-muted-foreground font-mono truncate border-b bg-muted/50">{currentDir}</div>
          {currentDir !== parentDir && (
            <button type="button" className="w-full text-left px-2 py-1.5 hover:bg-accent font-mono" onClick={() => browse(parentDir)}>..</button>
          )}
          {entries.map(e => (
            <button
              key={e.path}
              type="button"
              className="w-full text-left px-2 py-1.5 hover:bg-accent font-mono truncate"
              onClick={() => {
                if (e.isDir) {
                  browse(e.path);
                } else {
                  onChange(e.path);
                  setOpen(false);
                }
              }}
            >
              {e.isDir ? '\uD83D\uDCC1 ' : '\uD83D\uDCC4 '}{e.name}
            </button>
          ))}
          {entries.length === 0 && <div className="px-2 py-1.5 text-muted-foreground">No matching files</div>}
        </div>
      )}
    </div>
  );
}
