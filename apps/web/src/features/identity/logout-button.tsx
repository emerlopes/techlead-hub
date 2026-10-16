"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiMutation } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function logout() {
    startTransition(async () => {
      try {
        await apiMutation("POST", "/auth/logout");
        router.replace("/login");
        router.refresh();
      } catch (err) {
        setError(toApiError(err).message);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      disabled={pending}
      aria-label="Sair"
      title={error ?? "Sair"}
      className={error ? "text-danger-fg" : undefined}
    >
      <LogOut aria-hidden />
    </Button>
  );
}
