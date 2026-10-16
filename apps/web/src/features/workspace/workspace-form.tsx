"use client";

import { updateWorkspaceSchema, type Workspace } from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { TimeZoneSelect } from "./time-zone-select";

export function WorkspaceForm({ workspace, timeZones }: { workspace: Workspace; timeZones: string[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useApiForm({
    schema: updateWorkspaceSchema,
    read: (data) => ({
      name: data.get("name"),
      timezone: data.get("timezone"),
      version: workspace.version,
    }),
    submit: (input) => {
      setSaved(false);
      return apiMutation<Workspace>("PATCH", "/workspace", input);
    },
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });
  const err = form.fieldErrors;

  return (
    // `key` remonta o formulário quando outra versão chega do servidor.
    <form key={workspace.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError
        error={form.error}
        action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined}
      />
      {saved && !form.error && <Alert tone="success" title="Workspace atualizado." />}
      <Field label="Nome" htmlFor="name" required error={err.name}>
        <Input id="name" name="name" defaultValue={workspace.name} aria-invalid={Boolean(err.name)} />
      </Field>
      <Field label="Fuso horário" htmlFor="timezone" error={err.timezone} hint="Base para calendários e datas de negócio.">
        <TimeZoneSelect id="timezone" name="timezone" defaultValue={workspace.timezone} zones={timeZones} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
