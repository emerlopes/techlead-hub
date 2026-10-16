"use client";

import type { Risk } from "@tlh/shared-contracts";
import { CircleCheck, CircleSlash, Eye, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Situação do risco (§16.2). Resolver não conclui entregas nem atividades associadas (§16.4) e o
 * registro continua consultável (RN-008).
 */
export function RiskStatusActions({ risk }: { risk: Risk }) {
  const action = useApiAction();
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const patch = (body: object) => action.run(() => apiMutation("PATCH", `/risks/${risk.id}`, { ...body, version: risk.version }));
  const closed = risk.status === "RESOLVED" || risk.status === "CANCELLED";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {closed ? (
          <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch({ status: "OPEN" })}>
            <RotateCcw aria-hidden />
            Reabrir
          </Button>
        ) : (
          <>
            {risk.status === "OPEN" && (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch({ status: "MONITORING" })}>
                <Eye aria-hidden />
                Monitorar
              </Button>
            )}
            <ConfirmButton question="Cancelar o registro?" confirmLabel="Cancelar registro" pending={action.pending} onConfirm={() => patch({ status: "CANCELLED" })}>
              <CircleSlash aria-hidden />
              Cancelar
            </ConfirmButton>
            <Button size="sm" disabled={action.pending} aria-expanded={resolving} onClick={() => setResolving((v) => !v)}>
              <CircleCheck aria-hidden />
              Resolver
            </Button>
          </>
        )}
      </div>
      {resolving && !closed && (
        <form
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setResolving(false);
            patch({ status: "RESOLVED", resolutionNote: note });
          }}
        >
          <Input
            aria-label="Como foi resolvido"
            placeholder="Como foi resolvido (opcional)"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <Button type="submit" variant="secondary" disabled={action.pending}>
            Resolver
          </Button>
        </form>
      )}
      <FormError error={action.error} />
    </div>
  );
}
