import { BallIcon } from '@/components/icons';

interface Props {
  value: string;
  balls: any[];
  onChange: (ball: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function BallPicker({ value, balls, onChange, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="bg-muted/30 rounded-xl p-3 mb-3 border border-border/50">
      <div className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-2">Select Ball</div>
      <div className="flex flex-wrap gap-1">
        {balls.map(ball => (
          <button
            key={ball.name}
            onClick={() => { onChange(ball.name); onClose(); }}
            className={`w-9 h-9 rounded-lg border-[1.5px] flex items-center justify-center transition-all hover:bg-muted/50 ${
              value === ball.name
                ? 'border-primary bg-red-50/50 shadow-sm'
                : 'border-border/30 bg-white'
            }`}
            title={ball.name}
          >
            <BallIcon name={ball.name} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}
