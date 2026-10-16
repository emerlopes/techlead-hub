"use client";

import {
  createCheckItemSchema,
  type Refinement,
  refinementStatuses,
  type Sprint,
  updateRefinementSchema,
  type WorkItemDetail,
} from "@tlh/shared-contracts";
import { CircleCheck, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { useApiForm } from "@/lib/api/use-api-form";
import { refinementStatus } from "@/lib/design-system/status";
import { formatBusinessDate } from "@/lib/format";
import { optionalValue } from "@/lib/form-data";

/**
 * Refinamento do item (§15): situação, sprint pretendida, dúvidas, pendências e checklist de
 * prontidão. Independente da execução (RN-007). Checklist completo só sugere "pronto" (§15.5, §3.5).
 */
export function RefinementPanel({
  workItemId,
  version,
  refinement,
  sprints,
  closed,
}: {
  workItemId: string;
  /** Versão do item externo (raiz do agregado). */
  version: number;
  refinement: Refinement;
  /** Sprints planejadas ou ativas. */
  sprints: Pick<Sprint, "id" | "name" | "startDate" | "team">[];
  /** Execução encerrada: o refinamento fica como histórico. */
  closed: boolean;
}) {
  const router = useRouter();
  const action = useApiAction();
  const [status, setStatus] = useState(refinement.status);
  const [saved, setSaved] = useState(false);
  const form = useApiForm({
    schema: updateRefinementSchema,
    read: (data) => ({
      status: data.get("status"),
      intendedSprintId: optionalValue(data.get("intendedSprintId")),
      openQuestions: data.get("openQuestions"),
      pendingItems: data.get("pendingItems"),
      notes: data.get("notes"),
      ...(data.get("status") === "READY" && { readyExceptionReason: data.get("readyExceptionReason") }),
      version,
    }),
    submit: (input) => {
      setSaved(false);
      return apiMutation<WorkItemDetail>("PATCH", `/work-items/${workItemId}/refinement`, input);
    },
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });
  const addForm = useApiForm({
    schema: createCheckItemSchema,
    read: (data) => ({ label: data.get("label") }),
    submit: (input) => apiMutation("POST", `/work-items/${workItemId}/refinement/check-items`, input),
    onSuccess: () => router.refresh(),
  });
  const err = form.fieldErrors;
  const { total, checked } = refinement.checklist;
  const incomplete = checked < total;
  const intendedOptions = refinement.intendedSprint && !sprints.some((s) => s.id === refinement.intendedSprint?.id)
    ? [{ id: refinement.intendedSprint.id, name: refinement.intendedSprint.name, startDate: refinement.intendedSprint.startDate, team: null }, ...sprints]
    : sprints;

  return (
    <div className="flex flex-col gap-5">
      {refinement.notReadyForImminentSprint && (
        <Alert tone="warning" title="Não pronto para sprint iminente">
          O item está (ou vai entrar) em uma sprint ativa ou que começa em breve sem estar pronto (§15.5).
        </Alert>
      )}
      {refinement.suggestReady && !closed && (
        <Alert
          tone="success"
          title="Checklist completo"
          action={
            <Button
              size="sm"
              variant="secondary"
              disabled={action.pending}
              onClick={() =>
                action.run(() => apiMutation("PATCH", `/work-items/${workItemId}/refinement`, { status: "READY", version }))
              }
            >
              <CircleCheck aria-hidden />
              Marcar como pronta
            </Button>
          }
        >
          Todos os critérios de prontidão foram atendidos. A decisão continua sua (§3.5).
        </Alert>
      )}
      <FormError error={action.error} />

      <section aria-label="Checklist de prontidão" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium">Checklist de prontidão</h3>
          <span className="text-2xs text-muted-foreground tabular">
            {checked}/{total}
          </span>
        </div>
        <Progress value={checked} max={Math.max(total, 1)} tone={incomplete ? "attention" : "success"} label="Checklist de prontidão" />
        <ul className="flex flex-col gap-1">
          {refinement.checkItems.map((check) => (
            <li key={check.id} className="flex items-center gap-2">
              <Checkbox
                id={`check-${check.id}`}
                checked={check.checked}
                disabled={action.pending || closed}
                onChange={(e) =>
                  action.run(() => apiMutation("PATCH", `/refinement-check-items/${check.id}`, { checked: e.target.checked }))
                }
              />
              <Label htmlFor={`check-${check.id}`} className="flex-1 font-normal">
                {check.label}
              </Label>
              {!closed && (
                <ConfirmButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover “${check.label}” do checklist`}
                  question="Remover?"
                  confirmLabel="Remover"
                  pending={action.pending}
                  onConfirm={() => action.run(() => apiMutation("DELETE", `/refinement-check-items/${check.id}`))}
                >
                  <Trash2 aria-hidden />
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
        {!closed && (
          <form onSubmit={addForm.onSubmit} noValidate className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Input name="label" aria-label="Novo critério de prontidão" placeholder="Novo critério…" maxLength={120} />
              <Button type="submit" variant="secondary" disabled={addForm.pending}>
                <Plus aria-hidden />
                Adicionar
              </Button>
            </div>
            <FormError error={addForm.error} />
          </form>
        )}
      </section>

      <form key={version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
        <FormError error={form.error} action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
        {saved && !form.error && <Alert tone="success" title="Refinamento atualizado." />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Situação do refinamento" htmlFor="ref-status" error={err.status}>
            <Select
              id="ref-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Refinement["status"])}
              disabled={closed}
            >
              {refinementStatuses.map((value) => (
                <option key={value} value={value}>
                  {refinementStatus[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sprint pretendida" htmlFor="ref-sprint" error={err.intendedSprintId}>
            <Select id="ref-sprint" name="intendedSprintId" defaultValue={refinement.intendedSprint?.id ?? ""} disabled={closed}>
              <option value="">Nenhuma</option>
              {intendedOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.team ? `${s.team.code} · ` : ""}
                  {s.name} ({formatBusinessDate(s.startDate)})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {status === "READY" && incomplete && (
          <Field
            label="Justificativa da exceção"
            htmlFor="ref-reason"
            required
            error={err.readyExceptionReason}
            hint="O checklist está incompleto: registre por que o item pode seguir (§15.5)."
          >
            <Textarea id="ref-reason" name="readyExceptionReason" defaultValue={refinement.readyExceptionReason ?? ""} maxLength={1000} />
          </Field>
        )}
        <Field label="Dúvidas em aberto" htmlFor="ref-questions" error={err.openQuestions}>
          <Textarea id="ref-questions" name="openQuestions" defaultValue={refinement.openQuestions ?? ""} maxLength={2000} disabled={closed} />
        </Field>
        <Field label="Pendências" htmlFor="ref-pending" error={err.pendingItems}>
          <Textarea id="ref-pending" name="pendingItems" defaultValue={refinement.pendingItems ?? ""} maxLength={2000} disabled={closed} />
        </Field>
        <Field label="Observações" htmlFor="ref-notes" error={err.notes}>
          <Textarea id="ref-notes" name="notes" defaultValue={refinement.notes ?? ""} maxLength={2000} disabled={closed} />
        </Field>
        {!closed && (
          <div className="flex justify-end">
            <Button type="submit" disabled={form.pending}>
              <Save aria-hidden />
              {form.pending ? "Salvando…" : "Salvar refinamento"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
