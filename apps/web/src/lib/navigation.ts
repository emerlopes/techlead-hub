/** Só aceita destino interno após o login, evitando redirecionamento aberto. */
export function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export type NavSection = { label: string; items: readonly { href: string; label: string }[] };

/** Acompanhamento operacional dos times (Etapa 3): separado das atividades pessoais (§3.2). */
export const deliverySection: NavSection = {
  label: "Entregas",
  items: [
    { href: "/work-items", label: "Itens" },
    { href: "/sprints", label: "Sprints" },
    { href: "/releases", label: "Releases" },
    { href: "/refinements", label: "Refinamentos" },
    { href: "/risks", label: "Riscos" },
    { href: "/journal", label: "Diário" },
  ],
};

export const organizationSection: NavSection = {
  label: "Organização",
  items: [
    { href: "/teams", label: "Times" },
    { href: "/projects", label: "Projetos" },
    { href: "/developers", label: "Pessoas" },
  ],
};

/** `/sprints/123` ativa `/sprints`; `/` só ativa a si mesmo. */
export function isActiveSection(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
