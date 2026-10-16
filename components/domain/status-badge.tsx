import { Badge, type BadgeProps } from "@/components/ui/badge";
import { toneFill } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StatusMeta } from "@/lib/design-system/status";

/**
 * Renderiza qualquer status do domínio a partir do mapa em `lib/design-system/status.ts`.
 * Ícone + texto sempre juntos: a cor nunca é o único portador de significado.
 *
 *   <StatusBadge meta={healthStatus.AT_RISK} />
 */
export function StatusBadge({
  meta,
  variant = "subtle",
  size = "md",
  showIcon = true,
  className,
}: {
  meta: StatusMeta;
  variant?: BadgeProps["variant"];
  size?: BadgeProps["size"];
  showIcon?: boolean;
  className?: string;
}) {
  const Icon = meta.icon;
  if (variant === "dot") {
    return (
      <Badge variant="dot" size={size} className={className} title={meta.description}>
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            meta.indeterminate ? "border border-dashed border-neutral" : toneFill[meta.tone],
            meta.busy && "animate-pulse-soft",
          )}
        />
        {meta.label}
      </Badge>
    );
  }
  return (
    <Badge
      tone={meta.tone}
      variant={variant}
      size={size}
      title={meta.description}
      className={cn(
        meta.indeterminate && "border-dashed border-neutral/60 bg-hatch",
        className,
      )}
    >
      {showIcon && <Icon aria-hidden className={cn(meta.busy && "animate-spin [animation-duration:2s]")} />}
      {meta.label}
    </Badge>
  );
}
