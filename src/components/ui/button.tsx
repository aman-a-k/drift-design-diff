import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none disabled:opacity-50",
      {
        "bg-foreground text-background hover:bg-foreground/90": variant === "default",
        "border border-border bg-transparent hover:bg-muted": variant === "outline",
        "hover:bg-muted": variant === "ghost",
        "h-10 px-4 py-2": size === "default",
        "h-9 px-3": size === "sm",
        "h-11 px-8 text-base": size === "lg",
      },
      className
    )

    if (asChild) {
      // Render the single child (e.g. a Link) as the actual element instead
      // of wrapping it in a <button> — previously asChild did nothing, so
      // <Button asChild><Link .../></Button> nested an <a> inside a <button>
      // (invalid HTML) and leaked the unhandled `asChild` prop onto the DOM.
      const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>
      return React.cloneElement(child, {
        ...props,
        ref,
        className: cn(classes, child.props.className as string | undefined),
      })
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
