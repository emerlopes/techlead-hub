import { projectSchema } from "@tlh/shared-contracts";
import { FolderKanban, Plus } from "lucide-react";
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
import { projectStatus } from "@/lib/design-system/status";

export const metadata: Metadata = { title: "Projetos · Tech Lead Hub" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projetos"
        description="Produtos, serviços e iniciativas técnicas. Um projeto pode envolver vários times (DEC-009)."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            <Plus aria-hidden />
            Novo projeto
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <ProjectList />
      </Suspense>
    </>
  );
}

async function ProjectList() {
  const result = await loadApi("/projects", z.array(projectSchema));
  if (!result.ok) return <ApiUnavailable />;
  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Nenhum projeto cadastrado"
        description="Cadastre os projetos acompanhados e associe os times que atuam em cada um."
        action={
          <Link href="/projects/new" className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden />
            Cadastrar projeto
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
            <TableHead className="text-right">Times ativos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.data.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <ContextChip code={project.code} />
              </TableCell>
              <TableCell>
                <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge meta={projectStatus[project.status]} size="sm" />
              </TableCell>
              <TableCell className="text-right tabular">{project.activeTeamCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
