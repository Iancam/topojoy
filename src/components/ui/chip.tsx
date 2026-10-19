import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border bg-transparent text-text-muted hover:border-action hover:text-action-hover",
        selected:
          "border-action bg-action/15 text-action-hover hover:bg-action/25",
        warning:
          "border-highlight/40 bg-highlight/10 text-highlight hover:border-highlight/70 hover:bg-highlight/20",
        subtle:
          "border-border/70 bg-transparent text-text-subtle hover:border-action/60 hover:text-action-hover",
      },
      size: {
        default: "px-3 py-1 text-sm",
        sm: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Chip({
  className,
  variant,
  size,
  count,
  removable,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof chipVariants> & {
    count?: number;
    removable?: boolean;
  }) {
  return (
    <button
      type="button"
      className={cn(chipVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="text-[0.8em] text-current opacity-60">{count}</span>
      )}
      {removable && <span className="text-current opacity-70">×</span>}
    </button>
  );
}

export { Chip, chipVariants };
