"use client";

import { createWorkDependencySchema, type DependencyTypeValue, dependencyTypes, type WorkDependency } from "@tlh/shared-contracts";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { dependencyType as typeMeta } from "@/lib/design-system/status";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { optionalValue } from "@/lib/form-data";
import type { QueueCandidate } from "./plan-queue-editor";

/**
 * Nova dependência (§24.2). Entre itens: o predecessor condiciona o sucessor; externa: referência
 * livre e data de liberação quando conhecida (sem data, o sucessor fica sem previsão, CA-018).
 * Ciclos são rejeitados pela API (CA-017).
 */
export function DependencyForm({ items, successorId }: { items: readonly QueueCandidate[]; successorId?: string }) {
  const router = useRouter();
  const [type, setType] = useState<DependencyTypeValue>("FINISH_TO_START");
  const external = type === "EXTERNAL";
  const form = useApiForm({
    schema: createWorkDependencySchema,
    read: (data) => ({
      dependencyType: type,
      successorId: successorId ?? data.get("successorId"),
      predecessorId: external ? null : optionalValue(data.get("predecessorId")),
      externalReference: external ? data.get("externalReference") : undefined,
      expectedReleaseDate: external ? data.get("expectedReleaseDate") : undefined,
      notes: data.get("notes"),
    }),
    submit: (input) => apiMutation<WorkDependency>("POST", "/work-dependencies", input),
    onSuccess: () => router.refresh(),
  });
  const err = form.fieldErrors;
  const options = (exclude?: string) =>
    items
      .filter((i) => i.id !== exclude)
      .map((i) => (
        <option key={i.id} value={i.id}>
          {i.externalKey} · {i.title}
        </option>
      ));

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-3">
      <FormError error={form.error} />
      <Field label="Tipo" htmlFor="dep-type" required hint={typeMeta[type].description}>
        <Select id="dep-type" value={type} onChange={(e) => setType(e.target.value as DependencyTypeValue)}>
          {dependencyTypes.map((t) => (
            <option key={t} value={t}>
              {typeMeta[t].label}
            </option>
          ))}
        </Select>
      </Field>
      {!successorId && (
        <Field label="Item que depende (sucessor)" htmlFor="dep-succ" required error={err.successorId}>
          <Select id="dep-succ" name="successorId" defaultValue="" aria-invalid={Boolean(err.successorId)}>
            <option value="" disabled>
              Selecione…
            </option>
            {options()}
          </Select>
        </Field>
      )}
      {external ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label="Depende de" htmlFor="dep-ref" required error={err.externalReference} hint="Ex.: liberação da API do parceiro.">
            <Input id="dep-ref" name="externalReference" maxLength={200} aria-invalid={Boolean(err.externalReference)} />
          </Field>
          <Field label="Liberação prevista" htmlFor="dep-date" error={err.expectedReleaseDate} hint="Vazio = sem previsão.">
            <Input id="dep-date" name="expectedReleaseDate" type="date" />
          </Field>
        </div>
      ) : (
        <Field label="Predecessor" htmlFor="dep-pred" required error={err.predecessorId}>
          <Select id="dep-pred" name="predecessorId" defaultValue="" aria-invalid={Boolean(err.predecessorId)}>
            <option value="" disabled>
              Selecione…
            </option>
            {options(successorId)}
          </Select>
        </Field>
      )}
      <Field label="Observação" htmlFor="dep-notes" error={err.notes}>
        <Input id="dep-notes" name="notes" maxLength={1000} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={form.pending}>
          <Plus aria-hidden />
          {form.pending ? "Registrando…" : "Registrar dependência"}
        </Button>
      </div>
    </form>
  );
}
