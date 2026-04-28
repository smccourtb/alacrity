import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';

interface Props {
  onInsert: (text: string, url: string) => void;
  onClose: () => void;
}

export default function LinkDialog({ onInsert, onClose }: Props) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  function submit() {
    if (!url.trim()) return;
    onInsert(text.trim() || url.trim(), url.trim());
  }

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(
    <div data-rt-modal className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg w-[420px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-border flex items-center gap-2">
          <h3 className="font-semibold text-sm flex-1">Insert link</h3>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <form
          className="p-3 space-y-2"
          onSubmit={e => { e.preventDefault(); submit(); }}
        >
          <label className="block">
            <span className="text-2xs text-muted-foreground">Label</span>
            <Input
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. Unown chamber walkthrough"
            />
          </label>
          <label className="block">
            <span className="text-2xs text-muted-foreground">URL</span>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!url.trim()}
              className="flex-1 text-xs py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs py-1 px-3 rounded bg-muted hover:bg-muted/70"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
