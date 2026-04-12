import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number // 0-1
  color?: string // Tailwind bg class or CSS color
  gradient?: string // Tailwind gradient classes
  size?: "sm" | "md"
  className?: string
}

function ProgressBar({ value, color, gradient, size = "sm", className }: ProgressBarProps) {
  const clampedValue = Math.min(1, Math.max(0, value))
  const height = size === "sm" ? "h-1.5" : "h-2.5"

  return (
    <div className={cn("w-full rounded-full bg-surface-sunken", height, className)}>
      <div
        className={cn(
          "rounded-full transition-all duration-300",
          height,
          gradient || color || "bg-primary"
        )}
        style={{ width: `${clampedValue * 100}%` }}
      />
    </div>
  )
}

export { ProgressBar }
export type { ProgressBarProps }
