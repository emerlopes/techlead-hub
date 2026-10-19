import { Suspense } from "react";
import { AppNav } from "@/components/app/app-nav";
import { Brand } from "@/components/app/brand";
import { Skeleton } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/features/identity/user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="flex h-14 w-full items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Brand compact />
          {/* usePathname suspende em rotas com parâmetros dinâmicos (Cache Components). */}
          <Suspense fallback={<div className="flex-1" />}>
            <AppNav />
          </Suspense>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Suspense fallback={<Skeleton className="h-7 w-32" />}>
              <UserMenu />
            </Suspense>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
