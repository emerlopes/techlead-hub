import { developerSchema } from "@tlh/shared-contracts";
import { Plus, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadApi } from "@/lib/api/server";
import { developerStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Pessoas · Tech Lead Hub" };

export default function DevelopersPage() {
  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Cadastro de referência dos desenvolvedores acompanhados. Não há login para eles (DEC-002)."
        actions={
          <Link href="/developers/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Nova pessoa
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <DeveloperList />
      </Suspense>
    </>
  );
}

async function DeveloperList() {
  const result = await loadApi("/developers", z.array(developerSchema));
  if (!result.ok) return <ApiUnavailable />;
  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="Nenhuma pessoa cadastrada"
        description="Cadastre os desenvolvedores cujas entregas e capacidade você acompanha e associe-os aos times."
        action={
          <Link href="/developers/new" className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden />
            Cadastrar pessoa
          </Link>
        }
      />
    );
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Times atuais</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((dev) => (
            <TableRow key={dev.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Avatar name={dev.name} size="sm" />
                  <Link href={`/developers/${dev.id}`} className="font-medium hover:underline">
                    {dev.name}
                  </Link>
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{dev.roleDescription ?? "—"}</TableCell>
              <TableCell>
                {dev.teams.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className="flex gap-1">
                    {dev.teams.map((t) => (
                      <ContextChip key={t.id} code={t.code} name={t.name} />
                    ))}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge meta={developerStatus[dev.status]} size="sm" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
