import { useState } from 'react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AddTargetForm({
  speciesId,
  onCreated,
  onCancel,
}: {
  speciesId: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [sourceGame, setSourceGame] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    await api.specimens.createTarget({
      species_id: speciesId,
      description: description.trim(),
      source_game: sourceGame.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-muted rounded-xl">
      <div className="text-xs font-semibold mb-1">Add Custom Target</div>
      <Input
        placeholder="What do you want? (e.g. Friend Ball Bulbasaur)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        <Input
          placeholder="Game (optional)"
          value={sourceGame}
          onChange={(e) => setSourceGame(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!description.trim() || submitting} className="text-xs h-7">
          Add Target
        </Button>
      </div>
    </form>
  );
}
