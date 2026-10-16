import { Suspense } from "react";
import { SectionNav, SectionNavSkeleton } from "@/components/app/section-nav";
import { deliverySection } from "@/lib/navigation";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<SectionNavSkeleton />}>
        <SectionNav section={deliverySection} />
      </Suspense>
      {children}
    </>
  );
}
