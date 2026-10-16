import { Avatar } from "@/components/ui/misc";
import { loadMe } from "@/lib/api/server";
import { LogoutButton } from "./logout-button";

/** Lê a sessão: precisa ficar dentro de um <Suspense> (Cache Components). */
export async function UserMenu() {
  const result = await loadMe();
  const me = result.ok ? result.data : null;
  if (!me) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 flex-col items-end text-right sm:flex">
        <span className="truncate text-xs font-medium">{me.user.name}</span>
        <span className="truncate text-2xs text-muted-foreground">{me.workspace.name}</span>
      </div>
      <Avatar name={me.user.name} size="sm" />
      <LogoutButton />
    </div>
  );
}
