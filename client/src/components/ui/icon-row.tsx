import * as React from "react"
import { cn } from "@/lib/utils"

interface IconRowProps<T> {
  items: T[]
  max: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overflowClassName?: string
}

function IconRow<T>({ items, max, renderItem, className, overflowClassName }: IconRowProps<T>) {
  const visible = items.slice(0, max)
  const overflow = items.length - max

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {visible.map((item, i) => (
        <React.Fragment key={i}>{renderItem(item, i)}</React.Fragment>
      ))}
      {overflow > 0 && (
        <span className={cn("text-2xs text-muted-foreground/50 font-semibold", overflowClassName)}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

export { IconRow }
export type { IconRowProps }
