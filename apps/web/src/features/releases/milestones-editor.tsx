"use client";

import { createMilestoneSchema, type Milestone } from "@tlh/shared-contracts";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { useApiForm } from "@/lib/api/use-api-form";
import { formatBusinessDate } from "@/lib/format";

/** Marcos da release (§12.2, §34.9): concluir, acrescentar e remover. */
export function MilestonesEditor({ releaseId, milestones }: { releaseId: string; milestones: Milestone[] }) {
  const router = useRouter();
  const action = useApiAction();
  const form = useApiForm({
    schema: createMilestoneSchema,
    read: (data) => ({ name: data.get("name"), targetDate: data.get("targetDate") }),
    submit: (input) => apiMutation("POST", `/releases/${releaseId}/milestones`, input),
    onSuccess: () => router.refresh(),
  });
  return (
    <div className="flex flex-col gap-3">
      {milestones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum marco definido.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Checkbox
                id={`ms-${m.id}`}
                checked={m.completedAt !== null}
                disabled={action.pending}
                onChange={(e) => action.run(() => apiMutation("PATCH", `/release-milestones/${m.id}`, { completed: e.target.checked }))}
              />
              <Label htmlFor={`ms-${m.id}`} className={m.completedAt ? "flex-1 font-normal text-muted-foreground line-through" : "flex-1 font-normal"}>
                {m.name}
              </Label>
              <span className="text-2xs text-muted-foreground tabular">{m.targetDate ? formatBusinessDate(m.targetDate) : "sem data"}</span>
              <ConfirmButton
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover o marco ${m.name}`}
                question="Remover?"
                confirmLabel="Remover"
                pending={action.pending}
                onConfirm={() => action.run(() => apiMutation("DELETE", `/release-milestones/${m.id}`))}
              >
                <Trash2 aria-hidden />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      <FormError error={action.error} />
      <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Input name="name" aria-label="Nome do marco" placeholder="Novo marco…" maxLength={120} className="min-w-0 flex-1" />
          <Input name="targetDate" type="date" aria-label="Data do marco" className="w-36" />
          <Button type="submit" variant="secondary" disabled={form.pending}>
            <Plus aria-hidden />
            Adicionar
          </Button>
        </div>
        <FormError error={form.error} />
      </form>
    </div>
  );
}
