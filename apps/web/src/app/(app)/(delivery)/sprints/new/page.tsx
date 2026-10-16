import { teamSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SprintForm } from "@/features/sprints/sprint-form";
import { loadApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Nova sprint · Tech Lead Hub" };

export default function NewSprintPage() {
  return (
    <>
      <PageHeader eyebrow={<Link href="/sprints" className="hover:underline">Sprints</Link>} title="Nova sprint" />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <NewSprint />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewSprint() {
  const teams = await loadApi("/teams?status=ACTIVE", z.array(teamSchema));
  if (!teams.ok) return <ApiUnavailable />;
  return <SprintForm teams={teams.data} />;
}
