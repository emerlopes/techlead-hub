import { cn } from "@/lib/utils";
import { journalCategory, type JournalCategory } from "@/lib/design-system/status";
import { ContextChip } from "./domain-tag";

const ring: Record<string, string> = {
  neutral: "bg-neutral-subtle text-neutral-fg",
  info: "bg-info-subtle text-info-fg",
  success: "bg-success-subtle text-success-fg",
  attention: "bg-attention-subtle text-attention-fg",
  warning: "bg-warning-subtle text-warning-fg",
  danger: "bg-danger-subtle text-danger-fg",
  blocked: "bg-blocked-subtle text-blocked-fg",
  personal: "bg-personal-subtle text-personal-fg",
  delivery: "bg-delivery-subtle text-delivery-fg",
  capacity: "bg-capacity-subtle text-capacity-fg",
};

/** Item da linha do tempo do Diário de Bordo (§17). */
export function JournalEntry({
  category,
  date,
  description,
  contexts = [],
  links,
  actions,
  last,
}: {
  category: JournalCategory;
  date: string;
  description: string;
  contexts?: string[];
  /** Vínculos navegáveis (substitui `contexts` quando informado). */
  links?: React.ReactNode;
  actions?: React.ReactNode;
  last?: boolean;
}) {
  const meta = journalCategory[category];
  const Icon = meta.icon;
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-border" />}
      <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", ring[meta.tone])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold">{meta.label}</span>
          <span className="text-subtle-foreground tabular">{date}</span>
          {links ?? contexts.map((c) => <ContextChip key={c} code={c} />)}
          {actions && <span className="ml-auto">{actions}</span>}
        </div>
        <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
