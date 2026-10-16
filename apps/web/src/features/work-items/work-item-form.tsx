"use client";

import {
  type ContextRef,
  createWorkItemSchema,
  executionStatuses,
  type ExternalSource,
  healthStatuses,
  type NamedRef,
  statusSources,
  updateWorkItemSchema,
  type WorkItem,
  type WorkItemDetail,
  workItemTypes,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { executionStatus, healthStatus, statusSource, workItemType } from "@/lib/design-system/status";
import { hoursInput, hoursOrNull, optionalValue } from "@/lib/form-data";

/**
 * Cadastro e edição de item externo + acompanhamento corrente (§13.3, §14.2). Salvar o
 * acompanhamento registra a verificação; mudanças de previsão, responsável e time entram no
 * histórico (CA-006).
 */
export function WorkItemForm({
  item,
  sources,
  projects,
  teams,
  developers,
}: {
  item?: WorkItem;
  sources: Pick<ExternalSource, "id" | "name">[];
  /** Projetos não arquivados + o atual. */
  projects: ContextRef[];
  /** Times ativos + o atual. */
  teams: ContextRef[];
  /** Pessoas ativas + a atual. */
  developers: NamedRef[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const t = item?.tracking;
  const form = useApiForm({
    schema: item ? updateWorkItemSchema : createWorkItemSchema,
    read: (data) => ({
      sourceId: data.get("sourceId"),
      externalKey: data.get("externalKey"),
      title: data.get("title"),
      externalUrl: data.get("externalUrl"),
      itemType: data.get("itemType"),
      projectId: data.get("projectId"),
      notes: data.get("notes"),
      ...(!item && { executionStatus: data.get("executionStatus") }),
      executingTeamId: data.get("executingTeamId"),
      developerId: data.get("developerId"),
      committedDate: data.get("committedDate"),
      manualForecastDate: data.get("manualForecastDate"),
      manualHealth: optionalValue(data.get("manualHealth")),
      remainingEffortHours: hoursOrNull(data.get("remainingEffortHours")),
      statusSource: optionalValue(data.get("statusSource")),
      statusNote: data.get("statusNote"),
      ...(item && { version: item.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return item
        ? apiMutation<WorkItemDetail>("PATCH", `/work-items/${item.id}`, input)
        : apiMutation<WorkItemDetail>("POST", "/work-items", input);
    },
    onSuccess: (result) => {
      if (item) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/work-items/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={item?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-5">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && item ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Item atualizado e verificação registrada." />}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Origem" htmlFor="wi-source" required error={err.sourceId}>
            <Select id="wi-source" name="sourceId" defaultValue={item?.source.id ?? sources[0]?.id ?? ""} aria-invalid={Boolean(err.sourceId)}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Identificador" htmlFor="wi-key" required error={err.externalKey} hint="Único por origem (RN-005).">
            <Input
              id="wi-key"
              name="externalKey"
              defaultValue={item?.externalKey}
              maxLength={60}
              className="font-mono"
              aria-invalid={Boolean(err.externalKey)}
            />
          </Field>
        </div>
        <Field label="Título" htmlFor="wi-title" required error={err.title}>
          <Input id="wi-title" name="title" defaultValue={item?.title} maxLength={300} aria-invalid={Boolean(err.title)} />
        </Field>
        <Field label="URL" htmlFor="wi-url" error={err.externalUrl} hint="Referência à ferramenta externa, sem integração (§13.6).">
          <Input id="wi-url" name="externalUrl" type="url" defaultValue={item?.externalUrl ?? ""} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo" htmlFor="wi-type" error={err.itemType}>
            <Select id="wi-type" name="itemType" defaultValue={item?.itemType ?? "STORY"}>
              {workItemTypes.map((value) => (
                <option key={value} value={value}>
                  {workItemType[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Projeto de referência" htmlFor="wi-project" required error={err.projectId} hint="RN-018.">
            <Select id="wi-project" name="projectId" defaultValue={item?.project.id ?? ""} aria-invalid={Boolean(err.projectId)}>
              <option value="" disabled>
                Selecione…
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          {!item && (
            <Field label="Execução" htmlFor="wi-exec" error={err.executionStatus}>
              <Select id="wi-exec" name="executionStatus" defaultValue="NOT_STARTED">
                {executionStatuses.map((value) => (
                  <option key={value} value={value}>
                    {executionStatus[value].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Acompanhamento</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time executor" htmlFor="wi-team" error={err.executingTeamId}>
            <Select id="wi-team" name="executingTeamId" defaultValue={t?.executingTeam?.id ?? ""}>
              <option value="">Sem time definido</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.code} · {team.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável" htmlFor="wi-dev" error={err.developerId}>
            <Select id="wi-dev" name="developerId" defaultValue={t?.developer?.id ?? ""}>
              <option value="">Sem responsável</option>
              {developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Compromisso" htmlFor="wi-committed" error={err.committedDate}>
            <Input id="wi-committed" name="committedDate" type="date" defaultValue={t?.committedDate ?? ""} />
          </Field>
          <Field label="Previsão manual" htmlFor="wi-forecast" error={err.manualForecastDate} hint="Separada do compromisso.">
            <Input id="wi-forecast" name="manualForecastDate" type="date" defaultValue={t?.manualForecastDate ?? ""} />
          </Field>
          <Field label="Esforço restante (h)" htmlFor="wi-remaining" error={err.remainingEffortHours} hint="Não negativo (RN-031).">
            <Input
              id="wi-remaining"
              name="remainingEffortHours"
              inputMode="decimal"
              defaultValue={hoursInput(t?.remainingEffortHours)}
              aria-invalid={Boolean(err.remainingEffortHours)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Avaliação manual de saúde"
            htmlFor="wi-health"
            error={err.manualHealth}
            hint="Guardada à parte da saúde calculada (§14.4)."
          >
            <Select id="wi-health" name="manualHealth" defaultValue={t?.manualHealth ?? ""}>
              <option value="">Usar a calculada</option>
              {healthStatuses.map((value) => (
                <option key={value} value={value}>
                  {healthStatus[value].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Origem da informação" htmlFor="wi-source-info" error={err.statusSource}>
            <Select id="wi-source-info" name="statusSource" defaultValue={t?.statusSource ?? ""}>
              <option value="">Não informada</option>
              {statusSources.map((value) => (
                <option key={value} value={value}>
                  {statusSource[value].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Observação da situação" htmlFor="wi-note" error={err.statusNote}>
          <Textarea id="wi-note" name="statusNote" defaultValue={t?.statusNote ?? ""} maxLength={1000} className="min-h-16" />
        </Field>
        <Field label="Notas do item" htmlFor="wi-notes" error={err.notes}>
          <Textarea id="wi-notes" name="notes" defaultValue={item?.notes ?? ""} maxLength={5000} />
        </Field>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : item ? "Salvar e registrar verificação" : "Cadastrar item"}
        </Button>
      </div>
    </form>
  );
}
