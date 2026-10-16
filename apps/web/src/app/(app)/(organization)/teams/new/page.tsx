import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContextForm } from "@/features/organization/context-form";

export const metadata: Metadata = { title: "Novo time · Tech Lead Hub" };

export default function NewTeamPage() {
  return (
    <>
      <PageHeader eyebrow="Times" title="Novo time" description="Depois de criar, associe projetos e pessoas." />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <ContextForm kind="team" />
        </CardContent>
      </Card>
    </>
  );
}
