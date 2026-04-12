import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Clock, Shield } from "lucide-react"

function MetadataPills({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-1.5", className)}>{children}</div>
}

function Pill({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="default" className={cn("gap-1", className)}>
      {icon}
      {children}
    </Badge>
  )
}

function LocationPill({ name, className }: { name: string; className?: string }) {
  return (
    <Pill icon={<MapPin className="size-3" />} className={className}>
      {name}
    </Pill>
  )
}

function TrainerPill({ ot, tid, className }: { ot: string; tid?: number; className?: string }) {
  return (
    <Pill icon={<User className="size-3" />} className={className}>
      {ot}
      {tid !== undefined && <span className="text-muted-foreground/50">#{tid}</span>}
    </Pill>
  )
}

function BadgeCountPill({ count, total, className }: { count: number; total?: number; className?: string }) {
  return (
    <Pill icon={<Shield className="size-3" />} className={className}>
      {count}{total !== undefined && `/${total}`} badges
    </Pill>
  )
}

function TimestampPill({ date, className }: { date: string | Date; className?: string }) {
  const d = typeof date === "string" ? new Date(date) : date
  const formatted = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  return (
    <Pill icon={<Clock className="size-3" />} className={className}>
      {formatted}
    </Pill>
  )
}

const SOURCE_STYLES: Record<string, string> = {
  checkpoint: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  library: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  hunt: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  local: "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
  "3ds": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  catch: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
}

const SOURCE_LABELS: Record<string, string> = {
  checkpoint: "CKP",
  library: "LIB",
  hunt: "HNT",
  local: "LOC",
  "3ds": "3DS",
  catch: "CTH",
}

function SourceBadge({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  const style = SOURCE_STYLES[source] || SOURCE_STYLES.local
  const label = SOURCE_LABELS[source] || source.toUpperCase().slice(0, 3)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide",
        style,
        className
      )}
    >
      {label}
    </span>
  )
}

export {
  MetadataPills,
  Pill,
  LocationPill,
  TrainerPill,
  BadgeCountPill,
  TimestampPill,
  SourceBadge,
}
