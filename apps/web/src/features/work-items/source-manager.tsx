"use client";

import { createExternalSourceSchema, type ExternalSource, updateExternalSourceSchema } from "@tlh/shared-contracts";
import { Pencil, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteButton } from "@/components/app/delete-button";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";

/** Origens dos itens externos (§13.3). A URL base é só referência — sem integração (§13.6). */
export function SourceManager({ sources }: { sources: ExternalSource[] }) {
  const router = useRouter();
  const [round, setRound] = useState(0);
  const form = useApiForm({
    schema: createExternalSourceSchema,
    read: (data) => ({ name: data.get("name"), baseUrl: data.get("baseUrl") }),
    submit: (input) => apiMutation("POST", "/external-sources", input),
    onSuccess: () => {
      setRound((r) => r + 1);
      router.refresh();
    },
  });
  return (
    <div className="flex flex-col gap-3">
      {sources.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma origem cadastrada.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sources.map((source) => (
            <SourceRow key={`${source.id}-${source.version}`} source={source} />
          ))}
        </ul>
      )}
      <form key={round} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Input name="name" aria-label="Nome da origem" placeholder="Ex.: Jira" maxLength={60} className="w-40" />
          <Input name="baseUrl" type="url" aria-label="URL base" placeholder="https://… (opcional)" maxLength={500} className="min-w-0 flex-1" />
          <Button type="submit" variant="secondary" disabled={form.pending}>
            <Plus aria-hidden />
            Adicionar
          </Button>
        </div>
        <FormError error={form.error} />
      </form>
    </div>
  );
}

function SourceRow({ source }: { source: ExternalSource }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const form = useApiForm({
    schema: updateExternalSourceSchema,
    read: (data) => ({ name: data.get("name"), baseUrl: data.get("baseUrl"), version: source.version }),
    submit: (input) => apiMutation("PATCH", `/external-sources/${source.id}`, input),
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });
  if (editing) {
    return (
      <li className="py-2">
        <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Input name="name" aria-label="Nome da origem" defaultValue={source.name} maxLength={60} className="w-40" />
            <Input name="baseUrl" type="url" aria-label="URL base" defaultValue={source.baseUrl ?? ""} maxLength={500} className="min-w-0 flex-1" />
            <Button type="submit" variant="secondary" disabled={form.pending}>
              <Save aria-hidden />
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Voltar
            </Button>
          </div>
          <FormError error={form.error} />
        </form>
        <div className="mt-2 flex justify-end">
          {source.workItemCount > 0 ? (
            <p className="text-xs text-muted-foreground">Para excluir, remova antes {source.workItemCount === 1 ? "o item" : `os ${source.workItemCount} itens`} desta origem.</p>
          ) : (
            <DeleteButton path={`/external-sources/${source.id}`} question="Excluir a origem definitivamente?" onDeleted={router.refresh} />
          )}
        </div>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{source.name}</span>
        <span className="truncate text-xs text-muted-foreground">{source.baseUrl ?? "Sem URL base"}</span>
      </div>
      <span className="text-xs text-muted-foreground tabular">{source.workItemCount} itens</span>
      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${source.name}`} onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
      </Button>
    </li>
  );
}
