import { teamSchema } from "@tlh/shared-contracts";
import { Plus, Users } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadApi } from "@/lib/api/server";
import { teamStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Times · Tech Lead Hub" };

export default function TeamsPage() {
  return (
    <>
      <PageHeader
        title="Times"
        description="Equipes técnicas acompanhadas. Um time atua em vários projetos e reúne várias pessoas."
        actions={
          <Link href="/teams/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Novo time
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <TeamList />
      </Suspense>
    </>
  );
}

async function TeamList() {
  const result = await loadApi("/teams", z.array(teamSchema));
  if (!result.ok) return <ApiUnavailable />;
  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum time cadastrado"
        description="Cadastre os times que você acompanha para organizar projetos, pessoas e atividades por contexto."
        action={
          <Link href="/teams/new" className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden />
            Cadastrar time
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
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Projetos ativos</TableHead>
            <TableHead className="text-right">Pessoas ativas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((team) => (
            <TableRow key={team.id}>
              <TableCell>
                <ContextChip code={team.code} />
              </TableCell>
              <TableCell>
                <Link href={`/teams/${team.id}`} className="font-medium hover:underline">
                  {team.name}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge meta={teamStatus[team.status]} size="sm" />
              </TableCell>
              <TableCell className="text-right tabular">{team.activeProjectCount}</TableCell>
              <TableCell className="text-right tabular">{team.activeDeveloperCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
