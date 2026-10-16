"use client";

import { type ContextRef, createSprintSchema, type Sprint, type SprintDetail, updateSprintSchema } from "@tlh/shared-contracts";
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

/** Criar e editar sprint (§11.2). O time responsável é definido na criação (RN-016). */
export function SprintForm({ sprint, teams }: { sprint?: Sprint; teams: ContextRef[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const locked = sprint?.status === "CLOSED" || sprint?.status === "CANCELLED";
  const form = useApiForm({
    schema: sprint ? updateSprintSchema : createSprintSchema,
    read: (data) => ({
      ...(!sprint && { teamId: data.get("teamId") }),
      name: data.get("name"),
      goal: data.get("goal"),
      ...(!locked && { startDate: data.get("startDate"), endDate: data.get("endDate") }),
      ...(sprint && { version: sprint.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return sprint
        ? apiMutation<SprintDetail>("PATCH", `/sprints/${sprint.id}`, input)
        : apiMutation<SprintDetail>("POST", "/sprints", input);
    },
    onSuccess: (result) => {
      if (sprint) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/sprints/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={sprint?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && sprint ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Sprint atualizada." />}
      <div className="grid gap-4 sm:grid-cols-2">
        {!sprint && (
          <Field label="Time responsável" htmlFor="sp-team" required error={err.teamId} hint="Uma sprint pertence a um time (RN-016).">
            <Select id="sp-team" name="teamId" defaultValue="" aria-invalid={Boolean(err.teamId)}>
              <option value="" disabled>
                Selecione…
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nome" htmlFor="sp-name" required error={err.name}>
          <Input id="sp-name" name="name" defaultValue={sprint?.name} maxLength={80} aria-invalid={Boolean(err.name)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início" htmlFor="sp-start" required error={err.startDate}>
          <Input id="sp-start" name="startDate" type="date" defaultValue={sprint?.startDate} disabled={locked} />
        </Field>
        <Field label="Fim" htmlFor="sp-end" required error={err.endDate}>
          <Input id="sp-end" name="endDate" type="date" defaultValue={sprint?.endDate} disabled={locked} />
        </Field>
      </div>
      <Field label="Objetivo" htmlFor="sp-goal" error={err.goal}>
        <Textarea id="sp-goal" name="goal" defaultValue={sprint?.goal ?? ""} maxLength={1000} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : sprint ? "Salvar" : "Criar sprint"}
        </Button>
      </div>
    </form>
  );
}
