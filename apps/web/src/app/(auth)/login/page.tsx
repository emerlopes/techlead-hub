import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/identity/login-form";
import { loadAuthStatus, loadMe } from "@/lib/api/server";
import { safeNextPath } from "@/lib/navigation";
import { AuthCardSkeleton } from "../auth-card-skeleton";

export const metadata: Metadata = { title: "Entrar · Tech Lead Hub" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  const status = await loadAuthStatus();
  if (!status.ok) return <ApiUnavailable />;
  if (status.data.setupRequired) redirect("/setup");

  const me = await loadMe();
  if (me.ok && me.data) redirect(next);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrar</CardTitle>
        <CardDescription>Acesse seu workspace do Tech Lead Hub.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  );
}
