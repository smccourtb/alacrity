interface Props {
  count: number;
  onCancel: () => void;
  onNext: () => void;
}
export default function GroupWithBar({ count, onCancel, onNext }: Props) {
  return (
    <div className="absolute top-14 left-3 z-[1000] rounded-lg border border-primary bg-primary/10 backdrop-blur-xl shadow-lg px-3 py-2 pointer-events-auto text-xs font-medium flex items-center gap-3">
      <span className="text-primary animate-pulse">Group {count} marker{count === 1 ? '' : 's'} — shift-click to add more</span>
      <button onClick={onNext} disabled={count < 2} className="text-primary disabled:opacity-40">Next</button>
      <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">Cancel</button>
    </div>
  );
}
