import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/** Paginação por links (RNF-009). `hrefFor` monta a URL preservando os filtros. */
export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const step = (target: number, label: string, Icon: typeof ChevronLeft, disabled: boolean) =>
    disabled ? (
      <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50")}>
        <Icon aria-hidden />
        {label}
      </span>
    ) : (
      <Link href={hrefFor(target)} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Icon aria-hidden />
        {label}
      </Link>
    );
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground tabular">
        {first}–{last} de {total}
      </p>
      <div className="flex gap-2">
        {step(page - 1, "Anterior", ChevronLeft, page <= 1)}
        {step(page + 1, "Próxima", ChevronRight, page >= pages)}
      </div>
    </nav>
  );
}
