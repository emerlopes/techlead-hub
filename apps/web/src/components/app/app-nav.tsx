"use client";

import { Building2, Gauge, House, ListTodo, Settings, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { capacitySection, deliverySection, isActiveSection, type NavSection, organizationSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const sectionActive = (pathname: string, section: NavSection) => section.items.some((i) => isActiveSection(pathname, i.href));

/** Áreas principais; Entregas, Capacidade e Organização têm sub-navegação própria (`SectionNav`). */
const items = [
  { href: "/", label: "Início", icon: House, active: (p: string) => p === "/" },
  { href: "/tasks", label: "Atividades", icon: ListTodo, active: (p: string) => isActiveSection(p, "/tasks") },
  { href: "/work-items", label: "Entregas", icon: Truck, active: (p: string) => sectionActive(p, deliverySection) },
  { href: "/capacity", label: "Capacidade", icon: Gauge, active: (p: string) => sectionActive(p, capacitySection) },
  { href: "/teams", label: "Organização", icon: Building2, active: (p: string) => sectionActive(p, organizationSection) },
  { href: "/settings", label: "Configurações", icon: Settings, active: (p: string) => isActiveSection(p, "/settings") },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
      {items.map(({ href, label, icon: Icon, active }) => {
        const current = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            title={label}
            className={cn(
              "pressable flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 lg:px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
              current && "bg-secondary text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="max-lg:sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
