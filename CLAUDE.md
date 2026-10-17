@AGENTS.md

# Tech Lead Hub — instruções do projeto

Aplicação pessoal para um Tech Lead acompanhar atividades próprias, entregas de vários times, capacidade e previsões.

- **Especificação (fonte de verdade do produto):** `docs/main.md`. Consulte a seção do módulo antes de implementá-lo e cite regras pelo ID (`RN-xxx`, `CA-xxx`, `§n`).
- **Design system:** `docs/design-system.md` + showcase vivo em `/design-system`.
- **Decisões por etapa:** `docs/architecture/` (`fundacao-tecnica.md`, `organizacao-gestao-pessoal.md`, `acompanhamento-entregas.md`, `capacidade.md`, `planejamento-execucao.md`).

## Stack e comandos

Monorepo **pnpm** (via Corepack). Web: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · componentes no padrão shadcn/ui · `lucide-react` · `class-variance-authority` + `tailwind-merge`. API: NestJS 11 · Prisma 7 · PostgreSQL · Zod. Worker: BullMQ + Redis. Testes: Vitest. Decisões da fundação em `docs/architecture/fundacao-tecnica.md`.

```bash
pnpm env:init          # cria .env a partir de .env.example
pnpm db:up             # PostgreSQL + Redis (Docker)
pnpm db:deploy         # aplica migrations
pnpm dev               # web :3000 (showcase em /design-system), API :4000, worker
pnpm lint
pnpm typecheck
pnpm test              # unitários
pnpm test:integration  # API contra o banco de testes (DATABASE_URL_TEST)
pnpm build
docker compose up --build   # stack completa
```

Antes de dizer que algo está pronto: `typecheck`, `lint`, `test` e `build` passando (e `test:integration` quando mexer na API ou no schema); para mudanças de UI, conferir no navegador em tema claro, escuro e largura mobile (sem scroll horizontal).

## Estrutura

| Pasta                                        | Conteúdo                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/app/`                          | Rotas (App Router). `globals.css` contém **todos** os tokens. `(auth)` = setup/login; `(app)` = shell autenticado, com os grupos `(delivery)`, `(capacity)`, `(planning)` e `(organization)` (sub-navegação por área). |
| `apps/web/src/components/ui/`                | Primitivas genéricas (Button, Badge, Card, Input, Table, Tabs, Alert…). Sem regra de negócio. |
| `apps/web/src/components/domain/`            | Componentes com regra de produto (StatusBadge, DateDelta, HealthIndicator, WorkItemRow, CapacityBar, ContextLoadView, ExecutionTimeline, IssueList, FocusCard…).           |
| `apps/web/src/components/app/`               | Peças do shell da aplicação (Brand, AppNav, SectionNav, PageHeader, ApiUnavailable, FormError, skeletons). |
| `apps/web/src/features/<módulo>/`            | Formulários e componentes de um módulo (identity, workspace, organization, tasks, work-items, sprints, releases, risks, journal, capacity, planning, context…).  |
| `apps/web/src/lib/api/`                      | Cliente da API: `server.ts` (`loadApi` em Server Components), `client.ts` + `use-api-form.ts` + `use-api-action.ts` (navegador). |
| `apps/web/src/lib/design-system/status.ts`   | Mapa único de enums do domínio → rótulo pt-BR, tom e ícone.                                   |
| `apps/web/src/proxy.ts`                      | Repasse de `/api/v1` para a API e checagem otimista de sessão.                                |
| `apps/api/src/modules/<módulo>/`             | Módulos do backend (§34): identity, workspace, teams (+ associações), projects, developers, tasks (+ fila de foco), work-items (+ acompanhamento, refinamento, origens, estimativas), sprints, releases, risks, journal, capacity (jornadas, ausências, alocações, cálculos), planning (planos de execução, dependências, projeção), dashboard, audit, health. |
| `apps/api/src/common/`, `infrastructure/`    | Guards, pipes, filtro de erros; config (Zod) e Prisma.                                        |
| `apps/api/prisma/`                           | `schema.prisma` e migrations versionadas.                                                     |
| `apps/planning-worker/`                      | Worker BullMQ da fila `planning`.                                                             |
| `packages/shared-contracts/`                 | Schemas Zod e tipos compartilhados (contratos da API, erros, constantes HTTP) e regras puras de domínio (`task-rules`, `delivery-rules`, `capacity-rules`, `planning-rules`). |
| `packages/config/`                           | `tsconfig` base e ESLint dos pacotes Node.                                                    |
| `infrastructure/`                            | Dockerfiles, init do PostgreSQL, scripts.                                                     |
| `docs/`                                      | Especificação, design system e arquitetura.                                                   |

Alias de import na web: `@/*` aponta para `apps/web/src`.

## Regras obrigatórias

### 1. Siga o design system

- **Cores só por tokens semânticos** (`bg-surface`, `text-muted-foreground`, `bg-danger-subtle text-danger-fg`, `bg-personal`…). Nunca cores cruas do Tailwind (`bg-red-500`, `text-zinc-600`), hex ou `style` com cor literal.
- Tom certo para o significado: `success` no prazo · `attention` atenção/obsoleto · `warning` risco · `danger` atraso/sobrecarga/falha · `blocked` impedimento · `info` em andamento · `neutral` indeterminado/inativo. Domínios: `personal` (minha execução), `delivery` (times), `capacity` (capacidade/previsões).
- Status do domínio **sempre** via `<StatusBadge meta={healthStatus.AT_RISK} />` usando `lib/design-system/status.ts`. Nunca escreva rótulo/cor/ícone de status à mão em um componente. Enum novo → adicione ao `status.ts`.
- Tipografia e espaço conforme `docs/design-system.md` (corpo `text-sm`, apoio `text-xs`, eyebrow `text-2xs uppercase`, identificadores e números em `font-mono`/`tabular`, grade de 4px, controles `h-8`).
- Todo botão tem efeito de clique: use `<Button>` (já inclui) ou, em qualquer outro elemento clicável com aparência de botão, a utility `pressable`. Nunca crie `<button>` estilizado à mão sem ela.
- Todo status combina ícone + texto (nunca só cor). Botões só-ícone têm `aria-label`; ícones decorativos `aria-hidden`.
- Toda tela tem estados de carregamento (`Skeleton`), vazio (`EmptyState`) e falha (`Alert tone="danger"`).
- Novo token, variante ou componente reutilizável → atualize também `docs/design-system.md` e adicione um exemplo em `apps/web/src/app/design-system/page.tsx`.

### 2. Não duplique código

- Antes de criar algo, procure em `components/ui`, `components/domain`, `components/app`, `lib/` e `packages/shared-contracts`. Se existe algo próximo, **estenda** (nova variante via `cva`, nova prop) em vez de copiar.
- Padrão repetido em 2+ lugares vira componente/função compartilhada. Primitiva genérica → `components/ui`; com regra de negócio → `components/domain`; lógica pura → `lib/`.
- Formatação (datas, horas, percentuais — `lib/format.ts`) e cálculos de domínio (capacidade, utilização, saúde) ficam em um único lugar e são importados — nunca reimplementados inline.
- Validação de entrada usa os schemas de `@tlh/shared-contracts` dos dois lados (web e API); não duplique regras de validação.
- Classes condicionais com `cn()`; variantes com `cva`. Sem strings de classe dinâmicas (`` `bg-${tone}` ``) — o Tailwind não as detecta; use um mapa estático.
- Componentes `shadcn` novos: `pnpm dlx shadcn add <nome>` dentro de `apps/web` (o `components.json` já está configurado) e ajuste para os tokens do projeto.

### 3. Regras de produto que a UI deve respeitar

- **Dados explícitos (§3.4):** nunca invente valores. Sem dado → `—`, "Sem previsão" ou estado indeterminado (hachura `bg-hatch` + borda tracejada). Mostre confiança e origem (manual × calculada) das previsões.
- **Domínios separados (§3.2):** atividade pessoal ≠ entrega do time; não misture estados nem duplique entidades em totais (CA-010, RN-037).
- **O sistema sugere, o Tech Lead decide (§3.5):** nenhuma ação de recomendação é aplicada sem aprovação explícita; mostre ganhos e efeitos colaterais.
- Previsões obsoletas ou em recálculo devem ser sinalizadas (RNF-021, CA-031). Acompanhamentos desatualizados idem.
- Ações destrutivas usam variante `danger` e pedem confirmação.

## Convenções

- **Idioma:** textos de interface e documentação em português (pt-BR); identificadores de código (variáveis, funções, arquivos) em inglês; valores de enum iguais aos da especificação (`AT_RISK`, `IN_PROGRESS`).
- Datas e números formatados com `Intl` em `pt-BR`.
- Server Components por padrão; `"use client"` só quando houver estado/efeito/evento.
- TypeScript estrito: sem `any`; tipos de enum derivados de `status.ts` (`HealthStatus`, `Priority`…).
- API: toda rota exige sessão, exceto `@Public()`; mutações exigem o cabeçalho CSRF (`apiMutation` já envia); erros sempre no formato `ApiError`; alterações relevantes auditadas via `AuditService` na mesma transação; entidades mutáveis com `version` (controle otimista).
- Schema do banco: altere `schema.prisma` e gere migration nova (`pnpm db:migrate`); nunca edite migration já aplicada.
- Comentários só quando explicam o _porquê_ ou citam a regra da especificação.
- Não commitar sem pedido explícito.
