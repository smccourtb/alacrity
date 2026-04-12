import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';

interface CollectionToggleProps {
  checkpointId: number;
  included: boolean;
  archived: boolean;
  isActive: boolean;
  onToggle: () => void; // callback to refresh parent
}

export function CollectionToggle({
  checkpointId, included, archived, isActive, onToggle,
}: CollectionToggleProps) {
  // local state for optimistic UI
  const [localIncluded, setLocalIncluded] = useState(included);
  const [localArchived, setLocalArchived] = useState(archived);

  const handleCollectionToggle = async (checked: boolean) => {
    setLocalIncluded(checked);
    await api.timeline.toggleCheckpointCollection(checkpointId, checked);
    onToggle();
  };

  const handleArchiveToggle = async (checked: boolean) => {
    setLocalArchived(checked);
    await api.timeline.toggleCheckpointArchive(checkpointId, checked);
    onToggle();
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={`collection-${checkpointId}`} className="text-sm">
          Include in collection
          {isActive && <span className="text-muted-foreground ml-1">(active save)</span>}
        </Label>
        <Switch
          id={`collection-${checkpointId}`}
          checked={localIncluded}
          onCheckedChange={handleCollectionToggle}
        />
      </div>
      {!isActive && (
        <div className="flex items-center justify-between">
          <Label htmlFor={`archive-${checkpointId}`} className="text-sm text-muted-foreground">
            Archive branch
          </Label>
          <Switch
            id={`archive-${checkpointId}`}
            checked={localArchived}
            onCheckedChange={handleArchiveToggle}
          />
        </div>
      )}
    </div>
  );
}
