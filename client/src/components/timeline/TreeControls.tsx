import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface TreeControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isMobile: boolean;
}

export function TreeControls({
  searchQuery,
  onSearchChange,
  isMobile,
}: TreeControlsProps) {
  return (
    <Card className="py-0 gap-0">
      <div className="px-5 py-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search saves..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={isMobile ? 'flex-1 min-w-0' : 'w-48'}
        />
      </div>
    </Card>
  );
}
