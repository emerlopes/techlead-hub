import { Suspense } from "react";
import { SectionNav, SectionNavSkeleton } from "@/components/app/section-nav";
import { capacitySection } from "@/lib/navigation";

export default function CapacityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <SectionNav section={capacitySection} />
      </Suspense>
      {children}
    </>
  );
}
