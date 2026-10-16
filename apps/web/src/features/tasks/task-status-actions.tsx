"use client";

import type { Task } from "@tlh/shared-contracts";
import { CircleCheck, CircleSlash, OctagonX, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/**
 * Transições de situação (§6.2, §6.4). Concluir usa `POST /tasks/{id}/complete` e tira a atividade
 * da fila de foco; não resolve histórias, riscos ou impedimentos associados (§6.8).
 */
export function TaskStatusActions({ task }: { task: Task }) {
  const action = useApiAction();
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState("");
  const patch = (body: object) =>
    action.run(() => apiMutation("PATCH", `/tasks/${task.id}`, { ...body, version: task.version }));
  const closed = task.status === "DONE" || task.status === "CANCELLED";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {closed ? (
          <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch({ status: "TODO" })}>
            <RotateCcw aria-hidden />
            Reabrir
          </Button>
        ) : (
          <>
            {task.status === "TODO" && (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch({ status: "IN_PROGRESS" })}>
                <Play aria-hidden />
                Iniciar
              </Button>
            )}
            {task.status === "BLOCKED" ? (
              <Button variant="outline" size="sm" disabled={action.pending} onClick={() => patch({ status: "IN_PROGRESS" })}>
                <Play aria-hidden />
                Desbloquear
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={action.pending}
                aria-expanded={blocking}
                onClick={() => setBlocking((v) => !v)}
              >
                <OctagonX aria-hidden />
                Bloquear
              </Button>
            )}
            <ConfirmButton
              question="Cancelar a atividade?"
              confirmLabel="Cancelar atividade"
              pending={action.pending}
              onConfirm={() => patch({ status: "CANCELLED" })}
            >
              <CircleSlash aria-hidden />
              Cancelar
            </ConfirmButton>
            <Button
              size="sm"
              disabled={action.pending}
              onClick={() =>
                action.run(() => apiMutation("POST", `/tasks/${task.id}/complete`, { version: task.version }))
              }
            >
              <CircleCheck aria-hidden />
              Concluir
            </Button>
          </>
        )}
      </div>
      {blocking && task.status !== "BLOCKED" && !closed && (
        <form
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBlocking(false);
            patch({ status: "BLOCKED", blockedReason: reason });
          }}
        >
          <Input
            aria-label="Motivo do bloqueio"
            placeholder="Motivo do bloqueio (opcional)"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="md" variant="secondary" disabled={action.pending}>
            Bloquear
          </Button>
        </form>
      )}
      <FormError error={action.error} />
    </div>
  );
}
