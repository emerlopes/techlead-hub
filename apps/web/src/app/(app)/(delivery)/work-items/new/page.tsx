import { developerSchema, externalSourceSchema, projectSchema, teamSchema } from "@tlh/shared-contracts";
import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkItemForm } from "@/features/work-items/work-item-form";
import { loadApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Novo item · Tech Lead Hub" };

export default function NewWorkItemPage() {
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/work-items" className="hover:underline">Entregas</Link>}
        title="Novo item"
        description="Registre a referência ao item da ferramenta externa e o acompanhamento inicial (§13.3)."
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={6} />}>
            <NewWorkItem />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewWorkItem() {
  const [sources, projects, teams, developers] = await Promise.all([
    loadApi("/external-sources", z.array(externalSourceSchema)),
    loadApi("/projects", z.array(projectSchema)),
    loadApi("/teams?status=ACTIVE", z.array(teamSchema)),
    loadApi("/developers?status=ACTIVE", z.array(developerSchema)),
  ]);
  if (!sources.ok || !projects.ok || !teams.ok || !developers.ok) return <ApiUnavailable />;
  if (sources.data.length === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="Cadastre uma origem primeiro"
        description="Informe de qual ferramenta vêm os itens (Jira, Azure DevOps…). O identificador é único por origem (RN-005)."
        action={
          <Link href="/settings#sources" className={buttonVariants({ variant: "outline" })}>
            Gerenciar origens
          </Link>
        }
      />
    );
  }
  return (
    <WorkItemForm
      sources={sources.data}
      projects={projects.data.filter((p) => p.status !== "ARCHIVED")}
      teams={teams.data}
      developers={developers.data}
    />
  );
}
