"use client";

import {
  type AllocationDetail,
  type AllocationTypeValue,
  createAllocationSchema,
  updateAllocationSchema,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { hoursInput, hoursOrNull, optionalValue } from "@/lib/form-data";
import { type CapacityOptions, fractionToPercentInput, OptionList, percentToFraction } from "./options";

/**
 * Criar e editar alocação (§20). Percentual da capacidade efetiva ou horas com periodicidade explícita
 * (§20.3); sem time e sem projeto é uma reserva geral, que precisa de descrição (§20.5). Somas acima
 * da capacidade são aceitas e sinalizadas como conflito — quem decide é o Tech Lead (§3.5).
 */
export function AllocationForm({
  allocation,
  options,
  defaults = {},
}: {
  allocation?: AllocationDetail;
  options: CapacityOptions;
  defaults?: { developerId?: string; teamId?: string; projectId?: string; validFrom?: string };
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [type, setType] = useState<AllocationTypeValue>(allocation?.allocationType ?? "PERCENTAGE");
  // Destinos atuais continuam selecionáveis mesmo que o contexto tenha sido inativado.
  const teams = withCurrent(options.teams, allocation?.team);
  const projects = withCurrent(options.projects, allocation?.project);

  const form = useApiForm({
    schema: allocation ? updateAllocationSchema : createAllocationSchema,
    read: (data) => ({
      ...(!allocation && { developerId: data.get("developerId") }),
      teamId: optionalValue(data.get("teamId")),
      projectId: optionalValue(data.get("projectId")),
      allocationType: type,
      value: type === "PERCENTAGE" ? percentToFraction(data.get("value")) : (hoursOrNull(data.get("value")) ?? undefined),
      period: type === "HOURS" ? optionalValue(data.get("period")) : null,
      validFrom: data.get("validFrom") || undefined,
      validUntil: data.get("validUntil"),
      description: data.get("description"),
      ...(allocation && { version: allocation.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return allocation
        ? apiMutation<AllocationDetail>("PATCH", `/capacity/allocations/${allocation.id}`, input)
        : apiMutation<AllocationDetail>("POST", "/capacity/allocations", input);
    },
    onSuccess: (result) => {
      if (allocation) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/capacity/allocations/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={allocation?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && allocation ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Alocação atualizada. O histórico guarda a versão anterior." />}

      {!allocation && (
        <Field label="Pessoa" htmlFor="al-dev" required error={err.developerId}>
          <Select id="al-dev" name="developerId" defaultValue={defaults.developerId ?? ""} aria-invalid={Boolean(err.developerId)}>
            <option value="" disabled>
              Selecione…
            </option>
            <OptionList options={options.developers} />
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Time" htmlFor="al-team" error={err.teamId} hint="Opcional. Conta na capacidade do time.">
          <Select id="al-team" name="teamId" defaultValue={allocation?.team?.id ?? defaults.teamId ?? ""}>
            <OptionList options={teams} empty="Nenhum" />
          </Select>
        </Field>
        <Field label="Projeto" htmlFor="al-project" error={err.projectId} hint="Opcional. Conta na demanda do projeto.">
          <Select id="al-project" name="projectId" defaultValue={allocation?.project?.id ?? defaults.projectId ?? ""}>
            <OptionList options={projects} empty="Nenhum" />
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo" htmlFor="al-type" required>
          <Select id="al-type" value={type} onChange={(e) => setType(e.target.value as AllocationTypeValue)}>
            <option value="PERCENTAGE">Percentual da capacidade</option>
            <option value="HOURS">Horas fixas</option>
          </Select>
        </Field>
        <Field
          label={type === "PERCENTAGE" ? "Percentual (%)" : "Horas"}
          htmlFor="al-value"
          required
          error={err.value}
          hint={type === "PERCENTAGE" ? "Da capacidade efetiva (CA = CE × PA)." : "Não são reduzidas por ausências."}
        >
          <Input
            id="al-value"
            name="value"
            inputMode="decimal"
            className="font-mono"
            defaultValue={
              allocation?.allocationType === type
                ? type === "PERCENTAGE"
                  ? fractionToPercentInput(allocation.value)
                  : hoursInput(allocation.value)
                : ""
            }
            aria-invalid={Boolean(err.value)}
          />
        </Field>
        {type === "HOURS" && (
          <Field label="Periodicidade" htmlFor="al-period" required error={err.period} hint="Explícita (§20.3).">
            <Select id="al-period" name="period" defaultValue={allocation?.period ?? "WEEK"} aria-invalid={Boolean(err.period)}>
              <option value="WEEK">Por semana</option>
              <option value="DAY">Por dia</option>
            </Select>
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início da vigência" htmlFor="al-from" error={err.validFrom} hint={allocation ? undefined : "Vazio = hoje."}>
          <Input id="al-from" name="validFrom" type="date" defaultValue={allocation?.validFrom ?? defaults.validFrom} />
        </Field>
        <Field label="Fim da vigência" htmlFor="al-until" error={err.validUntil} hint="Vazio = sem prazo. Encerrar preserva o histórico.">
          <Input id="al-until" name="validUntil" type="date" defaultValue={allocation?.validUntil ?? ""} />
        </Field>
      </div>

      <Field label="Descrição" htmlFor="al-desc" error={err.description} hint="Obrigatória na reserva geral (ex.: suporte, sustentação).">
        <Input id="al-desc" name="description" defaultValue={allocation?.description ?? ""} maxLength={300} aria-invalid={Boolean(err.description)} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : allocation ? "Salvar" : "Criar alocação"}
        </Button>
      </div>
    </form>
  );
}

function withCurrent(options: CapacityOptions["teams"], current: { id: string; code: string; name: string } | null | undefined) {
  if (!current || options.some((o) => o.id === current.id)) return options;
  return [{ id: current.id, label: `${current.code} · ${current.name}` }, ...options];
}
