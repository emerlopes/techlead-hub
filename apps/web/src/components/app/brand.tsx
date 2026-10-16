import { Waypoints } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 rounded-md text-sm font-semibold", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Waypoints className="size-4" aria-hidden />
      </span>
      Tech Lead Hub
    </Link>
  );
}
