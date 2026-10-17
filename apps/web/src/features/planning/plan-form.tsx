"use client";

import {
  createExecutionPlanSchema,
  DEFAULT_REDISTRIBUTION_POLICY,
  defaultMaxParallel,
  type ExecutionModeValue,
  type ExecutionPlanDetail,
  executionModes,
  MAX_PARALLEL_LIMIT,
  type RedistributionPolicyValue,
  redistributionPolicies,
  updateExecutionPlanSchema,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { executionMode as modeMeta, redistributionPolicy as policyMeta } from "@/lib/design-system/status";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { optionalValue } from "@/lib/form-data";
import { type CapacityOptions, OptionList, withCurrent } from "../capacity/options";

/**
 * Criar plano ou editar a configuração (§22.3): pessoa, contexto, período, modo, limite de
 * simultaneidade e política de redistribuição (§23). A fila é editada à parte.
 */
export function PlanForm({
  plan,
  options,
  defaults = {},
}: {
  plan?: ExecutionPlanDetail;
  options: CapacityOptions;
  defaults?: { developerId?: string; teamId?: string; projectId?: string; startDate?: string; endDate?: string };
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<ExecutionModeValue>(plan?.executionMode ?? "SEQUENTIAL");
  const [policy, setPolicy] = useState<RedistributionPolicyValue>(plan?.redistributionPolicy ?? DEFAULT_REDISTRIBUTION_POLICY);
  const teams = withCurrent(options.teams, plan?.team);
  const projects = withCurrent(options.projects, plan?.project);

  const form = useApiForm({
    schema: plan ? updateExecutionPlanSchema : createExecutionPlanSchema,
    read: (data) => ({
      ...(!plan && { developerId: data.get("developerId"), status: data.get("status") }),
      teamId: optionalValue(data.get("teamId")),
      projectId: optionalValue(data.get("projectId")),
      period: { startDate: data.get("startDate"), endDate: data.get("endDate") },
      executionMode: mode,
      maxParallelItems: mode === "SEQUENTIAL" ? 1 : Number(data.get("maxParallelItems")),
      redistributionPolicy: policy,
      notes: data.get("notes"),
      ...(plan && { version: plan.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return plan
        ? apiMutation<ExecutionPlanDetail>("PATCH", `/execution-plans/${plan.id}`, input)
        : apiMutation<ExecutionPlanDetail>("POST", "/execution-plans", input);
    },
    onSuccess: (result) => {
      if (plan) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/plans/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;
  const disabled = plan?.status === "ARCHIVED";

  return (
    <form key={plan?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && plan ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Plano atualizado. A projeção já considera a mudança." />}

      {!plan && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pessoa" htmlFor="pl-dev" required error={err.developerId}>
            <Select id="pl-dev" name="developerId" defaultValue={defaults.developerId ?? ""} aria-invalid={Boolean(err.developerId)}>
              <option value="" disabled>
                Selecione…
              </option>
              <OptionList options={options.developers} />
            </Select>
          </Field>
          <Field label="Situação" htmlFor="pl-status" error={err.status} hint="Rascunho é projetado isolado, sem consumir o contexto.">
            <Select id="pl-status" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Ativo</option>
              <option value="DRAFT">Rascunho</option>
            </Select>
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Time" htmlFor="pl-team" error={err.teamId} hint="Com o projeto, define as alocações que alimentam a fila.">
          <Select id="pl-team" name="teamId" defaultValue={plan ? (plan.team?.id ?? "") : (defaults.teamId ?? "")} disabled={disabled}>
            <OptionList options={teams} empty="Nenhum" />
          </Select>
        </Field>
        <Field label="Projeto" htmlFor="pl-project" error={err.projectId} hint="Itens da fila precisam ser deste projeto.">
          <Select id="pl-project" name="projectId" defaultValue={plan ? (plan.project?.id ?? "") : (defaults.projectId ?? "")} disabled={disabled}>
            <OptionList options={projects} empty="Nenhum" />
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início" htmlFor="pl-start" required error={err["period.startDate"]}>
          <Input id="pl-start" name="startDate" type="date" defaultValue={plan?.startDate ?? defaults.startDate} disabled={disabled} />
        </Field>
        <Field label="Fim" htmlFor="pl-end" required error={err["period.endDate"]} hint="Até 184 dias (§25.6).">
          <Input id="pl-end" name="endDate" type="date" defaultValue={plan?.endDate ?? defaults.endDate} disabled={disabled} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modo de execução" htmlFor="pl-mode" required hint={modeMeta[mode].description}>
          <Select id="pl-mode" value={mode} onChange={(e) => setMode(e.target.value as ExecutionModeValue)} disabled={disabled}>
            {executionModes.map((m) => (
              <option key={m} value={m}>
                {modeMeta[m].label}
              </option>
            ))}
          </Select>
        </Field>
        {mode !== "SEQUENTIAL" && (
          <Field
            label={mode === "PARALLEL" ? "Máximo de itens" : "Itens simultâneos"}
            htmlFor="pl-parallel"
            required
            error={err.maxParallelItems}
            hint={`De 1 a ${MAX_PARALLEL_LIMIT} (§22.5).`}
          >
            <Input
              key={mode}
              id="pl-parallel"
              name="maxParallelItems"
              type="number"
              min={1}
              max={MAX_PARALLEL_LIMIT}
              className="font-mono"
              defaultValue={plan && plan.executionMode === mode ? plan.maxParallelItems : defaultMaxParallel(mode, plan?.items.length)}
              aria-invalid={Boolean(err.maxParallelItems)}
              disabled={disabled}
            />
          </Field>
        )}
      </div>

      <Field label="Redistribuição da sobra" htmlFor="pl-policy" required hint={policyMeta[policy].description}>
        <Select id="pl-policy" value={policy} onChange={(e) => setPolicy(e.target.value as RedistributionPolicyValue)} disabled={disabled}>
          {redistributionPolicies.map((p) => (
            <option key={p} value={p}>
              {policyMeta[p].label}
            </option>
          ))}
        </Select>
      </Field>
      {policy === "CROSS_CONTEXT" && (
        <Alert tone="warning" title="Redistribuição entre contextos autorizada">
          A sobra só vai para outros planos ativos da mesma pessoa que também autorizaram, e pode alterar compromissos de outros
          times (§23.4).
        </Alert>
      )}

      <Field label="Observações" htmlFor="pl-notes" error={err.notes}>
        <Textarea id="pl-notes" name="notes" rows={2} maxLength={1000} defaultValue={plan?.notes ?? ""} disabled={disabled} />
      </Field>
      {err.items && <p className="text-xs text-danger-fg" role="alert">{err.items}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending || disabled}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : plan ? "Salvar configuração" : "Criar plano"}
        </Button>
      </div>
    </form>
  );
}
