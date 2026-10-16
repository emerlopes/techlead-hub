"use client";

import {
  createJournalEntrySchema,
  journalCategories,
  type JournalEntry,
  updateJournalEntrySchema,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Button } from "@/components/ui/button";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  type LinkKind,
  linkFields,
  linkGroups,
  type LinkOptions,
  type LinkSelection,
  readLinks,
  selectionOf,
} from "@/features/context/link-options";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { journalCategory } from "@/lib/design-system/status";

/** Contextos de um acontecimento (§17.3). */
const kinds = ["teams", "projects", "sprints", "releases", "workItems", "risks"] as const satisfies readonly LinkKind[];

/**
 * Registro rápido e edição de acontecimento (§17.3). Categoria e descrição obrigatórias; data
 * preenchida com hoje se vazia (§17.4). Registro idêntico no mesmo dia é recusado.
 */
export function JournalForm({
  entry,
  options,
  preselected = {},
  onDone,
}: {
  entry?: JournalEntry;
  options: LinkOptions;
  preselected?: LinkSelection;
  onDone?: () => void;
}) {
  const router = useRouter();
  // Recria o formulário de registro rápido vazio após salvar.
  const [round, setRound] = useState(0);
  const linked = entry ? selectionOf(entry.links) : preselected;
  const form = useApiForm({
    schema: entry ? updateJournalEntrySchema : createJournalEntrySchema,
    read: (data) => ({
      category: data.get("category") || undefined,
      description: data.get("description"),
      occurredOn: data.get("occurredOn") || undefined,
      links: readLinks(data, kinds),
      ...(entry && { version: entry.version }),
    }),
    submit: (input) =>
      entry ? apiMutation("PATCH", `/journal/${entry.id}`, input) : apiMutation("POST", "/journal", input),
    onSuccess: () => {
      router.refresh();
      setRound((r) => r + 1);
      onDone?.();
    },
  });
  const err = form.fieldErrors;
  const prefix = entry ? `je-${entry.id}` : "je-new";
  const hasPreselection = Object.values(linked).some((ids) => ids && ids.length > 0);

  return (
    <form key={entry?.version ?? round} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-3">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && entry ? <RetryButton label="Recarregar" /> : undefined} />
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr_10rem]">
        <Field label="Categoria" htmlFor={`${prefix}-category`} required error={err.category}>
          <Select id={`${prefix}-category`} name="category" defaultValue={entry?.category ?? ""} aria-invalid={Boolean(err.category)}>
            <option value="" disabled>
              Selecione…
            </option>
            {journalCategories.map((value) => (
              <option key={value} value={value}>
                {journalCategory[value].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="O que aconteceu" htmlFor={`${prefix}-description`} required error={err.description} className="sm:row-span-2">
          <Textarea
            id={`${prefix}-description`}
            name="description"
            defaultValue={entry?.description}
            maxLength={5000}
            aria-invalid={Boolean(err.description)}
          />
        </Field>
        <Field label="Data" htmlFor={`${prefix}-date`} error={err.occurredOn} hint={entry ? undefined : "Vazio = hoje."}>
          <Input id={`${prefix}-date`} name="occurredOn" type="date" defaultValue={entry?.occurredOn ?? ""} />
        </Field>
      </div>
      <details open={hasPreselection || undefined} className="group">
        <summary className="pressable w-fit cursor-pointer rounded text-xs font-medium text-muted-foreground hover:text-foreground">
          Vincular contextos
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kinds.map((kind) => (
            <CheckboxGroup
              key={kind}
              legend={linkGroups[kind].legend}
              name={linkFields[kind]}
              idPrefix={`${prefix}-${kind}`}
              options={options[kind]}
              checked={new Set(linked[kind] ?? [])}
              empty={linkGroups[kind].empty}
              error={err[`links.${linkFields[kind]}`]}
            />
          ))}
        </div>
      </details>
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            Voltar
          </Button>
        )}
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : entry ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
