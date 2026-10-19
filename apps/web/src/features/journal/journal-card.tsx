import type { JournalEntry as Entry } from "@tlh/shared-contracts";
import Link from "next/link";
import { JournalEntry } from "@/components/domain/journal-entry";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBusinessDate } from "@/lib/format";

/** Últimos acontecimentos de um contexto (sprint, release, item) com atalho para a linha do tempo (§17.3). */
export function JournalCard({
  entries,
  href,
  description,
  title = "Diário",
  empty = "Nenhum acontecimento registrado.",
}: {
  entries: Entry[];
  href: string;
  description?: string;
  title?: string;
  empty?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Ver e registrar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ol>
            {entries.map((entry, index) => (
              <JournalEntry
                key={entry.id}
                category={entry.category}
                date={formatBusinessDate(entry.occurredOn)}
                description={entry.description}
                last={index === entries.length - 1}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
