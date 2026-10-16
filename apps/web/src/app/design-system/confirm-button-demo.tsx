"use client";

import { Archive } from "lucide-react";
import { useState } from "react";
import { ConfirmButton } from "@/components/ui/confirm-button";

/** Exemplo interativo: o showcase é Server Component e não pode passar `onConfirm`. */
export function ConfirmButtonDemo() {
  const [done, setDone] = useState(false);
  return done ? (
    <span className="text-xs text-muted-foreground">Confirmado.</span>
  ) : (
    <ConfirmButton question="Arquivar o projeto?" confirmLabel="Arquivar" onConfirm={() => setDone(true)}>
      <Archive aria-hidden />
      Arquivar
    </ConfirmButton>
  );
}
