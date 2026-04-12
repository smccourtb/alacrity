interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  /** px diameter */
  size: number;
  /** px stroke width */
  strokeWidth?: number;
  /** Ring color */
  color?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Optional label inside the ring */
  label?: string;
  /** Optional sublabel below the main label */
  sublabel?: string;
  className?: string;
  onClick?: () => void;
}

export default function ProgressRing({
  percent,
  size,
  strokeWidth = 4,
  color = '#e53e3e',
  trackColor = '#f0edea',
  label,
  sublabel,
  className,
  onClick,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {(label || sublabel) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {label && <span style={{ fontSize: size * 0.25, fontWeight: 700, color }}>{label}</span>}
          {sublabel && <span className="text-muted-foreground/40" style={{ fontSize: size * 0.12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
