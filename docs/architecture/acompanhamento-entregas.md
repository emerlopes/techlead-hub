# Etapa 3 — Acompanhamento de entregas

Implementa a Etapa 3 do roadmap (§54): itens externos, sprints, releases, acompanhamentos,
refinamentos, riscos, impedimentos, diário de bordo e histórico.

**Critério de conclusão:** é possível acompanhar entregas, riscos e acontecimentos de múltiplos times
e projetos.

## Banco (§35)

Migration `20261016183727_delivery_tracking`. Tabelas: `external_sources`, `external_work_items`,
`delivery_trackings`, `delivery_tracking_history`, `task_work_items`, `sprints`,
`sprint_memberships`, `releases`, `release_memberships`, `release_milestones`,
`release_forecast_history`, `refinements`, `refinement_check_items`, `risks`, `risk_links`,
`journal_entries`, `journal_links`. Enums iguais aos da especificação quando ela os define
(`HealthStatus`, `SprintStatus`, `RefinementStatus`, `SprintScopeType`); os demais seguem o mesmo
padrão (`ExecutionStatus`, `ReleaseStatus`, `RiskType`, `RiskStatus`, `BlockingLevel`…).

O **item externo é a raiz do agregado**: o acompanhamento corrente (1:1, §14.5) e o refinamento
(1:1) são criados junto com ele e compartilham a `version` do item. Assim, uma edição concorrente
em qualquer parte do item devolve `409` em vez de sobrescrever.

Constraints além do Prisma (mesma migration):

| Regra | Constraint |
| --- | --- |
| Identificador externo único por origem (RN-005) | `UNIQUE (source_id, external_key)` |
| Uma associação corrente de sprint por história (RN-020, §35.7) | índice único **parcial** `(work_item_id) WHERE exited_at IS NULL` |
| Item não duplicado no escopo vigente da release | índice único parcial `(release_id, work_item_id) WHERE removed_at IS NULL` |
| Esforço restante não negativo (RN-031) | `CHECK (remaining_effort_hours >= 0)` (acompanhamento e histórico) |
| Períodos válidos (§35.7) | `end_date >= start_date` em sprints; saída ≥ entrada em participações; motivo de saída presente sse houve saída |
| Só impedimentos têm nível de bloqueio (§16.4) | `CHECK (type = 'IMPEDIMENT' OR blocking_level IS NULL)` |
| Vínculos com integridade referencial | `risk_links` e `journal_links` com uma FK por tipo de contexto e `CHECK (num_nonnulls(...) = 1)` |
| Diário sem registro duplicado (§17.4) | índice único `(workspace_id, category, occurred_on, md5(description))` |

Nada é apagado fisicamente (§35.9): participações em sprint e release registram saída
(`exited_at`/`removed_at`), riscos resolvidos continuam na tabela (RN-008) e o diário só é editado.
As exceções explícitas e auditadas são itens do checklist de prontidão e marcos de release.

## Regras aplicadas

- **Saúde (§14.4, §25.8):** `classifyHealth` em `shared-contracts/src/delivery-rules.ts`, função pura e
  determinística: execução encerrada → sem saúde; impedimento total aberto → `BLOCKED`; compromisso
  vencido → `DELAYED`; impedimento parcial, risco `HIGH`/`CRITICAL` ou previsão posterior ao
  compromisso → `AT_RISK`; sem compromisso ou sem previsão → `UNKNOWN` (RN-012, §3.4); senão
  `ON_TRACK`. A **avaliação manual** fica em `delivery_trackings.health_status` e a **calculada** é
  derivada na leitura — as duas são devolvidas separadamente (`manualHealth`, `calculatedHealth`) e
  `health` é a manual quando houver. A release usa a mesma função, considerando riscos da própria
  release e a saúde dos itens obrigatórios.
- **Histórico do acompanhamento (RN-006, CA-006, §14.5):** cada mudança de execução, refinamento,
  time, responsável, compromisso, previsão, avaliação manual, esforço restante ou observação grava
  uma fotografia em `delivery_tracking_history` com os campos alterados. Reenviar o mesmo valor não
  gera histórico. Releases gravam compromisso × previsão em `release_forecast_history` (§12.5).
- **Verificação (§14.2, §14.5):** salvar o acompanhamento registra a verificação; `POST
  /work-items/{id}/check` registra sem alterar dados. Sem verificação há mais de
  `TRACKING_STALE_DAYS` (3) dias, ou nunca verificado, → `stale`.
- **Conclusão (§14.5, RN-035):** concluir zera o esforço restante; encerrar a sprint nunca conclui
  itens (RN-011, CA-009).
- **Sprints (§11):** item planejado em sprint `PLANNED` entra como `ORIGINAL`, em sprint `ACTIVE`
  como `ADDED`; vindo de outra sprint (`move: true`) ou pendente do encerramento anterior, como
  `MOVED`. Item em outra sprint corrente só entra remanejado (`409` sem `move`). Encerrar registra
  `COMPLETED`/`NOT_COMPLETED` por item; cancelar faz o mesmo. Sprints encerradas não recebem itens
  nem mudam período. O resumo para retrospectiva conta original, adicionados, remanejados,
  removidos, concluídos e pendentes sem inventar dados.
- **Releases (§12):** pertencem a um projeto (RN-017), reúnem itens de qualquer time (CA-008), um
  item pode estar em várias releases (RN-009), obrigatório × opcional, marcos, progresso por
  contagem (horas só com estimativas, Etapa 4). Times participantes vêm dos itens vigentes; a release
  conta uma vez em listas e no dashboard.
- **Refinamento (§15):** situação no próprio item (`refinement_status`), independente da execução
  (RN-007, CA-005). Checklist inicial do §15.4 em `DEFAULT_READINESS_CHECKLIST`, editável por item.
  Checklist completo só **sugere** pronto (§3.5); marcar `READY` com checklist incompleto exige
  justificativa (`422` sem ela, §15.5). Item não pronto em sprint ativa ou que começa em até
  `IMMINENT_SPRINT_DAYS` (5) dias — corrente ou pretendida — gera alerta.
- **Riscos e impedimentos (§16):** um registro afeta vários itens, sprints, releases, projetos,
  times e atividades. Impedimento sem nível informado bloqueia totalmente. Resolver não conclui nada
  associado (§16.4) e o registro permanece consultável (`?scope=closed`, RN-008).
- **Diário (§17):** categoria e descrição obrigatórias; data padrão = hoje no fuso do workspace;
  vários contextos por registro; filtros por time/projeto incluem sprints, releases e itens deles;
  continua disponível após o encerramento da sprint.
- **Atividades pessoais (§6.8):** passam a vincular itens externos (`workItemIds`); concluir a
  atividade não resolve o item, e vice-versa. Os domínios continuam separados (§3.2).
- **Contexto ativo:** novos vínculos exigem time ativo, projeto não arquivado e pessoa ativa
  (`common/context-rules.ts`, reaproveitado por atividades); vínculos antigos permanecem válidos.

## Calendário de sprints gerado pela release

Acréscimo pedido após a etapa (migration `20261016232442_release_sprint_calendar`).

- O cadastro da release aceita **início** (padrão: hoje no fuso do workspace) e **duração da
  sprint em dias úteis** (`sprintLengthDays`, 1–60, segunda a sexta). Com duração, o prazo
  comprometido é obrigatório e o início não pode ser depois dele (constraints
  `releases_sprint_length_range` e `releases_calendar_period`).
- Na mesma transação, cada time com participação ativa no projeto (§9.1) recebe sprints
  `PLANNED` consecutivas (`planSprintCalendar`, `shared-contracts/src/sprint-calendar.ts`) até cobrir
  o prazo — a última pode terminar depois dele. Períodos que se sobrepõem a sprints abertas
  (`PLANNED`/`ACTIVE`) do time são **pulados** sem deslocar a cadência. Teto de 52 sprints por time.
  Projeto sem time participante → `422`.
- As sprints guardam a release de origem (`sprints.release_id`) e nascem com nome provisório
  (`Sprint N · <release>`) e sem objetivo. `POST /releases` devolve o detalhe com
  `sprintGeneration: { created, skipped, teams }`.
- **Iniciar** passou a ser `POST /sprints/{id}/start { name, goal, version }`: nome e objetivo são
  obrigatórios e confirmados nesse momento (§11.2). `PATCH /sprints/{id}` não inicia mais (só
  cancela); só sprints planejadas podem ser iniciadas.
- Alterar início ou duração depois do cadastro não regenera sprints: o calendário é criado uma vez
  e as sprints seguem editáveis individualmente.

## Contratos implementados (`/api/v1`, §36)

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` `POST` | `/external-sources`, `PATCH /external-sources/{id}` | **Acréscimo**: origens dos itens (§13.3). |
| `GET` `POST` | `/work-items` | `?scope&teamId&projectId&developerId&sprintId&releaseId&health&stale&q&page&pageSize` → `{ items, total, page, pageSize }`. |
| `GET` `PATCH` | `/work-items/{id}` | Detalhe com acompanhamento, refinamento, histórico, sprints, releases e atividades. O `PATCH` inclui os campos do acompanhamento. |
| `POST` | `/work-items/{id}/check` | **Acréscimo**: registrar verificação. |
| `PATCH` | `/work-items/{id}/refinement` | **Acréscimo**: situação, sprint pretendida, dúvidas, pendências, justificativa. |
| `POST` | `/work-items/{id}/refinement/check-items`; `PATCH` `DELETE` `/refinement-check-items/{id}` | **Acréscimo**: checklist. |
| `GET` | `/refinements` | **Acréscimo**: pipeline (`?teamId&projectId&sprintId`). |
| `GET` `POST` | `/sprints` | `?status&teamId&projectId`. |
| `GET` `PATCH` | `/sprints/{id}` | Cancelar via `PATCH { status: CANCELLED }`. |
| `POST` | `/sprints/{id}/start` | **Acréscimo**: iniciar confirmando nome e objetivo. |
| `POST` | `/sprints/{id}/close` | Encerrar (§36.8). |
| `POST` | `/sprints/{id}/items`, `/sprints/{id}/items/{workItemId}/remove` | **Acréscimo**: escopo e remanejamento. |
| `GET` `POST` | `/releases`; `GET` `PATCH` `/releases/{id}` | `?status&projectId&teamId`. Cadastro com `startDate` e `sprintLengthDays` gera o calendário de sprints. Encerrar = `PATCH { status: RELEASED \| CANCELLED }`. |
| `POST` `PATCH` | `/releases/{id}/items`, `/releases/{id}/items/{workItemId}`, `.../remove` | **Acréscimo**: escopo obrigatório/opcional. |
| `POST` | `/releases/{id}/milestones`; `PATCH` `DELETE` `/release-milestones/{id}` | **Acréscimo**: marcos. |
| `GET` `POST` | `/risks`; `GET` `PATCH` `/risks/{id}` | **Acréscimo** (o §36 não lista riscos). Resolver via `PATCH { status }`. |
| `GET` `POST` | `/journal`; `GET` `PATCH` `/journal/{id}` | **Acréscimo**: diário paginado e filtrável. |
| `GET` | `/dashboard` | Ganhou `deliveries`, `activeSprints`, `releases`, `refinement` (§5.2.3–§5.2.6). |

Histórico de sprints, releases e riscos vem da trilha de auditoria (`AuditService.history`): ação,
campos alterados e transição de situação — nunca valores pessoais (§44.5).

**Desvios conscientes:**

- `ExternalWorkItem` (§13.4) lista `developer_id`, `target_date` e `last_checked_at`, que também
  existem em `DeliveryTracking` (§14.3). Para não duplicar estado, eles vivem só no acompanhamento
  (`target_date` = `committed_date`).
- `delivery_trackings.last_update` (§14.3) é o `updated_at`; não há coluna separada.
- A saúde calculada não é persistida: depende de "hoje" e mudaria sem nenhuma escrita. O motor de
  previsão (Etapa 6) passará a gravar seus resultados em `forecast_results`.
- Filtros de saúde e desatualização em `/work-items` são aplicados após o cálculo e antes da
  paginação, em memória — adequado ao volume de um workspace pessoal.

## Interface

Navegação reorganizada em áreas: **Início · Atividades · Entregas · Organização · Configurações**.
Entregas e Organização usam route groups (`(delivery)`, `(organization)`) com `SectionNav`; as URLs
não mudaram.

| Rota | Conteúdo |
| --- | --- |
| `/work-items` (+ `/new`, `/{id}`) | Entregas com contexto global, busca, saúde, pessoa, desatualizados e paginação. Detalhe com acompanhamento, ações de execução, verificação, refinamento + checklist, histórico, sprints/releases, riscos, atividades e diário. |
| `/sprints` (+ `/new`, `/{id}`) | Lista por situação; detalhe com resumo para retrospectiva, escopo (planejar, remanejar, retirar), itens que saíram, riscos, diário e histórico. |
| `/releases` (+ `/new`, `/{id}`) | Lista por situação; detalhe com escopo obrigatório/opcional, progresso, times, marcos, riscos, evolução da previsão, diário e histórico. |
| `/refinements` | Pipeline em colunas por situação, alerta de sprint iminente, filtro por sprint. |
| `/risks` (+ `/new`, `/{id}`) | Lista por situação e tipo; registro com vínculos (atalhos "Registrar" já chegam vinculados); resolver com nota. |
| `/journal` | Linha do tempo paginada com edição no lugar, registro rápido e filtros por categoria, período e contexto. |
| `/settings` | Origens de itens externos. |
| `/` | Blocos de entregas críticas, sprints ativas, refinamentos e releases. |
| `/teams/{id}`, `/projects/{id}`, `/developers/{id}` | Entregas abertas do contexto. |

## Testes

- `shared-contracts`: classificação de saúde, sinais de risco, desatualização, sprint iminente,
  sugestão de pronto e schemas (URL só http(s), campos vazios → `null`, paginação, período de
  sprint, bloqueio só em impedimento, diário).
- `apps/api` integração (`deliveries.int-test.ts`): unicidade origem + identificador, saúde
  indeterminada e por datas, manual × calculada, histórico de previsão/time/responsável, conclusão
  zerando esforço, verificação e desatualização, filtros e paginação, regras de contexto inativo,
  refinamento independente e justificativa, checklist configurável, alerta de sprint iminente,
  remanejamento com histórico e associação corrente única, encerramento sem concluir histórias,
  releases multi-time e multi-release, histórico de previsão, bloqueio por impedimento, marcos,
  riscos resolvidos consultáveis, diário (data padrão, duplicado, filtros, após encerramento) e
  dashboard sem duplicar entregas, global e contextual.

## Fora do escopo desta etapa

- Capacidade planejada e demanda das sprints (§5.2.4), horas no progresso da release, estimativas
  (`effort_estimates`) — Etapa 4.
- Dependências entre entregas (§24) e previsão calculada (§25) — Etapas 5 e 6.
- Relatório formal de sprint/retrospectiva (§31) — Etapa 9; a sprint já expõe o resumo.
- Checklist de prontidão configurável no nível do workspace (hoje: padrão do §15.4, editável por item).
- Filtros globais de sprint, release e período no contexto (§5.3).
