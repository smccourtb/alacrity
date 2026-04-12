// client/src/components/play/SessionBar.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ActiveSession {
  id: string;
  game: string;
  label: string;
  source: string;
  pid: number | null;
  startedAt: string;
  emulatorId: string;
  linkedSessionId: string | null;
}

interface SessionBarProps {
  sessions: ActiveSession[];
}

export function SessionBar({ sessions }: SessionBarProps) {
  const active = sessions.filter(s => !(s as any).pendingSave);
  if (active.length === 0) return null;

  return (
    <Card className="gap-0 py-0 border-none">
      <div className="h-[3px] bg-gradient-to-r from-green-400 to-emerald-500" />
      <CardContent className="flex items-center gap-3 py-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
        <span className="text-base font-medium text-green-700">Now Playing</span>
        <div className="flex flex-wrap gap-1.5 ml-1">
          {active.map(s => (
            <Badge key={s.id} variant="success">
              {s.game} — {s.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
