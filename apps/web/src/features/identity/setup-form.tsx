"use client";

import { DEFAULT_TIMEZONE, type Me, PASSWORD_MIN_LENGTH, setupSchema } from "@tlh/shared-contracts";
import { Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { TimeZoneSelect } from "../workspace/time-zone-select";
import { PasswordInput } from "./password-input";

// A confirmação é só da interface; a API recebe o contrato `setupSchema`.
const setupFormSchema = setupSchema
  .extend({ passwordConfirmation: z.string() })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "As senhas não conferem.",
  })
  .transform((values) => {
    const input: Partial<typeof values> = { ...values };
    delete input.passwordConfirmation;
    return input as z.output<typeof setupSchema>;
  });

export function SetupForm({ timeZones }: { timeZones: string[] }) {
  const router = useRouter();
  const form = useApiForm({
    schema: setupFormSchema,
    read: (data) => Object.fromEntries(data),
    submit: (input) => apiMutation<Me>("POST", "/auth/setup", input),
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
  });
  const err = form.fieldErrors;

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          Proprietário
        </legend>
        <Field label="Nome" htmlFor="name" required error={err.name}>
          <Input id="name" name="name" autoComplete="name" autoFocus aria-invalid={Boolean(err.name)} />
        </Field>
        <Field label="E-mail" htmlFor="email" required error={err.email} hint="Usado para entrar.">
          <Input id="email" name="email" type="email" autoComplete="username" aria-invalid={Boolean(err.email)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Senha"
            htmlFor="password"
            required
            error={err.password}
            hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
          >
            <PasswordInput id="password" name="password" autoComplete="new-password" aria-invalid={Boolean(err.password)} />
          </Field>
          <Field label="Confirmar senha" htmlFor="passwordConfirmation" required error={err.passwordConfirmation}>
            <PasswordInput
              id="passwordConfirmation"
              name="passwordConfirmation"
              autoComplete="new-password"
              aria-invalid={Boolean(err.passwordConfirmation)}
            />
          </Field>
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          Workspace
        </legend>
        <Field label="Nome do workspace" htmlFor="workspaceName" required error={err.workspaceName}>
          <Input id="workspaceName" name="workspaceName" aria-invalid={Boolean(err.workspaceName)} />
        </Field>
        <Field
          label="Fuso horário"
          htmlFor="timezone"
          error={err.timezone}
          hint="Base para calendários e datas de negócio."
        >
          <TimeZoneSelect id="timezone" name="timezone" defaultValue={DEFAULT_TIMEZONE} zones={timeZones} />
        </Field>
      </fieldset>
      <Button type="submit" disabled={form.pending} className="w-full">
        <Rocket aria-hidden />
        {form.pending ? "Configurando…" : "Concluir configuração"}
      </Button>
    </form>
  );
}
