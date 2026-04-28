import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { api } from '@/api/client';
import RichText from './RichText';
import RichTextToolbar from './RichTextToolbar';

interface InlineNotesProps {
  markerType: string;
  referenceId: number;
  initialValue: string;
  onSaved?: (value: string) => void;
  externalEditing?: boolean;
  onEditingChange?: (e: boolean) => void;
}

export default function InlineNotes({ markerType, referenceId, initialValue, onSaved, externalEditing, onEditingChange }: InlineNotesProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = externalEditing ?? internalEditing;
  const setEditing = (v: boolean) => {
    onEditingChange?.(v);
    setInternalEditing(v);
  };
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
    setSaved(initialValue);
  }, [initialValue, referenceId]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed !== saved) {
      setSaved(trimmed);
      setValue(trimmed);
      api.guide.updateSubMarkerDescription(markerType, referenceId, trimmed);
      onSaved?.(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setValue(saved);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div
        className="mt-1"
        onMouseDown={e => {
          // Keep focus in the textarea when clicking toolbar buttons.
          if ((e.target as HTMLElement).closest('textarea')) return;
          e.preventDefault();
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => {
            setValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={e => {
            // Don't commit if focus jumped into a toolbar-spawned modal (link/icon picker).
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.closest('[data-rt-modal]')) return;
            commit();
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-sm text-muted-foreground bg-muted/30 px-2 py-1 resize-none outline-none focus:ring-1 focus:ring-primary/30"
          rows={1}
          placeholder="Add a note..."
        />
        <RichTextToolbar
          inputRef={textareaRef}
          value={value}
          onChange={setValue}
          className="mt-1"
        />
        {value.trim() && (
          <div className="mt-1 px-2 py-1 rounded border border-dashed border-border/60 bg-background/40">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-0.5">Preview</div>
            <RichText text={value} className="text-sm text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  if (saved) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-start gap-1.5 text-sm text-muted-foreground mt-0.5 text-left hover:text-foreground transition-colors cursor-text w-full"
      >
        <RichText text={saved} className="flex-1" />
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0 mt-0.5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-sm text-muted-foreground/40 mt-0.5 hover:text-muted-foreground transition-colors cursor-text"
    >
      <Pencil className="w-3 h-3" />
      Add note...
    </button>
  );
}
