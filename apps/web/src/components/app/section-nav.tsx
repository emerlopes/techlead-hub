"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveSection, type NavSection } from "@/lib/navigation";

/**
 * Sub-navegação de uma área (Entregas, Capacidade, Planejamento, Organização). Rola na horizontal no mobile sem gerar scroll
 * de página. Usa `usePathname`: renderize dentro de `<Suspense>`.
 */
export function SectionNav({ section }: { section: NavSection }) {
  const pathname = usePathname();
  return (
    <nav aria-label={section.label} className="-mt-2 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {section.items.map(({ href, label, exact }) => {
          const active = isActiveSection(pathname, href, exact);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable inline-flex h-9 items-center border-b-2 border-transparent px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                  active && "border-primary text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SectionNavSkeleton() {
  return <div className="-mt-2 h-9 border-b border-border" />;
}
