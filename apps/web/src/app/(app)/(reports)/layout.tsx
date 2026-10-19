import { Suspense } from "react";
import { SectionNav, SectionNavSkeleton } from "@/components/app/section-nav";
import { reportsSection } from "@/lib/navigation";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <SectionNav section={reportsSection} />
      </Suspense>
      {children}
    </>
  );
}
