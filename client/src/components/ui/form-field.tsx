import * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

function FormField({ label, description, error, children, className, htmlFor }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
      >
        {label}
      </label>
      {description && (
        <p className="text-2xs text-muted-foreground/50">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-2xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export { FormField }
export type { FormFieldProps }
