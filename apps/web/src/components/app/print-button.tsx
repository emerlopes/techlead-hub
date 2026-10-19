"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Imprime a página (ou salva em PDF pelo navegador). O shell e as ações somem na impressão. */
export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden />
      {label}
    </Button>
  );
}
