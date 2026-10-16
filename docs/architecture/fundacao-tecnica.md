# Etapa 1 — Fundação técnica

Implementa a Etapa 1 do roadmap (§54): monorepo, Next.js, NestJS, PostgreSQL, Prisma,
Docker Compose, autenticação, workspace, configuração por ambiente, testes iniciais, CI e
migrations.

**Critério de conclusão:** a aplicação sobe localmente, permite autenticação e possui
persistência funcional.

## Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`), sem Turborepo | Escopo pequeno; `pnpm -r` já respeita a ordem de dependências. |
| Backend | NestJS **11** (CommonJS) | O Nest 12 passou a ser ESM-only há poucas semanas; o 11 segue mantido e evita atrito com decorators/Prisma. |
| ORM | Prisma **7** com `@prisma/adapter-pg` e gerador `prisma-client` (CJS) | Driver adapter oficial; sem binário de query engine na imagem. |
| Contratos | `@tlh/shared-contracts` (Zod 4), compilado para `dist/` | A web valida no navegador com o mesmo schema que a API usa (RNF-005). |
| Worker | BullMQ 5 + Redis, só com o job `system.ping` | Deixa o caminho API → Redis → worker pronto para a Etapa 6. |
| Testes | Vitest (unitários e integração com PostgreSQL real) | §50.1 e §50.2. Playwright entra com os fluxos E2E (§50.3). |

## Autenticação (§34.1, §44)

- **Usuário único proprietário** (§44.1). `POST /auth/setup` só funciona enquanto não existe
  usuário. A coluna `users.is_owner` é `UNIQUE` e `CHECK (is_owner)`, então dois setups
  concorrentes nunca criam dois proprietários.
- **Senha com Argon2id** (`@node-rs/argon2`, 64 MiB, t=3, p=4 — RFC 9106). Mínimo de 12
  caracteres no setup.
- **Sessão**: token opaco de 256 bits em cookie `tlh_session` `HttpOnly`, `SameSite=Lax`,
  `Secure` configurável (`COOKIE_SECURE`). O banco guarda apenas o SHA-256 do token.
  Expiração absoluta configurável (`SESSION_TTL_HOURS`, padrão 7 dias); logout revoga.
- **CSRF**: toda requisição que altera estado exige o cabeçalho `x-tlh-csrf: 1` (impossível de
  enviar de outro site sem preflight CORS, que a API não libera) e, quando o navegador envia
  `Origin`, ela precisa estar em `WEB_ORIGINS`.
- **Limitação de tentativas**: após `LOGIN_MAX_ATTEMPTS` falhas (padrão 5) o login fica
  bloqueado por `LOGIN_LOCK_MINUTES` (padrão 15) — resposta `429` com `Retry-After`. E-mail
  inexistente e senha errada têm a mesma mensagem e tempo equivalente (hash descartável).
- **Autorização** (§44.3): `SessionGuard` global; só rotas `@Public()` dispensam sessão.

Trade-off conhecido: como há um único usuário, um atacante com acesso à rede poderia manter o
login bloqueado. Aceitável no ambiente local (web só no loopback); rever ao migrar para a nuvem.

## Web ↔ API

- O navegador fala apenas com a web. `apps/web/src/proxy.ts` repassa `/api/v1/*` para
  `API_INTERNAL_URL` em tempo de execução: o cookie é da mesma origem e não há CORS.
- Server Components leem a sessão com `requireMe()` (`lib/api/server.ts`), sempre dentro de
  `<Suspense>` (Cache Components). O proxy faz só a checagem otimista (presença do cookie); a
  validade é conferida na API.
- Mutações no navegador usam `apiMutation()` (`lib/api/client.ts`), que envia o cabeçalho CSRF,
  e `useApiForm()` para validação, erros por campo e estado de envio.
- Destino após login (`?next=`) aceita só caminhos internos (`safeNextPath`).

## Contratos implementados (`/api/v1`, §36)

| Método | Rota | Sessão | Observação |
| --- | --- | --- | --- |
| `GET` | `/auth/status` | não | **Acréscimo** ao §36.2: informa se o setup inicial é necessário. |
| `POST` | `/auth/setup` | não | Cria workspace + proprietário e já abre a sessão. |
| `POST` | `/auth/login` | não | |
| `POST` | `/auth/logout` | sim | Revoga a sessão e limpa o cookie. |
| `GET` | `/auth/me` | sim | Usuário, workspace e expiração da sessão. |
| `GET` | `/workspace` | sim | Módulo Workspace (§34.2). |
| `PATCH` | `/workspace` | sim | Exige `version`; versão divergente → `409 CONFLICT`. |
| `GET` | `/health` | não | API + banco; usado pelo healthcheck do Compose. |

Erros seguem um formato único (`ApiError` em `shared-contracts`):
`{ statusCode, code, message, details?, retryAfterSeconds? }`.

## Banco (§35)

Tabelas: `workspaces`, `users`, `sessions`, `audit_events`. UUID, `timestamptz(3)`, `version`
nas entidades mutáveis, nomes físicos em `snake_case`. A segunda migration adiciona `CHECK`
constraints que o Prisma não modela (versões ≥ 1, contadores não negativos, e-mail em
minúsculas, `expires_at > created_at`).

`audit_events` registra `auth.setup`, `auth.login`, `auth.login_failed`, `auth.login_locked`,
`auth.logout` e `workspace.updated` — sem senhas, tokens ou IP (§44.5).

## Configuração por ambiente (RNF-013)

Todas as variáveis estão em [`.env.example`](../../.env.example); `pnpm env:init` cria o `.env`
com senha aleatória. A API valida o ambiente com Zod na inicialização e falha listando as
variáveis inválidas, sem ecoar valores. Por padrão a API escuta só em `127.0.0.1` (§44.6).

## Testes

- `packages/shared-contracts`: schemas (normalização de e-mail, fuso, campos extras, `version`).
- `apps/api` unitários: ambiente, CSRF, bloqueio de login, Argon2id e token de sessão.
- `apps/api` integração (`test/*.int-test.ts`): recria o schema do banco **de testes**
  (`DATABASE_URL_TEST`, nunca igual a `DATABASE_URL`), aplica as migrations do zero e cobre
  setup único, cookie, CSRF, sessão, logout, bloqueio, conflito de versão e auditoria.
- `apps/web`: `safeNextPath`, formatação de data no fuso do workspace e lista de fusos.

## Fora do escopo desta etapa

- Times, projetos, desenvolvedores e atividades (Etapa 2).
- Playwright/E2E, OpenTelemetry, backups (Etapas seguintes e §47, §49).
- OpenAPI formal dos contratos (§36) — os schemas Zod de `shared-contracts` são a fonte atual.
