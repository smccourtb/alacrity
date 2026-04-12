import * as React from "react"
import { cn } from "@/lib/utils"
import { ProgressBar } from "./progress-bar"

interface StatRowProps {
  label: string
  value: React.ReactNode
  bar?: number // 0-1, renders ProgressBar if provided
  barColor?: string
  barGradient?: string
  className?: string
}

function StatRow({ label, value, bar, barColor, barGradient, className }: StatRowProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-16 shrink-0 text-xs text-muted-foreground/50 font-medium">{label}</span>
      {bar !== undefined ? (
        <ProgressBar value={bar} color={barColor} gradient={barGradient} className="flex-1" />
      ) : (
        <div className="flex-1" />
      )}
      <span className="w-16 shrink-0 text-right text-sm font-bold font-mono">{value}</span>
    </div>
  )
}

export { StatRow }
export type { StatRowProps }
