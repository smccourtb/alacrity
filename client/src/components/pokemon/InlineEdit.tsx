import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
  placeholder?: string;
}

export default function InlineEdit({ value, onSave, type = 'text', className = '', placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className={`bg-surface-sunken border-none rounded-lg px-1.5 py-0.5 outline-none text-inherit font-inherit focus:ring-2 focus:ring-ring/50 ${className}`}
        style={{ width: Math.max(40, draft.length * 8 + 16) }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer px-1 py-0.5 rounded border border-transparent hover:border-muted-foreground/20 hover:bg-muted/30 transition-all ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground/30">{placeholder || '—'}</span>}
    </span>
  );
}
