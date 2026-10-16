# Tech Lead Hub

Aplicação pessoal para um Tech Lead acompanhar atividades próprias, entregas de vários times,
capacidade e previsões. Especificação completa em [`docs/main.md`](docs/main.md).

**Estado atual:** Etapa 1 — Fundação técnica (§54) concluída. Ver
[`docs/architecture/fundacao-tecnica.md`](docs/architecture/fundacao-tecnica.md).

## Estrutura (§33)

| Caminho                     | Conteúdo                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `apps/web`                  | Next.js 16 (App Router) — interface e design system             |
| `apps/api`                  | NestJS 11 + Prisma 7 + PostgreSQL — autenticação, workspace     |
| `apps/planning-worker`      | Worker BullMQ (Redis) — base para previsões e simulações        |
| `packages/shared-contracts` | Schemas Zod e tipos compartilhados entre web e API              |
| `packages/config`           | `tsconfig` e ESLint compartilhados                              |
| `infrastructure/`           | Dockerfiles, init do PostgreSQL e scripts                       |

## Pré-requisitos

- Node.js 22+ com Corepack (`corepack enable` deixa o comando `pnpm` disponível)
- Docker com Docker Compose

## Desenvolvimento local

```bash
pnpm install
pnpm env:init       # cria .env com senha aleatória para o PostgreSQL
pnpm db:up          # PostgreSQL e Redis no Docker (apenas loopback)
pnpm db:deploy      # aplica as migrations
pnpm dev            # web :3000, API :4000 e worker
```

Abra http://localhost:3000. Na primeira vez você é levado à **configuração inicial** do
proprietário (só pode ser feita uma vez; não há cadastro público). O showcase do design system
fica em `/design-system`.

## Stack completa no Docker

```bash
pnpm env:init
docker compose up --build
```

Sobe `postgres`, `redis`, `migrate` (aplica migrations e encerra), `api`, `planning-worker` e
`web` em http://localhost:3000. Só a web é publicada (no loopback); API, banco e Redis ficam na
rede interna — banco e Redis também em `127.0.0.1` para uso a partir do host.

## Qualidade

```bash
pnpm lint
pnpm typecheck
pnpm test               # unitários (Vitest)
pnpm test:integration   # API + PostgreSQL real; usa DATABASE_URL_TEST
pnpm build
```

O CI (`.github/workflows/ci.yml`) executa todos esses passos e o build das imagens Docker.

## Banco de dados

```bash
pnpm db:migrate     # cria nova migration a partir de apps/api/prisma/schema.prisma (dev)
pnpm db:deploy      # aplica migrations pendentes
pnpm db:studio      # Prisma Studio
```
