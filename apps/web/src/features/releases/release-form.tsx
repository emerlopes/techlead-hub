"use client";

import { type ContextRef, createReleaseSchema, type Release, type ReleaseDetail, updateReleaseSchema } from "@tlh/shared-contracts";
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

/** Criar e editar release (§12.2). Compromisso e previsão separados; mudanças viram histórico (§12.5). */
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
      ...(release && { version: release.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return release
        ? apiMutation<ReleaseDetail>("PATCH", `/releases/${release.id}`, input)
        : apiMutation<ReleaseDetail>("POST", "/releases", input);
    },
    onSuccess: (result) => {
      if (release) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/releases/${result.id}`);
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
