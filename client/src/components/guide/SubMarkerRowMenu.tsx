import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface SubMarkerRowMenuProps {
  onEditNote: () => void;
  onOverrideIcon: () => void;
  onGroupWith: () => void;
  isClusterMember?: boolean;
  onSplitFromGroup?: () => void;
  onSetAsPrimary?: () => void;
  isClusterPrimaryOrAggregate?: boolean;
  onOpenLocationPinEditor?: () => void;
}

export default function SubMarkerRowMenu(props: SubMarkerRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={e => e.stopPropagation()}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Row actions"
      >
        <MoreVertical className="w-4 h-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={props.onEditNote}>Edit note</DropdownMenuItem>
        <DropdownMenuItem onSelect={props.onOverrideIcon}>Icon override…</DropdownMenuItem>
        <DropdownMenuItem onSelect={props.onGroupWith}>Group with…</DropdownMenuItem>
        {(props.isClusterMember || props.isClusterPrimaryOrAggregate) && <DropdownMenuSeparator />}
        {props.isClusterMember && (
          <DropdownMenuItem onSelect={props.onSplitFromGroup}>Split from group</DropdownMenuItem>
        )}
        {props.isClusterMember && (
          <DropdownMenuItem onSelect={props.onSetAsPrimary}>Set as primary</DropdownMenuItem>
        )}
        {props.isClusterPrimaryOrAggregate && (
          <DropdownMenuItem onSelect={props.onOpenLocationPinEditor}>
            Open location pin editor
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
