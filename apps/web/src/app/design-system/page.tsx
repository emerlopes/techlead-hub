import type { Task } from "@tlh/shared-contracts";
import type { Metadata } from "next";
import {
  AlertOctagon,
  CalendarCheck,
  ExternalLink,
  Inbox,
  Layers,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  UserX,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Avatar, Kbd, Separator, Skeleton } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { CapacityBar } from "@/components/domain/capacity-bar";
import { ConfidenceMeter } from "@/components/domain/confidence-meter";
import { DateDelta } from "@/components/domain/date-delta";
import { ContextChip, DomainTag } from "@/components/domain/domain-tag";
import { FocusCard } from "@/components/domain/focus-card";
import { JournalEntry } from "@/components/domain/journal-entry";
import { Kpi } from "@/components/domain/kpi";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { StaleIndicator } from "@/components/domain/stale-indicator";
import { StatusBadge } from "@/components/domain/status-badge";
import { TaskItem } from "@/components/domain/task-item";

import { ApiUnavailable } from "@/components/app/api-unavailable";
import { Brand } from "@/components/app/brand";
import { FormError } from "@/components/app/form-error";
import { PageHeader } from "@/components/app/page-header";
import { PasswordInput } from "@/features/identity/password-input";

import * as status from "@/lib/design-system/status";
import type { StatusMeta } from "@/lib/design-system/status";
import { ConfirmButtonDemo } from "./confirm-button-demo";

export const metadata: Metadata = {
  title: "Design System · Tech Lead Hub",
  description: "Tokens, componentes e padrões de interface do Tech Lead Hub.",
};

const sections = [
  { id: "principios", label: "Princípios" },
  { id: "cores", label: "Cores" },
  { id: "tipografia", label: "Tipografia" },
  { id: "forma", label: "Espaço e forma" },
  { id: "acoes", label: "Ações" },
  { id: "formularios", label: "Formulários" },
  { id: "estrutura", label: "Estrutura" },
  { id: "feedback", label: "Feedback e estados" },
  { id: "status", label: "Status do domínio" },
  { id: "previsibilidade", label: "Previsibilidade" },
  { id: "padroes", label: "Padrões de domínio" },
  { id: "shell", label: "Shell da aplicação" },
  { id: "composicao", label: "Composição" },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">Tech Lead Hub</span>
            <span className="text-2xs text-muted-foreground">Design System · v1.0</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Next.js · Tailwind v4 · shadcn/ui
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-4 sm:px-6">
        <nav aria-label="Seções" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 shrink-0 overflow-y-auto py-8 lg:block">
          <ul className="flex flex-col gap-0.5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-16 py-10">
          <section className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              Uma interface calma para decisões sob pressão.
            </h1>
            <p className="text-muted-foreground">
              O Tech Lead Hub consolida atividades pessoais, entregas de vários times e previsões de capacidade.
              Este design system existe para que essas três perspectivas convivam na mesma tela sem se
              confundirem — e para que o sistema nunca apresente como fato algo que não sabe.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <DomainTag domain="personal" />
              <DomainTag domain="delivery" />
              <DomainTag domain="capacity" />
            </div>
          </section>

          <Principles />
          <Colors />
          <Typography />
          <Shape />
          <Actions />
          <Forms />
          <Structure />
          <Feedback />
          <DomainStatus />
          <Predictability />
          <DomainPatterns />
          <AppShell />
          <Composition />
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Specimen({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-sunken px-4 py-2">
        <span className="text-xs font-semibold">{title}</span>
        {note && <span className="truncate text-2xs text-muted-foreground">{note}</span>}
      </div>
      <div className={`flex flex-wrap items-center gap-3 bg-surface p-4 ${className ?? ""}`}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Principles() {
  const items = [
    {
      t: "Atenção primeiro",
      d: "A cor existe para chamar atenção. Tudo que está saudável é discreto; apenas risco, atraso e bloqueio ganham saturação.",
    },
    {
      t: "Dados explícitos",
      d: "Sem dado, sem número. Valores ausentes viram “—”, estados indeterminados usam hachura e borda tracejada, previsões mostram confiança.",
    },
    {
      t: "Domínios separados",
      d: "Atividade pessoal (violeta), entrega dos times (azul) e capacidade (verde-azulado) têm identidade própria, mesmo quando lado a lado.",
    },
    {
      t: "O sistema sugere, você decide",
      d: "Recomendações mostram explicação, ganhos e efeitos colaterais. Aplicar sempre exige um passo explícito de aprovação.",
    },
    {
      t: "Densidade com respiro",
      d: "Interface operacional: texto base de 14px, tabelas compactas, números tabulares. Hierarquia por peso e cor, não por tamanho.",
    },
    {
      t: "Nunca só cor",
      d: "Todo status combina ícone + rótulo. Contraste AA em ambos os temas e foco visível em todos os controles.",
    },
  ];
  return (
    <Section id="principios" title="Princípios" description="Derivados diretamente dos princípios de projeto da especificação (§3).">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i, n) => (
          <div key={i.t} className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4">
            <span className="font-mono text-2xs text-subtle-foreground">0{n + 1}</span>
            <span className="text-sm font-semibold">{i.t}</span>
            <p className="text-xs leading-5 text-muted-foreground">{i.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Swatch({ token, label }: { token: string; label?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="h-12 rounded-md border border-border" style={{ background: `var(--${token})` }} />
      <div className="flex flex-col">
        {label && <span className="text-xs font-medium">{label}</span>}
        <code className="truncate font-mono text-2xs text-muted-foreground">--{token}</code>
      </div>
    </div>
  );
}

function ToneRow({ tone, label, use }: { tone: string; label: string; use: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[9rem_repeat(3,minmax(0,1fr))_minmax(0,1.6fr)]">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <code className="font-mono text-2xs text-muted-foreground">{tone}</code>
      </div>
      <div className="col-start-2 grid grid-cols-3 gap-2 sm:contents">
        <div className="h-9 rounded-md" style={{ background: `var(--${tone})` }} title={`--${tone}`} />
        <div className="h-9 rounded-md border border-border" style={{ background: `var(--${tone}-subtle)` }} title={`--${tone}-subtle`} />
        <div
          className="flex h-9 items-center justify-center rounded-md text-xs font-medium"
          style={{ background: `var(--${tone}-subtle)`, color: `var(--${tone}-fg)` }}
        >
          Aa 12
        </div>
      </div>
      <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">{use}</span>
    </div>
  );
}

function Colors() {
  return (
    <Section
      id="cores"
      title="Cores"
      description="Tokens em OKLCH definidos em app/globals.css, com tema claro e escuro. Componentes usam apenas tokens semânticos — nunca cores do Tailwind direto."
    >
      <Specimen title="Superfícies e texto" className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <Swatch token="background" label="Fundo" />
        <Swatch token="surface" label="Superfície" />
        <Swatch token="surface-sunken" label="Rebaixada" />
        <Swatch token="border" label="Borda" />
        <Swatch token="foreground" label="Texto" />
        <Swatch token="muted-foreground" label="Texto 2º" />
        <Swatch token="primary" label="Primária" />
        <Swatch token="secondary" label="Secundária" />
      </Specimen>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="hidden grid-cols-[9rem_repeat(3,minmax(0,1fr))_minmax(0,1.6fr)] gap-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Tom</span>
          <span>base</span>
          <span>subtle</span>
          <span>fg / subtle</span>
          <span>Uso no produto</span>
        </div>
        <ToneRow tone="success" label="Sucesso" use="No prazo, concluída, pronta, aplicada" />
        <ToneRow tone="attention" label="Atenção" use="Margem pequena, confiança reduzida, obsoleta, com dúvidas" />
        <ToneRow tone="warning" label="Risco" use="Em risco, prioridade alta, efeitos colaterais" />
        <ToneRow tone="danger" label="Perigo" use="Atrasada, sobrecarga, prioridade crítica, falhas" />
        <ToneRow tone="blocked" label="Bloqueio" use="Impedimento ativo — distinto de atraso" />
        <ToneRow tone="info" label="Informação" use="Em andamento, sprint ativa, em recálculo" />
        <ToneRow tone="neutral" label="Neutro" use="A fazer, indeterminado, arquivado, cancelado" />
        <Separator className="my-1" />
        <ToneRow tone="personal" label="Minha execução" use="Atividades pessoais, foco, prioridades do Tech Lead" />
        <ToneRow tone="delivery" label="Times" use="Entregas, sprints, releases, desenvolvedores" />
        <ToneRow tone="capacity" label="Capacidade" use="Jornadas, alocações, utilização, previsões" />
      </div>

      <Alert tone="info" title="Escala de severidade">
        A ordem cromática é intencional: verde → amarelo → laranja → vermelho cresce com a urgência. Bloqueio usa
        magenta porque exige uma ação diferente (remover impedimento) da de atraso (replanejar).
      </Alert>
    </Section>
  );
}

function Typography() {
  const scale = [
    { cls: "text-3xl font-semibold tracking-tight", name: "Display", spec: "30/36 · 600", sample: "Sprint 42 — Checkout" },
    { cls: "text-xl font-semibold tracking-tight", name: "Título de página", spec: "20/28 · 600", sample: "Entregas críticas" },
    { cls: "text-base font-semibold", name: "Título de cartão", spec: "16/24 · 600", sample: "Revisar contrato da integração de pagamentos" },
    { cls: "text-sm font-semibold", name: "Subtítulo", spec: "14/20 · 600", sample: "Releases em risco" },
    { cls: "text-sm", name: "Corpo", spec: "14/20 · 400", sample: "A previsão considera ausências, alocações e dependências." },
    { cls: "text-xs text-muted-foreground", name: "Apoio", spec: "12/16 · 400", sample: "Verificado há 2 dias · confiança média" },
    { cls: "text-2xs font-semibold uppercase tracking-wide text-muted-foreground", name: "Eyebrow", spec: "11/16 · 600 · caps", sample: "Foco principal" },
    { cls: "font-mono text-sm tabular", name: "Mono / dados", spec: "14 · Geist Mono", sample: "PAY-142 · 24,0h · +2 d.u." },
  ];
  return (
    <Section
      id="tipografia"
      title="Tipografia"
      description="Geist para interface e Geist Mono para identificadores externos, códigos de contexto e números. Algarismos tabulares em tabelas e métricas."
    >
      <div className="divide-y divide-border rounded-lg border border-border bg-surface">
        {scale.map((s) => (
          <div key={s.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium">{s.name}</span>
              <span className="font-mono text-2xs text-subtle-foreground">{s.spec}</span>
            </div>
            <span className={`${s.cls} min-w-0 truncate`}>{s.sample}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Shape() {
  return (
    <Section
      id="forma"
      title="Espaço e forma"
      description="Grade de 4px. Raio base de 8px. Sombras sutis — a separação vem de bordas, não de elevação."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Specimen title="Espaçamento" note="4 · 8 · 12 · 16 · 24 · 32" className="items-end">
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className="bg-primary/70" style={{ width: n * 4, height: n * 4 }} />
              <span className="font-mono text-2xs text-muted-foreground">{n * 4}</span>
            </div>
          ))}
        </Specimen>
        <Specimen title="Raio" note="sm · md · lg · xl · full">
          {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-full"].map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <div className={`size-10 border-2 border-primary bg-primary/10 ${r}`} />
              <span className="font-mono text-2xs text-muted-foreground">{r.replace("rounded-", "")}</span>
            </div>
          ))}
        </Specimen>
        <Specimen title="Elevação" note="xs · sm · md · lg" className="bg-surface-sunken">
          {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg"].map((s) => (
            <div key={s} className={`flex size-12 items-center justify-center rounded-lg bg-surface ${s}`}>
              <span className="font-mono text-2xs text-muted-foreground">{s.replace("shadow-", "")}</span>
            </div>
          ))}
        </Specimen>
      </div>
      <p className="text-xs text-muted-foreground">
        Uso de elevação: <b>xs</b> cartões e campos · <b>md</b> popovers e menus · <b>lg</b> diálogos e painéis laterais.
      </p>
    </Section>
  );
}

function Actions() {
  return (
    <Section
      id="acoes"
      title="Ações"
      description="Um único botão primário por região. Ações destrutivas usam “danger” e sempre pedem confirmação. Altura padrão 32px para manter a densidade."
    >
      <Specimen title="Variantes">
        <Button>
          <Plus /> Nova atividade
        </Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="outline">Simular cenário</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button variant="danger">Encerrar sprint</Button>
        <Button variant="link">Ver histórico</Button>
      </Specimen>
      <Specimen title="Tamanhos e estados">
        <Button size="sm">Pequeno</Button>
        <Button>Médio</Button>
        <Button size="lg">Grande</Button>
        <Button variant="outline" size="icon" aria-label="Recalcular">
          <RefreshCw />
        </Button>
        <Button disabled>Desabilitado</Button>
        <Button disabled>
          <RefreshCw className="animate-spin" /> Recalculando…
        </Button>
        <ConfirmButtonDemo />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Atalho global <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Specimen>
    </Section>
  );
}

function Forms() {
  return (
    <Section
      id="formularios"
      title="Formulários"
      description="Labels sempre visíveis, ajuda abaixo do campo e erro substituindo a ajuda. Registro rápido: só o essencial é obrigatório (§3.1)."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nova atividade</CardTitle>
            <CardDescription>Atividades pessoais são independentes das entregas dos times.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Título" htmlFor="t" required>
              <Input id="t" placeholder="Ex.: Revisar contrato técnico da integração" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prioridade" htmlFor="p">
                <Select id="p" defaultValue="HIGH">
                  {Object.entries(status.priority).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Prazo" htmlFor="d" hint="Opcional">
                <Input id="d" type="date" />
              </Field>
            </div>
            <Field label="Próxima ação" htmlFor="n" hint="O que destrava esta atividade agora?">
              <Textarea id="n" rows={2} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Adicionar à fila de foco
            </label>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="ghost">Cancelar</Button>
            <Button>Salvar</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validação</CardTitle>
            <CardDescription>Erros explicam a regra violada em linguagem do domínio.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Esforço restante (h)" htmlFor="e" error="O esforço restante não pode ser negativo (RN-031).">
              <Input id="e" defaultValue="-4" aria-invalid />
            </Field>
            <Field label="Alocação no projeto (%)" htmlFor="a" error="A soma das alocações de Ana chega a 120%. Ajuste antes de salvar (RN-029).">
              <Input id="a" defaultValue="70" aria-invalid />
            </Field>
            <Field label="Identificador externo" htmlFor="k" hint="Origem + identificador devem ser únicos">
              <Input id="k" className="font-mono" defaultValue="PAY-142" />
            </Field>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s">Busca</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
                <Input id="s" className="pl-8" placeholder="Buscar entregas, pessoas, riscos…" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function Structure() {
  return (
    <Section id="estrutura" title="Estrutura" description="Cartões, abas e tabelas são a base de todas as telas de módulo.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sprint 42 · Checkout</CardTitle>
            <CardDescription>14 out – 25 out · objetivo: novo fluxo de pagamento</CardDescription>
            <CardAction>
              <StatusBadge meta={status.sprintStatus.ACTIVE} size="sm" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Entregas concluídas</span>
              <span className="font-medium tabular">7 / 12</span>
            </div>
            <Progress value={7} max={12} tone="delivery" label="Entregas concluídas" />
            <CapacityBar label="Demanda × capacidade" demand={118} capacity={132} />
          </CardContent>
          <CardFooter>
            <StatusBadge meta={status.healthStatus.BLOCKED} size="sm" /> 1 bloqueio
            <span className="ml-auto">
              <StaleIndicator lastCheckedDaysAgo={1} />
            </span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abas</CardTitle>
            <CardDescription>Alternam visões do mesmo conjunto (lista, Kanban, agenda — §6.2).</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="lista">
              <TabsList>
                <TabsTrigger value="lista">
                  <ListChecks /> Lista
                </TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="agenda">
                  <CalendarCheck /> Agenda
                </TabsTrigger>
              </TabsList>
              <TabsContent value="lista" className="flex flex-col gap-2">
                {(["IN_PROGRESS", "TODO", "BLOCKED"] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <StatusBadge meta={status.taskStatus[s]} variant="dot" size="sm" />
                    <span className="truncate">
                      {["Revisar ADR de mensageria", "Preparar pauta da retro", "Alinhar contrato com time de Auth"][i]}
                    </span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="kanban" className="text-sm text-muted-foreground">
                Colunas por situação: A fazer · Em andamento · Bloqueada · Concluída.
              </TabsContent>
              <TabsContent value="agenda" className="text-sm text-muted-foreground">
                Atividades distribuídas por prazo.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Entregas críticas</CardTitle>
          <CardDescription>Tabela densa: identificador em mono, status com ícone, datas tabulares.</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">
              Filtrar
            </Button>
          </CardAction>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Saúde</TableHead>
              <TableHead>Prazo × previsão</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Verificação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.key}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <a href="#" className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline">
                      {d.key} <ExternalLink className="size-3" aria-hidden />
                    </a>
                    <span className="max-w-64 truncate text-xs text-muted-foreground">{d.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-xs">
                    <Avatar name={d.dev} size="sm" /> {d.dev}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge meta={status.healthStatus[d.health]} size="sm" />
                </TableCell>
                <TableCell>
                  <DateDelta committed={d.committed} forecast={d.forecast} delayBusinessDays={d.delay} source={d.source} />
                </TableCell>
                <TableCell>
                  <ConfidenceMeter value={d.conf} showLabel={false} />
                </TableCell>
                <TableCell>
                  <StaleIndicator lastCheckedDaysAgo={d.checked} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Section>
  );
}

const deliveries = [
  { key: "PAY-142", title: "Integração com gateway de pagamentos", dev: "Ana Souza", health: "AT_RISK", committed: "2026-10-23", forecast: "2026-10-27", delay: 2, source: "CALCULATED", conf: "MEDIUM", checked: 1 },
  { key: "AUTH-88", title: "Rotação de tokens de sessão", dev: "Bruno Lima", health: "BLOCKED", committed: "2026-10-24", forecast: null, delay: null, source: "CALCULATED", conf: null, checked: 4 },
  { key: "PAY-155", title: "Webhook de estorno", dev: "Ana Souza", health: "ON_TRACK", committed: "2026-10-30", forecast: "2026-10-28", delay: -2, source: "CALCULATED", conf: "HIGH", checked: 0 },
  { key: "CHK-301", title: "Tela de revisão do pedido", dev: "Carla Mendes", health: "DELAYED", committed: "2026-10-14", forecast: "2026-10-20", delay: 4, source: "MANUAL", conf: "LOW", checked: 2 },
  { key: "CHK-310", title: "Cupom no carrinho", dev: "Diego Rocha", health: "UNKNOWN", committed: "2026-11-06", forecast: null, delay: null, source: "CALCULATED", conf: null, checked: null },
] as const;

function Feedback() {
  return (
    <Section
      id="feedback"
      title="Feedback e estados"
      description="Toda tela tem estados de carregamento, vazio e falha (§58). Estados vazios explicam o motivo e oferecem o próximo passo."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Alert tone="warning" title="3 previsões estão obsoletas" action={<Button size="sm" variant="outline">Recalcular</Button>}>
          A alocação de Ana mudou depois do último cálculo.
        </Alert>
        <Alert tone="danger" title="Falha no cálculo da previsão">
          Dependência cíclica detectada entre PAY-142 e PAY-155.
        </Alert>
        <Alert tone="success" title="Recomendação aplicada">
          Fila de execução de Ana reordenada. Histórico preservado.
        </Alert>
        <Alert tone="info" title="Cenário de simulação">
          Você está vendo “Ausência da Ana”. Nada aqui altera o planejamento-base.
        </Alert>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <EmptyState
          icon={Inbox}
          title="Nenhuma atividade para hoje"
          description="Aproveite para revisar a fila de foco ou registrar um acontecimento no diário."
          action={<Button size="sm" variant="outline"><Plus /> Nova atividade</Button>}
        />
        <EmptyState
          icon={UserX}
          title="Sem capacidade configurada"
          description="Cadastre a jornada de Diego para calcular previsões. Sem jornada, a previsão fica indeterminada."
          action={<Button size="sm">Configurar jornada</Button>}
        />
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" aria-busy>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <span className="sr-only">Carregando…</span>
        </div>
      </div>
    </Section>
  );
}

function StatusGroup({ title, spec, map }: { title: string; spec: string; map: Record<string, StatusMeta> }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold">{title}</span>
        <span className="font-mono text-2xs text-subtle-foreground">{spec}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(map).map(([k, m]) => (
          <StatusBadge key={k} meta={m} />
        ))}
      </div>
    </div>
  );
}

function DomainStatus() {
  return (
    <Section
      id="status"
      title="Status do domínio"
      description="Fonte única: lib/design-system/status.ts mapeia cada enum da especificação para rótulo, tom e ícone. Use <StatusBadge meta={healthStatus.AT_RISK} />."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <StatusGroup title="Saúde da entrega" spec="§14.4 · §25.8" map={status.healthStatus} />
        <StatusGroup title="Atividade pessoal" spec="§6.4" map={status.taskStatus} />
        <StatusGroup title="Prioridade pessoal" spec="§6.5" map={status.priority} />
        <StatusGroup title="Alerta de prazo" spec="§5.2.2 · §6.6" map={status.taskDueState} />
        <StatusGroup title="Tipo de atividade" spec="§6.3" map={status.taskType} />
        <StatusGroup title="Time" spec="§7.2" map={status.teamStatus} />
        <StatusGroup title="Desenvolvedor" spec="§10.2" map={status.developerStatus} />
        <StatusGroup title="Participação" spec="§9 · RN-025" map={status.membershipStatus} />
        <StatusGroup title="Refinamento" spec="§15.3" map={status.refinementStatus} />
        <StatusGroup title="Sprint" spec="§11.4" map={status.sprintStatus} />
        <StatusGroup title="Projeto" spec="§8.4" map={status.projectStatus} />
        <StatusGroup title="Recomendação" spec="§28.6" map={status.recommendationStatus} />
        <StatusGroup title="Impacto" spec="§28.7" map={status.impact} />
        <StatusGroup title="Jobs" spec="§41.4" map={status.jobStatus} />
        <StatusGroup title="Escopo da sprint" spec="§11.5" map={status.scopeType} />
      </div>
      <Specimen title="Variantes de badge" note="subtle (padrão) · outline · solid · dot">
        <StatusBadge meta={status.healthStatus.AT_RISK} />
        <StatusBadge meta={status.healthStatus.AT_RISK} variant="outline" />
        <StatusBadge meta={status.healthStatus.AT_RISK} variant="solid" />
        <StatusBadge meta={status.healthStatus.AT_RISK} variant="dot" />
        <Separator orientation="vertical" className="h-6" />
        <Badge size="sm">sm</Badge>
        <Badge>md</Badge>
        <Separator orientation="vertical" className="h-6" />
        <ContextChip code="CHK" name="Time Checkout" />
        <ContextChip code="PAY" name="Projeto Pagamentos" />
      </Specimen>
      <p className="text-xs text-muted-foreground">
        <b>solid</b> só para contagem de alertas e itens que exigem ação imediata. Em tabelas e listas prefira <b>subtle</b> ou <b>dot</b>.
      </p>
    </Section>
  );
}

function Predictability() {
  return (
    <Section
      id="previsibilidade"
      title="Previsibilidade"
      description="Componentes que tornam visível a qualidade da informação: frescor, confiança, origem da previsão e utilização da capacidade."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen title="Estado da previsão" note="§43.4">
          {Object.entries(status.forecastState).map(([k, m]) => (
            <StatusBadge key={k} meta={m} />
          ))}
        </Specimen>
        <Specimen title="Confiança" note="§21.4">
          <ConfidenceMeter value="HIGH" />
          <ConfidenceMeter value="MEDIUM" />
          <ConfidenceMeter value="LOW" />
          <ConfidenceMeter value={null} />
        </Specimen>
        <Specimen title="Compromisso × previsão" note="ícone = origem (calculada / manual)" className="gap-8">
          <DateDelta committed="2026-10-30" forecast="2026-10-28" delayBusinessDays={-2} />
          <DateDelta committed="2026-10-23" forecast="2026-10-27" delayBusinessDays={2} />
          <DateDelta committed="2026-10-20" forecast="2026-10-24" delayBusinessDays={4} source="MANUAL" />
          <DateDelta committed="2026-10-24" forecast={null} />
        </Specimen>
        <Specimen title="Acompanhamento" note="desatualizado após 3 dias">
          <StaleIndicator lastCheckedDaysAgo={0} />
          <StaleIndicator lastCheckedDaysAgo={2} />
          <StaleIndicator lastCheckedDaysAgo={6} />
          <StaleIndicator lastCheckedDaysAgo={null} />
        </Specimen>
      </div>
      <Specimen title="Utilização da capacidade" note="U = D / CA · faixas <85% · 85–100% · >100%" className="grid gap-5 sm:grid-cols-2">
        <CapacityBar label="Ana Souza · Pagamentos" demand={14} capacity={24} />
        <CapacityBar label="Bruno Lima · Autenticação" demand={21.5} capacity={24} />
        <CapacityBar label="Carla Mendes · Checkout" demand={31} capacity={24} />
        <CapacityBar label="Diego Rocha · em férias" demand={8} capacity={0} />
      </Specimen>
    </Section>
  );
}

const sampleTask = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Decidir estratégia de filas para o checkout",
  description: null,
  type: "DECISION",
  status: "IN_PROGRESS",
  priority: "CRITICAL",
  dueDate: "2026-10-14",
  nextAction: "Comparar custo de SQS × RabbitMQ com o time de plataforma",
  blockedReason: null,
  estimatedHours: 3,
  actualHours: null,
  completedAt: null,
  cancelledAt: null,
  teams: [{ id: "00000000-0000-4000-8000-000000000002", code: "PAY", name: "Pagamentos" }],
  projects: [{ id: "00000000-0000-4000-8000-000000000003", code: "CHK", name: "Checkout" }],
  focus: { position: 1, isPrimary: false },
  dueState: "OVERDUE",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
  version: 1,
} satisfies Task;

function DomainPatterns() {
  return (
    <Section
      id="padroes"
      title="Padrões de domínio"
      description="Composições recorrentes com regras de produto embutidas."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <FocusCard
            title="Revisar contrato técnico da integração de pagamentos"
            priority="CRITICAL"
            status="IN_PROGRESS"
            due="hoje, 17h"
            nextAction="Validar campos de idempotência com o time de Checkout"
            contexts={["PAY", "CHK"]}
          />
          <p className="text-xs text-muted-foreground">
            Foco principal: único (RN-002), faixa violeta do domínio pessoal, próxima ação sempre visível.
          </p>
          <Card className="p-4">
            <TaskItem task={sampleTask} showNextAction />
          </Card>
          <p className="text-xs text-muted-foreground">
            TaskItem: linha compacta de atividade (dashboard, Kanban, agenda). Alerta de prazo independente da
            fila de foco (§6.6) e contextos sem duplicar a atividade (§6.8).
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Diário de bordo</CardTitle>
            <CardDescription>Linha do tempo por categoria (§17.2)</CardDescription>
          </CardHeader>
          <CardContent>
            <ol>
              <JournalEntry category="TECH_DECISION" date="15 out" description="Adotar outbox transacional para eventos de recálculo." contexts={["PAY"]} />
              <JournalEntry category="BLOCK" date="14 out" description="AUTH-88 aguardando liberação de credenciais do provedor." contexts={["AUTH"]} />
              <JournalEntry category="ACHIEVEMENT" date="13 out" description="Primeiro pagamento ponta a ponta em homologação." contexts={["PAY", "CHK"]} last />
            </ol>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationCard
          title="Reordenar fila de Ana: PAY-155 antes de PAY-142"
          explanation="PAY-142 depende de liberação externa prevista para 22/out. Antecipar PAY-155 usa a capacidade ociosa até lá."
          status="GENERATED"
          impact="MEDIUM"
          positives={["PAY-155 conclui 3 d.u. antes", "Utilização de Ana sobe de 58% para 91%"]}
          negatives={["PAY-142 desliza 1 d.u. (ainda em risco)"]}
        />
        <RecommendationCard
          title="Retirar CHK-310 (opcional) da release 2.4"
          explanation="A release tem 2 itens obrigatórios em risco e capacidade insuficiente no time de Checkout."
          status="APPROVED"
          impact="HIGH"
          positives={["Release 2.4 volta a ficar no prazo"]}
          negatives={["Cupom no carrinho fica para a release 2.5", "Afeta compromisso com o time de Marketing"]}
        />
      </div>
    </Section>
  );
}

function AppShell() {
  return (
    <Section
      id="shell"
      title="Shell da aplicação"
      description="Peças compartilhadas pelas telas (components/app): cabeçalho de página, falhas de API e erros de formulário no contrato ApiError."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen title="PageHeader + Brand" note="eyebrow opcional com o contexto">
          <div className="flex w-full flex-col gap-4">
            <Brand />
            <PageHeader eyebrow="Hub da Ana" title="Configurações" description="Preferências e configurações globais do workspace." />
            <PageHeader
              title="Times"
              description="Com ações à direita (quebram abaixo no mobile)."
              actions={
                <Button>
                  <Plus /> Novo time
                </Button>
              }
            />
          </div>
        </Specimen>
        <Specimen title="PasswordInput" note="alternar visibilidade com aria-pressed">
          <Field label="Senha" htmlFor="ds-password" hint="Mínimo de 12 caracteres." className="w-full">
            <PasswordInput id="ds-password" autoComplete="off" />
          </Field>
        </Specimen>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Specimen title="FormError" note="bloqueio e conflito usam tom de aviso" className="flex-col items-stretch">
          <FormError error={{ statusCode: 401, code: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." }} />
          <FormError
            error={{
              statusCode: 429,
              code: "TOO_MANY_ATTEMPTS",
              message: "Muitas tentativas. Tente novamente em 15 min.",
            }}
          />
        </Specimen>
        <Specimen title="ApiUnavailable" note="estado de falha padrão (§58)" className="flex-col items-stretch">
          <ApiUnavailable />
        </Specimen>
      </div>
    </Section>
  );
}

function Composition() {
  return (
    <Section
      id="composicao"
      title="Composição: dashboard"
      description="Exemplo de como as peças se combinam na visão global (§5). Indicadores no topo, foco à esquerda, entregas críticas e capacidade em seguida."
    >
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Visão global</span>
          <Separator orientation="vertical" className="h-4" />
          <Select aria-label="Time" className="h-7 w-auto text-xs" defaultValue="all">
            <option value="all">Todos os times</option>
          </Select>
          <Select aria-label="Projeto" className="h-7 w-auto text-xs" defaultValue="all">
            <option value="all">Todos os projetos</option>
          </Select>
          <span className="ml-auto">
            <StatusBadge meta={status.forecastState.STALE} size="sm" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Atividades atrasadas" value={2} icon={TriangleAlert} tone="danger" hint="1 vence hoje" />
          <Kpi label="Entregas bloqueadas" value={1} icon={AlertOctagon} tone="blocked" hint="AUTH-88 há 2 dias" />
          <Kpi label="Utilização (times)" value={94} unit="%" icon={Layers} tone="capacity" hint="Checkout acima de 100%" />
          <Kpi label="Previsões indeterminadas" value={null} hint="Sem cálculo para Diego" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-3">
            <FocusCard
              title="Revisar contrato técnico da integração de pagamentos"
              priority="CRITICAL"
              status="IN_PROGRESS"
              due="hoje, 17h"
              nextAction="Validar idempotência com Checkout"
              contexts={["PAY"]}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DomainTag domain="capacity" />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <CapacityBar label="Checkout" demand={148} capacity={132} />
                <CapacityBar label="Pagamentos" demand={96} capacity={120} />
                <CapacityBar label="Autenticação" demand={40} capacity={48} />
              </CardContent>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DomainTag domain="delivery" /> Entregas críticas
              </CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border border-t border-border">
              {deliveries.slice(0, 4).map((d) => (
                <li key={d.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <Avatar name={d.dev} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-xs font-medium">{d.key}</span>
                    <span className="truncate text-xs text-muted-foreground">{d.title}</span>
                  </div>
                  <StatusBadge meta={status.healthStatus[d.health]} size="sm" />
                  <DateDelta committed={d.committed} forecast={d.forecast} delayBusinessDays={d.delay} source={d.source} className="w-36" />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Section>
  );
}
