import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DeveloperForm } from "@/features/organization/developer-form";

export const metadata: Metadata = { title: "Nova pessoa · Tech Lead Hub" };

export default function NewDeveloperPage() {
  return (
    <>
      <PageHeader eyebrow="Pessoas" title="Nova pessoa" description="Depois de cadastrar, associe a pessoa aos times." />
      <Card className="max-w-2xl">
        <CardContent className="pt-4">
          <DeveloperForm />
        </CardContent>
      </Card>
    </>
  );
}
