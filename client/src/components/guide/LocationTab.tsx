import React from 'react';

interface LocationTabProps {
  items: Array<{
    id?: number;
    flag_index?: number | null;
    [key: string]: any;
  }>;
  flagReport?: {
    flags_by_location: Record<string, {
      total: number;
      set: number;
      flags: Array<{ index: number; set: boolean }>;
    }>;
  } | null;
  locationKey: string;
  renderItem: (item: any, isComplete: boolean) => React.ReactNode;
}

export function LocationTab({ items, flagReport, locationKey, renderItem }: LocationTabProps) {
  const locationFlags = flagReport?.flags_by_location[locationKey];

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const isComplete = item.flag_index != null && locationFlags
          ? locationFlags.flags.some(f => f.index === item.flag_index && f.set)
          : false;
        return <div key={item.id ?? i}>{renderItem(item, isComplete)}</div>;
      })}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">No data for this location</p>
      )}
    </div>
  );
}
