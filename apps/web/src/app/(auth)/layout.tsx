import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-4">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
