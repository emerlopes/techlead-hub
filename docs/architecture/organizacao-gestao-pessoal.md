# Etapa 2 — Organização e gestão pessoal

Implementa a Etapa 2 do roadmap (§54): times, projetos, desenvolvedores, associações, Minhas
Atividades, prioridades, fila de foco e dashboard inicial.

**Critério de conclusão:** é possível organizar atividades pessoais e navegar entre diferentes
contextos.

## Banco (§35)

Migration `20261016180520_organization_and_personal`. Tabelas: `teams`, `projects`,
`team_projects`, `developers`, `team_developers`, `tasks`, `task_teams`, `task_projects`,
`focus_queue_items`. Enums iguais aos da especificação.

Constraints além do Prisma (mesma migration):

| Regra | Constraint |
| --- | --- |
| Código único por workspace (RN-015) | `UNIQUE (workspace_id, code)` em `teams` e `projects` + `CHECK` de formato (maiúsculas, 2–12) |
| Associação ativa não duplicada (§9.2) | índices únicos **parciais** `(team_id, project_id)` / `(team_id, developer_id)` `WHERE ended_at IS NULL` |
| Período válido (§35.7) | `CHECK (ended_at IS NULL OR ended_at >= started_at)` |
| Fila de foco com até 3 (RN-003) e um principal (RN-002) | `CHECK (position BETWEEN 0 AND 2)`, `UNIQUE (workspace_id, position)`, índice único parcial `(workspace_id) WHERE is_primary`, `UNIQUE (task_id)` |
| Horas não negativas (§35.4) | `numeric(7,2)` + `CHECK (>= 0)` |

Prazo da atividade é `date` (data de negócio, §35.3); "hoje" é calculado no fuso do workspace.
Arquivar não apaga (§35.9): times/pessoas são desativados, projetos arquivados e
associações encerradas (`ended_at`). A exclusão definitiva é a exceção explícita (§35.9): `DELETE /<recurso>/:id` em times,
projetos, pessoas, atividades, itens, sprints, releases, riscos, diário e planos de execução, com
confirmação na interface e evento `<entidade>.deleted` na auditoria. As FKs dependentes são
`ON DELETE CASCADE` (vínculos, filhos e históricos) ou `SET NULL` (responsável/time do
acompanhamento, release da sprint, sprint pretendida no refinamento, contexto do plano) —
migration `delete_cascades`.

## Contratos implementados (`/api/v1`, §36)

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` `POST` | `/teams` | `?status=ACTIVE\|INACTIVE`. Lista traz contagem de projetos e pessoas ativos. |
| `GET` `PATCH` | `/teams/{id}` | Detalhe com associações (ativas e histórico). Ativar/desativar via `PATCH { status }`. |
| `GET` `POST` | `/projects` | `?status=ACTIVE\|PAUSED\|ARCHIVED`. |
| `GET` `PATCH` | `/projects/{id}` | Pausar/arquivar/reativar via `PATCH { status }`. |
| `GET` `POST` | `/developers` | Cadastro de referência, sem login (DEC-002). |
| `GET` `PATCH` | `/developers/{id}` | Detalhe com histórico de times e projetos relacionados (via times atuais). |
| `POST` | `/team-projects`, `/team-projects/{id}/end` | **Acréscimo** ao §36: participação time ↔ projeto (§9.1). |
| `POST` | `/team-developers`, `/team-developers/{id}/end` | **Acréscimo** ao §36: participação pessoa ↔ time (§9.3). |
| `GET` `POST` | `/tasks` | `?scope=open\|closed\|all&teamId&projectId`. Abertas na ordenação padrão (§6.7). |
| `GET` `PATCH` | `/tasks/{id}` | Situação, dados e vínculos (substitui `teamIds`/`projectIds` quando enviados). |
| `POST` | `/tasks/{id}/complete` | Conclui e tira da fila de foco (§6.6). |
| `GET` `PUT` | `/focus-queue` | `PUT { taskIds (ordem manual, ≤ 3), primaryTaskId }` substitui a fila. |
| `GET` | `/dashboard` | **Acréscimo** ao §36: visão do §5 em uma chamada; `?teamId&projectId` para a visão contextual. |

**Desvio consciente:** o §36 lista `POST /teams/{id}/archive` e `POST /projects/{id}/archive`. Como
as transições são várias (ativar/desativar, pausar/arquivar/reativar), elas são feitas por
`PATCH { status, version }`, com o mesmo controle otimista e auditoria das demais alterações.

Toda mutação exige `version` quando a entidade é mutável (`409 CONFLICT` se divergente) e grava
`audit_events` na mesma transação (somente nomes de campos e ids — nunca e-mail ou anotações,
§44.5). Regras de negócio violadas devolvem `422 RULE_VIOLATION` (novo código em `ApiError`).

## Regras aplicadas

- **Atividades** (§6): concluídas/canceladas nunca ficam atrasadas (RN-001, CA-003) e saem da
  fila de foco; reabrir limpa a data de conclusão; sair de `BLOCKED` limpa o motivo do bloqueio.
  Alerta de prazo (`dueState`: atrasada, hoje, próximos 7 dias) é independente da fila (§6.6).
  Ordenação padrão (§6.7) em `compareTasksDefault` (`shared-contracts/src/task-rules.ts`),
  usada pela API.
- **Vínculos** (§6.8): atividade pode ter vários times e projetos ou nenhum (RN-023), sem
  duplicação. Novos vínculos com time inativo ou projeto arquivado são recusados (§7.4, §8.5);
  vínculos antigos permanecem.
- **Associações**: time inativo não recebe novas associações; projeto arquivado não recebe novos
  times; pessoa inativa não entra em novos times. Encerrar preserva o período (RN-025).
- **Fila de foco**: só atividades abertas; a primeira adicionada pela interface vira o foco
  principal se não houver outro.
- **Contexto** (§5.3, §5.4): filtro global de time/projeto em cookie (`tlh_context`), aplicado ao
  dashboard e a Minhas Atividades. A fila de foco não muda com o contexto.

## Interface

| Rota | Conteúdo |
| --- | --- |
| `/` | Dashboard inicial: filtro de contexto, KPIs pessoais, foco principal, demais em foco, bloqueadas, atrasadas, para hoje, próximos vencimentos e resumo da organização. |
| `/tasks` | Fila de foco (reordenar, trocar principal, remover), filtro abertas/encerradas/todas e visões Lista · Kanban · Agenda. |
| `/tasks/new`, `/tasks/{id}` | Formulário, ações de situação (iniciar, bloquear com motivo, desbloquear, concluir, cancelar com confirmação, reabrir) e ações de foco. |
| `/teams`, `/projects`, `/developers` (+ `/new`, `/{id}`) | Listas, cadastro/edição, mudança de situação com confirmação, associações com histórico e atividades do contexto. |

## Testes

- `shared-contracts`: `todayIn`/fuso, `dueStateOf` (RN-001), ordenação §6.7, schemas (código,
  campos vazios → `null`, limites da fila).
- `apps/web`: operações puras da fila de foco e formatação de datas/horas.
- `apps/api` integração (`organization.int-test.ts`, `tasks.int-test.ts`): unicidade de código,
  controle de versão, associações com histórico e índices parciais, regras de arquivado/inativo,
  isolamento, ordenação, conclusão e foco, vínculos múltiplos, auditoria de transição, dashboard
  global e contextual.

## Fora do escopo desta etapa

- Vínculos de atividade com histórias externas, riscos, sprints e releases (§6.2): as entidades
  chegam nas Etapas 3+.
- Capacidade, disponibilidade e alocações de desenvolvedores (`/developers/{id}/capacity`, Etapa 4).
- Blocos do dashboard que dependem dessas entidades (§5.2.3–§5.2.8).
- Paginação: listas pessoais são pequenas; filtros já existem (RNF-009) e a paginação entra
  quando houver volume (entregas, histórias).
