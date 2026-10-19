import { PAGE_SIZE_MAX, paginatedSchema, workItemSchema } from "@tlh/shared-contracts";
import Link from "next/link";
import { DomainTag } from "@/components/domain/domain-tag";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { loadApi, withQuery } from "@/lib/api/server";
import { atRequestTime } from "@/lib/today.server";

/**
 * Entregas abertas de um time, projeto ou pessoa (§14.2). Carrega os próprios dados: renderize
 * dentro de `<Suspense fallback={<DeliveriesCardSkeleton />}>`.
 */
export async function DeliveriesCard({
  filter,
  description,
  moreHref,
}: {
  filter: { teamId?: string; projectId?: string; developerId?: string };
  description: string;
  moreHref?: string;
}) {
  await atRequestTime();
  const result = await loadApi(
    withQuery("/work-items", { ...filter, pageSize: String(PAGE_SIZE_MAX) }),
    paginatedSchema(workItemSchema),
  );
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Entregas abertas
          {result.ok && <span className="font-mono text-xs font-normal text-muted-foreground tabular">{result.data.total}</span>}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="flex items-center gap-2">
          {moreHref && (
            <Link href={moreHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver em Entregas
            </Link>
          )}
          <DomainTag domain="delivery" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {!result.ok ? (
          <Alert tone="danger" title="Não foi possível carregar as entregas." />
        ) : result.data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma entrega aberta.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {result.data.items.map((item) => (
              <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                <WorkItemRow item={item} showProject={!filter.projectId} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DeliveriesCardSkeleton() {
  return <Skeleton className="h-40 lg:col-span-2" />;
}
