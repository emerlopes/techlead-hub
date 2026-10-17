import { dependencyListQuerySchema, workDependencySchema } from "@tlh/shared-contracts";
import { Link2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { DomainTag } from "@/components/domain/domain-tag";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { DependencyForm } from "@/features/planning/dependency-form";
import { DependencyList } from "@/features/planning/dependency-list";
import { loadOpenWorkItems } from "@/lib/api/options";
import { loadApi } from "@/lib/api/server";
import { flatParams, withQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Dependências · Tech Lead Hub" };

const scopes = [
  { value: "open", label: "Não liberadas" },
  { value: "all", label: "Todas" },
] as const;

export default function DependenciesPage({ searchParams }: PageProps<"/dependencies">) {
  return (
    <>
      <PageHeader
        title="Dependências"
        description="O que condiciona o início das entregas (§24). Entre projetos e times é permitido; ciclos são rejeitados (CA-017)."
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Dependencies searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Dependencies({ searchParams }: Pick<PageProps<"/dependencies">, "searchParams">) {
  const params = flatParams(await searchParams);
  const query = dependencyListQuerySchema.safeParse({ scope: params.scope });
  const scope = query.success ? query.data.scope : "open";
  const [dependencies, items] = await Promise.all([
    loadApi(withQuery("/work-dependencies", { scope }), z.array(workDependencySchema)),
    loadOpenWorkItems(),
  ]);
  if (!dependencies.ok || !items.ok) return <ApiUnavailable />;
  const candidates = items.data.items.map((w) => ({ id: w.id, externalKey: w.externalKey, title: w.title }));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex min-w-0 flex-col gap-3" aria-label="Dependências registradas">
        <SegmentedNav
          label="Situação"
          current={scope}
          items={scopes.map((s) => ({ ...s, href: withQuery("/dependencies", { scope: s.value === "open" ? undefined : s.value }) }))}
        />
        {dependencies.data.length === 0 ? (
          <EmptyState
            icon={Link2}
            title={scope === "open" ? "Nenhuma dependência pendente" : "Nenhuma dependência"}
            description="Registre quando uma entrega só pode começar depois de outra ou de algo externo."
          />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <DependencyList dependencies={dependencies.data} />
            </CardContent>
          </Card>
        )}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Nova dependência</CardTitle>
          <CardDescription>Término → início e externa com data entram no cálculo; os demais tipos são só registro (§24.4).</CardDescription>
          <CardAction>
            <DomainTag domain="delivery" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DependencyForm items={candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
