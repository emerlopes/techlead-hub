"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "./button";

/**
 * Ação que pede confirmação explícita antes de executar (ações destrutivas ou que encerram algo).
 * Primeiro clique abre a confirmação no próprio lugar; nada é feito sem o segundo clique.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Confirmar",
  question = "Tem certeza?",
  onConfirm,
  pending,
  variant = "outline",
  size = "sm",
  ...props
}: Omit<ButtonProps, "onClick"> & {
  confirmLabel?: string;
  question?: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant={variant} size={size} disabled={pending} onClick={() => setAsking(true)} {...props}>
        {children}
      </Button>
    );
  }
  return (
    <span role="group" aria-label={question} className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{question}</span>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)} disabled={pending}>
        Voltar
      </Button>
      <Button
        variant="danger"
        size={size}
        disabled={pending}
        autoFocus
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
    </span>
  );
}
