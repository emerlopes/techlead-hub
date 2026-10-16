"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

/** Alterna `.dark` em <html> e persiste a escolha. O script em app/layout.tsx aplica antes da pintura. */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema claro/escuro">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
