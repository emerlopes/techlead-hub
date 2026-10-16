/** Só aceita destino interno após o login, evitando redirecionamento aberto. */
export function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/** `exact`: raiz de área que não deve ficar ativa nas subpáginas irmãs (ex.: `/capacity`). */
export type NavSection = { label: string; items: readonly { href: string; label: string; exact?: boolean }[] };

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

/** Disponibilidade, alocação e demanda (Etapa 4, §18–§21). */
export const capacitySection: NavSection = {
  label: "Capacidade",
  items: [
    { href: "/capacity", label: "Visão geral", exact: true },
    { href: "/capacity/allocations", label: "Alocações" },
    { href: "/capacity/availability", label: "Ausências" },
    { href: "/capacity/schedules", label: "Jornadas" },
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

/** `/sprints/123` ativa `/sprints`; `/` só ativa a si mesmo; uma raiz de área só ativa a si mesma. */
export function isActiveSection(pathname: string, href: string, exact = false): boolean {
  if (href === "/" || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
