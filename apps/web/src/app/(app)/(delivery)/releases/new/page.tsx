import { projectSchema } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { ListSkeleton } from "@/components/app/page-skeletons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReleaseForm } from "@/features/releases/release-form";
import { loadApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Nova release · Tech Lead Hub" };

export default function NewReleasePage() {
  return (
    <>
      <PageHeader eyebrow={<Link href="/releases" className="hover:underline">Releases</Link>} title="Nova release" />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <NewRelease />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}

async function NewRelease() {
  const projects = await loadApi("/projects", z.array(projectSchema));
  if (!projects.ok) return <ApiUnavailable />;
  return <ReleaseForm projects={projects.data.filter((p) => p.status !== "ARCHIVED")} />;
}
