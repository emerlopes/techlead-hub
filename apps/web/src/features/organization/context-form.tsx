"use client";

import { createTeamSchema, updateTeamSchema } from "@tlh/shared-contracts";
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

type Entity = { id: string; name: string; code: string; description: string | null; version: number };

const copy = {
  team: { path: "/teams", noun: "Time", placeholder: "Pagamentos", codeHint: "Ex.: PAY. Único entre os times (RN-015)." },
  project: { path: "/projects", noun: "Projeto", placeholder: "Checkout", codeHint: "Ex.: CHK. Único entre os projetos (RN-015)." },
} as const;

/**
 * Cadastro e edição de time ou projeto — mesmos campos (§7.3, §8.3). Times e projetos usam
 * schemas equivalentes em `@tlh/shared-contracts`.
 */
export function ContextForm({ kind, entity }: { kind: keyof typeof copy; entity?: Entity }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const c = copy[kind];
  const form = useApiForm({
    schema: entity ? updateTeamSchema : createTeamSchema,
    read: (data) => ({
      name: data.get("name"),
      code: data.get("code"),
      description: data.get("description"),
      ...(entity && { version: entity.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return entity
        ? apiMutation<Entity>("PATCH", `${c.path}/${entity.id}`, input)
        : apiMutation<Entity>("POST", c.path, input);
    },
    onSuccess: (result) => {
      if (entity) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`${c.path}/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;
  const prefix = `${kind}-`;

  return (
    <form key={entity?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError
        error={form.error}
        action={form.error?.code === "CONFLICT" && !err.code ? <RetryButton label="Recarregar" /> : undefined}
      />
      {saved && !form.error && <Alert tone="success" title={`${c.noun} atualizado.`} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Nome" htmlFor={`${prefix}name`} required error={err.name}>
          <Input
            id={`${prefix}name`}
            name="name"
            defaultValue={entity?.name}
            placeholder={c.placeholder}
            aria-invalid={Boolean(err.name)}
          />
        </Field>
        <Field label="Código" htmlFor={`${prefix}code`} required error={err.code}>
          <Input
            id={`${prefix}code`}
            name="code"
            defaultValue={entity?.code}
            className="font-mono uppercase"
            maxLength={12}
            autoCapitalize="characters"
            aria-invalid={Boolean(err.code)}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{c.codeHint}</p>
      <Field label="Descrição" htmlFor={`${prefix}description`} error={err.description}>
        <Textarea
          id={`${prefix}description`}
          name="description"
          defaultValue={entity?.description ?? ""}
          maxLength={500}
          aria-invalid={Boolean(err.description)}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : entity ? "Salvar" : `Criar ${c.noun.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
