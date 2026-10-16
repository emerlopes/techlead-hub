"use client";

import type { Release } from "@tlh/shared-contracts";
import { CircleSlash, Play, Rocket } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Iniciar, encerrar como entregue ou cancelar (§12.2). Encerrada preserva o escopo. */
export function ReleaseActions({ release }: { release: Release }) {
  const action = useApiAction();
  if (release.status === "RELEASED" || release.status === "CANCELLED") return null;
  const patch = (status: Release["status"]) =>
    action.run(() => apiMutation("PATCH", `/releases/${release.id}`, { status, version: release.version }));
  const pending = release.progress.required - release.progress.requiredDone;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmButton question="Cancelar a release?" confirmLabel="Cancelar release" pending={action.pending} onConfirm={() => patch("CANCELLED")}>
          <CircleSlash aria-hidden />
          Cancelar
        </ConfirmButton>
        {release.status === "PLANNED" && (
          <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch("IN_PROGRESS")}>
            <Play aria-hidden />
            Iniciar
          </Button>
        )}
        <ConfirmButton
          variant="primary"
          question={pending > 0 ? `${pending} obrigatório(s) pendente(s). Encerrar mesmo assim?` : "Encerrar como entregue?"}
          confirmLabel="Encerrar"
          pending={action.pending}
          onConfirm={() => patch("RELEASED")}
        >
          <Rocket aria-hidden />
          Encerrar como entregue
        </ConfirmButton>
      </div>
      <FormError error={action.error} />
    </div>
  );
}
