# Etapa 5 — Planejamento de execução

Implementa a Etapa 5 do roadmap (§54): planos de execução, filas, reordenação, paralelismo, limites de
simultaneidade, políticas de redistribuição e dependências.

**Critério de conclusão:** o sistema representa como o trabalho será executado, respeitando capacidade e
restrições.

## Banco (§35)

Migration `20261016234608_execution_planning`. Tabelas: `execution_plans`, `execution_plan_items`,
`work_dependencies`. Enums: `ExecutionMode` (§22.2), `RedistributionPolicy` (§23),
`ExecutionPlanStatus`, `DependencyType` (§24.3), `DependencyStatus`.

| Regra | Constraint |
| --- | --- |
| Períodos válidos (§35.7) | `end_date ≥ start_date` |
| Limite de simultaneidade (§22.5) | `max_parallel_items` entre 1 e 10; sequencial ⇒ 1 |
| Percentuais entre zero e um (§35.7) | `capacity_share` em `(0, 1]` ou vazio |
| Ordem explícita (§22.5) | `position ≥ 1`, única por plano; item único por plano |
| Capacidade não consumida duas vezes (RN-026) | índice único parcial `(developer_id, team_id, project_id) NULLS NOT DISTINCT WHERE status = 'ACTIVE'` |
| Sem auto-dependência (§24.5) | `predecessor_id <> successor_id` |
| Forma da dependência | externa ⇔ sem predecessor e com `external_reference`; interna sem data de liberação |
| Liberação | `RELEASED` só para externa, com `actual_release_date` |
| Ausência de ciclos (§35.7, CA-017) | verificada na transação com `pg_advisory_xact_lock` por workspace sobre o grafo FS/SS/FF |

Nada calculado é persistido: a projeção é derivada na leitura (mesma abordagem da Etapa 4).

## Modelo

- **Plano = pessoa × contexto × período.** O contexto (time, projeto — ambos opcionais) decide quais
  alocações alimentam a fila: as da pessoa com **exatamente** esse time e projeto. Correspondência exata
  evita que a mesma alocação alimente dois planos (RN-026). Sem alocação no contexto a capacidade é zero
  e o plano é sinalizado (`NO_CAPACITY`), nunca inventada (§3.4).
- **Situação:** `ACTIVE` consome o contexto (um por pessoa e contexto); `DRAFT` é projetado isolado,
  como alternativa, sem entrar na redistribuição entre contextos; `ARCHIVED` não é projetado nem editado
  (reabre como rascunho).
- **Fila:** posição explícita, parcela opcional (`capacity_share`), início mais cedo e observação. Um
  item fica em no máximo um plano ativo (senão o esforço restante seria consumido duas vezes); com
  projeto no contexto, todos os itens são desse projeto (§3.2); itens novos precisam estar abertos
  (RN-035). A fila não interfere na fila de foco pessoal (§22.5).
- **Situação de execução** continua no item externo (sem estado duplicado); a do item no plano é
  derivada na projeção (`planItemState`).

## Projeção da execução (`planning-rules.ts`)

`simulateExecution` projeta dia a dia, de `max(início, hoje)` ao fim do plano — o passado não é simulado,
porque o esforço restante é o de hoje. Todos os planos ativos do workspace entram juntos, então
Finish-to-Start entre pessoas e a redistribuição entre contextos usam o mesmo cálculo.

- **Capacidade do contexto:** `contextCapacityByDay` usa a distribuição diária da Etapa 4 (§56.2).
- **Modos (§22.2):** sequencial = 1 item com 100% (padrão, §22.5); paralelo = todos os itens juntos com
  parcela obrigatória; híbrido = até `max_parallel_items` itens elegíveis na ordem, com parcela explícita
  ou divisão igual do restante.
- **Elegibilidade:** item aberto, sem bloqueio total, a partir do início mais cedo e com dependências
  satisfeitas. Bloqueio total não consome capacidade e o próximo assume (§22.5).
- **Conclusão libera capacidade (CA-012):** a sobra do dia de quem termina vai para o próximo elegível.
- **Bloqueio parcial (§22.5, §56.3):** usa `PARTIAL_BLOCK_FACTOR` (50%) da parcela; o resto fica ocioso
  para a política. Valor provisório até a validação do §56.3.
- **Redistribuição (§23):** `NONE` deixa a sobra livre; `SAME_CONTEXT` (padrão, §23.4) a entrega a outros
  itens elegíveis da fila, na ordem; `CROSS_CONTEXT` também a cede a outros planos **ativos da mesma
  pessoa** que também escolheram `CROSS_CONTEXT` — a autorização é dos dois lados (§23.4).
- **Dependências (§24.4):** Finish-to-Start com predecessor em plano ativo → o sucessor começa no dia
  seguinte ao término; predecessor encerrado → liberada; predecessor aberto fora de planos ativos →
  sem previsão. Externa: liberada, com data prevista (começa nela) ou sem data. SS, FF e informativa são
  registradas e não afetam o cálculo.
- **Sem dados, sem datas (§3.4, CA-018, RN-039):** sem estimativa o item ocupa a vaga sem horas
  conhecidas e os que esperam vaga atrás dele ficam `INDETERMINATE`; dependência sem previsão deixa o
  item `WAITING_DEPENDENCY`. A projeção marca `complete = false`.
- **Sinalizações (`planIssueType`):** sem capacidade no contexto, conflito de alocação da pessoa
  (CA-011/RN-029, da Etapa 4), sem estimativa, bloqueado, dependência sem previsão, item antes do
  predecessor na fila, responsável diferente no acompanhamento e itens que não cabem no período.
  Sinalizar não bloqueia: o Tech Lead decide (§3.5).

**Validação que impede salvar (`planShapeIssues`, usada pela web e pela API):** parcelas simultâneas
acima de 100% do contexto são rejeitadas (CA-014), exatamente 100% é válido (CA-013). No paralelo a soma
de todas as parcelas; no híbrido, as `max_parallel_items` maiores parcelas (as que podem coincidir).

## Contratos implementados (`/api/v1`, §36)

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/execution-plans` | §36.11. `?developerId&teamId&projectId&workItemId&scope=current\|archived\|all`. |
| `POST` | `/execution-plans` | §36.11 / §37. Sem modo → sequencial; sem política → `SAME_CONTEXT`; sem limite → padrão do modo; situação padrão `ACTIVE`. |
| `GET` | `/execution-plans/{id}` | §36.11. Plano, fila com restrições e projeção por item, projeção do plano, sinalizações, alocações do contexto e histórico. |
| `PATCH` | `/execution-plans/{id}` | §36.11. Configuração, situação e `items` (substitui a fila inteira — reordenação). Combinação final revalidada; `version` obrigatória. |
| `GET` `POST` | `/work-dependencies` | §36.12. `?workItemId&scope=open\|all`. Ciclo → `422` (CA-017); duplicada → `409`. |
| `DELETE` | `/work-dependencies/{id}` | §36.12. Auditado. |
| `GET` `PATCH` | `/work-dependencies/{id}` | **Acréscimo**: detalhe; referência, data prevista (só externa) e observação. |
| `POST` | `/work-dependencies/{id}/release` | **Acréscimo**: libera a dependência externa (§24.5). |

Auditoria: plano criado/atualizado/fila alterada (com transição de situação) e dependência
criada/alterada/liberada/removida.

**Desvios conscientes:**

- `ExecutionPlanItem.execution_status` (§22.4) não é armazenado: a execução continua no item externo e a
  situação no plano é derivada na projeção.
- `WorkDependency.status` só é usado pela externa; a interna se libera quando o predecessor é encerrado.
- `ExecutionPlan` ganhou `notes`; a fila é substituída inteira no `PATCH` (sem rota própria de itens).

## Interface

Nova área **Planejamento** (`(planning)` com `SectionNav`):

| Rota | Conteúdo |
| --- | --- |
| `/plans` | Planos por pessoa (ativos e rascunhos, arquivados, todos), filtrados pelo contexto global. |
| `/plans/new` | Pessoa, situação, contexto, período (padrão: 2 semanas), modo, limite e política. |
| `/plans/{id}` | Sinalizações, editor da fila (subir/descer, parcela, início mais cedo, observação, adicionar/remover, salvar com versão), projeção (KPIs, `ExecutionTimeline`, aviso de projeção incompleta), configuração, alocações do contexto e histórico. |
| `/dependencies` | Dependências (não liberadas / todas) com liberar e remover; cadastro. |
| `/work-items/{id}` | Cartão “Execução e dependências”: planos com o item, dependências e cadastro com o item como sucessor. |

Novos componentes e status: ver `docs/design-system.md` e o showcase `/design-system`.

## Testes

- `shared-contracts` (`planning-rules.test.ts`): CA-013/CA-014 nos modos paralelo e híbrido, contrato do
  §37, ciclos (CA-017), estado das dependências, capacidade do contexto, sequencial com CA-012, RN-035,
  paralelo com `NONE` × `SAME_CONTEXT`, híbrido, bloqueio total/parcial, FS fora da ordem (CA-016),
  dependência sem previsão (CA-018), item sem estimativa, início mais cedo e período, `CROSS_CONTEXT`
  só entre planos da mesma pessoa que autorizaram, e sem capacidade.
- `apps/api` integração (`planning.int-test.ts`): contrato do §37 com capacidade do contexto, CA-013/014,
  CA-012, dependências (CA-016/017/018, liberação, remoção, auditoria), bloqueio e responsável diferente,
  `CROSS_CONTEXT`, um plano ativo por contexto e item em um só plano ativo, arquivamento, versão,
  validações da fila e reordenação.

## Fora do escopo desta etapa

- Previsão de datas com confiança, histórico (`ForecastRun`), saúde calculada e recálculo assíncrono via
  outbox (§25, §26, §43) — Etapa 6. A projeção do plano é derivada na leitura e rotulada como “não é
  previsão”.
- Start-to-Start e Finish-to-Finish no cálculo (§24.4) e dependências de itens fora de planos ativos com
  data conhecida — com o motor da Etapa 6.
- Cenários e recomendações (Etapas 7 e 8).
