import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { api } from '@/api/client';

interface CollectionToggleProps {
  checkpointId: number;
  label: string;
  included: boolean;
  isActive: boolean;
  onToggle: () => void; // callback to refresh parent
}

export function CollectionToggle({
  checkpointId, label, included, isActive, onToggle,
}: CollectionToggleProps) {
  const [localIncluded, setLocalIncluded] = useState(included);
  const [deleting, setDeleting] = useState(false);

  const handleCollectionToggle = async (checked: boolean) => {
    setLocalIncluded(checked);
    await api.timeline.toggleCheckpointCollection(checkpointId, checked);
    onToggle();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await api.timeline.deleteCheckpoint(checkpointId);
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
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-center" />
            }
          >
            Delete Save
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete save?</DialogTitle>
              <DialogDescription>
                This will permanently remove <strong>{label}</strong>. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
