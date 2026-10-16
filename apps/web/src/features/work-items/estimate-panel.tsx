"use client";

import { createEstimateSchema, type EffortEstimate, estimateConfidences, type WorkItemDetail } from "@tlh/shared-contracts";
import { Calculator } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { ConfidenceMeter } from "@/components/domain/confidence-meter";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiForm } from "@/lib/api/use-api-form";
import { confidence } from "@/lib/design-system/status";
import { formatDateTime, formatHours } from "@/lib/format";
import { hoursInput, hoursOrNull } from "@/lib/form-data";

/**
 * Estimativa e revisões (§21). Cada envio é uma nova linha: o histórico nunca é sobrescrito (RN-030,
 * CA-022). O esforço restante passa a valer no acompanhamento; story points ficam só como referência,
 * sem conversão em horas (§21.5).
 */
export function EstimatePanel({
  workItemId,
  version,
  estimates,
  closed,
  timeZone,
}: {
  workItemId: string;
  version: number;
  estimates: EffortEstimate[];
  closed: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const current = estimates[0];
  const form = useApiForm({
    schema: createEstimateSchema,
    read: (data) => ({
      estimatedHours: hoursOrNull(data.get("estimatedHours")) ?? undefined,
      remainingHours: hoursOrNull(data.get("remainingHours")),
      confidence: data.get("confidence"),
      storyPoints: hoursOrNull(data.get("storyPoints")),
      actualHours: hoursOrNull(data.get("actualHours")),
      reason: data.get("reason"),
      version,
    }),
    submit: (input) => apiMutation<WorkItemDetail>("POST", `/work-items/${workItemId}/estimates`, input),
    onSuccess: () => router.refresh(),
  });
  const err = form.fieldErrors;

  return (
    <div className="flex flex-col gap-4">
      {!closed && (
        <form key={version} onSubmit={form.onSubmit} noValidate className="flex flex-col gap-3">
          <FormError error={form.error} action={form.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Estimativa (h)" htmlFor="es-est" required error={err.estimatedHours}>
              <Input id="es-est" name="estimatedHours" inputMode="decimal" className="font-mono" defaultValue={hoursInput(current?.estimatedHours)} />
            </Field>
            <Field label="Restante (h)" htmlFor="es-rem" error={err.remainingHours} hint="Vazio = igual à estimativa.">
              <Input id="es-rem" name="remainingHours" inputMode="decimal" className="font-mono" />
            </Field>
            <Field label="Confiança" htmlFor="es-conf" required error={err.confidence}>
              <Select id="es-conf" name="confidence" defaultValue={current?.confidence ?? "MEDIUM"}>
                {estimateConfidences.map((c) => (
                  <option key={c} value={c}>
                    {confidence[c].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Story points" htmlFor="es-sp" error={err.storyPoints} hint="Referência; não vira horas.">
              <Input id="es-sp" name="storyPoints" inputMode="decimal" className="font-mono" defaultValue={hoursInput(current?.storyPoints)} />
            </Field>
            <Field label="Realizado (h)" htmlFor="es-act" error={err.actualHours} hint="Opcional, manual.">
              <Input id="es-act" name="actualHours" inputMode="decimal" className="font-mono" />
            </Field>
            <Field label="Motivo da revisão" htmlFor="es-reason" error={err.reason}>
              <Input id="es-reason" name="reason" maxLength={500} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={form.pending}>
              <Calculator aria-hidden />
              {form.pending ? "Registrando…" : current ? "Revisar estimativa" : "Registrar estimativa"}
            </Button>
          </div>
        </form>
      )}
      {estimates.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem estimativa: o item conta como não estimado na demanda (RN-039).</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {estimates.map((e, i) => (
            <li key={e.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-mono font-medium tabular">{formatHours(e.estimatedHours)}</span>
                <span className="tabular text-muted-foreground">restante {formatHours(e.remainingHours)}</span>
                {e.storyPoints !== null && <span className="tabular text-muted-foreground">{String(e.storyPoints).replace(".", ",")} pts</span>}
                {e.actualHours !== null && <span className="tabular text-muted-foreground">realizado {formatHours(e.actualHours)}</span>}
                <ConfidenceMeter value={e.confidence} />
                {i === 0 && <span className="text-2xs font-semibold text-capacity-fg uppercase">Vigente</span>}
              </div>
              <p className="text-2xs text-muted-foreground">
                {formatDateTime(e.estimatedAt, timeZone)}
                {e.reason && ` · ${e.reason}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
