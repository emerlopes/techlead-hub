"use client";

import { addReleaseItemSchema, type WorkItem } from "@tlh/shared-contracts";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { useApiForm } from "@/lib/api/use-api-form";

/** Associar item à release (§12.2): pode vir de qualquer time (CA-008) e estar em outras releases (RN-009). */
export function AddReleaseItemForm({ releaseId, candidates }: { releaseId: string; candidates: WorkItem[] }) {
  const router = useRouter();
  const id = useId();
  const form = useApiForm({
    schema: addReleaseItemSchema,
    read: (data) => ({ workItemId: data.get("workItemId"), isRequired: data.get("isRequired") === "on" }),
    submit: (input) => apiMutation("POST", `/releases/${releaseId}/items`, input),
    onSuccess: () => router.refresh(),
  });
  if (candidates.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum item aberto disponível. Cadastre itens em Entregas.</p>;
  }
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select name="workItemId" defaultValue="" aria-label="Item da release" className="w-auto min-w-0 flex-1">
          <option value="" disabled>
            Selecione um item…
          </option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.externalKey} · {item.title}
              {item.tracking.executingTeam ? ` (${item.tracking.executingTeam.code})` : ""}
            </option>
          ))}
        </Select>
        <span className="flex items-center gap-1.5">
          <Checkbox id={`${id}-required`} name="isRequired" defaultChecked />
          <Label htmlFor={`${id}-required`} className="font-normal">
            Obrigatório
          </Label>
        </span>
        <Button type="submit" variant="secondary" disabled={form.pending}>
          <Plus aria-hidden />
          Adicionar
        </Button>
      </div>
      <FormError error={form.error} />
    </form>
  );
}

/** Alterna obrigatório × opcional (§12.2). */
export function RequiredToggle({ releaseId, workItemId, isRequired }: { releaseId: string; workItemId: string; isRequired: boolean }) {
  const action = useApiAction();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={action.pending}
        onClick={() =>
          action.run(() => apiMutation("PATCH", `/releases/${releaseId}/items/${workItemId}`, { isRequired: !isRequired }))
        }
      >
        {isRequired ? "Tornar opcional" : "Tornar obrigatório"}
      </Button>
      <FormError error={action.error} />
    </span>
  );
}
