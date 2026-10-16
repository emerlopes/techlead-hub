import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetupForm } from "@/features/identity/setup-form";
import { loadAuthStatus } from "@/lib/api/server";
import { listTimeZones } from "@/lib/time-zones";
import { AuthCardSkeleton } from "../auth-card-skeleton";

export const metadata: Metadata = { title: "Configuração inicial · Tech Lead Hub" };

export default function SetupPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton fields={5} />}>
      <SetupGate />
    </Suspense>
  );
}

/** Configuração inicial do proprietário (§34.1, §44.1): disponível só enquanto não há usuário. */
async function SetupGate() {
  const status = await loadAuthStatus();
  if (!status.ok) return <ApiUnavailable />;
  if (!status.data.setupRequired) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuração inicial</CardTitle>
        <CardDescription>
          Crie o acesso do proprietário e o seu workspace. Não há cadastro público: esta etapa
          acontece uma única vez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm timeZones={listTimeZones()} />
      </CardContent>
    </Card>
  );
}
