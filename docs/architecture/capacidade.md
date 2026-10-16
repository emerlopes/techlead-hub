# Etapa 4 — Capacidade

Implementa a Etapa 4 do roadmap (§54): jornadas, calendários, ausências, alocações, estimativas,
capacidade por desenvolvedor e por time, demanda por projeto e alertas de sobrecarga.

**Critério de conclusão:** o sistema calcula capacidade efetiva e identifica conflitos de alocação.

## Banco (§35)

Migration `20261016224134_capacity`. Tabelas: `work_schedules`, `availability_exceptions`,
`capacity_allocations`, `capacity_allocation_history`, `effort_estimates`. Enums:
`AvailabilityExceptionType` (§19.3), `AllocationType` e `AllocationPeriod` (§20.3),
`EstimateConfidence` (§21.4).

Constraints além do Prisma (mesma migration):

| Regra | Constraint |
| --- | --- |
| Jornada com sete dias, 0–24 h cada (§19.1) | `CHECK` em `weekly_pattern` (`array_length = 7`, sem nulos, `0 ≤ h ≤ 24`) |
| Percentuais entre zero e um (§35.7) | `focus_factor` em `[0, 1]`; alocação percentual em `(0, 1]` |
| Periodicidade explícita das horas (§20.3) | `CHECK` tipo × valor × `period` (percentual sem período; horas com período) |
| Reserva geral identificada (§20.5) | sem time e sem projeto ⇒ `description` obrigatória |
| Períodos válidos (§35.7) | `valid_until ≥ valid_from`, `end_date ≥ start_date` |
| Validação transacional de conflitos temporais (§35.7) | `EXCLUDE USING gist (developer_id WITH =, daterange(valid_from, valid_until, '[]') WITH &&)` em `work_schedules` (extensão `btree_gist`) |
| Feriado do workspace | `developer_id IS NULL` só com `type = 'HOLIDAY'` |
| Ausência parcial plausível | `unavailable_hours` em `(0, 24]` |
| Esforço não negativo (RN-031) | `estimated_hours`, `remaining_hours`, `actual_hours`, `story_points` ≥ 0 |

Índices de §35.8: alocações e ausências por pessoa e período (`developer_id, valid_from` /
`developer_id, start_date`), além de time e projeto nas alocações.

Nada calculado é persistido. Exclusão física só existe para alocação que ainda não começou
(`DELETE`, auditado); as demais são encerradas pela vigência e ausências são canceladas
(`cancelled_at`) — §35.9.

## Regras aplicadas

Funções puras em `packages/shared-contracts/src/capacity-rules.ts` (motor testável isoladamente,
RNF-019), usadas pela API e pela web:

- **Capacidade efetiva (§18.3):** `CE = (HN − HI) × FF`, dia a dia, somada no período. O fator de foco
  é aplicado depois dos descontos (RN-028); a capacidade nunca é negativa (§18.4).
- **Jornada (§19.1):** padrão semanal com horas por dia (segunda a domingo); `weekly_hours` é a soma,
  derivada. Uma nova jornada encerra a vigente no dia anterior ao início (histórico preservado,
  §19.4); sobreposição com jornada futura → `409`. **Sem jornada a capacidade é desconhecida, não
  zero** (§3.4): o dia conta como "sem jornada" e alocações nele geram `NO_SCHEDULE`.
- **Ausências (§19.2–§19.4):** granularidade diária (§56.2). `unavailable_hours = null` = dia inteiro;
  valor = horas por dia. Sobreposições são consolidadas: um dia inteiro desconta a jornada uma única
  vez; parciais somam, limitadas à jornada do dia — nada é descontado duas vezes (§18.4). Feriados
  sem pessoa valem para todo o workspace. O motivo é genérico e nunca vai para a auditoria (§44.5).
- **Alocações (§20) — política de distribuição diária (§56.2):**
  - percentual: `CA = CE × PA` (§25.5) sobre a capacidade efetiva de cada dia;
  - horas por dia: o valor em cada dia com jornada;
  - horas por semana: distribuídas proporcionalmente à jornada nominal de cada dia.
  Alocações em horas são **compromissos fixos**: ausências não as reduzem, então uma ausência que
  impede cumpri-las aparece como conflito (ausência com impacto) em vez de sumir.
- **Conflitos sinalizados antes da previsão (§20.5):** `OVER_ALLOCATED` (alocado > efetivo no período,
  CA-011), `PERCENTAGE_OVER_LIMIT` (percentuais somam > 100% em algum dia, RN-029 / CA-014),
  `NO_SCHEDULE`, `NOT_TEAM_MEMBER` (alocação em time sem participação no período) e
  `INACTIVE_CONTEXT` (time inativo, projeto arquivado ou pessoa desativada). Somar exatamente 100%
  é válido (CA-013). Conflitos não bloqueiam o cadastro — o Tech Lead decide (§3.5).
- **Capacidade não duplicada (RN-026, RN-037, CA-021):** a capacidade de cada pessoa é calculada uma
  única vez; times e projetos recebem só a parcela das alocações ligadas a eles. Totais da visão
  geral somam pessoas, nunca contextos.
- **Estimativas (§21):** cada estimativa ou revisão é uma linha nova (RN-030, CA-022) com confiança,
  story points opcionais (sem conversão em horas, §21.5) e esforço realizado opcional. O esforço
  restante informado passa a valer em `delivery_trackings.remaining_effort_hours`, com fotografia no
  histórico do acompanhamento — **um único valor corrente de esforço restante**, sem estado duplicado.
  Itens encerrados não recebem estimativas e não consomem capacidade (RN-035).
- **Demanda e utilização (§25.5):** demanda = esforço restante de itens abertos, separado em: vence no
  período (compromisso ≤ fim do período, inclusive vencidos), depois do período e sem compromisso.
  Itens sem esforço restante não viram zero: contam como "sem estimativa" (RN-039).
  `U = D / CA × 100` usa a demanda que vence no período; com `CA = 0` não há percentual
  (`NO_CAPACITY`). Faixas: < 85% saudável · 85–100% atenção · > 100% sobrecarga.
- **Sprint (§5.2.4):** capacidade planejada = alocações ao time durante a sprint; demanda estimada =
  esforço restante do escopo vigente em aberto (todo ele vence no fim da sprint).
- **Release (§12):** progresso ganha horas restantes dos obrigatórios estimados e quantos estão sem
  estimativa (pendência da Etapa 3).
- **Recálculo (RN-034, CA-015):** capacidade e demanda são derivadas na leitura; uma ausência, jornada
  ou alocação nova vale na próxima consulta. O recálculo de **previsões** e o estado "obsoleta" chegam
  com o motor (Etapa 6), via outbox (§42, §43).
- **Período (§25.6):** `?from&to` (datas de negócio no fuso do workspace); padrão = hoje +
  `CAPACITY_DEFAULT_DAYS` (14); horizonte máximo `CAPACITY_MAX_DAYS` (184).

## Contratos implementados (`/api/v1`, §36)

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/teams/{id}/capacity` | §36.10. `?from&to`. Alocado ao time × demanda das entregas que ele executa; pessoas (participantes ou alocadas) com a capacidade global de cada uma; ausências relevantes. |
| `GET` | `/projects/{id}/demand` | §36.10. Demanda por time executor, quem tem capacidade alocada, itens com esforço restante e confiança. |
| `GET` `POST` | `/capacity/allocations` | §36.10. `?developerId&teamId&projectId&scope=current\|all`. |
| `GET` `PATCH` | `/capacity/allocations/{id}` | `PATCH` §36.10; `GET` (com histórico) é acréscimo. A combinação final é revalidada; o histórico registra só os campos que mudaram. |
| `DELETE` | `/capacity/allocations/{id}` | **Acréscimo**: só alocação futura (§35.9); vigente → `422`. |
| `GET` | `/developers/{id}/capacity` | §36.5. Resumo, dia a dia, jornadas, ausências e alocações com horas e inconsistências. |
| `POST` | `/developers/{id}/availability-exceptions` | §36.5. |
| `GET` `POST` | `/capacity/availability-exceptions` | **Acréscimo**: lista (`scope=upcoming\|all\|cancelled`) e cadastro de feriados do workspace (sem pessoa). |
| `PATCH` | `/capacity/availability-exceptions/{id}`; `POST .../cancel` | **Acréscimo**. |
| `GET` `POST` | `/capacity/schedules`; `PATCH /capacity/schedules/{id}` | **Acréscimo**: jornadas (§19.1). |
| `GET` | `/capacity` | **Acréscimo**: visão geral (pessoas, times, projetos, totais sem duplicação, ausências), filtrável por contexto. |
| `POST` | `/work-items/{id}/estimates` | **Acréscimo**: estimativa/revisão com a `version` do item (raiz do agregado). |
| `GET` | `/dashboard` | Ganhou `capacity` (§5.2.7). Sprints ganharam `capacity`; releases, `requiredRemainingHours` e `requiredUnestimated`; itens, `estimate` (vigente) e, no detalhe, `estimates`. |

Alterações relevantes são auditadas (RN-038): jornada criada/alterada/encerrada, ausência
criada/alterada/cancelada, alocação criada/alterada/excluída e estimativa registrada.

**Desvios conscientes:**

- `WorkSchedule.weekly_hours` (§19.1) é derivado do padrão semanal e devolvido na API, não armazenado.
- `AvailabilityException` usa datas de negócio (`start_date`, `end_date`) em vez de instantes
  (`start_at`, `end_at`) e `unavailable_hours` significa **horas por dia** (vazio = dia inteiro): a
  granularidade mínima é o dia (§56.2).
- `CapacityAllocation` ganhou `period` (`DAY`/`WEEK`) para a periodicidade explícita do §20.3, e o
  histórico de valores fica em `capacity_allocation_history` (a auditoria guarda só nomes de campos).
- `EffortEstimate.remaining_hours` registra o restante na data da estimativa; o restante corrente
  continua em `delivery_trackings` (Etapa 3), que a estimativa atualiza.
- A validação de "alocações acima de 100%" é por dia: vigências que não se cruzam podem somar mais de
  100% no período sem conflito.

## Interface

Nova área **Capacidade** (`(capacity)` com `SectionNav`):

| Rota | Conteúdo |
| --- | --- |
| `/capacity` | Período (`?from&to`, atalhos 2/4/12 semanas), contexto global, totais (nominal, efetiva, alocada, livre, sobrecarga), pessoas (alocado × efetivo + inconsistências), times e projetos (`ContextLoadView`) e ausências do período. |
| `/capacity/allocations` (+ `/new`, `/{id}`) | Alocações agrupadas por pessoa; criação com percentual ou horas + periodicidade; detalhe com edição, histórico de valores, "Encerrar hoje" e exclusão só de futuras. |
| `/capacity/availability` | Registro de ausência/feriado e lista (atuais e próximas, todas, canceladas) com cancelamento. |
| `/capacity/schedules` | Jornadas por pessoa (vigente destacada), cadastro e edição; aviso de quem está sem jornada. |
| `/developers/{id}` | Cartão de capacidade: resumo, dia a dia, jornada vigente, alocações com horas, ausências. |
| `/teams/{id}`, `/projects/{id}` | Capacidade do time / demanda do projeto. |
| `/work-items/{id}` | Estimativas e revisões; confiança no resumo. |
| `/sprints`, `/sprints/{id}`, `/releases` | Capacidade planejada × demanda; horas restantes da release. |
| `/` | Bloco de capacidade (§5.2.7): times sobrecarregados, pessoas acima da capacidade, capacidade não alocada, conflitos entre projetos, ausências com impacto, pessoas sem jornada. |

Novos componentes e status: ver `docs/design-system.md` (§6–§9) e o showcase `/design-system`.

## Testes

- `shared-contracts` (`capacity-rules.test.ts`): fórmula do §18.3 (40 h, 8 h, 75% → 24 h), capacidade
  não negativa, fator de foco após descontos, jornada por dia e por vigência, sem jornada, ausência
  parcial, consolidação de sobreposições, distribuição 50/30/20 do §20.4, percentuais acima de 100%,
  vigências sem sobreposição, horas por semana e por dia, ausência que gera conflito, demanda por
  vencimento e utilização com `CA = 0`.
- `apps/api` integração (`capacity.int-test.ts`): CE com ausência, nova jornada encerrando a anterior,
  `EXCLUDE` de sobreposição e versão, capacidade sem jornada, validação do padrão semanal,
  consolidação com feriado do workspace, cancelamento devolvendo capacidade (CA-015), auditoria sem
  motivo, alocações 50/30/20 sem conflito e com excesso (CA-011, RN-029) refletidas no dashboard,
  capacidade não duplicada entre times (CA-021), pessoa fora do time, horas com periodicidade,
  validações e contexto inativo, histórico/versão/encerramento/exclusão de alocações, revisões de
  estimativa (RN-030, CA-022), demanda do projeto (RN-035, RN-039), capacidade da sprint e horizonte
  máximo.

## Fora do escopo desta etapa

- Fila de execução, paralelismo e dependências (§22, §24) — Etapa 5. Por isso CA-012 ("entrega
  sequencial concluída libera capacidade") ainda não se aplica; hoje concluir já zera o esforço
  restante (RN-035).
- Previsão calculada, recálculo assíncrono e estado obsoleto (§25, §43) — Etapa 6.
- Calendários de feriados regionais por pessoa/time (§56.2): hoje há o calendário do workspace e
  exceções individuais.
- Relatório de capacidade (§31.3) — Etapa 9; a visão geral já reúne os dados.
