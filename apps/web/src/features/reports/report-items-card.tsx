import type { WorkItem } from "@tlh/shared-contracts";
import { WorkItemRow } from "@/components/domain/work-item-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Lista de itens externos de uma seção de relatório, com contagem no título e texto de vazio (§3.4). */
export function ReportItemsCard({
  title,
  description,
  rows,
  empty,
}: {
  title: string;
  description?: string;
  rows: { key: string; item: WorkItem; aside?: React.ReactNode }[];
  empty: string;
}) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle>
          {title} <span className="font-normal text-muted-foreground tabular">({rows.length})</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <li key={row.key} className="py-2.5 first:pt-0 last:pb-0">
                <WorkItemRow item={row.item} aside={row.aside} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
