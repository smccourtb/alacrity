import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isOpen = controlledOpen ?? uncontrolledOpen

  const toggle = React.useCallback(() => {
    const next = !isOpen
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }, [isOpen, onOpenChange])

  return (
    <div data-slot="collapsible" data-state={isOpen ? "open" : "closed"} className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === CollapsibleTrigger) {
            return React.cloneElement(child as React.ReactElement<CollapsibleTriggerInternalProps>, {
              _isOpen: isOpen,
              _toggle: toggle,
            })
          }
          if (child.type === CollapsibleContent) {
            return React.cloneElement(child as React.ReactElement<CollapsibleContentInternalProps>, {
              _isOpen: isOpen,
            })
          }
        }
        return child
      })}
    </div>
  )
}

interface CollapsibleTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  children: React.ReactNode
  className?: string
  showChevron?: boolean
}

interface CollapsibleTriggerInternalProps extends CollapsibleTriggerProps {
  _isOpen?: boolean
  _toggle?: () => void
}

function CollapsibleTrigger({
  children,
  className,
  showChevron = true,
  _isOpen,
  _toggle,
  onClick,
  ...rest
}: CollapsibleTriggerInternalProps) {
  return (
    <button
      type="button"
      aria-expanded={_isOpen}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) _toggle?.()
      }}
      className={cn(
        "flex w-full items-center gap-2 text-left",
        className
      )}
      {...rest}
    >
      {showChevron && (
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
            _isOpen && "rotate-90"
          )}
        />
      )}
      {children}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

interface CollapsibleContentInternalProps extends CollapsibleContentProps {
  _isOpen?: boolean
}

function CollapsibleContent({
  children,
  className,
  _isOpen,
}: CollapsibleContentInternalProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        _isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div className={cn("overflow-hidden", className)}>
        {children}
      </div>
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
export type { CollapsibleProps, CollapsibleTriggerProps, CollapsibleContentProps }
