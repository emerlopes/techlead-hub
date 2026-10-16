"use client";

import { Archive, Pause, Play, Power, PowerOff, UserCheck, UserX } from "lucide-react";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";

/** Ícones por chave: componentes não atravessam a fronteira Server → Client. */
const icons = {
  archive: Archive,
  pause: Pause,
  play: Play,
  power: Power,
  powerOff: PowerOff,
  userCheck: UserCheck,
  userX: UserX,
} as const;

export type StatusAction = {
  status: string;
  label: string;
  icon: keyof typeof icons;
  /** Pede confirmação (desativar, arquivar). */
  confirm?: string;
};

/** Transições de situação via `PATCH { status, version }` (times, projetos, desenvolvedores). */
export function StatusActions({ path, version, actions }: { path: string; version: number; actions: StatusAction[] }) {
  const action = useApiAction();
  const change = (status: string) => action.run(() => apiMutation("PATCH", path, { status, version }));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.map(({ status, label, icon, confirm }) => {
          const Icon = icons[icon];
          return confirm ? (
            <ConfirmButton key={status} question={confirm} confirmLabel={label} pending={action.pending} onConfirm={() => change(status)}>
              <Icon aria-hidden />
              {label}
            </ConfirmButton>
          ) : (
            <Button key={status} variant="outline" size="sm" disabled={action.pending} onClick={() => change(status)}>
              <Icon aria-hidden />
              {label}
            </Button>
          );
        })}
      </div>
      <FormError error={action.error} />
    </div>
  );
}
