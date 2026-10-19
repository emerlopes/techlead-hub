"use client";

import {
  type ApiError,
  draftEmptyMessages,
  draftSectionLabels,
  type DraftEntry,
  renderDraftMarkdown,
  type ReportDraft,
  type ReportDraftType,
  reportDraftTypes,
} from "@tlh/shared-contracts";
import { Check, Copy, Download } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FormError } from "@/components/app/form-error";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { apiMutation } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { draftSectionState, reportDraftType } from "@/lib/design-system/status";
import { formatBusinessDate, formatBusinessDateNumeric } from "@/lib/format";

const refHref: Record<DraftEntry["ref"]["kind"], ((id: string) => string) | null> = {
  WORK_ITEM: (id) => `/work-items/${id}`,
  RISK: (id) => `/risks/${id}`,
  // Acontecimentos não têm página própria: a origem fica na linha do tempo da sprint.
  JOURNAL_ENTRY: null,
};

/**
 * Rascunhos de demo e retrospectiva (§31.4, §31.5) gerados na hora a partir dos fatos da sprint. Nada é
 * salvo: o Tech Lead copia ou baixa o Markdown e edita fora do hub. Seções sem registro ficam vazias.
 */
export function DraftGenerator({ sprintId }: { sprintId: string }) {
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate(type: ReportDraftType) {
    startTransition(async () => {
      setError(null);
      setCopied(false);
      try {
        setDraft(await apiMutation<ReportDraft>("POST", "/reports/generate", { type, sprintId }));
      } catch (err) {
        setError(toApiError(err));
      }
    });
  }

  const markdown = draft ? renderDraftMarkdown(draft, formatBusinessDateNumeric) : "";

  function download() {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.type === "SPRINT_DEMO" ? "demo" : "retrospectiva"}-${draft.sprint.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        {reportDraftTypes.map((type) => {
          const meta = reportDraftType[type];
          const Icon = meta.icon;
          return (
            <Button key={type} variant={draft?.type === type ? "primary" : "outline"} disabled={pending} onClick={() => generate(type)}>
              <Icon aria-hidden />
              {meta.label}
            </Button>
          );
        })}
      </div>
      <FormError error={error} />
      {draft && (
        <section aria-label={reportDraftType[draft.type].label} className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{reportDraftType[draft.type].label}</h3>
            <span className="ml-auto flex flex-wrap gap-2 print:hidden">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(markdown).then(() => setCopied(true), () => setCopied(false))}
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? "Copiado" : "Copiar Markdown"}
              </Button>
              <Button size="sm" variant="outline" onClick={download}>
                <Download aria-hidden />
                Baixar .md
              </Button>
            </span>
          </div>
          {draft.sections.map((s) => (
            <div key={s.key} className="flex flex-col gap-1.5">
              <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{draftSectionLabels[s.key]}</h4>
              {s.state === "FILLED" ? (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                  {s.entries.map((entry, index) => {
                    const href = refHref[entry.ref.kind]?.(entry.ref.id);
                    return (
                      <li key={`${entry.ref.id}-${index}`} className="break-words">
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {entry.text}
                          </Link>
                        ) : (
                          <span className="whitespace-pre-line">{entry.text}</span>
                        )}
                        {entry.date && <span className="ml-1.5 text-xs text-subtle-foreground tabular">{formatBusinessDate(entry.date)}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge meta={draftSectionState[s.state]} size="sm" />
                  {draftEmptyMessages[s.state]}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
