"use client";

import { createTeamDeveloperSchema, createTeamProjectSchema } from "@tlh/shared-contracts";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox, Label, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";

const variants = {
  "team-projects": { schema: createTeamProjectSchema, primary: true },
  "team-developers": { schema: createTeamDeveloperSchema, primary: false },
} as const;

/**
 * Nova associação a partir de qualquer lado (time, projeto ou desenvolvedor): `fixed` traz o lado
 * conhecido e o `Select` escolhe o outro.
 */
export function AddAssociationForm({
  endpoint,
  fixed,
  field,
  label,
  options,
}: {
  endpoint: keyof typeof variants;
  fixed: Record<string, string>;
  field: string;
  label: string;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();
  const id = useId();
  const variant = variants[endpoint];
  const form = useApiForm({
    schema: variant.schema,
    read: (data) => ({
      ...fixed,
      [field]: data.get(field),
      ...(variant.primary && { isPrimary: data.get("isPrimary") === "on" }),
    }),
    submit: (input) => apiMutation("POST", `/${endpoint}`, input),
    onSuccess: () => router.refresh(),
  });

  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma opção ativa disponível para associar.</p>;
  }

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          name={field}
          aria-label={label}
          defaultValue=""
          className="w-auto min-w-0 flex-1"
          aria-invalid={Boolean(form.fieldErrors[field])}
        >
          <option value="" disabled>
            {label}…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
        {variant.primary && (
          <span className="flex items-center gap-1.5">
            <Checkbox id={`${id}-primary`} name="isPrimary" />
            <Label htmlFor={`${id}-primary`} className="font-normal">
              Principal
            </Label>
          </span>
        )}
        <Button type="submit" size="md" variant="secondary" disabled={form.pending}>
          <Plus aria-hidden />
          Associar
        </Button>
      </div>
      <FormError error={form.error} />
    </form>
  );
}
