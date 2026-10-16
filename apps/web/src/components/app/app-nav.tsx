"use client";

import { FolderKanban, House, ListTodo, Settings, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Início", icon: House },
  { href: "/tasks", label: "Atividades", icon: ListTodo },
  { href: "/teams", label: "Times", icon: Users },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/developers", label: "Pessoas", icon: UserRound },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "pressable flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 lg:px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
              active && "bg-secondary text-foreground",
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
