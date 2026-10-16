import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge = rótulo compacto de estado/categoria.
 * `tone` segue os tons semânticos do design system; `variant` controla o peso visual.
 */
export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-md border font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "",
        info: "",
        success: "",
        attention: "",
        warning: "",
        danger: "",
        blocked: "",
        personal: "",
        delivery: "",
        capacity: "",
      },
      variant: {
        subtle: "border-transparent",
        outline: "bg-transparent",
        solid: "border-transparent",
        dot: "border-border bg-surface text-foreground",
      },
      size: {
        sm: "h-5 px-1.5 text-2xs [&_svg]:size-3",
        md: "h-6 px-2 text-xs [&_svg]:size-3.5",
      },
    },
    compoundVariants: [
      { variant: "subtle", tone: "neutral", className: "bg-neutral-subtle text-neutral-fg" },
      { variant: "subtle", tone: "info", className: "bg-info-subtle text-info-fg" },
      { variant: "subtle", tone: "success", className: "bg-success-subtle text-success-fg" },
      { variant: "subtle", tone: "attention", className: "bg-attention-subtle text-attention-fg" },
      { variant: "subtle", tone: "warning", className: "bg-warning-subtle text-warning-fg" },
      { variant: "subtle", tone: "danger", className: "bg-danger-subtle text-danger-fg" },
      { variant: "subtle", tone: "blocked", className: "bg-blocked-subtle text-blocked-fg" },
      { variant: "subtle", tone: "personal", className: "bg-personal-subtle text-personal-fg" },
      { variant: "subtle", tone: "delivery", className: "bg-delivery-subtle text-delivery-fg" },
      { variant: "subtle", tone: "capacity", className: "bg-capacity-subtle text-capacity-fg" },

      { variant: "outline", tone: "neutral", className: "border-neutral/50 text-neutral-fg" },
      { variant: "outline", tone: "info", className: "border-info/50 text-info-fg" },
      { variant: "outline", tone: "success", className: "border-success/50 text-success-fg" },
      { variant: "outline", tone: "attention", className: "border-attention/60 text-attention-fg" },
      { variant: "outline", tone: "warning", className: "border-warning/50 text-warning-fg" },
      { variant: "outline", tone: "danger", className: "border-danger/50 text-danger-fg" },
      { variant: "outline", tone: "blocked", className: "border-blocked/50 text-blocked-fg" },
      { variant: "outline", tone: "personal", className: "border-personal/50 text-personal-fg" },
      { variant: "outline", tone: "delivery", className: "border-delivery/50 text-delivery-fg" },
      { variant: "outline", tone: "capacity", className: "border-capacity/50 text-capacity-fg" },

      { variant: "solid", tone: "neutral", className: "bg-neutral text-white" },
      { variant: "solid", tone: "info", className: "bg-info text-white" },
      { variant: "solid", tone: "success", className: "bg-success text-white" },
      { variant: "solid", tone: "attention", className: "bg-attention text-black" },
      { variant: "solid", tone: "warning", className: "bg-warning text-black" },
      { variant: "solid", tone: "danger", className: "bg-danger text-white" },
      { variant: "solid", tone: "blocked", className: "bg-blocked text-white" },
      { variant: "solid", tone: "personal", className: "bg-personal text-white" },
      { variant: "solid", tone: "delivery", className: "bg-delivery text-white" },
      { variant: "solid", tone: "capacity", className: "bg-capacity text-white" },
    ],
    defaultVariants: { tone: "neutral", variant: "subtle", size: "md" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, variant, size }), className)}
      {...props}
    />
  );
}
