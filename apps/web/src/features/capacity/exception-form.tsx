"use client";

import {
  type AvailabilityException,
  availabilityExceptionTypes,
  type AvailabilityExceptionTypeValue,
  createAvailabilityExceptionSchema,
} from "@tlh/shared-contracts";
import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { availabilityExceptionType } from "@/lib/design-system/status";
import { hoursOrNull, optionalValue } from "@/lib/form-data";
import { OptionList, type Option } from "./options";

/**
 * Registrar ausência, folga, treinamento ou feriado (§19.2, §19.3). Sem pessoa = feriado do calendário
 * do workspace. Horas vazias = dia inteiro; ausência parcial reduz só a parte correspondente (§19.4).
 */
export function ExceptionForm({ developers, developerId }: { developers: Option[]; developerId?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState<AvailabilityException | null>(null);
  const [person, setPerson] = useState(developerId ?? "");
  const [type, setType] = useState<AvailabilityExceptionTypeValue>(developerId ? "VACATION" : "HOLIDAY");

  const form = useApiForm({
    schema: createAvailabilityExceptionSchema,
    read: (data) => ({
      developerId: optionalValue(data.get("developerId")),
      type,
      startDate: data.get("startDate"),
      endDate: data.get("endDate"),
      unavailableHours: hoursOrNull(data.get("unavailableHours")),
      description: data.get("description"),
    }),
    submit: (input) => {
      setSaved(null);
      return apiMutation<AvailabilityException>("POST", "/capacity/availability-exceptions", input);
    },
    onSuccess: (result) => {
      setSaved(result);
      router.refresh();
    },
  });
  const err = form.fieldErrors;
  const types = person ? availabilityExceptionTypes : (["HOLIDAY"] as const);

  return (
    <form key={saved?.id} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} />
      {saved && !form.error && <Alert tone="success" title="Registrado. A capacidade do período já considera a indisponibilidade." />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pessoa" htmlFor="ex-dev" error={err.developerId} hint="Vazio = feriado para todas as pessoas.">
          <Select
            id="ex-dev"
            name="developerId"
            value={person}
            onChange={(e) => {
              setPerson(e.target.value);
              if (!e.target.value) setType("HOLIDAY");
            }}
          >
            <OptionList options={developers} empty="Todas as pessoas (feriado)" />
          </Select>
        </Field>
        <Field label="Tipo" htmlFor="ex-type" required error={err.type}>
          <Select id="ex-type" value={type} onChange={(e) => setType(e.target.value as AvailabilityExceptionTypeValue)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {availabilityExceptionType[t].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Início" htmlFor="ex-start" required error={err.startDate}>
          <Input id="ex-start" name="startDate" type="date" aria-invalid={Boolean(err.startDate)} />
        </Field>
        <Field label="Fim" htmlFor="ex-end" error={err.endDate} hint="Vazio = um dia.">
          <Input id="ex-end" name="endDate" type="date" aria-invalid={Boolean(err.endDate)} />
        </Field>
        <Field label="Horas por dia" htmlFor="ex-hours" error={err.unavailableHours} hint="Vazio = dia inteiro.">
          <Input id="ex-hours" name="unavailableHours" inputMode="decimal" className="font-mono" aria-invalid={Boolean(err.unavailableHours)} />
        </Field>
      </div>
      <Field label="Motivo" htmlFor="ex-desc" error={err.description} hint="Genérico. Não registre informações pessoais sensíveis (§19.4).">
        <Input id="ex-desc" name="description" maxLength={200} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <CalendarPlus aria-hidden />
          {form.pending ? "Registrando…" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
