import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SummaryCard from './SummaryCard';
import BallPicker from './BallPicker';
import FormPicker from './FormPicker';
import MoveStrip from './MoveStrip';
import RibbonSection from './RibbonSection';
import MarkSection from './MarkSection';

interface Props {
  entry: any;
  species: any;
  ribbons: any[];
  marks: any[];
  balls: any[];
  forms: any[];
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

export default function EntryDetail({ entry, species, ribbons, marks, balls, forms, onUpdate, onDelete }: Props) {
  const [ballPickerOpen, setBallPickerOpen] = useState(false);

  const earnedRibbons: number[] = (() => {
    try { return JSON.parse(entry.ribbons || '[]'); } catch { return []; }
  })();
  const earnedMarks: number[] = (() => {
    try { return JSON.parse(entry.marks || '[]'); } catch { return []; }
  })();

  const handleRibbonToggle = (ribbonId: number) => {
    const current = new Set(earnedRibbons);
    if (current.has(ribbonId)) current.delete(ribbonId);
    else current.add(ribbonId);
    onUpdate({ ribbons: [...current] });
  };

  const handleMarkToggle = (markId: number) => {
    const current = new Set(earnedMarks);
    if (current.has(markId)) current.delete(markId);
    else current.add(markId);
    onUpdate({ marks: [...current] });
  };

  const moves = [
    entry.move1 ?? null,
    entry.move2 ?? null,
    entry.move3 ?? null,
    entry.move4 ?? null,
  ];

  const handleMoveUpdate = (moveIndex: number, value: string) => {
    const key = `move${moveIndex + 1}` as 'move1' | 'move2' | 'move3' | 'move4';
    onUpdate({ [key]: value || null });
  };

  // Manual override banner: shown when entry has manual_fields set
  const manualFields: string[] = entry.manual_fields
    ? (typeof entry.manual_fields === 'string' ? JSON.parse(entry.manual_fields) : entry.manual_fields)
    : [];

  return (
    <div className="space-y-0">
      {/* Manual override banner */}
      {entry.source === 'auto' && manualFields.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <span className="font-bold">✎ Manual overrides:</span>
          <span className="opacity-70">{manualFields.join(', ')}</span>
        </div>
      )}

      {/* Summary card with ball badge */}
      <SummaryCard
        entry={entry}
        species={species}
        onUpdate={onUpdate}
        onBallClick={() => setBallPickerOpen(prev => !prev)}
      />

      {/* Form picker */}
      <FormPicker
        value={entry.form_id || null}
        forms={forms}
        onChange={formId => onUpdate({ form_id: formId })}
      />

      {/* Ball picker panel */}
      <BallPicker
        value={entry.ball || ''}
        balls={balls}
        open={ballPickerOpen}
        onChange={ball => onUpdate({ ball })}
        onClose={() => setBallPickerOpen(false)}
      />

      {/* Move strip */}
      <MoveStrip moves={moves} onUpdate={handleMoveUpdate} />

      {/* Ribbons */}
      <RibbonSection ribbons={ribbons} earned={earnedRibbons} onToggle={handleRibbonToggle} />

      {/* Marks */}
      <MarkSection marks={marks} earned={earnedMarks} onToggle={handleMarkToggle} />

      {/* Delete */}
      <div className="pt-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="text-xs h-7"
        >
          Delete Entry
        </Button>
      </div>
    </div>
  );
}
