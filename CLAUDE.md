@AGENTS.md

# Tech Lead Hub — instruções do projeto

Aplicação pessoal para um Tech Lead acompanhar atividades próprias, entregas de vários times, capacidade e previsões.

- **Especificação (fonte de verdade do produto):** `docs/main.md`. Consulte a seção do módulo antes de implementá-lo e cite regras pelo ID (`RN-xxx`, `CA-xxx`, `§n`).
- **Design system:** `docs/design-system.md` + showcase vivo em `/design-system`.

## Stack e comandos

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · componentes no padrão shadcn/ui · `lucide-react` · `class-variance-authority` + `tailwind-merge`.

```bash
npm run dev     # http://localhost:3000 (showcase em /design-system)
npm run lint
npx tsc --noEmit
npm run build
```

Antes de dizer que algo está pronto: `tsc`, `lint` e `build` passando; para mudanças de UI, conferir no navegador em tema claro, escuro e largura mobile (sem scroll horizontal).

## Estrutura

| Pasta                         | Conteúdo                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `app/`                        | Rotas (App Router). `globals.css` contém **todos** os tokens.                                 |
| `components/ui/`              | Primitivas genéricas (Button, Badge, Card, Input, Table, Tabs, Alert…). Sem regra de negócio. |
| `components/domain/`          | Componentes com regra de produto (StatusBadge, DateDelta, CapacityBar, FocusCard…).           |
| `lib/design-system/status.ts` | Mapa único de enums do domínio → rótulo pt-BR, tom e ícone.                                   |
| `lib/utils.ts`                | `cn()` para compor classes.                                                                   |
| `docs/`                       | Especificação e design system.                                                                |

Alias de import: `@/*` aponta para a raiz.

## Regras obrigatórias

### 1. Siga o design system

- **Cores só por tokens semânticos** (`bg-surface`, `text-muted-foreground`, `bg-danger-subtle text-danger-fg`, `bg-personal`…). Nunca cores cruas do Tailwind (`bg-red-500`, `text-zinc-600`), hex ou `style` com cor literal.
- Tom certo para o significado: `success` no prazo · `attention` atenção/obsoleto · `warning` risco · `danger` atraso/sobrecarga/falha · `blocked` impedimento · `info` em andamento · `neutral` indeterminado/inativo. Domínios: `personal` (minha execução), `delivery` (times), `capacity` (capacidade/previsões).
- Status do domínio **sempre** via `<StatusBadge meta={healthStatus.AT_RISK} />` usando `lib/design-system/status.ts`. Nunca escreva rótulo/cor/ícone de status à mão em um componente. Enum novo → adicione ao `status.ts`.
- Tipografia e espaço conforme `docs/design-system.md` (corpo `text-sm`, apoio `text-xs`, eyebrow `text-2xs uppercase`, identificadores e números em `font-mono`/`tabular`, grade de 4px, controles `h-8`).
- Todo botão tem efeito de clique: use `<Button>` (já inclui) ou, em qualquer outro elemento clicável com aparência de botão, a utility `pressable`. Nunca crie `<button>` estilizado à mão sem ela.
- Todo status combina ícone + texto (nunca só cor). Botões só-ícone têm `aria-label`; ícones decorativos `aria-hidden`.
- Toda tela tem estados de carregamento (`Skeleton`), vazio (`EmptyState`) e falha (`Alert tone="danger"`).
- Novo token, variante ou componente reutilizável → atualize também `docs/design-system.md` e adicione um exemplo em `app/design-system/page.tsx`.

### 2. Não duplique código

- Antes de criar algo, procure em `components/ui`, `components/domain` e `lib/`. Se existe algo próximo, **estenda** (nova variante via `cva`, nova prop) em vez de copiar.
- Padrão repetido em 2+ lugares vira componente/função compartilhada. Primitiva genérica → `components/ui`; com regra de negócio → `components/domain`; lógica pura → `lib/`.
- Formatação (datas, horas, percentuais) e cálculos de domínio (capacidade, utilização, saúde) ficam em um único lugar e são importados — nunca reimplementados inline.
- Classes condicionais com `cn()`; variantes com `cva`. Sem strings de classe dinâmicas (`` `bg-${tone}` ``) — o Tailwind não as detecta; use um mapa estático.
- Componentes `shadcn` novos: `npx shadcn add <nome>` (o `components.json` já está configurado) e ajuste para os tokens do projeto.

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
- Comentários só quando explicam o _porquê_ ou citam a regra da especificação.
- Não commitar sem pedido explícito.
