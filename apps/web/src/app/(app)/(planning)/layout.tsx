import { Suspense } from "react";
import { SectionNav, SectionNavSkeleton } from "@/components/app/section-nav";
import { planningSection } from "@/lib/navigation";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <SectionNav section={planningSection} />
      </Suspense>
      {children}
    </>
  );
}
