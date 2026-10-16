"use client";

import {
  createWorkScheduleSchema,
  DEFAULT_FOCUS_FACTOR,
  DEFAULT_WEEKLY_PATTERN,
  updateWorkScheduleSchema,
  WEEKDAY_LABELS,
  type WorkSchedule,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { hoursInput, hoursOrNull } from "@/lib/form-data";
import { fractionToPercentInput, OptionList, type Option, percentToFraction } from "./options";

/**
 * Jornada (§19.1): horas por dia da semana e fator de foco. Uma nova jornada encerra a vigente no dia
 * anterior ao início, preservando o histórico (§19.4). O fator de foco é a parte da jornada destinada a
 * trabalho planejado — não mede produtividade (§18.4).
 */
export function ScheduleForm({
  schedule,
  developers,
  developerId,
  onDone,
}: {
  schedule?: WorkSchedule;
  developers: Option[];
  developerId?: string;
  onDone?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const pattern = schedule?.weeklyPattern ?? DEFAULT_WEEKLY_PATTERN;

  const form = useApiForm({
    schema: schedule ? updateWorkScheduleSchema : createWorkScheduleSchema,
    read: (data) => ({
      ...(!schedule && { developerId: data.get("developerId") }),
      validFrom: data.get("validFrom") || undefined,
      ...(schedule && { validUntil: data.get("validUntil") }),
      weeklyPattern: WEEKDAY_LABELS.map((_, i) => hoursOrNull(data.get(`day${i}`)) ?? 0),
      focusFactor: percentToFraction(data.get("focusFactor")),
      ...(schedule && { version: schedule.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return schedule
        ? apiMutation<WorkSchedule>("PATCH", `/capacity/schedules/${schedule.id}`, input)
        : apiMutation<WorkSchedule>("POST", "/capacity/schedules", input);
    },
    onSuccess: () => {
      setSaved(true);
      if (onDone) router.push(onDone);
      router.refresh();
    },
  });
  const err = form.fieldErrors;
  const dayError = Object.entries(err).find(([path]) => path.startsWith("weeklyPattern"))?.[1];

  return (
    <form key={schedule ? `${schedule.id}-${schedule.version}` : "new"} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && schedule ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Jornada salva. A capacidade já usa a nova jornada." />}
      {!schedule && (
        <Field label="Pessoa" htmlFor="ws-dev" required error={err.developerId}>
          <Select id="ws-dev" name="developerId" defaultValue={developerId ?? ""} aria-invalid={Boolean(err.developerId)}>
            <option value="" disabled>
              Selecione…
            </option>
            <OptionList options={developers} />
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Início da vigência"
          htmlFor="ws-from"
          required
          error={err.validFrom}
          hint={schedule ? undefined : "A jornada vigente é encerrada no dia anterior."}
        >
          <Input id="ws-from" name="validFrom" type="date" defaultValue={schedule?.validFrom} aria-invalid={Boolean(err.validFrom)} />
        </Field>
        {schedule ? (
          <Field label="Fim da vigência" htmlFor="ws-until" error={err.validUntil} hint="Vazio = sem fim.">
            <Input id="ws-until" name="validUntil" type="date" defaultValue={schedule.validUntil ?? ""} />
          </Field>
        ) : null}
        <Field label="Fator de foco (%)" htmlFor="ws-ff" required error={err.focusFactor} hint="Parte da jornada para trabalho planejado.">
          <Input
            id="ws-ff"
            name="focusFactor"
            inputMode="decimal"
            className="font-mono"
            defaultValue={fractionToPercentInput(schedule?.focusFactor ?? DEFAULT_FOCUS_FACTOR)}
            aria-invalid={Boolean(err.focusFactor)}
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium">Horas por dia</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col gap-1">
              <Label htmlFor={`ws-day${i}`} className="text-2xs text-muted-foreground uppercase">
                {label}
              </Label>
              <Input id={`ws-day${i}`} name={`day${i}`} inputMode="decimal" className="font-mono" defaultValue={hoursInput(pattern[i])} />
            </div>
          ))}
        </div>
        {dayError && (
          <p className="text-xs text-danger-fg" role="alert">
            {dayError}
          </p>
        )}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : schedule ? "Salvar jornada" : "Cadastrar jornada"}
        </Button>
      </div>
    </form>
  );
}
