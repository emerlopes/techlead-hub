# TECH LEAD HUB

## Documento Consolidado de Produto, Requisitos Funcionais e Arquitetura Técnica

**Versão:** 1.0 — Consolidação das especificações v0.1 a v0.9  
**Status:** Especificação consolidada para revisão e planejamento de implementação  
**Tipo de produto:** Sistema pessoal de gestão técnica e acompanhamento de entregas  
**Público-alvo inicial:** Um único Tech Lead  
**Estratégia de implantação:** Local primeiro, preparado para nuvem  
**Modelo de desenvolvimento:** Incremental e modular

---

# 1. VISÃO GERAL DO PRODUTO

## 1.1. O que é o Tech Lead Hub

O Tech Lead Hub é uma aplicação pessoal destinada a centralizar as atividades, prioridades, acompanhamentos e decisões de um Tech Lead que gerencia múltiplos times e projetos.

O sistema tem como objetivo oferecer uma visão consolidada sobre:

- Atividades pessoais e prioridades do Tech Lead.
- Foco de trabalho atual.
- Sprints de diferentes times.
- Releases de diferentes projetos.
- Histórias e demandas registradas em ferramentas externas.
- Situação das entregas dos desenvolvedores.
- Refinamentos pendentes.
- Riscos, impedimentos e dependências.
- Disponibilidade e capacidade dos desenvolvedores.
- Alocação entre times e projetos.
- Estimativas e previsões de conclusão.
- Recomendações de replanejamento.
- Acontecimentos relevantes para demos e retrospectivas.

A ferramenta deverá reduzir a dependência de planilhas, anotações dispersas e consultas repetitivas a diferentes sistemas.

## 1.2. Problema que o produto resolve

Um Tech Lead que acompanha múltiplos times e projetos precisa responder constantemente a perguntas como:

1. O que preciso fazer hoje?
2. Qual é minha prioridade principal?
3. Quais tarefas pessoais estão atrasadas?
4. O que cada desenvolvedor está executando?
5. Quais entregas estão bloqueadas?
6. Quais histórias ainda precisam de refinamento?
7. Quais sprints apresentam risco?
8. Quais releases podem atrasar?
9. Existe capacidade suficiente para concluir o escopo?
10. Um desenvolvedor está alocado acima da capacidade?
11. Como uma ausência afeta as entregas?
12. Que mudanças de planejamento poderiam reduzir os atrasos?
13. Quais decisões e acontecimentos precisam ser mencionados na demo ou retrospectiva?

Essas informações frequentemente estão distribuídas entre ferramentas de gestão, conversas, reuniões e registros pessoais.

O Tech Lead Hub deverá organizar essas informações em uma visão operacional única.

## 1.3. Objetivo principal

Permitir que o Tech Lead tome decisões melhores sobre suas próprias atividades e sobre a execução técnica dos times, com base em informações organizadas, atualizadas e rastreáveis.

## 1.4. Objetivos secundários

- Melhorar a organização pessoal.
- Reduzir esquecimentos e pendências.
- Aumentar a visibilidade sobre as entregas.
- Antecipar riscos de atraso.
- Identificar conflitos de capacidade.
- Facilitar planejamento de sprints e releases.
- Preservar histórico de decisões.
- Melhorar a preparação de reuniões, demos e retrospectivas.
- Apoiar o replanejamento sem retirar o controle do Tech Lead.

## 1.5. O que o Tech Lead Hub não é

O sistema não será, inicialmente:

- Uma ferramenta colaborativa.
- Um substituto completo do Jira ou Azure DevOps.
- Uma ferramenta de autoria de histórias de usuário.
- Um sistema de controle de ponto.
- Um software de avaliação individual de desempenho.
- Uma ferramenta de comunicação entre desenvolvedores.
- Uma plataforma multiusuário.
- Um sistema que altera automaticamente o backlog externo.
- Um mecanismo que toma decisões de planejamento sem aprovação.

---

# 2. DECISÕES DE PRODUTO JÁ DEFINIDAS

As seguintes decisões foram estabelecidas durante o refinamento.

| ID      | Decisão                                                           | Situação         |
| ------- | ----------------------------------------------------------------- | ---------------- |
| DEC-001 | O sistema será utilizado inicialmente por um único Tech Lead      | Confirmada       |
| DEC-002 | Desenvolvedores serão cadastros de referência, sem login          | Confirmada       |
| DEC-003 | Histórias serão registradas manualmente com links externos        | Confirmada       |
| DEC-004 | Não haverá integração obrigatória com Jira/Azure DevOps no MVP    | Confirmada       |
| DEC-005 | Atividades pessoais e entregas dos times serão domínios separados | Confirmada       |
| DEC-006 | O dashboard consolidará informações dos dois domínios             | Confirmada       |
| DEC-007 | O sistema suportará múltiplos times                               | Confirmada       |
| DEC-008 | O sistema suportará múltiplos projetos                            | Confirmada       |
| DEC-009 | Um projeto poderá envolver vários times                           | Confirmada       |
| DEC-010 | O sistema terá gestão completa de capacidade                      | Confirmada       |
| DEC-011 | Disponibilidade, ausências e alocações serão acompanhadas         | Confirmada       |
| DEC-012 | O planejamento de execução será híbrido                           | Confirmada       |
| DEC-013 | Existirá fila ordenada com paralelismo configurável               | Confirmada       |
| DEC-014 | O sistema calculará previsões de entrega                          | Confirmada       |
| DEC-015 | O sistema poderá sugerir ajustes de planejamento                  | Confirmada       |
| DEC-016 | Ajustes somente serão aplicados após aprovação do Tech Lead       | Confirmada       |
| DEC-017 | A implantação começará localmente                                 | Confirmada       |
| DEC-018 | A arquitetura deverá permitir migração futura para nuvem          | Confirmada       |
| DEC-019 | A arquitetura de referência será um monólito modular              | Proposta técnica |
| DEC-020 | A stack será TypeScript, Next.js, NestJS e PostgreSQL             | Proposta técnica |
| DEC-021 | Redis e BullMQ serão usados para jobs                             | Proposta técnica |

As decisões confirmadas definem o comportamento esperado do produto.

As propostas técnicas poderão ser revisadas antes da implementação.

---

# 3. PRINCÍPIOS DE PROJETO

## 3.1. Simplicidade de uso

Apesar da complexidade do domínio, a interface deverá permitir operações frequentes com poucos passos.

O sistema não deverá exigir atualização excessiva de campos para ser útil.

## 3.2. Separação entre atividade pessoal e entrega

Uma atividade pessoal representa algo que o Tech Lead precisa fazer.

Uma entrega representa trabalho acompanhado pelo Tech Lead, normalmente executado por um desenvolvedor.

Esses elementos não são equivalentes.

Exemplo:

**Entrega:** Desenvolvedor implementar integração de pagamentos.

**Atividade pessoal:** Tech Lead revisar o contrato técnico dessa integração.

As duas entidades podem estar relacionadas, mas possuem estados, responsáveis e prioridades independentes.

## 3.3. Rastreabilidade

Mudanças relevantes devem preservar histórico.

Isso inclui:

- Alterações de previsão.
- Mudanças de responsável.
- Movimentação entre sprints.
- Alterações de esforço.
- Alterações de alocação.
- Aplicação de recomendações.
- Decisões e acontecimentos.

## 3.4. Dados explícitos

O sistema não deve apresentar como fato uma informação que não foi registrada ou calculada com dados suficientes.

Quando faltarem informações, deverá exibir estado indeterminado ou confiança reduzida.

## 3.5. Planejamento assistido

O sistema analisa, calcula e recomenda.

O Tech Lead decide e aprova.

## 3.6. Portabilidade

A aplicação deverá funcionar localmente e ser implantável na nuvem sem reescrever os módulos de domínio.

---

# 4. ESCOPO FUNCIONAL

O Tech Lead Hub será organizado nos seguintes módulos:

1. Dashboard.
2. Minhas Atividades.
3. Times.
4. Projetos.
5. Desenvolvedores.
6. Sprints.
7. Releases.
8. Entregas.
9. Refinamentos.
10. Capacidade e Alocação.
11. Planejamento de Execução.
12. Dependências.
13. Previsibilidade.
14. Simulação de Cenários.
15. Recomendações.
16. Riscos e Impedimentos.
17. Diário de Bordo.
18. Relatórios.
19. Configurações.
20. Auditoria e Histórico.

---

# 5. MÓDULO: DASHBOARD

## 5.1. Objetivo

Apresentar uma visão consolidada das informações que exigem atenção do Tech Lead.

O dashboard deverá funcionar em dois modos:

**Visão global:** todos os times e projetos.

**Visão contextual:** um time, projeto ou combinação selecionada.

## 5.2. Componentes

### 5.2.1. Foco principal

Exibir a atividade pessoal definida como foco principal.

Informações:

- Título.
- Prioridade.
- Prazo.
- Próxima ação.
- Situação.
- Contextos relacionados.

### 5.2.2. Atividades pessoais

Exibir:

- Atividades atrasadas.
- Atividades para hoje.
- Próximos vencimentos.
- Atividades bloqueadas.
- Fila de foco.

### 5.2.3. Entregas críticas

Exibir:

- Entregas bloqueadas.
- Entregas atrasadas.
- Entregas em risco.
- Previsões posteriores ao compromisso.
- Acompanhamentos desatualizados.

### 5.2.4. Sprints ativas

Exibir:

- Time.
- Sprint.
- Período.
- Quantidade de entregas.
- Entregas concluídas.
- Bloqueios.
- Riscos.
- Capacidade planejada.
- Demanda estimada.

### 5.2.5. Releases

Exibir:

- Projeto.
- Nome da release.
- Data comprometida.
- Previsão.
- Situação.
- Entregas pendentes.
- Riscos.

### 5.2.6. Refinamentos

Exibir histórias:

- Aguardando refinamento.
- Em análise.
- Com dúvidas.
- Próximas de entrar em sprint.
- Sem critérios de prontidão atendidos.

### 5.2.7. Capacidade

Exibir:

- Times sobrecarregados.
- Desenvolvedores com alocação excessiva.
- Capacidade não alocada.
- Conflitos entre projetos.
- Ausências com impacto previsto.

### 5.2.8. Recomendações

Exibir sugestões pendentes de análise, agrupadas por impacto.

## 5.3. Filtros

Filtros globais:

- Todos os times ou time específico.
- Todos os projetos ou projeto específico.
- Sprint.
- Release.
- Período.

O filtro deve permanecer durante a navegação até ser alterado.

## 5.4. Regras

- A prioridade pessoal não muda quando o contexto muda.
- Uma entrega compartilhada não pode ser duplicada nos totais globais.
- Uma atividade relacionada a vários projetos continua sendo única.
- Alertas podem ser adiados ou dispensados quando a regra permitir.
- Alertas críticos não devem desaparecer sem registro ou resolução adequada.
- Informações desatualizadas devem ser identificadas.

---

# 6. MÓDULO: MINHAS ATIVIDADES

## 6.1. Objetivo

Organizar o trabalho pessoal do Tech Lead.

## 6.2. Funcionalidades

- Criar atividade.
- Editar atividade.
- Definir prioridade.
- Definir prazo.
- Registrar estimativa de esforço.
- Registrar esforço realizado, opcionalmente.
- Definir próxima ação.
- Alterar situação.
- Marcar como bloqueada.
- Concluir.
- Cancelar.
- Associar a times.
- Associar a projetos.
- Associar a histórias externas.
- Associar a riscos.
- Associar a releases ou sprints.
- Visualizar lista.
- Visualizar Kanban.
- Visualizar agenda.

## 6.3. Tipos de atividade

- Técnica.
- Acompanhamento.
- Decisão.
- Reunião.
- Planejamento.
- Revisão.
- Investigação.
- Outra.

## 6.4. Situações

- `TODO`
- `IN_PROGRESS`
- `BLOCKED`
- `DONE`
- `CANCELLED`

## 6.5. Prioridades

Sugestão:

- Crítica.
- Alta.
- Média.
- Baixa.

A prioridade pessoal será definida manualmente.

## 6.6. Fila de foco

O sistema permitirá:

- Definir até três atividades em foco.
- Definir uma delas como foco principal.
- Reordenar manualmente a fila.
- Remover atividades do foco.
- Visualizar alertas de prazo independentemente da ordem manual.

Uma atividade concluída deverá sair da fila de foco.

## 6.7. Ordenação padrão

Na ausência de uma ordenação manual específica:

1. Foco principal.
2. Demais atividades em foco.
3. Atividades atrasadas.
4. Atividades críticas.
5. Atividades próximas do vencimento.
6. Demais atividades abertas.

A fila de foco e os alertas de vencimento são conceitos independentes.

## 6.8. Regra de associação

Uma atividade pode estar vinculada a múltiplos projetos e times.

A atividade não deve ser duplicada em razão desses vínculos.

Concluir uma atividade não resolve automaticamente a história, o risco ou o impedimento associado.

---

# 7. MÓDULO: TIMES

## 7.1. Objetivo

Organizar as equipes técnicas acompanhadas.

## 7.2. Funcionalidades

- Cadastrar time.
- Editar time.
- Ativar e desativar.
- Associar projetos.
- Associar desenvolvedores.
- Visualizar sprints.
- Visualizar entregas.
- Visualizar capacidade.
- Visualizar riscos.
- Consultar histórico.

## 7.3. Campos

**Team**

- `id`
- `workspace_id`
- `name`
- `code`
- `description`
- `status`
- `created_at`
- `updated_at`
- `version`

## 7.4. Regras

- Código único por workspace.
- Um time pode atuar em vários projetos.
- Um time pode possuir várias sprints.
- Um time pode ter vários desenvolvedores.
- Desenvolvedores podem participar de mais de um time.
- A desativação não apaga o histórico.

---

# 8. MÓDULO: PROJETOS

## 8.1. Objetivo

Organizar produtos, serviços, sistemas e iniciativas técnicas.

## 8.2. Funcionalidades

- Cadastrar projeto.
- Editar projeto.
- Pausar.
- Arquivar.
- Reativar.
- Associar times.
- Visualizar releases.
- Visualizar histórias.
- Visualizar riscos.
- Visualizar capacidade e demanda.
- Consultar histórico.

## 8.3. Campos

**Project**

- `id`
- `workspace_id`
- `name`
- `code`
- `description`
- `status`
- `created_at`
- `updated_at`
- `version`

## 8.4. Situações

- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

## 8.5. Regras

- Código único por workspace.
- Um projeto pode envolver vários times.
- Uma release pertence a um projeto na versão inicial.
- Uma história externa possui um projeto de referência.
- Um projeto arquivado permanece consultável.
- Projetos arquivados não aceitam novos planejamentos por padrão.

---

# 9. RELACIONAMENTOS ENTRE TIMES E PROJETOS

## 9.1. Associação TeamProject

Campos:

- `id`
- `team_id`
- `project_id`
- `started_at`
- `ended_at`
- `is_primary`

## 9.2. Regras

- Relacionamento muitos-para-muitos.
- Histórico de participação preservado.
- Uma associação ativa entre o mesmo time e projeto não deve ser duplicada.
- Associações encerradas continuam disponíveis para relatórios históricos.

## 9.3. Associação TeamDeveloper

Campos:

- `id`
- `team_id`
- `developer_id`
- `started_at`
- `ended_at`

Regras:

- Desenvolvedor pode participar de múltiplos times.
- Mudanças de time preservam histórico.
- Um desenvolvedor não possui acesso ao sistema apenas por estar cadastrado.

---

# 10. MÓDULO: DESENVOLVEDORES

## 10.1. Objetivo

Manter um cadastro de referência das pessoas cujas entregas e capacidades são acompanhadas.

## 10.2. Funcionalidades

- Cadastrar desenvolvedor.
- Editar informações.
- Associar a times.
- Consultar projetos relacionados.
- Consultar entregas atribuídas.
- Consultar disponibilidade.
- Consultar alocações.
- Consultar histórico de participação.
- Desativar cadastro.

## 10.3. Campos sugeridos

**Developer**

- `id`
- `workspace_id`
- `name`
- `email` opcional
- `role_description` opcional
- `status`
- `notes` opcionais
- `created_at`
- `updated_at`

## 10.4. Regras

- Não haverá login para desenvolvedores.
- Um desenvolvedor pode participar de vários times.
- Um desenvolvedor pode trabalhar em vários projetos.
- Histórico de entregas deve permanecer após desativação.
- O sistema não deverá utilizar indicadores de capacidade como avaliação automática de desempenho.

---

# 11. MÓDULO: SPRINTS

## 11.1. Objetivo

Acompanhar ciclos de execução dos times.

## 11.2. Funcionalidades

- Criar sprint.
- Definir time responsável.
- Definir datas.
- Registrar objetivo.
- Associar histórias.
- Registrar escopo inicial.
- Registrar itens adicionados posteriormente.
- Registrar itens removidos.
- Consultar situação das entregas.
- Consultar refinamentos.
- Consultar capacidade.
- Consultar diário.
- Encerrar sprint.
- Gerar resumo para retrospectiva.

## 11.3. Campos

**Sprint**

- `id`
- `workspace_id`
- `team_id`
- `name`
- `goal`
- `start_date`
- `end_date`
- `status`
- `created_at`
- `updated_at`

## 11.4. Situações

- `PLANNED`
- `ACTIVE`
- `CLOSED`
- `CANCELLED`

## 11.5. Associação SprintMembership

Campos:

- `id`
- `sprint_id`
- `work_item_id`
- `entered_at`
- `exited_at`
- `scope_type`
- `exit_reason`

Tipos de escopo:

- Original.
- Adicionado.
- Remanejado.

## 11.6. Regras

- Uma sprint pertence a um time.
- Uma sprint pode conter histórias de diferentes projetos.
- Uma história pode participar de várias sprints ao longo do tempo.
- Uma história possui, no máximo, uma associação corrente de sprint de execução.
- A movimentação entre sprints preserva histórico.
- Encerrar uma sprint não conclui automaticamente suas histórias.
- Histórias pendentes podem ser planejadas em outra sprint.
- O diário continua disponível após o encerramento.

---

# 12. MÓDULO: RELEASES

## 12.1. Objetivo

Acompanhar entregas planejadas para disponibilização em determinado projeto.

## 12.2. Funcionalidades

- Criar release.
- Definir projeto.
- Definir prazo comprometido.
- Definir marcos.
- Associar histórias.
- Identificar itens obrigatórios e opcionais.
- Consultar times participantes.
- Consultar previsão.
- Consultar riscos.
- Consultar dependências.
- Consultar progresso.
- Encerrar release.

## 12.3. Campos

**Release**

- `id`
- `workspace_id`
- `project_id`
- `name`
- `description`
- `committed_date`
- `forecast_date`
- `status`
- `created_at`
- `updated_at`

## 12.4. Associação ReleaseMembership

Campos:

- `id`
- `release_id`
- `work_item_id`
- `is_required`
- `added_at`
- `removed_at`

## 12.5. Regras

- Uma release pertence a um projeto na versão inicial.
- Uma release pode envolver vários times.
- Uma história pode contribuir para mais de uma release.
- Uma release não pode ser duplicada nos indicadores globais por envolver vários times.
- O prazo comprometido e a previsão devem ser armazenados separadamente.
- Alterações de previsão devem preservar histórico.

## 12.6. Evolução futura

Caso seja necessário coordenar uma entrega composta por várias releases de projetos diferentes, poderá ser criada uma entidade `ReleaseGroup` ou `DeliveryMilestone`.

---

# 13. MÓDULO: HISTÓRIAS E ITENS EXTERNOS

## 13.1. Objetivo

Registrar referências a histórias, bugs, tarefas técnicas e outros itens existentes em ferramentas externas.

## 13.2. Premissa

O Tech Lead Hub não será a fonte principal de autoria das histórias.

A fonte principal continuará sendo a ferramenta externa.

## 13.3. Funcionalidades

- Cadastrar item manualmente.
- Informar identificador externo.
- Informar origem.
- Informar título.
- Informar URL.
- Definir projeto.
- Definir tipo.
- Associar desenvolvedor.
- Associar sprint.
- Associar release.
- Acompanhar execução.
- Acompanhar refinamento.
- Registrar observações.
- Registrar data da última verificação.

## 13.4. Campos

**ExternalWorkItem**

- `id`
- `workspace_id`
- `source_id`
- `external_key`
- `title`
- `external_url`
- `item_type`
- `project_id`
- `execution_status`
- `refinement_status`
- `developer_id`
- `target_date`
- `notes`
- `last_checked_at`
- `created_at`
- `updated_at`

## 13.5. Tipos

- História.
- Bug.
- Tarefa técnica.
- Spike.
- Melhoria.
- Outro.

## 13.6. Regras

- A combinação de origem e identificador externo deve ser única no workspace.
- O estado de execução é independente do estado de refinamento.
- Um item pode estar pronto para refinamento e ainda não iniciado na execução.
- Um item pode ter execução concluída e histórico de refinamento preservado.
- A URL externa é uma referência, não uma integração obrigatória.
- Atualizações serão manuais no MVP.

---

# 14. MÓDULO: ACOMPANHAMENTO DE ENTREGAS

## 14.1. Objetivo

Registrar o estado atual das entregas acompanhadas.

## 14.2. Funcionalidades

- Consultar entregas por time.
- Consultar entregas por projeto.
- Consultar entregas por desenvolvedor.
- Atualizar situação.
- Atualizar previsão.
- Atualizar esforço restante.
- Registrar bloqueios.
- Registrar observações.
- Registrar última verificação.
- Consultar histórico.
- Visualizar risco calculado.

## 14.3. Campos

**DeliveryTracking**

- `id`
- `work_item_id`
- `executing_team_id`
- `developer_id`
- `committed_date`
- `manual_forecast_date`
- `health_status`
- `remaining_effort_hours`
- `last_update`
- `last_checked_at`
- `status_source`
- `status_note`
- `updated_at`

## 14.4. Situações de saúde

- `ON_TRACK`
- `AT_RISK`
- `DELAYED`
- `BLOCKED`
- `UNKNOWN`

O estado calculado e a avaliação manual deverão ser armazenados separadamente para evitar perda de informação.

## 14.5. Regras

- Cada item possui um acompanhamento corrente na versão inicial.
- Mudanças de responsável preservam histórico.
- Mudanças de time preservam histórico.
- Mudanças de previsão preservam histórico.
- Informações insuficientes produzem estado indeterminado.
- Um acompanhamento desatualizado deve ser sinalizado.
- A conclusão da entrega elimina consumo futuro de capacidade de execução.

---

# 15. MÓDULO: REFINAMENTOS

## 15.1. Objetivo

Acompanhar a preparação de histórias antes da execução.

## 15.2. Funcionalidades

- Visualizar pipeline.
- Definir situação.
- Registrar dúvidas.
- Registrar pendências.
- Utilizar checklist de prontidão.
- Associar sprint pretendida.
- Registrar observações.
- Filtrar por time e projeto.

## 15.3. Situações sugeridas

- `NEEDS_REFINEMENT`
- `ANALYZING`
- `WAITING_INFORMATION`
- `READY`
- `CANCELLED`

## 15.4. Checklist de prontidão

Itens configuráveis, como:

- Objetivo compreendido.
- Critérios de aceite claros.
- Dependências identificadas.
- Dúvidas resolvidas.
- Solução técnica discutida.
- Estimativa disponível.
- Condições para execução atendidas.

## 15.5. Regras

- O refinamento é independente da execução.
- A conclusão do checklist pode sugerir estado pronto.
- O usuário poderá justificar exceções.
- Histórias não prontas para uma sprint iminente devem gerar alertas.

---

# 16. MÓDULO: RISCOS E IMPEDIMENTOS

## 16.1. Objetivo

Registrar problemas atuais e potenciais que afetem atividades, sprints, releases e entregas.

## 16.2. Funcionalidades

- Criar risco.
- Registrar impedimento.
- Definir gravidade.
- Definir probabilidade.
- Definir impacto.
- Associar contextos.
- Registrar plano de mitigação.
- Registrar responsável pelo acompanhamento.
- Definir situação.
- Resolver.
- Consultar histórico.

## 16.3. Campos sugeridos

**Risk**

- `id`
- `workspace_id`
- `title`
- `description`
- `type`
- `severity`
- `probability`
- `status`
- `mitigation_plan`
- `identified_at`
- `resolved_at`
- `created_at`
- `updated_at`

## 16.4. Regras

- Um risco pode afetar múltiplas entregas.
- Um risco pode afetar múltiplos projetos.
- Resolver um risco não conclui automaticamente atividades associadas.
- Riscos resolvidos permanecem no histórico.
- Um impedimento pode bloquear totalmente ou parcialmente uma entrega.

---

# 17. MÓDULO: DIÁRIO DE BORDO

## 17.1. Objetivo

Preservar acontecimentos relevantes para acompanhamento técnico, demos, retrospectivas e decisões futuras.

## 17.2. Categorias

- Decisão técnica.
- Incidente.
- Bloqueio.
- Desbloqueio.
- Aprendizado.
- Mudança de escopo.
- Conquista.
- Risco.
- Acontecimento geral.

## 17.3. Funcionalidades

- Registrar acontecimento rapidamente.
- Definir categoria.
- Registrar descrição.
- Associar data.
- Associar time.
- Associar projeto.
- Associar sprint.
- Associar release.
- Associar história.
- Associar risco.
- Consultar linha do tempo.
- Filtrar registros.
- Utilizar registros em relatórios.

## 17.4. Regras

- Categoria e descrição são obrigatórias.
- A data é preenchida automaticamente, mas pode ser ajustada.
- Um acontecimento pode estar relacionado a vários contextos.
- O registro não deve ser duplicado.
- O histórico permanece após o encerramento da sprint.
- Relatórios não devem inventar acontecimentos não registrados.

---

# 18. MÓDULO: DISPONIBILIDADE E CAPACIDADE

## 18.1. Objetivo

Calcular a quantidade de horas efetivas que cada desenvolvedor possui para executar trabalho planejado.

## 18.2. Conceitos

**Jornada nominal:** total de horas previstas no calendário de trabalho.

**Indisponibilidade:** horas não disponíveis por ausência ou compromissos explicitamente descontados.

**Fator de foco:** proporção da jornada disponível destinada ao trabalho planejado.

**Capacidade efetiva:** horas estimadas disponíveis para execução.

**Capacidade alocada:** parcela da capacidade efetiva reservada para determinado contexto.

**Demanda:** esforço estimado das entregas planejadas.

## 18.3. Fórmula de capacidade

Capacidade efetiva:

`CE = (HN - HI) × FF`

Onde:

- `CE`: capacidade efetiva.
- `HN`: horas nominais.
- `HI`: horas indisponíveis.
- `FF`: fator de foco entre 0 e 1.

Exemplo:

- Jornada nominal: 40 horas.
- Indisponibilidade: 8 horas.
- Fator de foco: 75%.

Resultado:

`CE = (40 - 8) × 0,75 = 24 horas`

## 18.4. Regras

- O fator de foco não representa produtividade individual.
- Indisponibilidades não podem ser descontadas duas vezes.
- Exceções de calendário devem respeitar períodos.
- A capacidade não pode ser negativa.
- A capacidade global de uma pessoa não pode ser duplicada entre times.
- Mudanças de disponibilidade devem provocar recálculo das previsões afetadas.

---

# 19. JORNADAS E CALENDÁRIOS

## 19.1. Entidade WorkSchedule

Campos:

- `id`
- `developer_id`
- `valid_from`
- `valid_until`
- `timezone`
- `weekly_hours`
- `focus_factor`
- `weekly_pattern`

O padrão semanal deverá permitir jornadas diferentes por dia.

## 19.2. Entidade AvailabilityException

Campos:

- `id`
- `developer_id`
- `start_at`
- `end_at`
- `type`
- `unavailable_hours`
- `description`

## 19.3. Tipos de exceção

- Férias.
- Folga.
- Feriado.
- Treinamento.
- Ausência.
- Suporte extraordinário.
- Outra indisponibilidade.

## 19.4. Regras

- Exceções sobrepostas devem ser consolidadas.
- Uma ausência parcial reduz somente a capacidade correspondente.
- O calendário utiliza o fuso horário configurado.
- Alterações históricas devem preservar rastreabilidade.
- O motivo de uma ausência pode ser genérico, sem armazenar informações pessoais sensíveis.

---

# 20. MÓDULO: ALOCAÇÃO ENTRE TIMES E PROJETOS

## 20.1. Objetivo

Distribuir a capacidade efetiva de um desenvolvedor entre diferentes contextos.

## 20.2. Entidade CapacityAllocation

Campos:

- `id`
- `developer_id`
- `team_id`
- `project_id`
- `allocation_type`
- `allocation_value`
- `valid_from`
- `valid_until`
- `description`

## 20.3. Tipos de alocação

- Percentual.
- Horas por período.

Quando a alocação for expressa em horas, a periodicidade deverá ser explícita.

## 20.4. Exemplo

Capacidade efetiva: 24 horas.

Alocações:

- Projeto Pagamentos: 50% = 12 horas.
- Projeto Autenticação: 30% = 7,2 horas.
- Suporte geral: 20% = 4,8 horas.

Total: 24 horas.

## 20.5. Regras

- A soma das alocações não pode ultrapassar a capacidade disponível sem gerar conflito.
- A alocação não representa horas efetivamente trabalhadas.
- Um desenvolvedor pode ter alocações em vários times.
- Um desenvolvedor pode ter alocações em vários projetos.
- Reservas gerais devem ser permitidas.
- Mudanças de alocação devem preservar histórico.
- O cálculo deve considerar períodos de validade.
- Alocações inconsistentes devem ser sinalizadas antes da previsão.

---

# 21. MÓDULO: ESTIMATIVAS

## 21.1. Objetivo

Registrar esforço estimado e esforço restante das entregas.

## 21.2. Entidade EffortEstimate

Campos:

- `id`
- `work_item_id`
- `estimated_hours`
- `remaining_hours`
- `confidence`
- `estimated_at`
- `reason`

## 21.3. Conceitos

**Estimativa inicial:** esforço previsto originalmente.

**Esforço restante:** esforço estimado para concluir a entrega.

**Esforço realizado:** opcional, informado manualmente.

**Confiança:** qualidade da estimativa.

## 21.4. Confiança

- Alta.
- Média.
- Baixa.

## 21.5. Regras

- O esforço restante não pode ser negativo.
- Revisões de estimativa preservam histórico.
- O esforço restante não deve ser interpretado automaticamente como percentual concluído.
- Horas serão a unidade padrão do motor de capacidade.
- Story points podem ser registrados como referência adicional.
- Story points não serão convertidos automaticamente em horas sem calibração específica.

---

# 22. MÓDULO: PLANEJAMENTO HÍBRIDO DE EXECUÇÃO

## 22.1. Objetivo

Organizar a execução das entregas considerando ordem, paralelismo e capacidade disponível.

## 22.2. Modos

### Sequencial

O desenvolvedor executa o primeiro item elegível da fila.

O próximo item recebe capacidade após a conclusão ou inelegibilidade do anterior.

### Paralelo

O desenvolvedor divide a capacidade entre múltiplas entregas simultaneamente.

Cada entrega possui uma parcela planejada.

### Híbrido

Combina fila ordenada e execução paralela configurável.

Este será o modelo adotado pelo Tech Lead Hub.

## 22.3. Entidade ExecutionPlan

Campos:

- `id`
- `developer_id`
- `team_id`
- `project_id`
- `start_date`
- `end_date`
- `execution_mode`
- `max_parallel_items`
- `redistribution_policy`
- `status`

## 22.4. Entidade ExecutionPlanItem

Campos:

- `id`
- `execution_plan_id`
- `work_item_id`
- `position`
- `capacity_share`
- `earliest_start_date`
- `execution_status`
- `notes`

## 22.5. Regras

- O modo sequencial será o padrão.
- A ordem de execução será explícita.
- A ordem poderá ser alterada manualmente.
- O paralelismo terá limite configurável.
- A soma dos percentuais simultâneos não poderá ultrapassar 100% do contexto.
- Uma entrega concluída libera capacidade.
- Uma entrega totalmente bloqueada não consome capacidade produtiva de execução.
- Bloqueios parciais podem permitir trabalho residual.
- Capacidade ociosa pode ser redistribuída conforme política configurada.
- A redistribuição entre projetos não será automática por padrão.
- A fila de execução não interfere na fila de foco pessoal do Tech Lead.

---

# 23. POLÍTICAS DE REDISTRIBUIÇÃO

## 23.1. NONE

Capacidade não utilizada permanece livre.

## 23.2. SAME_CONTEXT

Capacidade não utilizada pode ser direcionada a outras entregas elegíveis do mesmo contexto.

## 23.3. CROSS_CONTEXT

Capacidade pode ser redistribuída entre contextos quando houver configuração e restrições compatíveis.

## 23.4. Regra padrão

A política inicial recomendada é `SAME_CONTEXT`.

A redistribuição entre projetos deve ser explicitamente autorizada no planejamento, pois pode alterar compromissos de outros times.

---

# 24. MÓDULO: DEPENDÊNCIAS

## 24.1. Objetivo

Representar relações que influenciam a possibilidade de iniciar ou concluir entregas.

## 24.2. Entidade WorkDependency

Campos:

- `id`
- `predecessor_id`
- `successor_id`
- `dependency_type`
- `external_reference`
- `expected_release_date`
- `actual_release_date`
- `status`
- `notes`

## 24.3. Tipos

- Finish-to-Start.
- Start-to-Start.
- Finish-to-Finish.
- External.
- Informational.

## 24.4. Suporte inicial

O primeiro motor deverá calcular automaticamente:

- Finish-to-Start.
- Dependência externa com data de liberação conhecida.

Os demais tipos poderão ser registrados, mas não devem afetar o cálculo até receberem implementação específica.

## 24.5. Regras

- Uma entrega não pode depender de si mesma.
- Dependências cíclicas devem ser rejeitadas.
- Dependências entre projetos são permitidas.
- Dependências entre times são permitidas.
- Dependências externas podem possuir data desconhecida.
- Dependências sem previsão confiável podem tornar a entrega indeterminada.
- A liberação de uma dependência deve provocar recálculo.

---

# 25. MOTOR DE PREVISIBILIDADE

## 25.1. Objetivo

Calcular datas projetadas de conclusão considerando:

- Calendários.
- Ausências.
- Fator de foco.
- Alocações.
- Esforço restante.
- Filas de execução.
- Paralelismo.
- Dependências.
- Bloqueios.
- Prazos.
- Restrições configuradas.

## 25.2. Característica principal

O motor será determinístico.

Com os mesmos dados de entrada, configurações e versão do algoritmo, deverá produzir resultados equivalentes.

## 25.3. Entradas

1. Desenvolvedores.
2. Jornadas.
3. Calendários.
4. Exceções.
5. Alocações.
6. Planos de execução.
7. Itens planejados.
8. Estimativas.
9. Dependências.
10. Bloqueios.
11. Compromissos.
12. Horizonte de cálculo.

## 25.4. Processo

1. Validar dados de entrada.
2. Identificar conflitos de alocação.
3. Validar dependências.
4. Construir capacidade diária.
5. Distribuir capacidade por contexto.
6. Determinar itens elegíveis.
7. Aplicar fila e paralelismo.
8. Consumir esforço restante.
9. Registrar conclusões projetadas.
10. Liberar sucessores.
11. Comparar previsão e compromisso.
12. Classificar riscos.
13. Persistir resultados e avisos.

## 25.5. Fórmulas

Capacidade alocada:

`CA = CE × PA`

Onde:

- `CA`: capacidade alocada.
- `CE`: capacidade efetiva.
- `PA`: percentual de alocação.

Utilização planejada:

`U = (D / CA) × 100`

Onde:

- `D`: demanda estimada.
- `CA`: capacidade alocada.

Quando `CA = 0`, a utilização não será calculada como percentual. O sistema deverá sinalizar ausência de capacidade.

## 25.6. Horizonte

O cálculo deverá possuir horizonte máximo configurável.

Se a conclusão não puder ser projetada dentro desse horizonte, o resultado deverá informar a limitação.

## 25.7. Resultados

Cada entrega poderá apresentar:

- Data prevista.
- Prazo comprometido.
- Diferença em dias úteis.
- Saúde calculada.
- Confiança.
- Premissas.
- Avisos.
- Dependências críticas.
- Identificador da execução do cálculo.

## 25.8. Classificação de saúde

**No prazo:** previsão compatível com compromisso, sem risco relevante.

**Atenção:** margem pequena ou confiança reduzida.

**Em risco:** previsão posterior ao compromisso ou risco significativo.

**Atrasada:** compromisso vencido com entrega pendente.

**Bloqueada:** impedimento ativo que inviabiliza avanço.

**Indeterminada:** informações insuficientes.

## 25.9. Regras

- Não inventar datas.
- Não assumir liberação arbitrária de bloqueios.
- Não duplicar capacidade.
- Não ultrapassar alocações válidas.
- Respeitar dias úteis e fusos.
- Preservar previsões anteriores.
- Identificar resultados obsoletos.
- Recalcular quando dados relevantes mudarem.

---

# 26. HISTÓRICO DE PREVISÕES

## 26.1. Entidade ForecastRun

Campos:

- `id`
- `scenario_id`
- `algorithm_version`
- `input_snapshot_id`
- `calculated_at`
- `horizon_end`
- `status`
- `warnings`

## 26.2. Entidade ForecastResult

Campos sugeridos:

- `id`
- `forecast_run_id`
- `work_item_id`
- `forecast_date`
- `committed_date`
- `health_status`
- `confidence`
- `delay_business_days`
- `warnings`
- `explanation`

## 26.3. Regras

- Cada execução deve ser identificável.
- Os dados de entrada devem ser reproduzíveis por snapshot ou versionamento consistente.
- Resultados anteriores permanecem consultáveis.
- Resultados desatualizados devem ser sinalizados.
- Previsões manuais e calculadas não devem ser confundidas.

---

# 27. MÓDULO: SIMULAÇÃO DE CENÁRIOS

## 27.1. Objetivo

Permitir testar mudanças no planejamento sem alterar os dados vigentes.

## 27.2. Exemplos

- Desenvolvedor ausente por três dias.
- Aumento do esforço restante.
- Mudança de alocação.
- Alteração da ordem de execução.
- Redistribuição entre projetos.
- Mudança de responsável.
- Antecipação de prazo.
- Inclusão ou remoção de escopo.
- Liberação antecipada de dependência.

## 27.3. Entidade PlanningScenario

Campos sugeridos:

- `id`
- `workspace_id`
- `name`
- `description`
- `base_forecast_run_id`
- `status`
- `created_at`
- `updated_at`

## 27.4. Entidade ScenarioOverride

Campos sugeridos:

- `id`
- `scenario_id`
- `override_type`
- `target_entity_id`
- `field`
- `proposed_value`
- `reason`

## 27.5. Regras

- Cenários não alteram o planejamento-base.
- Alterações simuladas devem ser validadas.
- O cenário deve referenciar uma versão consistente do planejamento.
- A comparação deve apresentar impactos positivos e negativos.
- A aplicação posterior exige aprovação e revalidação.
- Cenários podem ser descartados ou preservados para consulta.

---

# 28. MÓDULO: RECOMENDAÇÕES DE PLANEJAMENTO

## 28.1. Objetivo

Sugerir mudanças que possam melhorar a viabilidade do planejamento.

## 28.2. Princípio

O sistema pode recomendar automaticamente.

A aplicação exige aprovação explícita do Tech Lead.

## 28.3. Tipos de recomendação

- Reordenar fila.
- Alterar paralelismo.
- Redistribuir capacidade.
- Ajustar alocação.
- Reatribuir entrega.
- Retirar escopo não obrigatório.
- Revisar previsão interna.
- Criar atividade de acompanhamento.
- Priorizar resolução de bloqueio.
- Ajustar reserva de capacidade.

## 28.4. Restrições

O sistema não poderá:

- Cancelar férias automaticamente.
- Inventar disponibilidade.
- Ignorar dependências obrigatórias.
- Alterar histórias em ferramentas externas.
- Modificar compromissos sem aprovação.
- Reatribuir trabalho sem considerar elegibilidade.
- Aplicar alterações silenciosamente.

## 28.5. Fluxo

1. Detectar problema.
2. Identificar escopo afetado.
3. Gerar alternativas.
4. Validar restrições.
5. Simular alternativas.
6. Comparar impactos.
7. Apresentar recomendações.
8. Aguardar decisão.
9. Revalidar dados.
10. Aplicar transacionalmente.
11. Auditar.
12. Recalcular previsões.

## 28.6. Estados

- `GENERATED`
- `REVIEWING`
- `APPROVED`
- `APPLIED`
- `REJECTED`
- `EXPIRED`
- `FAILED`

## 28.7. Níveis de impacto

**Baixo:** alteração local com pouco impacto.

**Médio:** alteração de capacidade, paralelismo ou entregas relacionadas.

**Alto:** alteração que afeta compromissos relevantes, vários times ou projetos.

## 28.8. Regras

- Recomendações não modificam dados ao serem geradas.
- A aprovação deve ser registrada.
- A aplicação deve validar a versão do planejamento.
- Recomendações obsoletas não podem ser aplicadas.
- Aplicações devem ser atômicas.
- Impactos secundários devem ser visíveis.
- Toda recomendação deve ser explicável.
- Reversões devem ser controladas.
- Histórico de aprovação e aplicação deve ser preservado.

---

# 29. GERAÇÃO DE RECOMENDAÇÕES

## 29.1. Estratégia

Utilizar inicialmente regras determinísticas e heurísticas de otimização.

Não é necessário utilizar inteligência artificial no primeiro momento.

## 29.2. Problemas detectáveis

- Sobrecarga.
- Atraso projetado.
- Conflito de alocação.
- Capacidade ociosa.
- Dependência crítica.
- Ausência com impacto.
- Baixa cobertura de estimativas.
- Entrega sem acompanhamento recente.

## 29.3. Avaliação de alternativas

A função de avaliação poderá considerar:

- Redução de atrasos.
- Redução de sobrecarga.
- Redução de riscos.
- Minimização de mudanças.
- Confiança dos dados.
- Impactos sobre outras entregas.

Os critérios deverão ser normalizados e ponderados.

Nenhuma pontuação poderá compensar uma violação de restrição obrigatória.

## 29.4. Limites

O motor deverá limitar:

- Número de alternativas.
- Profundidade das alterações.
- Tempo de processamento.
- Horizonte de cálculo.
- Quantidade de itens afetados.

Se não encontrar solução válida, deverá informar o problema sem inventar recomendações.

---

# 30. INDICADORES DO SISTEMA

## 30.1. Indicadores pessoais

- Atividades abertas.
- Atividades atrasadas.
- Atividades concluídas.
- Atividades bloqueadas.
- Foco principal.
- Próximos vencimentos.

## 30.2. Indicadores de sprint

- Escopo inicial.
- Escopo adicionado.
- Escopo removido.
- Entregas concluídas.
- Entregas pendentes.
- Entregas bloqueadas.
- Capacidade efetiva.
- Demanda estimada.
- Sobrecarga.
- Cobertura de estimativas.

## 30.3. Indicadores de release

- Prazo comprometido.
- Previsão.
- Entregas obrigatórias pendentes.
- Entregas opcionais.
- Riscos.
- Dependências.
- Margem de entrega.

## 30.4. Indicadores de capacidade

- Capacidade nominal.
- Capacidade efetiva.
- Capacidade alocada.
- Capacidade livre.
- Demanda.
- Utilização.
- Sobrecarga.
- Conflitos de alocação.

## 30.5. Indicadores de previsibilidade

- Entregas no prazo.
- Entregas em risco.
- Entregas atrasadas.
- Entregas indeterminadas.
- Diferença entre previsão e compromisso.
- Confiança das previsões.
- Precisão histórica das previsões.
- Quantidade de recálculos.

## 30.6. Indicadores de recomendações

- Recomendações geradas.
- Recomendações pendentes.
- Recomendações aprovadas.
- Recomendações rejeitadas.
- Recomendações aplicadas.
- Recomendações expiradas.

## 30.7. Regra global

Indicadores agregados não podem duplicar:

- Desenvolvedores.
- Horas.
- Histórias.
- Releases.
- Atividades.
- Acontecimentos.

Quando uma entidade participar de vários contextos, o sistema deverá explicitar a regra de agregação.

---

# 31. RELATÓRIOS

## 31.1. Relatório de sprint

Conteúdo:

- Identificação.
- Objetivo.
- Período.
- Escopo original.
- Alterações de escopo.
- Entregas concluídas.
- Pendências.
- Bloqueios.
- Riscos.
- Decisões.
- Acontecimentos.
- Capacidade e demanda.
- Observações para retrospectiva.

## 31.2. Relatório de release

Conteúdo:

- Projeto.
- Release.
- Compromisso.
- Previsão.
- Escopo.
- Situação das entregas.
- Times envolvidos.
- Dependências.
- Riscos.
- Principais mudanças.

## 31.3. Relatório de capacidade

Conteúdo:

- Período.
- Times.
- Desenvolvedores.
- Capacidade nominal.
- Capacidade efetiva.
- Alocações.
- Demanda.
- Sobrecarga.
- Conflitos.
- Ausências relevantes.

## 31.4. Relatório para demo

Gerar um rascunho com base em:

- Entregas concluídas.
- Funcionalidades relevantes.
- Decisões.
- Acontecimentos.
- Pendências conhecidas.

## 31.5. Relatório para retrospectiva

Gerar um rascunho com base em:

- O que funcionou.
- Problemas registrados.
- Bloqueios.
- Mudanças de escopo.
- Aprendizados.
- Decisões.
- Ações sugeridas.

O sistema não deverá inventar fatos para preencher seções sem dados.

---

# 32. ARQUITETURA TÉCNICA

## 32.1. Estratégia

Monólito modular com frontend separado e worker de planejamento.

## 32.2. Stack proposta

| Camada           | Tecnologia     |
| ---------------- | -------------- |
| Frontend         | Next.js        |
| Interface        | React          |
| Linguagem        | TypeScript     |
| Estilização      | Tailwind CSS   |
| Componentes      | shadcn/ui      |
| Backend          | NestJS         |
| ORM              | Prisma         |
| Banco            | PostgreSQL     |
| Fila             | BullMQ         |
| Broker           | Redis          |
| Worker           | Node.js        |
| Validação        | Zod            |
| Testes unitários | Vitest         |
| Testes E2E       | Playwright     |
| Observabilidade  | OpenTelemetry  |
| Ambiente local   | Docker Compose |

## 32.3. Princípios arquiteturais

- Separação de responsabilidades.
- Contratos tipados.
- Regras de domínio isoladas.
- Dependências externas encapsuladas.
- Processamento assíncrono para tarefas pesadas.
- Persistência transacional.
- Histórico auditável.
- Configuração por ambiente.
- Testabilidade.
- Portabilidade.

## 32.4. Componentes

**Web App:** interface do usuário.

**Backend API:** autenticação, regras de negócio e operações transacionais.

**PostgreSQL:** fonte de verdade dos dados.

**Redis:** infraestrutura de fila.

**Planning Worker:** execução de previsões, cenários e recomendações.

**Planning Engine:** biblioteca de cálculo isolada.

---

# 33. ESTRUTURA DO REPOSITÓRIO

```text
tech-lead-hub/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   └── infrastructure/
│   │   ├── prisma/
│   │   └── package.json
│   │
│   └── planning-worker/
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── planning-engine/
│   │   ├── src/domain/
│   │   ├── src/scheduler/
│   │   ├── src/forecast/
│   │   └── src/recommendations/
│   │
│   ├── shared-contracts/
│   ├── ui/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── compose/
│   └── scripts/
│
├── docs/
│   ├── architecture/
│   ├── domain/
│   ├── api/
│   └── decisions/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

# 34. MÓDULOS DO BACKEND

## 34.1. Identity

- Autenticação.
- Sessão.
- Configuração inicial do proprietário.

## 34.2. Workspace

- Preferências.
- Configurações globais.
- Contexto de operação.

## 34.3. Teams

- Times.
- Associações.
- Histórico.

## 34.4. Projects

- Projetos.
- Participação de times.

## 34.5. Developers

- Pessoas.
- Participações.
- Situação cadastral.

## 34.6. Tasks

- Atividades pessoais.
- Foco.
- Prioridades.
- Vínculos.

## 34.7. Work Items

- Itens externos.
- Origens.
- Referências.

## 34.8. Sprints

- Ciclos.
- Escopo.
- Histórico de movimentações.

## 34.9. Releases

- Compromissos.
- Escopo.
- Marcos.

## 34.10. Refinements

- Situações.
- Checklists.
- Pendências.

## 34.11. Deliveries

- Acompanhamentos.
- Histórico.
- Estimativas.

## 34.12. Capacity

- Jornadas.
- Calendários.
- Ausências.
- Alocações.

## 34.13. Planning

- Filas.
- Paralelismo.
- Dependências.
- Cenários.

## 34.14. Forecasts

- Execuções de cálculo.
- Resultados.
- Histórico.

## 34.15. Recommendations

- Geração.
- Avaliação.
- Aprovação.
- Aplicação.

## 34.16. Journal

- Acontecimentos.
- Decisões.
- Linha do tempo.

## 34.17. Reports

- Relatórios.
- Exportações.

## 34.18. Audit

- Eventos.
- Rastreabilidade.

---

# 35. BANCO DE DADOS

## 35.1. Banco escolhido

PostgreSQL.

## 35.2. Identificadores

Utilizar UUID para entidades principais.

## 35.3. Datas

- `date` para datas de negócio.
- `timestamptz` para instantes.
- Fuso horário explícito para calendários.

## 35.4. Quantidades

Utilizar `numeric` para horas, percentuais e valores que exijam precisão decimal.

## 35.5. Campos de controle

Entidades mutáveis deverão possuir, quando aplicável:

- `created_at`
- `updated_at`
- `version`

## 35.6. Tabelas principais

### Organização

- `workspaces`
- `teams`
- `projects`
- `team_projects`
- `developers`
- `team_developers`

### Gestão pessoal

- `tasks`
- `focus_queue_items`
- `task_projects`
- `task_teams`
- `task_work_items`

### Entregas

- `external_sources`
- `external_work_items`
- `delivery_trackings`
- `delivery_tracking_history`
- `effort_estimates`

### Sprints e releases

- `sprints`
- `sprint_memberships`
- `releases`
- `release_memberships`

### Refinamentos

- `refinements`
- `refinement_check_items`

### Capacidade

- `work_schedules`
- `availability_exceptions`
- `capacity_allocations`

### Execução

- `execution_plans`
- `execution_plan_items`
- `work_dependencies`

### Previsibilidade

- `forecast_runs`
- `forecast_results`
- `planning_snapshots`

### Simulações

- `planning_scenarios`
- `scenario_overrides`

### Recomendações

- `planning_recommendations`
- `recommendation_changes`
- `recommendation_evaluations`
- `recommendation_decisions`

### Apoio

- `risks`
- `risk_links`
- `journal_entries`
- `journal_links`
- `audit_events`
- `outbox_events`

## 35.7. Constraints essenciais

- Código de time único por workspace.
- Código de projeto único por workspace.
- Identificador externo único por origem.
- Esforço restante não negativo.
- Percentuais entre zero e um.
- Períodos válidos.
- Integridade referencial.
- Uma associação corrente de sprint por história.
- Ausência de ciclos nas dependências de agendamento.
- Validação transacional de conflitos temporais.

## 35.8. Índices

Priorizar índices para:

- Atividades por prazo e situação.
- Histórias por projeto.
- Entregas por desenvolvedor.
- Sprints por time.
- Releases por projeto.
- Alocações por pessoa e período.
- Ausências por pessoa e período.
- Previsões por execução.
- Recomendações pendentes.
- Diário por data.

## 35.9. Exclusão

Priorizar arquivamento lógico de entidades de negócio.

Exclusões físicas devem ser explícitas e não podem comprometer o histórico.

---

# 36. CONTRATOS DE API

## 36.1. Padrão

REST com versionamento:

`/api/v1`

## 36.2. Autenticação

- `POST /auth/setup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## 36.3. Times

- `GET /teams`
- `POST /teams`
- `GET /teams/{id}`
- `PATCH /teams/{id}`
- `POST /teams/{id}/archive`

## 36.4. Projetos

- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `PATCH /projects/{id}`
- `POST /projects/{id}/archive`

## 36.5. Desenvolvedores

- `GET /developers`
- `POST /developers`
- `GET /developers/{id}`
- `PATCH /developers/{id}`
- `GET /developers/{id}/capacity`
- `POST /developers/{id}/availability-exceptions`

## 36.6. Atividades

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}`
- `POST /tasks/{id}/complete`
- `GET /focus-queue`
- `PUT /focus-queue`

## 36.7. Histórias externas

- `GET /work-items`
- `POST /work-items`
- `GET /work-items/{id}`
- `PATCH /work-items/{id}`

## 36.8. Sprints

- `GET /sprints`
- `POST /sprints`
- `GET /sprints/{id}`
- `PATCH /sprints/{id}`
- `POST /sprints/{id}/close`

## 36.9. Releases

- `GET /releases`
- `POST /releases`
- `GET /releases/{id}`
- `PATCH /releases/{id}`

## 36.10. Capacidade

- `GET /teams/{id}/capacity`
- `GET /projects/{id}/demand`
- `GET /capacity/allocations`
- `POST /capacity/allocations`
- `PATCH /capacity/allocations/{id}`

## 36.11. Planejamento

- `GET /execution-plans`
- `POST /execution-plans`
- `GET /execution-plans/{id}`
- `PATCH /execution-plans/{id}`

## 36.12. Dependências

- `GET /work-dependencies`
- `POST /work-dependencies`
- `DELETE /work-dependencies/{id}`

## 36.13. Previsões

- `POST /forecasts/calculate`
- `GET /forecasts/{id}`
- `GET /forecast-runs/{id}`

## 36.14. Cenários

- `POST /planning-scenarios`
- `GET /planning-scenarios/{id}`
- `GET /planning-scenarios/{id}/comparison`

## 36.15. Recomendações

- `GET /planning-recommendations`
- `GET /planning-recommendations/{id}`
- `POST /planning-recommendations/{id}/approve`
- `POST /planning-recommendations/{id}/reject`
- `POST /planning-recommendations/{id}/apply`

## 36.16. Relatórios

- `GET /reports/sprints/{id}`
- `GET /reports/releases/{id}`
- `GET /reports/capacity`
- `POST /reports/generate`

Os contratos detalhados de request, response, erros e paginação deverão ser formalizados em OpenAPI antes da implementação de cada módulo.

---

# 37. EXEMPLO DE CONTRATO DE PLANEJAMENTO

`POST /api/v1/execution-plans`

```json
{
  "developerId": "dev-ana",
  "teamId": "team-checkout",
  "projectId": "project-payments",
  "period": {
    "startDate": "2026-10-19",
    "endDate": "2026-10-30"
  },
  "executionMode": "HYBRID",
  "maxParallelItems": 2,
  "redistributionPolicy": "SAME_CONTEXT",
  "items": [
    {
      "workItemId": "work-pay-142",
      "position": 1,
      "capacityShare": 0.7
    },
    {
      "workItemId": "work-pay-155",
      "position": 2,
      "capacityShare": 0.3
    }
  ]
}
```

Identificadores ilustrativos.

---

# 38. EXEMPLO DE CONTRATO DE PREVISÃO

`POST /api/v1/forecasts/calculate`

```json
{
  "scope": {
    "type": "TEAM",
    "id": "team-checkout"
  },
  "startDate": "2026-10-19",
  "horizonEnd": "2026-12-31",
  "scenarioId": null,
  "includeDependencies": true,
  "saveRun": true
}
```

Resposta ilustrativa:

```json
{
  "forecastRunId": "run-001",
  "status": "COMPLETED",
  "algorithmVersion": "1.0.0",
  "results": [
    {
      "workItemId": "work-pay-142",
      "forecastDate": "2026-10-27",
      "committedDate": "2026-10-23",
      "healthStatus": "AT_RISK",
      "confidence": "MEDIUM",
      "delayBusinessDays": 2,
      "warnings": ["DEPENDENCY_DELAY"]
    }
  ]
}
```

---

# 39. EXEMPLO DE CONTRATO DE SIMULAÇÃO

`POST /api/v1/planning-scenarios`

```json
{
  "name": "Ausencia da Ana",
  "baseForecastRunId": "run-001",
  "overrides": [
    {
      "type": "AVAILABILITY",
      "developerId": "dev-ana",
      "startDate": "2026-10-21",
      "endDate": "2026-10-23",
      "availableHours": 0
    },
    {
      "type": "EFFORT",
      "workItemId": "work-pay-142",
      "remainingHours": 30
    }
  ]
}
```

---

# 40. EXEMPLO DE APLICAÇÃO DE RECOMENDAÇÃO

`POST /api/v1/planning-recommendations/{id}/apply`

```json
{
  "expectedPlanningVersion": 42,
  "approvalConfirmed": true,
  "justification": "Priorizar entrega critica da release."
}
```

O backend deverá validar:

1. Sessão autenticada.
2. Aprovação previamente registrada.
3. Versão do planejamento.
4. Restrições.
5. Impactos.
6. Integridade das alterações.

O campo `approvalConfirmed` não será suficiente, isoladamente, para autorizar a operação.

---

# 41. PROCESSAMENTO ASSÍNCRONO

## 41.1. Objetivo

Executar cálculos e operações demoradas sem bloquear a interface.

## 41.2. Tecnologia proposta

- BullMQ.
- Redis.
- Worker Node.js.

## 41.3. Jobs

- `forecast.recalculate`
- `scenario.simulate`
- `recommendations.generate`
- `alerts.refresh`
- `reports.generate`
- `planning.consistency-check`
- `backup.verify`

## 41.4. Estados

- `QUEUED`
- `RUNNING`
- `RETRYING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

## 41.5. Regras

- Jobs devem ser idempotentes.
- Jobs podem ser repetidos com segurança.
- Erros transitórios podem gerar tentativas.
- Erros de validação não devem gerar repetição infinita.
- Jobs devem registrar versão dos dados.
- Resultados antigos devem ser identificados.
- Falhas devem ser observáveis.
- Workers não aplicam recomendações automaticamente.

---

# 42. OUTBOX TRANSACIONAL

## 42.1. Problema

Uma alteração pode ser salva no banco, mas a publicação do evento para recálculo pode falhar.

## 42.2. Solução

Utilizar Transactional Outbox.

## 42.3. Fluxo

1. API recebe alteração.
2. Transação inicia.
3. Entidade é atualizada.
4. Evento é registrado em `outbox_events`.
5. Transação é confirmada.
6. Dispatcher lê eventos pendentes.
7. Evento é publicado na fila.
8. Worker processa.
9. Resultado é persistido.

## 42.4. Regras

- Alteração e evento devem ser persistidos atomicamente.
- Publicação deve ser idempotente.
- Eventos pendentes devem ser recuperáveis.
- Eventos não devem ser perdidos após reinicialização.
- O banco permanece como fonte de verdade.

---

# 43. ESTRATÉGIA DE RECÁLCULO

## 43.1. Eventos que provocam recálculo

- Alteração de esforço.
- Alteração de alocação.
- Registro de ausência.
- Mudança de responsável.
- Mudança de fila.
- Alteração de paralelismo.
- Criação de dependência.
- Resolução de dependência.
- Registro de bloqueio.
- Conclusão de entrega.
- Mudança de calendário.

## 43.2. Escopo afetado

O recálculo deve incluir:

- Entrega alterada.
- Sucessores dependentes.
- Entregas concorrentes pela mesma capacidade.
- Contextos impactados.
- Releases relacionadas.

## 43.3. Otimização

Alterações consecutivas podem ser agrupadas.

O sistema não precisa recalcular todos os projetos quando apenas um conjunto restrito foi afetado.

## 43.4. Estado da previsão

A interface deverá distinguir:

- Atualizada.
- Em recálculo.
- Obsoleta.
- Indeterminada.
- Falha de cálculo.

---

# 44. SEGURANÇA

## 44.1. Modelo de usuário

Um usuário proprietário.

Sem cadastro público.

Sem permissões colaborativas no MVP.

## 44.2. Autenticação

- Configuração inicial do proprietário.
- Senha com Argon2id.
- Sessão autenticada.
- Cookie HttpOnly.
- Secure quando aplicável.
- SameSite adequado.
- Proteção CSRF.
- Limitação de tentativas de login.

## 44.3. Autorização

Todas as operações devem validar:

- Sessão.
- Workspace.
- Integridade dos relacionamentos.
- Condições para operações sensíveis.

## 44.4. Segredos

- Não versionar senhas.
- Não versionar tokens.
- Não utilizar credenciais padrão em produção.
- Configurar segredos por ambiente.

## 44.5. Dados pessoais

- Coletar somente informações necessárias.
- Evitar registrar motivos médicos ou pessoais detalhados.
- Evitar dados sensíveis nos logs.
- Proteger backups.

## 44.6. Rede local

- PostgreSQL sem exposição pública.
- Redis sem exposição pública.
- Containers em rede interna.
- Web vinculada ao loopback quando o acesso for apenas local.

## 44.7. Nuvem

Ao migrar:

- HTTPS obrigatório.
- Gerenciamento seguro de segredos.
- Controle de rede.
- Backups.
- Monitoramento.
- Configuração correta de sessão e cookies.

---

# 45. AMBIENTES

## 45.1. Local

Ambiente inicial.

Utilizar Docker Compose.

Serviços:

- Web.
- API.
- PostgreSQL.
- Redis.
- Planning Worker.

## 45.2. Homologação

Ambiente para testes de release e migrations.

Utilizar dados fictícios ou anonimizados.

## 45.3. Produção

Ambiente futuro na nuvem.

Requisitos:

- HTTPS.
- Banco persistente.
- Backups.
- Segredos gerenciados.
- Monitoramento.
- Logs.
- Processo de deploy.

---

# 46. DOCKER COMPOSE — REFERÊNCIA

```yaml
services:
  web:
    build:
      context: .
      dockerfile: infrastructure/docker/web.Dockerfile
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      API_INTERNAL_URL: http://api:4000
    depends_on:
      api:
        condition: service_started

  api:
    build:
      context: .
      dockerfile: infrastructure/docker/api.Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  planning-worker:
    build:
      context: .
      dockerfile: infrastructure/docker/worker.Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: tech_lead_hub
      POSTGRES_USER: tech_lead_hub
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tech_lead_hub"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres_data:
```

Este arquivo é uma referência estrutural. Ainda exige Dockerfiles, configuração de proxy, variáveis de ambiente e ajustes para execução efetiva.

---

# 47. BACKUP E RECUPERAÇÃO

## 47.1. Estratégia

O PostgreSQL será a fonte de verdade.

Volumes Docker não substituem backups.

## 47.2. Backup

Utilizar `pg_dump` ou mecanismo compatível.

## 47.3. Política inicial sugerida

- Backup diário.
- Retenção de 14 backups diários.
- Retenção de 4 backups semanais.
- Restauração de teste periódica.
- Armazenamento fora do volume principal.

## 47.4. Recuperação

Documentar:

1. Parada da aplicação.
2. Preparação do banco.
3. Restauração.
4. Aplicação de migrations compatíveis.
5. Validação de integridade.
6. Recuperação de eventos pendentes.
7. Reinício dos serviços.
8. Validação de previsões e histórico.

## 47.5. Redis

O Redis não será fonte de verdade dos dados de negócio.

Jobs recuperáveis deverão ser reconstruídos a partir dos estados e eventos persistidos no PostgreSQL.

---

# 48. MIGRAÇÃO FUTURA PARA NUVEM

## 48.1. Objetivo

Migrar sem reescrever o domínio.

## 48.2. Etapas

1. Preparar infraestrutura remota.
2. Configurar PostgreSQL.
3. Configurar Redis.
4. Configurar aplicação.
5. Configurar HTTPS.
6. Configurar segredos.
7. Executar migrations.
8. Interromper escrita local.
9. Gerar backup consistente.
10. Restaurar dados.
11. Validar integridade.
12. Validar autenticação.
13. Validar cálculos.
14. Ativar ambiente remoto.

## 48.3. Restrição

Não operar duas instâncias independentes com escrita simultânea sem sincronização adequada.

Local-first não significa sincronização offline bidirecional.

---

# 49. OBSERVABILIDADE

## 49.1. Logs

Utilizar logs estruturados.

Campos sugeridos:

- Timestamp.
- Serviço.
- Operação.
- Identificador de correlação.
- Identificador do job.
- Duração.
- Resultado.
- Erro.

## 49.2. Métricas técnicas

- Tempo de resposta da API.
- Tempo de cálculo.
- Jobs pendentes.
- Jobs com falha.
- Tentativas.
- Recálculos.
- Uso de recursos.
- Resultados obsoletos.

## 49.3. Métricas funcionais

- Quantidade de previsões.
- Quantidade de recomendações.
- Recomendações aprovadas.
- Recomendações rejeitadas.
- Precisão histórica das previsões.
- Cobertura de estimativas.

## 49.4. Diagnóstico de previsão

Cada previsão deverá permitir consultar:

- Capacidade considerada.
- Esforço restante.
- Alocações.
- Dependências.
- Bloqueios.
- Premissas.
- Versão do algoritmo.
- Data do cálculo.

---

# 50. ESTRATÉGIA DE TESTES

## 50.1. Testes unitários

Validar:

- Capacidade.
- Ausências.
- Alocações.
- Estimativas.
- Filas.
- Paralelismo.
- Dependências.
- Previsões.
- Recomendações.

## 50.2. Testes de integração

Validar:

- PostgreSQL.
- Constraints.
- Transações.
- Outbox.
- Redis.
- Jobs.
- Versionamento.

## 50.3. Testes end-to-end

Validar fluxos completos.

Exemplo:

1. Cadastrar time.
2. Cadastrar projeto.
3. Cadastrar desenvolvedor.
4. Criar sprint.
5. Registrar história.
6. Informar estimativa.
7. Configurar alocação.
8. Criar plano.
9. Calcular previsão.
10. Simular mudança.
11. Aprovar recomendação.
12. Consultar histórico.

## 50.4. Testes de determinismo

Mesmas entradas e versão do algoritmo devem gerar resultados equivalentes.

## 50.5. Testes de concorrência

Recomendações antigas não podem sobrescrever planejamento atualizado.

## 50.6. Testes de recuperação

Validar restauração do banco e reprocessamento seguro de jobs.

---

# 51. CRITÉRIOS DE ACEITE CONSOLIDADOS

## 51.1. Gestão pessoal

**CA-001:** O Tech Lead consegue criar e priorizar atividades pessoais.

**CA-002:** O sistema permite definir foco principal e até três atividades em foco.

**CA-003:** Atividades concluídas deixam de aparecer como atrasadas.

## 51.2. Entregas

**CA-004:** O sistema permite acompanhar histórias externas sem integração obrigatória.

**CA-005:** O refinamento é independente da execução.

**CA-006:** Alterações de previsão preservam histórico.

## 51.3. Sprints e releases

**CA-007:** Uma história pode mudar de sprint preservando histórico.

**CA-008:** Uma release pode reunir entregas de vários times.

**CA-009:** Encerrar sprint não conclui histórias automaticamente.

## 51.4. Dashboard

**CA-010:** O dashboard consolida atividades pessoais e entregas sem duplicá-las.

## 51.5. Capacidade

**CA-011:** Alocações acima da capacidade são identificadas.

**CA-012:** Uma entrega sequencial concluída libera capacidade.

**CA-013:** Paralelismo com soma de 100% é válido.

**CA-014:** Paralelismo acima de 100% é rejeitado ou marcado inválido.

**CA-015:** Ausências provocam recálculo.

## 51.6. Dependências

**CA-016:** Dependências Finish-to-Start são respeitadas.

**CA-017:** Dependências cíclicas são rejeitadas.

**CA-018:** Bloqueios sem previsão não recebem datas arbitrárias.

## 51.7. Simulações

**CA-019:** Simulações não alteram o cenário-base.

**CA-020:** Cálculos determinísticos são reproduzíveis.

## 51.8. Capacidade compartilhada

**CA-021:** A capacidade de uma pessoa não é duplicada entre times.

**CA-022:** Revisões de estimativa preservam histórico.

## 51.9. Recomendações

**CA-023:** O motor identifica problemas e gera alternativas quando possível.

**CA-024:** Gerar recomendação não altera planejamento.

**CA-025:** Rejeitar recomendação impede aplicação sem nova aprovação.

**CA-026:** Aplicar recomendação exige revalidação.

**CA-027:** Planejamento alterado invalida recomendação incompatível.

**CA-028:** Impactos positivos e negativos são apresentados.

**CA-029:** Alternativas que violam dependências são descartadas.

**CA-030:** Aplicações são atômicas.

**CA-031:** Previsões pendentes de recálculo são sinalizadas.

**CA-032:** Aplicações preservam histórico anterior e posterior.

---

# 52. REQUISITOS NÃO FUNCIONAIS

| ID      | Requisito                                    |
| ------- | -------------------------------------------- |
| RNF-001 | Interface responsiva                         |
| RNF-002 | Operações frequentes com baixa fricção       |
| RNF-003 | Persistência confiável                       |
| RNF-004 | Histórico de alterações relevantes           |
| RNF-005 | Validação de dados                           |
| RNF-006 | Tratamento explícito de erros                |
| RNF-007 | Controle de acesso ao workspace              |
| RNF-008 | Desempenho adequado em consultas comuns      |
| RNF-009 | Suporte a filtros e paginação                |
| RNF-010 | Possibilidade de evolução incremental        |
| RNF-011 | Execução local por Docker Compose            |
| RNF-012 | PostgreSQL nos ambientes                     |
| RNF-013 | Configuração externa ao código               |
| RNF-014 | Recomendações aplicadas transacionalmente    |
| RNF-015 | Jobs idempotentes e recuperáveis             |
| RNF-016 | Versionamento dos dados de cálculo           |
| RNF-017 | Backup e restauração documentados            |
| RNF-018 | Proteção de segredos e dados pessoais        |
| RNF-019 | Motor testável isoladamente                  |
| RNF-020 | Migração para nuvem sem reescrita de domínio |
| RNF-021 | Identificação de previsões obsoletas         |
| RNF-022 | Auditoria de aprovações e alterações         |

---

# 53. REGRAS DE NEGÓCIO CONSOLIDADAS

## 53.1. Atividades

**RN-001:** Atividades concluídas não são consideradas atrasadas.

**RN-002:** Existe no máximo um foco principal.

**RN-003:** A fila de foco possui até três atividades.

**RN-004:** Prioridade pessoal é independente da criticidade da entrega.

## 53.2. Histórias e entregas

**RN-005:** A combinação origem e identificador externo deve ser única.

**RN-006:** Previsões e situações relevantes devem preservar histórico.

**RN-007:** Refinamento e execução possuem estados independentes.

**RN-008:** Bloqueios resolvidos permanecem consultáveis.

## 53.3. Sprints e releases

**RN-009:** Uma história pode contribuir para várias releases.

**RN-010:** Movimentações de sprint preservam histórico.

**RN-011:** Encerramento de sprint não conclui histórias.

**RN-012:** Dados insuficientes produzem estado indeterminado.

## 53.4. Organização

**RN-013:** Times e projetos podem se relacionar de forma muitos-para-muitos.

**RN-014:** Desenvolvedores podem participar de múltiplos times.

**RN-015:** Códigos de times e projetos são únicos por workspace.

**RN-016:** Uma sprint possui um time responsável.

**RN-017:** Uma release possui um projeto na versão inicial.

**RN-018:** Uma história externa possui um projeto de referência.

**RN-019:** Uma sprint pode conter histórias de múltiplos projetos.

**RN-020:** Uma história possui no máximo uma associação corrente de sprint de execução.

**RN-021:** Desenvolvedores podem participar de múltiplos times.

**RN-022:** Times inativos permanecem consultáveis historicamente.

**RN-023:** Atividades pessoais podem existir sem projeto ou time.

**RN-024:** Arquivamento de projeto preserva histórico.

**RN-025:** Associações entre times e projetos preservam período de participação.

## 53.5. Capacidade

**RN-026:** Capacidade individual não pode ser duplicada.

**RN-027:** Ausências reduzem disponibilidade.

**RN-028:** Fator de foco é aplicado após descontos explícitos.

**RN-029:** Alocação acima de 100% gera conflito.

**RN-030:** Estimativas preservam histórico.

**RN-031:** Esforço restante não pode ser negativo.

**RN-032:** Previsões respeitam calendário.

**RN-033:** Bloqueios sem liberação conhecida podem impedir previsão.

**RN-034:** Mudanças de capacidade provocam recálculo.

**RN-035:** Entregas concluídas não consomem capacidade futura.

**RN-036:** Capacidade planejada não é esforço realizado.

**RN-037:** Indicadores globais não duplicam horas.

**RN-038:** Mudanças relevantes de alocação são auditáveis.

**RN-039:** Previsões com dados incompletos devem ser identificadas.

## 53.6. Planejamento assistido

**RN-040:** Recomendações não alteram planejamento automaticamente.

**RN-041:** Aplicação exige aprovação.

**RN-042:** Aplicação exige revalidação de versão.

**RN-043:** Aplicação deve ser atômica.

**RN-044:** Recomendações devem apresentar impactos secundários.

**RN-045:** Restrições obrigatórias não podem ser ignoradas.

**RN-046:** Recomendações expiradas não podem ser aplicadas.

**RN-047:** Aplicações devem preservar auditoria.

---

# 54. ROADMAP DE IMPLEMENTAÇÃO

## ETAPA 1 — FUNDAÇÃO TÉCNICA

### Objetivo

Criar a base executável do sistema.

### Entregas

- Monorepo.
- Next.js.
- NestJS.
- PostgreSQL.
- Prisma.
- Docker Compose.
- Autenticação.
- Workspace.
- Configuração por ambiente.
- Testes iniciais.
- CI.
- Migrations.

### Critério de conclusão

A aplicação sobe localmente, permite autenticação e possui persistência funcional.

---

## ETAPA 2 — ORGANIZAÇÃO E GESTÃO PESSOAL

### Objetivo

Entregar valor imediato ao Tech Lead.

### Entregas

- Times.
- Projetos.
- Desenvolvedores.
- Associações.
- Minhas Atividades.
- Prioridades.
- Fila de foco.
- Dashboard inicial.

### Critério de conclusão

É possível organizar atividades pessoais e navegar entre diferentes contextos.

---

## ETAPA 3 — ACOMPANHAMENTO DE ENTREGAS

### Objetivo

Centralizar o acompanhamento operacional dos times.

### Entregas

- Itens externos.
- Sprints.
- Releases.
- Acompanhamentos.
- Refinamentos.
- Riscos.
- Impedimentos.
- Diário de bordo.
- Histórico.

### Critério de conclusão

É possível acompanhar entregas, riscos e acontecimentos de múltiplos times e projetos.

---

## ETAPA 4 — CAPACIDADE

### Objetivo

Representar disponibilidade e demanda.

### Entregas

- Jornadas.
- Calendários.
- Ausências.
- Alocações.
- Estimativas.
- Capacidade por desenvolvedor.
- Capacidade por time.
- Demanda por projeto.
- Alertas de sobrecarga.

### Critério de conclusão

O sistema calcula capacidade efetiva e identifica conflitos de alocação.

---

## ETAPA 5 — PLANEJAMENTO DE EXECUÇÃO

### Objetivo

Organizar o consumo da capacidade.

### Entregas

- Planos de execução.
- Filas.
- Reordenação.
- Paralelismo.
- Limites de simultaneidade.
- Políticas de redistribuição.
- Dependências.

### Critério de conclusão

O sistema representa como o trabalho será executado, respeitando capacidade e restrições.

---

## ETAPA 6 — MOTOR DE PREVISÃO

### Objetivo

Calcular datas projetadas de conclusão.

### Entregas

- Motor determinístico.
- Snapshots.
- ForecastRun.
- ForecastResult.
- Histórico.
- Jobs.
- Outbox.
- Indicadores de risco.
- Diagnóstico de cálculo.

### Critério de conclusão

O sistema calcula previsões reproduzíveis e identifica atrasos potenciais.

---

## ETAPA 7 — SIMULAÇÕES

### Objetivo

Avaliar cenários alternativos.

### Entregas

- PlanningScenario.
- ScenarioOverride.
- Comparação de cenários.
- Impactos em entregas.
- Impactos em releases.
- Histórico de simulações.

### Critério de conclusão

É possível simular mudanças sem alterar o planejamento-base.

---

## ETAPA 8 — RECOMENDAÇÕES

### Objetivo

Apoiar decisões de replanejamento.

### Entregas

- Detecção de problemas.
- Geração de alternativas.
- Avaliação.
- Explicações.
- Aprovação.
- Aplicação transacional.
- Auditoria.
- Revalidação.

### Critério de conclusão

O sistema sugere ajustes e os aplica somente após aprovação válida.

---

## ETAPA 9 — RELATÓRIOS E OPERAÇÃO

### Objetivo

Consolidar o uso e preparar a aplicação para operação contínua.

### Entregas

- Relatórios de sprint.
- Relatórios de release.
- Relatórios de capacidade.
- Rascunhos de demo.
- Rascunhos de retrospectiva.
- Backups.
- Restauração.
- Observabilidade.
- Testes de recuperação.
- Preparação para nuvem.

### Critério de conclusão

O sistema possui relatórios úteis, operação documentada e recuperação testada.

---

# 55. PRIORIZAÇÃO SUGERIDA

Embora o produto completo tenha vários módulos, não é necessário implementá-los simultaneamente.

## Prioridade P0 — Fundação

- Infraestrutura local.
- Banco.
- Autenticação.
- Times.
- Projetos.
- Desenvolvedores.

## Prioridade P1 — Valor pessoal imediato

- Atividades.
- Foco.
- Dashboard.
- Histórias externas.
- Sprints.
- Releases.
- Acompanhamentos.

## Prioridade P2 — Visibilidade operacional

- Refinamentos.
- Riscos.
- Impedimentos.
- Diário.
- Histórico.
- Relatórios básicos.

## Prioridade P3 — Capacidade

- Jornadas.
- Ausências.
- Alocações.
- Estimativas.
- Indicadores.

## Prioridade P4 — Planejamento e previsão

- Filas.
- Paralelismo.
- Dependências.
- Motor de previsão.
- Jobs.
- Histórico de cálculo.

## Prioridade P5 — Inteligência de planejamento

- Simulações.
- Recomendações.
- Aprovação.
- Comparação de alternativas.

A prioridade de implementação poderá ser revista após a análise do Tech Lead.

---

# 56. PONTOS QUE AINDA PRECISAM DE VALIDAÇÃO

O documento consolida as decisões tomadas, mas alguns detalhes ainda devem ser fechados antes de codificar os módulos correspondentes.

## 56.1. Modelo de dados

- Modelo Prisma definitivo.
- Chaves compostas.
- Estratégia exata de versionamento.
- Regras de exclusão.
- Índices físicos.
- Representação de vínculos históricos.

## 56.2. Capacidade

- Granularidade mínima de cálculo.
- Regras para calendários de feriados.
- Política de distribuição diária.
- Tratamento de alocações parciais.
- Limites de sobreposição.
- Regras para desenvolvedores compartilhados.

## 56.3. Planejamento

- Comportamento exato da redistribuição.
- Limites de paralelismo.
- Tratamento de bloqueios parciais.
- Critérios de elegibilidade.
- Política de desempate entre itens.

## 56.4. Previsibilidade

- Fórmula final de confiança.
- Critérios exatos de saúde.
- Horizonte padrão.
- Regras de arredondamento.
- Tratamento de dependências com datas incertas.
- Estratégia de snapshot.

## 56.5. Recomendações

- Pesos de avaliação.
- Tipos habilitados inicialmente.
- Critérios de impacto.
- Limites de busca.
- Política de expiração.
- Fluxo de reversão.

## 56.6. Infraestrutura

- Versões finais das dependências.
- Estratégia de deploy.
- Ferramenta de CI.
- Estratégia de backups.
- Política de retenção.
- RPO e RTO desejados.

## 56.7. Interface

- Design system.
- Navegação definitiva.
- Layout responsivo.
- Fluxos detalhados.
- Estados vazios.
- Mensagens de erro.
- Acessibilidade.

---

# 57. DEFINIÇÃO DE PRONTO PARA IMPLEMENTAÇÃO

Um módulo poderá entrar em desenvolvimento quando possuir:

1. Objetivo definido.
2. Requisitos funcionais claros.
3. Entidades identificadas.
4. Regras de negócio descritas.
5. Contratos de API definidos.
6. Fluxos de interface mapeados.
7. Critérios de aceite verificáveis.
8. Dependências técnicas conhecidas.
9. Estratégia de testes.
10. Escopo suficientemente pequeno para implementação incremental.

Nem todos os módulos precisam atingir esse nível ao mesmo tempo.

A recomendação é detalhar cada módulo imediatamente antes de implementá-lo, mantendo este documento como referência principal.

---

# 58. DEFINIÇÃO DE CONCLUÍDO

Uma funcionalidade será considerada concluída quando:

- O comportamento esperado estiver implementado.
- Os dados forem persistidos corretamente.
- As validações estiverem funcionando.
- Os critérios de aceite forem atendidos.
- Os testes relevantes estiverem passando.
- Erros forem tratados.
- A interface apresentar estados de carregamento e falha.
- Alterações relevantes forem auditadas.
- A documentação técnica estiver atualizada.
- A funcionalidade puder ser executada no ambiente local.

---

# 59. RESULTADO ESPERADO DO PRODUTO

Quando estiver completo, o Tech Lead Hub permitirá que o Tech Lead:

- Organize suas prioridades pessoais.
- Defina claramente seu foco.
- Acompanhe múltiplos times.
- Acompanhe múltiplos projetos.
- Consulte sprints e releases.
- Identifique entregas em risco.
- Acompanhe refinamentos.
- Registre decisões e acontecimentos.
- Entenda a capacidade disponível.
- Visualize alocações.
- Identifique sobrecarga.
- Planeje execução sequencial e paralela.
- Calcule previsões.
- Simule mudanças.
- Receba recomendações.
- Aprove ajustes conscientemente.
- Consulte histórico.
- Prepare demos e retrospectivas.
- Utilize o sistema localmente.
- Migre futuramente para a nuvem.

---

# 60. CONCLUSÃO

O Tech Lead Hub foi concebido como uma ferramenta pessoal de gestão técnica, organização operacional e apoio à decisão.

Sua principal característica é a combinação de três perspectivas:

**1. Minha execução:** atividades, prioridades, foco e compromissos pessoais.

**2. Execução dos times:** histórias, sprints, releases, desenvolvedores, riscos e refinamentos.

**3. Capacidade e previsibilidade:** disponibilidade, alocações, esforço, dependências, previsões, cenários e recomendações.

Essas perspectivas permanecem separadas no domínio, mas são consolidadas em um dashboard orientado à tomada de decisão.

O produto será desenvolvido incrementalmente, começando por uma aplicação local com arquitetura modular, banco PostgreSQL e infraestrutura reproduzível.

As funcionalidades de previsão e recomendação serão incorporadas sobre uma base consistente de dados operacionais.

O princípio fundamental do produto é:

**O Tech Lead Hub organiza informações, antecipa problemas e recomenda caminhos, mas mantém o Tech Lead no controle das decisões.**

---

**Fim do Documento Consolidado — Tech Lead Hub v1.0**
