import { Suspense } from "react";
import { SectionNav, SectionNavSkeleton } from "@/components/app/section-nav";
import { organizationSection } from "@/lib/navigation";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <SectionNav section={organizationSection} />
      </Suspense>
      {children}
    </>
  );
}
