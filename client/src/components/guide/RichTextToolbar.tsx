import { useState, type RefObject } from 'react';
import { Link2, Image as ImageIcon, Sparkles } from 'lucide-react';
import ItemPickerModal from './ItemPickerModal';
import LinkDialog from './LinkDialog';

interface Props {
  /** Ref to the textarea or input the toolbar edits. */
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Current value (controlled). */
  value: string;
  /** Called with the new value after an insertion. */
  onChange: (next: string) => void;
  className?: string;
}

/**
 * Inserts `insert` at the current selection in the given input/textarea,
 * then restores focus with the caret placed after the insertion.
 */
function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  insert: string,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + insert + value.slice(end);
  return { next, caret: start + insert.length };
}

export default function RichTextToolbar({ inputRef, value, onChange, className }: Props) {
  const [pickerOpen, setPickerOpen] = useState<null | 'item' | 'pokemon'>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  function applyInsert(insert: string) {
    const { next, caret } = insertAtCursor(inputRef.current, value, insert);
    onChange(next);
    // Defer caret restore until after React re-renders.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try { el.setSelectionRange(caret, caret); } catch { /* not all inputs support it */ }
    });
  }

  return (
    <>
      <div className={`flex items-center gap-1 ${className ?? ''}`}>
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
          title="Insert link"
        >
          <Link2 className="w-3 h-3" />
          Link
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen('item')}
          className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
          title="Insert item icon"
        >
          <ImageIcon className="w-3 h-3" />
          Item
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen('pokemon')}
          className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
          title="Insert Pokémon sprite"
        >
          <Sparkles className="w-3 h-3" />
          Pokémon
        </button>
      </div>
      {pickerOpen && (
        <ItemPickerModal
          initialKind={pickerOpen}
          onClose={() => setPickerOpen(null)}
          onPick={(picked) => {
            const folder = picked.sprite_kind === 'pokemon' ? 'pokemon' : 'items';
            applyInsert(`![${picked.label}](${folder}/${picked.sprite_ref})`);
            setPickerOpen(null);
          }}
        />
      )}
      {linkOpen && (
        <LinkDialog
          onClose={() => setLinkOpen(false)}
          onInsert={(text, url) => {
            applyInsert(`[${text}](${url})`);
            setLinkOpen(false);
          }}
        />
      )}
    </>
  );
}
