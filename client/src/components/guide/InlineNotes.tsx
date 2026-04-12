import { useState, useRef, useEffect } from 'react';
import { api } from '@/api/client';

interface InlineNotesProps {
  markerType: string;
  referenceId: number;
  initialValue: string;
}

export default function InlineNotes({ markerType, referenceId, initialValue }: InlineNotesProps) {
  const [editing, setEditing] = useState(false);
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

  function handleBlur() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed !== saved) {
      setSaved(trimmed);
      setValue(trimmed);
      api.guide.updateSubMarkerDescription(markerType, referenceId, trimmed);
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
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => {
          setValue(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full text-sm text-muted-foreground bg-muted/30 px-2 py-1 resize-none outline-none focus:ring-1 focus:ring-primary/30 mt-1"
        rows={1}
        placeholder="Add a note..."
      />
    );
  }

  if (saved) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-muted-foreground mt-0.5 text-left hover:text-foreground transition-colors cursor-text w-full"
      >
        {saved}
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm text-muted-foreground/40 mt-0.5 hover:text-muted-foreground transition-colors cursor-text"
    >
      Add note...
    </button>
  );
}
