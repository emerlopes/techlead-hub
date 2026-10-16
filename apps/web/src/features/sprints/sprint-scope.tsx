"use client";

import { addSprintItemSchema, type WorkItem } from "@tlh/shared-contracts";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";

/**
 * Planejar item na sprint (§11.2). Item em outra sprint só entra remanejado, preservando o
 * histórico (CA-007, RN-020).
 */
export function AddSprintItemForm({ sprintId, candidates }: { sprintId: string; candidates: WorkItem[] }) {
  const router = useRouter();
  const id = useId();
  const form = useApiForm({
    schema: addSprintItemSchema,
    read: (data) => ({ workItemId: data.get("workItemId"), move: data.get("move") === "on" }),
    submit: (input) => apiMutation("POST", `/sprints/${sprintId}/items`, input),
    onSuccess: () => router.refresh(),
  });
  if (candidates.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum item aberto disponível. Cadastre itens em Entregas.</p>;
  }
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select name="workItemId" defaultValue="" aria-label="Item a planejar" className="w-auto min-w-0 flex-1">
          <option value="" disabled>
            Selecione um item…
          </option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.externalKey} · {item.title}
              {item.currentSprint ? ` (em ${item.currentSprint.name})` : ""}
            </option>
          ))}
        </Select>
        <span className="flex items-center gap-1.5">
          <Checkbox id={`${id}-move`} name="move" />
          <Label htmlFor={`${id}-move`} className="font-normal">
            Remanejar de outra sprint
          </Label>
        </span>
        <Button type="submit" variant="secondary" disabled={form.pending}>
          <Plus aria-hidden />
          Planejar
        </Button>
      </div>
      <FormError error={form.error} />
    </form>
  );
}
