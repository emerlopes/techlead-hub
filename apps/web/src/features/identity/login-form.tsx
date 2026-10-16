"use client";

import { loginSchema, type Me } from "@tlh/shared-contracts";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useApiForm({
    schema: loginSchema,
    read: (data) => ({ email: data.get("email"), password: data.get("password") }),
    submit: (input) => apiMutation<Me>("POST", "/auth/login", input),
    onSuccess: () => {
      router.replace(next);
      router.refresh();
    },
  });

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} />
      <Field label="E-mail" htmlFor="email" error={form.fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={Boolean(form.fieldErrors.email)}
        />
      </Field>
      <Field label="Senha" htmlFor="password" error={form.fieldErrors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(form.fieldErrors.password)}
        />
      </Field>
      <Button type="submit" disabled={form.pending} className="w-full">
        <LogIn aria-hidden />
        {form.pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
