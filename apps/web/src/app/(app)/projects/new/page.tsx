import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContextForm } from "@/features/organization/context-form";

export const metadata: Metadata = { title: "Novo projeto · Tech Lead Hub" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader eyebrow="Projetos" title="Novo projeto" description="Depois de criar, associe os times participantes." />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <ContextForm kind="project" />
        </CardContent>
      </Card>
    </>
  );
}
