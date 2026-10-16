"use client";

import {
  type ContextRef,
  type CreateReleaseResult,
  createReleaseSchema,
  type Release,
  type ReleaseDetail,
  SPRINT_LENGTH_MAX,
  SPRINT_LENGTH_MIN,
  updateReleaseSchema,
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
import { withQuery } from "@/lib/search-params";

function intOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  return text === "" ? null : Number(text);
}

/**
 * Criar e editar release (§12.2). Compromisso e previsão separados; mudanças viram histórico (§12.5).
 * No cadastro, a duração da sprint gera o calendário de sprints dos times do projeto.
 */
export function ReleaseForm({ release, projects }: { release?: Release; projects: ContextRef[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useApiForm({
    schema: release ? updateReleaseSchema : createReleaseSchema,
    read: (data) => ({
      ...(!release && { projectId: data.get("projectId") }),
      name: data.get("name"),
      description: data.get("description"),
      committedDate: data.get("committedDate"),
      forecastDate: data.get("forecastDate"),
      ...(!release && { startDate: data.get("startDate"), sprintLengthDays: intOrNull(data.get("sprintLengthDays")) }),
      ...(release && { version: release.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return release
        ? apiMutation<ReleaseDetail>("PATCH", `/releases/${release.id}`, input).then((detail) => ({ ...detail, sprintGeneration: null }))
        : apiMutation<CreateReleaseResult>("POST", "/releases", input);
    },
    onSuccess: (result) => {
      if (release) {
        setSaved(true);
        router.refresh();
      } else {
        const generation = result.sprintGeneration;
        router.push(
          withQuery(`/releases/${result.id}`, {
            generated: generation ? String(generation.created) : undefined,
            skipped: generation?.skipped ? String(generation.skipped) : undefined,
          }),
        );
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={release?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && release ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Release atualizada." />}
      <div className="grid gap-4 sm:grid-cols-2">
        {!release && (
          <Field label="Projeto" htmlFor="rl-project" required error={err.projectId} hint="Uma release pertence a um projeto (RN-017).">
            <Select id="rl-project" name="projectId" defaultValue="" aria-invalid={Boolean(err.projectId)}>
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
        )}
        <Field label="Nome" htmlFor="rl-name" required error={err.name}>
          <Input id="rl-name" name="name" defaultValue={release?.name} maxLength={80} aria-invalid={Boolean(err.name)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prazo comprometido" htmlFor="rl-committed" error={err.committedDate}>
          <Input id="rl-committed" name="committedDate" type="date" defaultValue={release?.committedDate ?? ""} />
        </Field>
        <Field label="Previsão (manual)" htmlFor="rl-forecast" error={err.forecastDate} hint="A previsão calculada chega com o motor (§25).">
          <Input id="rl-forecast" name="forecastDate" type="date" defaultValue={release?.forecastDate ?? ""} />
        </Field>
      </div>
      {!release && (
        <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
          <legend className="px-1 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">Calendário de sprints</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início" htmlFor="rl-start" error={err.startDate} hint="Vazio = hoje.">
              <Input id="rl-start" name="startDate" type="date" aria-invalid={Boolean(err.startDate)} />
            </Field>
            <Field
              label="Duração da sprint (dias úteis)"
              htmlFor="rl-length"
              error={err.sprintLengthDays}
              hint="Ex.: 10 = duas semanas. Vazio = sem gerar sprints."
            >
              <Input
                id="rl-length"
                name="sprintLengthDays"
                type="number"
                inputMode="numeric"
                min={SPRINT_LENGTH_MIN}
                max={SPRINT_LENGTH_MAX}
                step={1}
                aria-invalid={Boolean(err.sprintLengthDays)}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada time participante do projeto recebe sprints planejadas em sequência até o prazo comprometido; períodos em que o
            time já tem sprint aberta são pulados. Nome e objetivo são definidos ao iniciar cada sprint.
          </p>
        </fieldset>
      )}
      <Field label="Descrição" htmlFor="rl-description" error={err.description}>
        <Textarea id="rl-description" name="description" defaultValue={release?.description ?? ""} maxLength={2000} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : release ? "Salvar" : "Criar release"}
        </Button>
      </div>
    </form>
  );
}
