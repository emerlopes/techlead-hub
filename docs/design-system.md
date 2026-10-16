# Tech Lead Hub — Design System v1.0

Referência viva: rode `pnpm dev` e abra **`/design-system`**.
Responde ao item **§56.7 Interface → Design system** do [documento principal](./main.md).

Caminhos relativos a `apps/web/src`.

| Camada | Onde |
| --- | --- |
| Tokens (cores, raio, sombra, tipografia) | `app/globals.css` |
| Mapa de status do domínio → rótulo/tom/ícone | `lib/design-system/status.ts` |
| Primitivas (estilo shadcn/ui) | `components/ui/*` |
| Componentes de domínio | `components/domain/*` |
| Showcase | `app/design-system/page.tsx` |

Stack: Next.js 16 · Tailwind CSS v4 (`@theme inline`) · componentes no padrão shadcn/ui (`components.json` já configurado para `npx shadcn add`) · ícones `lucide-react` · `class-variance-authority` + `tailwind-merge` (`cn()` em `lib/utils.ts`).

---

## 1. Princípios

Derivados de §3 da especificação.

1. **Atenção primeiro.** A cor serve para chamar atenção. O que está saudável fica discreto; só risco, atraso e bloqueio ganham saturação.
2. **Dados explícitos (§3.4).** Sem dado, sem número: valor ausente vira `—`, estado indeterminado usa hachura (`bg-hatch`) e borda tracejada, previsões mostram confiança e origem (manual × calculada).
3. **Domínios separados (§3.2).** As três perspectivas do produto (§60) têm cor própria e nunca se misturam visualmente.
4. **O sistema sugere, o Tech Lead decide (§3.5).** Recomendações sempre mostram explicação, ganhos e efeitos colaterais; aplicar exige aprovação explícita.
5. **Densidade com respiro (§3.1).** Corpo de 14px, controles de 32px, tabelas compactas, algarismos tabulares.
6. **Nunca só cor.** Todo status é ícone + rótulo. Contraste AA nos dois temas. Foco sempre visível.

## 2. Cores

Todos os tokens em OKLCH, com tema claro (`:root`) e escuro (`.dark`). O tema segue o sistema e pode ser alternado (`ThemeToggle`, persistido em `localStorage`).

**Regra:** componentes usam apenas tokens semânticos (`bg-surface`, `text-danger-fg`…). Não usar cores cruas do Tailwind (`bg-red-500`).

### 2.1 Superfícies e texto

| Token | Uso |
| --- | --- |
| `background` | Fundo da aplicação |
| `surface` | Cartões, tabelas, campos |
| `surface-sunken` | Cabeçalhos de especime, linhas em hover, chips |
| `surface-raised` | Popovers, menus |
| `foreground` / `muted-foreground` / `subtle-foreground` | Texto principal / secundário / terciário |
| `border` / `border-strong` / `input` | Divisórias / bordas de controles / campos |
| `primary` | Ação principal, links, foco (`ring`) |

### 2.2 Tons semânticos

Cada tom tem três tokens: `--{tom}` (base: ícones, barras, pontos), `--{tom}-subtle` (fundo) e `--{tom}-fg` (texto sobre o subtle, AA).

| Tom | Significado no produto |
| --- | --- |
| `success` | No prazo, concluída, pronta, aplicada |
| `attention` | Margem pequena, confiança reduzida, previsão obsoleta, refinamento com dúvidas |
| `warning` | Em risco, prioridade alta, efeitos colaterais |
| `danger` | Atrasada, sobrecarga (>100%), prioridade crítica, falhas |
| `blocked` | Impedimento ativo — **distinto de atraso** (pede remover impedimento, não replanejar) |
| `info` | Em andamento, sprint ativa, em recálculo |
| `neutral` | A fazer, indeterminado, arquivado, cancelado |

A escala verde → amarelo → laranja → vermelho cresce com a urgência.

### 2.3 Domínios

| Domínio | Token | Abrange |
| --- | --- | --- |
| Minha execução | `personal` (violeta) | Atividades, foco, prioridades pessoais |
| Execução dos times | `delivery` (azul) | Entregas, sprints, releases, desenvolvedores |
| Capacidade e previsibilidade | `capacity` (verde-azulado) | Jornadas, alocações, utilização, previsões |

Use `<DomainTag domain="…"/>` em cabeçalhos de cartões do dashboard e na navegação.

## 3. Tipografia

Geist (UI) e Geist Mono (identificadores externos, códigos de contexto, números).

| Estilo | Classes | Uso |
| --- | --- | --- |
| Display | `text-3xl font-semibold tracking-tight` | Título raro de página |
| Título de página | `text-xl font-semibold tracking-tight` | Cabeçalho de módulo |
| Título de cartão | `text-base font-semibold` | Foco principal, diálogos |
| Subtítulo | `text-sm font-semibold` | Título de cartão padrão |
| Corpo | `text-sm` | Texto geral |
| Apoio | `text-xs text-muted-foreground` | Metadados, ajuda |
| Eyebrow | `text-2xs font-semibold uppercase tracking-wide` | Rótulos de seção, cabeçalho de tabela |
| Dados | `font-mono` + `tabular` | `PAY-142`, horas, deltas |

`text-2xs` (11px) é um token adicional. Tabelas aplicam `tabular-nums` automaticamente.

## 4. Espaço, raio e elevação

- Grade de 4px (`1` = 4px). Padding de cartão: 16px. Gap entre cartões: 12–16px.
- Raio base `--radius: 8px` → `rounded-sm` 4 · `md` 6 · `lg` 8 · `xl` 12.
- Elevação sutil — a separação vem de bordas: `shadow-xs` cartões/campos · `shadow-md` popovers · `shadow-lg` diálogos/painéis.
- Altura de controles: `sm` 28px · `md` 32px (padrão) · `lg` 40px.
- **Efeito de clique:** todo botão (incluindo abas e botões só-ícone) usa a utility `pressable` (`app/globals.css`): ao pressionar, `scale(0.97)` + leve escurecimento em 120ms; ignorado quando `disabled` e reduzido por `prefers-reduced-motion`. `Button` e `TabsTrigger` já aplicam. **Cursor:** `pressable` e a camada base (`button`, `[role=button]`, `[role=tab]`, `select`, checkbox/radio) aplicam `cursor: pointer` — o Tailwind v4 não faz mais isso por padrão; controles desabilitados usam `not-allowed`.

## 5. Primitivas (`components/ui`)

| Componente | Notas |
| --- | --- |
| `Button` | `primary` · `secondary` · `outline` · `ghost` · `danger` · `link`; tamanhos `sm` `md` `lg` `icon`. Um primário por região. Destrutivo sempre com confirmação. |
| `Badge` | `tone` × `variant` (`subtle` padrão, `outline`, `solid`, `dot`) × `size`. `solid` só para contagem de alertas. |
| `Card` + `Header/Title/Description/Action/Content/Footer` | Estrutura de todas as telas. |
| `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Field` | `Field` agrupa label, ajuda e erro; erro substitui a ajuda e cita a regra (ex.: RN-031). `aria-invalid` ativa estilo de erro. |
| `Table*` | Cabeçalho em eyebrow, linhas de 44px, rolagem horizontal própria. |
| `Tabs*` | Alternância de visões (lista · Kanban · agenda). |
| `Progress` | Barra simples com `tone`. |
| `Alert` | `info` · `success` · `warning` · `danger`, com ação opcional. |
| `EmptyState` | Explica o motivo e oferece a próxima ação; nunca inventa conteúdo. |
| `ConfirmButton` | Ação que encerra ou destrói algo: o primeiro clique troca o botão por “pergunta · Voltar · Confirmar (danger)” no próprio lugar; nada acontece sem o segundo clique. |
| `Skeleton`, `Separator`, `Kbd`, `Avatar`, `ThemeToggle` | Utilitários. `Avatar` usa iniciais (desenvolvedores não têm login/foto). |

## 6. Status do domínio (`lib/design-system/status.ts`)

Fonte única para rótulo pt-BR, tom e ícone de cada enum da especificação. Sempre renderizar via `<StatusBadge meta={…}/>`.

| Mapa | Origem | Valores |
| --- | --- | --- |
| `healthStatus` | §14.4, §25.8 | No prazo · Atenção · Em risco · Atrasada · Bloqueada · Indeterminada |
| `taskStatus` | §6.4 | A fazer · Em andamento · Bloqueada · Concluída · Cancelada |
| `priority` | §6.5 | Crítica · Alta · Média · Baixa |
| `taskDueState` | §5.2.2, §6.6 | Atrasada · Vence hoje · Vence em breve (alerta de prazo, independente da fila de foco) |
| `taskType` | §6.3 | Técnica · Acompanhamento · Decisão · Reunião · Planejamento · Revisão · Investigação · Outra |
| `teamStatus` | §7.2 | Ativo · Inativo |
| `developerStatus` | §10.2 | Ativo · Inativo |
| `membershipStatus` | §9, RN-025 | Ativa · Encerrada (participação em time/projeto) |
| `projectStatus` | §8.4 | Ativo · Pausado · Arquivado |
| `sprintStatus` | §11.4 | Planejada · Ativa · Encerrada · Cancelada |
| `refinementStatus` | §15.3 | Aguardando refinamento · Em análise · Com dúvidas · Pronta · Cancelada |
| `forecastState` | §43.4 | Atualizada · Em recálculo · Obsoleta · Indeterminada · Falha de cálculo |
| `confidence` | §21.4 | Alta · Média · Baixa |
| `recommendationStatus` | §28.6 | Gerada · Em análise · Aprovada · Aplicada · Rejeitada · Expirada · Falhou |
| `impact` | §28.7 | Baixo · Médio · Alto |
| `jobStatus` | §41.4 | Na fila · Executando · Nova tentativa · Concluído · Falhou · Cancelado |
| `journalCategory` | §17.2 | Decisão técnica · Incidente · Bloqueio · Desbloqueio · Aprendizado · Mudança de escopo · Conquista · Risco · Acontecimento geral |
| `scopeType` | §11.5 | Original · Adicionado · Remanejado |

Novos enums: adicionar ao arquivo com `satisfies StatusMap<string>`; marcar `indeterminate: true` para estados sem dados e `busy: true` para estados transitórios.

## 7. Componentes de domínio (`components/domain`)

| Componente | Regra de produto embutida |
| --- | --- |
| `StatusBadge` | Ícone + rótulo; estados indeterminados com hachura e borda tracejada; estados `busy` animados. |
| `FocusCard` | Foco principal único (RN-002), faixa `personal`, próxima ação sempre visível, prazo vencido em `danger`. `href` opcional transforma o título em link. |
| `TaskItem` | Atividade em linha compacta (dashboard, Kanban, agenda, fila de foco): prioridade, situação, alerta de prazo com data (§6.6), chips de contexto sem duplicar a atividade (§6.8), ícone de foco. |
| `DateDelta` | Compromisso × previsão; diferença em dias úteis; ícone de origem (calculadora = calculada, mão = manual — §26.3); sem previsão → “Sem previsão”, nunca data inventada (§25.9). |
| `ConfidenceMeter` | 3 barras + rótulo; `null` = “Confiança desconhecida”. |
| `CapacityBar` | U = D / CA (§25.5). Faixas: <85% `capacity` · 85–100% `attention` · >100% `danger` com excedente hachurado após o marcador de 100%. CA = 0 → “Sem capacidade”, sem percentual. |
| `StaleIndicator` | Acompanhamento desatualizado após N dias (padrão 3) ou nunca verificado (§5.4, §14.5). |
| `Kpi` | Indicador do dashboard; `value = null` → `—`. |
| `RecommendationCard` | Explicação + ganhos + efeitos colaterais (CA-028); ações Rejeitar · Simular · Aprovar; “Aplicar” só após aprovação e com aviso de revalidação (RN-041/042). |
| `JournalEntry` | Linha do tempo do Diário de Bordo com ícone por categoria e chips de contexto. |
| `DomainTag`, `ContextChip` | Identidade do domínio; códigos de time/projeto em mono (`CHK`, `PAY`). |

## 8. Shell da aplicação (`components/app`)

| Componente | Notas |
| --- | --- |
| `Brand` | Marca + link para o início. `compact` oculta o nome no mobile (fica para leitores de tela). |
| `AppNav` | Navegação principal; item ativo com `aria-current="page"`; rótulos viram `sr-only` no mobile. |
| `PageHeader` | Título de página (`text-xl`), eyebrow opcional (texto ou link de volta), descrição e `actions` à direita (quebram abaixo no mobile). |
| `ListSkeleton`, `DetailSkeleton` | Carregamento padrão de listagens e páginas de detalhe. |
| `ApiUnavailable` | Estado de falha padrão quando a API não responde: `Alert tone="danger"` + `RetryButton`. |
| `FormError` | Erro geral de formulário a partir de `ApiError`. Bloqueio (`TOO_MANY_ATTEMPTS`) e conflito de versão (`CONFLICT`) usam `warning`; demais, `danger`. |
| `RetryButton` | `router.refresh()` com estado de carregamento; `label` customizável (“Recarregar” em conflitos). |
| `PasswordInput` (`features/identity`) | `Input` com botão de mostrar/ocultar (`aria-pressed`). |

Formulários que falam com a API usam `useApiForm` (`lib/api/use-api-form.ts`): valida no navegador com o schema de `@tlh/shared-contracts`, mapeia `details` para o `error` de cada `Field` e expõe `pending`. Ações pontuais sem formulário (mudar situação, encerrar associação, reordenar a fila de foco) usam `useApiAction` (`lib/api/use-api-action.ts`), que executa, expõe o `ApiError` e faz `router.refresh()`.

Server Components leem a API com `loadApi(path, schema)` (`lib/api/server.ts`): sem sessão → login; `404` → `not_found` (a página chama `notFound()`); demais falhas → `ApiUnavailable`.

**Fronteira Server → Client:** ícones `lucide` são componentes e não podem ser passados como prop para Client Components. Passe uma chave e resolva o ícone num mapa estático do lado cliente (ver `features/organization/status-actions.tsx`).

## 9. Padrões de interface

- **Estados obrigatórios (§58):** toda tela tem carregamento (`Skeleton`), vazio (`EmptyState`) e falha (`Alert tone="danger"`).
- **Previsões obsoletas (RNF-021, CA-031):** `Alert tone="warning"` com ação “Recalcular” no topo do contexto + `StatusBadge forecastState.STALE` no cabeçalho.
- **Simulação (§27):** `Alert tone="info"` persistente informando que nada altera o planejamento-base.
- **Erros de validação:** mensagem no domínio, citando a regra (“A soma das alocações chega a 120% (RN-029)”).
- **Filtros globais (§5.3):** `ContextFilter` (`features/context`) no topo do dashboard e de Minhas Atividades, com `Select` compactos (`h-7`). A escolha fica no cookie `tlh_context` e persiste durante a navegação até ser alterada; a fila de foco não muda com o contexto (§5.4).
- **Tabelas de entregas:** item (chave externa em mono + link externo) · responsável · saúde · `DateDelta` · confiança · verificação.
- **Dashboard (§5):** KPIs no topo → foco principal + capacidade à esquerda → entregas críticas à direita. Ver seção “Composição” no showcase.

## 10. Acessibilidade

- Contraste AA para texto (`*-fg` sobre `*-subtle`) nos dois temas.
- Status nunca dependem só de cor (ícone + texto; `title` com descrição em `healthStatus`).
- `:focus-visible` global com `--ring`; `prefers-reduced-motion` desativa animações.
- `role="progressbar"`/`role="meter"` com `aria-value*` em barras; `role="alert"` em erros.
- Ícones decorativos com `aria-hidden`; botões só-ícone com `aria-label`.

## 11. Pendências

- Componentes com Radix (Dialog, Popover, DropdownMenu, Tooltip, Command ⌘K) — adicionar via `npx shadcn add …` quando os módulos precisarem; os tokens já são compatíveis.
- Navegação definitiva (sidebar dos 20 módulos) e gráficos (burndown, histórico de previsões) — a definir junto com os fluxos detalhados de §56.7.
