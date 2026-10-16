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
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Brand className="max-sm:[&>span+*]:sr-only" />
          <AppNav />
          <div className="ml-auto flex items-center gap-1">
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
