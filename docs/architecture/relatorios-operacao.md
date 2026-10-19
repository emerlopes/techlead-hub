# Etapa 9 — Relatórios e operação

A Etapa 9 do roadmap (§54) foi dividida em duas partes:

| Parte | Escopo | Situação |
| --- | --- | --- |
| **9a — Relatórios** | Relatórios de sprint, release e capacidade; rascunhos de demo e de retrospectiva (§31, §34.17, §36.16) | **Implementada** |
| **9b — Operação** | Backups, restauração, observabilidade, testes de recuperação e preparação para nuvem (§47–§50.6) | **Pendente** — ver [Pendências](#pendências-rastreáveis) |

**Por que dividir.** Os relatórios usam só o que as Etapas 3, 4 e 5 já registram e entram no P2 da
priorização (§55), antes do motor de previsão. A operação não depende do motor, mas fica para depois da
Etapa 6: os jobs de previsão, o outbox e o diagnóstico de cálculo (§41–§43, §49.4) aumentam o que
precisa ser monitorado, restaurado e reprocessado. Fazer a 9b antes obrigaria a refazer boa parte dela.

**Critério de conclusão da Etapa 9 (§54):** relatórios úteis, operação documentada e recuperação
testada. A 9a cobre a primeira parte; a etapa só está concluída quando as pendências PEND-9-03 a
PEND-9-07 forem resolvidas.

## 9a — Relatórios

### Princípios

- **Derivados na leitura, nada persistido.** Como capacidade (Etapa 4) e projeção (Etapa 5), os
  relatórios são calculados a cada consulta: refletem o estado atual dos registros e não criam outra
  fonte de verdade. Não há tabela nova nem migration.
- **Regras puras em `packages/shared-contracts/src/report-rules.ts`.** A API só reúne os dados dos
  módulos existentes; a classificação (escopo original, mudanças, concluídos, riscos do período, seções
  dos rascunhos) e o Markdown ficam em funções puras testadas isoladamente.
- **Nenhum fato inventado (§3.4, §31.5).** Seção sem registro aparece vazia com o motivo; previsão
  ausente aparece como “Sem previsão”; capacidade sem jornada aparece como “—”.
- **Previsão sempre com a origem (§26.3).** Até a Etapa 6 só existe a previsão manual.

### Conteúdo de cada relatório

| Relatório | Origem dos dados | Regras |
| --- | --- | --- |
| **Sprint (§31.1)** | Detalhe da sprint (escopo, saídas, resumo e capacidade × demanda), riscos e diário | Escopo original = itens `ORIGINAL`, inclusive os que saíram. Alterações = `ADDED`, `MOVED` (entrada) e saídas `REMOVED`/`MOVED`, em ordem cronológica (RN-010). Concluído: no encerramento vale o resultado registrado (`COMPLETED`, RN-011); antes, a execução atual. Bloqueios = pendentes com saúde “Bloqueada” + impedimentos. Riscos ligados à sprint ou a qualquer item que passou por ela, **vigentes no período** (identificados até o fim e não resolvidos antes do início; cancelados ficam de fora). Diário: ligado à sprint, ou a um item dela **dentro do período**; separado em decisões técnicas e demais acontecimentos. |
| **Release (§31.2)** | Detalhe da release, dependências, riscos e diário | Compromisso e previsão manual (`forecastDate` + `ReleaseForecastHistory`, §12.5), com a data em que a previsão atual foi registrada. Escopo separado em obrigatório e opcional. Dependências em que um item do escopo é o sucessor (§24). Riscos **abertos** da release ou dos itens. Principais mudanças: compromisso/previsão, retiradas de escopo e registros do diário ligados à release, do mais recente ao mais antigo. As inclusões aparecem no escopo, com a data de entrada, e não como “mudança” (todo item entra por inclusão). |
| **Capacidade (§31.3)** | `CapacityService.overview` | Mesmo cálculo da visão geral (RN-037: um só cálculo): totais, pessoas, alocações com horas no período, demanda por time e projeto, conflitos (§20.5) e ausências. Filtro de período (`?from&to`) e de contexto (`teamId`, `projectId`). |
| **Demo (§31.4)** | Relatório da sprint | Entregas concluídas · Funcionalidades relevantes (registros “Conquista” do diário) · Decisões · Acontecimentos · Pendências conhecidas. |
| **Retrospectiva (§31.5)** | Relatório da sprint | O que funcionou (“Conquista”) · Problemas (“Incidente”, “Risco” do diário + riscos do período) · Bloqueios (“Bloqueio”/“Desbloqueio” + impedimentos + itens bloqueados) · Mudanças de escopo (movimentações + “Mudança de escopo”) · Aprendizados · Decisões · Ações sugeridas (**não gerada**, PEND-9-02). |

Cada entrada de rascunho carrega a referência de origem (`WORK_ITEM`, `JOURNAL_ENTRY`, `RISK`) para
conferência (§3.3). Seções têm estado `FILLED`, `NO_DATA` (nada registrado) ou `NOT_GENERATED` (o sistema
ainda não gera esse conteúdo).

### Contratos implementados (`/api/v1`, §36.16)

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/reports/sprints/{id}` | `SprintReport`. `404` para sprint inexistente ou de outro workspace. |
| `GET` | `/reports/releases/{id}` | `ReleaseReport`. `forecast = null` sem previsão; `source` hoje é sempre `MANUAL`. |
| `GET` | `/reports/capacity` | `CapacityReport` (`?from&to&teamId&projectId`, mesmo limite de período do §25.6). |
| `POST` | `/reports/generate` | `{ type: SPRINT_DEMO \| SPRINT_RETROSPECTIVE, sprintId }` → `ReportDraft`. Gera na hora, **não persiste e não audita** (não altera dados). Exige o cabeçalho CSRF como toda mutação. |

Schemas em `packages/shared-contracts/src/reports.ts`. Para servir os relatórios, os serviços existentes
ganharam leituras sem paginação: `RisksService.listForContexts`, `JournalService.listForContexts`
(limite de segurança `REPORT_JOURNAL_LIMIT = 500`) e `DependenciesService.listForSuccessors`.

**Desvios conscientes:**

- `POST /reports/generate` cobre só os rascunhos. Sprint, release e capacidade têm rotas `GET` próprias;
  gerar esses relatórios por `POST` não traria nada além de duplicar as rotas.
- Rascunhos não são salvos nem editados no hub: o Tech Lead copia ou baixa o Markdown e edita onde for
  apresentar. Exportação dos relatórios = impressão/PDF pelo navegador (`PrintButton`).

### Interface

Nova área **Relatórios** (`(reports)` com `SectionNav`):

| Rota | Conteúdo |
| --- | --- |
| `/reports` | Sprints (exceto canceladas) e releases do contexto selecionado, com link para o relatório; atalho para o de capacidade. |
| `/reports/sprints/{id}` | Resumo, escopo original, alterações, concluídas, pendências, capacidade e demanda, bloqueios, riscos, decisões, acontecimentos e o cartão “Observações para retrospectiva e demo” (`DraftGenerator`: gerar, copiar Markdown, baixar `.md`). |
| `/reports/releases/{id}` | Resumo, compromisso × previsão (com origem e data do registro), times, escopo obrigatório/opcional, dependências (leitura), riscos e principais mudanças. |
| `/reports/capacity` | Período e contexto, totais (`CapacityTotals`, compartilhado com `/capacity`), tabelas de pessoas, alocações e demanda, conflitos e ausências. |

Os detalhes de sprint e release ganharam o botão “Relatório”. Todos os relatórios imprimem sem o
shell (`print:hidden`). Novos status e componentes: ver `docs/design-system.md` e `/design-system`.

### Testes

- `shared-contracts` (`report-rules.test.ts`): classificação do escopo, resultado do encerramento
  (RN-011), riscos vigentes no período, separação do diário, rascunhos sem fatos inventados (§31.5),
  ações sugeridas não geradas, Markdown, previsão manual e “Sem previsão” (§3.4), escopo e mudanças da
  release, validação de `POST /reports/generate`.
- `apps/api` integração (`reports.int-test.ts`): relatório de sprint completo com recorte de período do
  diário, rascunhos de demo e retrospectiva, geração sem auditoria, validações e `404`, relatório de
  release com previsão manual, dependências, riscos abertos e mudanças, release sem datas, relatório de
  capacidade igual à visão geral.

## Pendências rastreáveis

Cada pendência tem um identificador `PEND-9-xx`. As que deixam uma lacuna em código existente
(PEND-9-01, PEND-9-02) são citadas nos comentários de lá — procure por `PEND-9-` no repositório; as de
operação são citadas em `COMO_USAR.md` e em `docs/main.md` (§54). Ao resolver uma, atualize esta tabela
(situação e onde foi resolvida) em vez de apagar a linha.

| ID | Pendência | Spec | Depende de | Onde está hoje | O que falta |
| --- | --- | --- | --- | --- | --- |
| PEND-9-01 | **Previsão calculada no relatório de release** | §31.2, §30.3, §26.3, §25.7, RNF-021, CA-031 | Etapa 6 (motor de previsão) | `manualReleaseForecast` e `forecastSources` (`report-rules.ts`, `reports.ts`); cartão “Compromisso e previsão” em `/reports/releases/{id}` | Preencher `forecast` com a previsão calculada (`source: CALCULATED`, `confidence`), mantendo a manual visível e separada; sinalizar previsão obsoleta ou em recálculo (`forecastState`); mostrar a margem de entrega (§30.3). O mesmo vale para a previsão por item nas listas do relatório. |
| PEND-9-02 | **Ações sugeridas na retrospectiva** | §31.5, §3.5 | Etapa 8 (recomendações) ou decisão de produto | Seção `SUGGESTED_ACTIONS` com estado `NOT_GENERATED` em `buildSprintDraft` | Decidir a origem das ações (recomendações aprovadas da Etapa 8, ou ações registradas manualmente) e gerá-las sem inventar fatos. Enquanto isso, a seção fica para preenchimento na reunião. |
| PEND-9-03 | **Backups automáticos** | §47.1–§47.3 | — (planejada para depois da Etapa 6) | Só o procedimento manual com `pg_dump` em `COMO_USAR.md` §6 | Backup diário agendado com `pg_dump`, retenção de 14 diários e 4 semanais, armazenamento fora do volume principal; documentar em `docs/` e `COMO_USAR.md`. |
| PEND-9-04 | **Restauração documentada** | §47.4, §47.5 | Etapa 6 (passos 6 e 8: eventos pendentes e previsões) | Só o comando de restauração em banco vazio em `COMO_USAR.md` | Roteiro com os 8 passos do §47.4 (parada, preparação, restauração, migrations, integridade, eventos pendentes, reinício, validação de previsões e histórico) e reconstrução dos jobs a partir do PostgreSQL, sem depender do Redis (§47.5). |
| PEND-9-05 | **Testes de recuperação** | §50.6, §47.3 (“restauração de teste periódica”) | PEND-9-03, PEND-9-04 | Nenhum | Teste automatizado que restaura um backup em banco limpo, valida integridade e reprocessa jobs com segurança. |
| PEND-9-06 | **Observabilidade** | §49.1–§49.4 | Etapa 6 para métricas de cálculo e §49.4 | Logs padrão do Nest e `/health` | Logs estruturados com os campos do §49.1 (correlação, job, duração, resultado); métricas técnicas (§49.2) e funcionais (§49.3); diagnóstico de cada previsão (§49.4). |
| PEND-9-07 | **Preparação para nuvem** | §48, §44.7, §45 | PEND-9-03, PEND-9-04 | Nenhum | Roteiro de migração com as 14 etapas do §48.2 e a restrição do §48.3 (sem duas instâncias com escrita simultânea). |
| PEND-9-08 | Exportações adicionais (opcional) | §34.17 | — | Markdown dos rascunhos e impressão/PDF pelo navegador | Avaliar se vale gerar PDF no servidor, CSV ou salvar versões dos relatórios. Não é exigido pela especificação; reavaliar com uso real. |
| PEND-9-09 | Contratos em OpenAPI | §36.16 | — (vale para todas as etapas) | Contratos só em Zod (`shared-contracts`) | Formalizar request/response/erros em OpenAPI, como pede o §36. Pendência transversal, não exclusiva da Etapa 9. |
