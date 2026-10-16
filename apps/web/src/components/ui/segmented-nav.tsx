import Link from "next/link";
import { cn } from "@/lib/utils";

/** Filtro segmentado por links (estado na URL, funciona sem JavaScript). */
export function SegmentedNav({
  label,
  items,
  current,
  className,
}: {
  label: string;
  items: readonly { value: string; label: string; href: string }[];
  current: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("inline-flex h-8 w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-md bg-secondary p-0.5", className)}
    >
      {items.map(({ value, label: text, href }) => (
        <Link
          key={value}
          href={href}
          aria-current={current === value ? "page" : undefined}
          className={cn(
            "pressable inline-flex h-7 shrink-0 items-center rounded-[calc(var(--radius)-4px)] px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground",
            current === value && "bg-surface text-foreground shadow-xs",
          )}
        >
          {text}
        </Link>
      ))}
    </nav>
  );
}
