import { CircleUser, Gauge, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * As três perspectivas do produto (§60). Usadas em navegação, cabeçalhos de seção e
 * cartões do dashboard para deixar claro de que domínio vem cada informação (§3.2).
 */
export const domains = {
  personal: { label: "Minha execução", icon: CircleUser, className: "bg-personal-subtle text-personal-fg", bar: "bg-personal" },
  delivery: { label: "Execução dos times", icon: Users, className: "bg-delivery-subtle text-delivery-fg", bar: "bg-delivery" },
  capacity: { label: "Capacidade e previsibilidade", icon: Gauge, className: "bg-capacity-subtle text-capacity-fg", bar: "bg-capacity" },
} as const;

export type Domain = keyof typeof domains;

export function DomainTag({ domain, className }: { domain: Domain; className?: string }) {
  const d = domains[domain];
  const Icon = d.icon;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded px-1.5 text-2xs font-semibold uppercase tracking-wide",
        d.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {d.label}
    </span>
  );
}

/** Contexto (time / projeto) por código curto. */
export function ContextChip({ code, name, className }: { code: string; name?: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex h-5 items-center rounded border border-border bg-surface-sunken px-1.5 font-mono text-2xs font-medium text-muted-foreground",
        className,
      )}
    >
      {code}
    </span>
  );
}
