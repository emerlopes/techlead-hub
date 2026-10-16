"use client";

import {
  blockingLevels,
  createRiskSchema,
  type Risk,
  type RiskDetail,
  riskProbabilities,
  riskSeverities,
  riskTypes,
  updateRiskSchema,
} from "@tlh/shared-contracts";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { Alert } from "@/components/ui/alert";
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
import { blockingLevel, riskProbability, riskSeverity, riskType } from "@/lib/design-system/status";
import { optionalValue } from "@/lib/form-data";

/** Contextos que um risco pode afetar (§16.4). */
const kinds = ["workItems", "sprints", "releases", "projects", "teams", "tasks"] as const satisfies readonly LinkKind[];

/**
 * Registrar e editar risco ou impedimento (§16.2). Pode afetar várias entregas e projetos (§16.4);
 * impedimento pode bloquear total ou parcialmente.
 */
export function RiskForm({ risk, options, preselected = {} }: { risk?: Risk; options: LinkOptions; preselected?: LinkSelection }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [type, setType] = useState<Risk["type"]>(risk?.type ?? "RISK");
  const linked = risk ? selectionOf(risk.links) : preselected;
  const form = useApiForm({
    schema: risk ? updateRiskSchema : createRiskSchema,
    read: (data) => ({
      title: data.get("title"),
      type: data.get("type"),
      severity: data.get("severity"),
      probability: optionalValue(data.get("probability")),
      blockingLevel: data.get("type") === "IMPEDIMENT" ? optionalValue(data.get("blockingLevel")) : null,
      impact: data.get("impact"),
      description: data.get("description"),
      mitigationPlan: data.get("mitigationPlan"),
      owner: data.get("owner"),
      identifiedAt: data.get("identifiedAt"),
      links: readLinks(data, kinds),
      ...(risk && { version: risk.version }),
    }),
    submit: (input) => {
      setSaved(false);
      return risk ? apiMutation<RiskDetail>("PATCH", `/risks/${risk.id}`, input) : apiMutation<RiskDetail>("POST", "/risks", input);
    },
    onSuccess: (result) => {
      if (risk) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/risks/${result.id}`);
      }
    },
  });
  const err = form.fieldErrors;

  return (
    <form key={risk?.version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError error={form.error} action={form.error?.code === "CONFLICT" && risk ? <RetryButton label="Recarregar" /> : undefined} />
      {saved && !form.error && <Alert tone="success" title="Registro atualizado." />}
      <Field label="Título" htmlFor="rk-title" required error={err.title}>
        <Input id="rk-title" name="title" defaultValue={risk?.title} maxLength={200} aria-invalid={Boolean(err.title)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Tipo" htmlFor="rk-type" error={err.type}>
          <Select id="rk-type" name="type" value={type} onChange={(e) => setType(e.target.value as Risk["type"])}>
            {riskTypes.map((value) => (
              <option key={value} value={value}>
                {riskType[value].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gravidade" htmlFor="rk-severity" error={err.severity}>
          <Select id="rk-severity" name="severity" defaultValue={risk?.severity ?? "MEDIUM"}>
            {riskSeverities.map((value) => (
              <option key={value} value={value}>
                {riskSeverity[value].label.replace("Gravidade ", "")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Probabilidade" htmlFor="rk-probability" error={err.probability}>
          <Select id="rk-probability" name="probability" defaultValue={risk?.probability ?? ""}>
            <option value="">Não avaliada</option>
            {riskProbabilities.map((value) => (
              <option key={value} value={value}>
                {riskProbability[value].label.replace("Probabilidade ", "")}
              </option>
            ))}
          </Select>
        </Field>
        {type === "IMPEDIMENT" ? (
          <Field label="Bloqueio" htmlFor="rk-blocking" error={err.blockingLevel} hint="§16.4.">
            <Select id="rk-blocking" name="blockingLevel" defaultValue={risk?.blockingLevel ?? "FULL"}>
              {blockingLevels.map((value) => (
                <option key={value} value={value}>
                  {blockingLevel[value].label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Identificado em" htmlFor="rk-identified" error={err.identifiedAt}>
            <Input id="rk-identified" name="identifiedAt" type="date" defaultValue={risk?.identifiedAt ?? ""} />
          </Field>
        )}
      </div>
      {type === "IMPEDIMENT" && (
        <Field label="Identificado em" htmlFor="rk-identified-imp" error={err.identifiedAt} hint="Vazio = hoje.">
          <Input id="rk-identified-imp" name="identifiedAt" type="date" defaultValue={risk?.identifiedAt ?? ""} className="sm:w-48" />
        </Field>
      )}
      <Field label="Impacto" htmlFor="rk-impact" error={err.impact}>
        <Textarea id="rk-impact" name="impact" defaultValue={risk?.impact ?? ""} maxLength={1000} className="min-h-16" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <Field label="Plano de mitigação" htmlFor="rk-mitigation" error={err.mitigationPlan}>
          <Textarea id="rk-mitigation" name="mitigationPlan" defaultValue={risk?.mitigationPlan ?? ""} maxLength={2000} className="min-h-16" />
        </Field>
        <Field label="Responsável pelo acompanhamento" htmlFor="rk-owner" error={err.owner}>
          <Input id="rk-owner" name="owner" defaultValue={risk?.owner ?? ""} maxLength={120} />
        </Field>
      </div>
      <Field label="Descrição" htmlFor="rk-description" error={err.description}>
        <Textarea id="rk-description" name="description" defaultValue={risk?.description ?? ""} maxLength={5000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map((kind) => (
          <CheckboxGroup
            key={kind}
            legend={linkGroups[kind].legend}
            name={linkFields[kind]}
            options={options[kind]}
            checked={new Set(linked[kind] ?? [])}
            empty={linkGroups[kind].empty}
            error={err[`links.${linkFields[kind]}`]}
          />
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={form.pending}>
          <Save aria-hidden />
          {form.pending ? "Salvando…" : risk ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
