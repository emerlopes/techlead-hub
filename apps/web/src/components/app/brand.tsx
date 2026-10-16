import { Waypoints } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** `compact`: no mobile o nome vira texto só para leitores de tela. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 rounded-md text-sm font-semibold", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Waypoints className="size-4" aria-hidden />
      </span>
      <span className={cn("whitespace-nowrap", compact && "max-sm:sr-only")}>Tech Lead Hub</span>
    </Link>
  );
}
