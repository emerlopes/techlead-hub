"use client";

import type { JournalEntry as Entry } from "@tlh/shared-contracts";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { JournalEntry } from "@/components/domain/journal-entry";
import { LinkChips } from "@/components/domain/link-chips";
import { Button } from "@/components/ui/button";
import type { LinkOptions } from "@/features/context/link-options";
import { formatBusinessDate } from "@/lib/format";
import { JournalForm } from "./journal-form";

/** Item da linha do tempo com edição no lugar; a exclusão fica no modo de edição. */
export function JournalEntryEditor({ entry, options, last }: { entry: Entry; options: LinkOptions; last?: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="pb-5 last:pb-0">
        <JournalForm entry={entry} options={options} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <JournalEntry
      category={entry.category}
      date={formatBusinessDate(entry.occurredOn)}
      description={entry.description}
      links={<LinkChips links={entry.links} />}
      actions={
        <Button variant="ghost" size="icon-sm" aria-label="Editar registro" onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
        </Button>
      }
      last={last}
    />
  );
}
