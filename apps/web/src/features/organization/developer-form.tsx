"use client";

import { createDeveloperSchema, type DeveloperDetail, updateDeveloperSchema } from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";

/** Cadastro de referência (§10.3): sem login nem senha (DEC-002). */
export function DeveloperForm({ developer }: { developer?: DeveloperDetail }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useApiForm({
    schema: developer ? updateDeveloperSchema : createDeveloperSchema,
    read: (data) => ({
      name: data.get("name"),
      email: data.get("email"),
      roleDescription: data.get("roleDescription"),
      notes: data.get("notes"),
      ...(developer && { version: developer.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return developer
        ? apiMutation<DeveloperDetail>("PATCH", `/developers/${developer.id}`, input)
        : apiMutation<DeveloperDetail>("POST", "/developers", input);
    },
    onSuccess: (result) => {
      if (developer) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/developers/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={developer?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Cadastro atualizado." />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="dev-name" required error={err.name}>
          <Input id="dev-name" name="name" defaultValue={developer?.name} aria-invalid={Boolean(err.name)} />
        </Field>
        <Field label="Papel" htmlFor="dev-role" error={err.roleDescription} hint="Ex.: Backend, Mobile, QA.">
          <Input id="dev-role" name="roleDescription" defaultValue={developer?.roleDescription ?? ""} maxLength={120} />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="dev-email" error={err.email} hint="Opcional. Só para referência — não dá acesso ao sistema.">
        <Input
          id="dev-email"
          name="email"
          type="email"
          defaultValue={developer?.email ?? ""}
          aria-invalid={Boolean(err.email)}
        />
      </Field>
      <Field label="Anotações" htmlFor="dev-notes" error={err.notes} hint="Não use para avaliação de desempenho (§10.4).">
        <Textarea id="dev-notes" name="notes" defaultValue={developer?.notes ?? ""} maxLength={2000} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : developer ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
