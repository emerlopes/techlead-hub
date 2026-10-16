import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse-soft rounded-md bg-secondary", className)}
      {...props}
    />
  );
}

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-sunken px-1 font-mono text-2xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Iniciais de um desenvolvedor (cadastro de referência, sem foto). */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-delivery-subtle font-semibold text-delivery-fg ring-2 ring-surface",
        size === "sm" ? "size-6 text-2xs" : "size-8 text-xs",
        className,
      )}
    >
      {initials}
    </span>
  );
}
