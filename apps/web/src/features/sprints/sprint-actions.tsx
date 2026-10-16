"use client";

import { type Sprint, startSprintSchema } from "@tlh/shared-contracts";
import { CircleSlash, Lock, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { useApiForm } from "@/lib/api/use-api-form";

/**
 * Iniciar (confirmando nome e objetivo), cancelar e encerrar (§11.2). Encerrar não conclui
 * histórias (RN-011, CA-009).
 */
export function SprintActions({ sprint }: { sprint: Sprint }) {
  const action = useApiAction();
  if (sprint.status === "CLOSED" || sprint.status === "CANCELLED") return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmButton
          question="Cancelar a sprint? O escopo fica no histórico."
          confirmLabel="Cancelar sprint"
          pending={action.pending}
          onConfirm={() =>
            action.run(() => apiMutation("PATCH", `/sprints/${sprint.id}`, { status: "CANCELLED", version: sprint.version }))
          }
        >
          <CircleSlash aria-hidden />
          Cancelar
        </ConfirmButton>
        {sprint.status === "PLANNED" ? (
          <Link href="#iniciar" className={buttonVariants({ size: "sm" })}>
            <Play aria-hidden />
            Iniciar sprint
          </Link>
        ) : (
          <ConfirmButton
            variant="primary"
            question="Encerrar? Pendentes continuam abertos para outra sprint."
            confirmLabel="Encerrar sprint"
            pending={action.pending}
            onConfirm={() => action.run(() => apiMutation("POST", `/sprints/${sprint.id}/close`, { version: sprint.version }))}
          >
            <Lock aria-hidden />
            Encerrar sprint
          </ConfirmButton>
        )}
      </div>
      <FormError error={action.error} />
    </div>
  );
}

/** Nome e objetivo são confirmados no início — sprints geradas pela release chegam com nome provisório. */
export function StartSprintForm({ sprint }: { sprint: Sprint }) {
  const router = useRouter();
  const form = useApiForm({
    schema: startSprintSchema,
    read: (data) => ({ name: data.get("name"), goal: data.get("goal"), version: sprint.version }),
    submit: (input) => apiMutation("POST", `/sprints/${sprint.id}/start`, input),
    onSuccess: () => router.refresh(),
  });
  const err = form.fieldErrors;
  return (
    <form
      onSubmit={form.onSubmit}
      noValidate
      aria-label="Iniciar sprint"
      className="flex flex-col gap-3"
    >
      <FormError error={form.error} action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
      <Field label="Nome" htmlFor="start-name" required error={err.name}>
        <Input id="start-name" name="name" defaultValue={sprint.name} maxLength={80} aria-invalid={Boolean(err.name)} />
      </Field>
      <Field label="Objetivo" htmlFor="start-goal" required error={err.goal} hint="O que o time se compromete a alcançar nesta sprint.">
        <Textarea id="start-goal" name="goal" defaultValue={sprint.goal ?? ""} maxLength={1000} aria-invalid={Boolean(err.goal)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Play aria-hidden />
          {form.pending ? "Iniciando…" : "Iniciar sprint"}
        </Button>
      </div>
    </form>
  );
}
