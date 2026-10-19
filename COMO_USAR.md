# Como usar o Tech Lead Hub no dia a dia

Guia para rodar a aplicação na sua máquina e usá-la todo dia, sem precisar mexer no código.

> **Resumo em uma linha:** abra o Docker Desktop, rode `docker compose up -d` e acesse <http://localhost:3000>.

---

## 1. Como funciona

A aplicação inteira roda dentro do **Docker**. Um único comando sobe tudo:

| Peça                | O que faz                                                         |
| ------------------- | ----------------------------------------------------------------- |
| **web**             | A interface que você abre no navegador (porta 3000).              |
| **api**             | O backend. Não fica exposto, só a web conversa com ela.           |
| **planning-worker** | Calcula projeções e planos em segundo plano.                      |
| **postgres**        | O banco de dados, onde ficam **todos os seus dados**.             |
| **redis**           | Fila de tarefas do worker.                                        |
| **migrate**         | Atualiza a estrutura do banco quando necessário e depois encerra. |

Os dados ficam guardados em um **volume do Docker** (`postgres_data`). Desligar os containers **não apaga nada**.

A aplicação só é acessível pela sua própria máquina, e não pela rede.

> **`pnpm dev` não é para o dia a dia.** Ele serve para desenvolver o código. Para usar a aplicação, use sempre o Docker como descrito aqui.

---

## 2. O que você precisa ter instalado

- **Docker Desktop**, aberto e rodando.
- **Node.js 22 ou mais novo**, só para gerar o arquivo de configuração na primeira vez.

Não é preciso instalar o pnpm para usar a aplicação.

---

## 3. Primeira vez (só uma vez)

Abra o terminal na pasta do projeto:

```bash
cd ~/github/techlead-hub
```

**Passo 1: gerar a configuração.** Cria o arquivo `.env` com uma senha aleatória para o banco.

```bash
node infrastructure/scripts/init-env.mjs
```

**Passo 2: construir e subir tudo.** A primeira vez demora alguns minutos.

```bash
docker compose up -d --build
```

**Passo 3: abrir no navegador.** Acesse <http://localhost:3000>. Na primeira vez aparece a tela de **configuração inicial**, onde você cria seu usuário e senha.

Pronto, a aplicação está no ar.

> **Guarde o arquivo `.env`.** Ele tem a senha do banco. Não apague e não envie para o Git.

---

## 4. Uso diário

| Quero…                     | Comando                          |
| -------------------------- | -------------------------------- |
| **Ligar** a aplicação      | `docker compose up -d`           |
| **Desligar** (dados ficam) | `docker compose stop`            |
| Ver se está tudo rodando   | `docker compose ps`              |
| Ver os logs (erros, etc.)  | `docker compose logs -f api web` |

Rode os comandos sempre dentro da pasta do projeto.

> **Depois de reiniciar o Mac**, a aplicação não volta sozinha. Abra o Docker Desktop e rode `docker compose up -d`.

---

## 5. Atualizar para uma versão nova

Quando houver mudanças novas no código:

```bash
git pull
docker compose up -d --build
```

O `--build` reconstrói a aplicação, e o serviço `migrate` atualiza o banco automaticamente. Seus dados são mantidos.

---

## 6. Backup dos dados

Ainda **não existe backup automático** (pendência `PEND-9-03` em `docs/architecture/relatorios-operacao.md`). Faça um de vez em quando, por exemplo uma vez por semana, com a aplicação ligada:

```bash
docker compose exec -T postgres pg_dump -U tech_lead_hub tech_lead_hub > ~/backup-tlh-$(date +%F).sql
```

Isso cria um arquivo como `~/backup-tlh-2026-10-19.sql` na sua pasta pessoal. Guarde em um lugar seguro, como um iCloud ou Google Drive.

### Restaurar um backup

Só faça isso em um banco vazio, como em uma instalação nova ou depois de apagar os dados de propósito. O roteiro completo de recuperação ainda está pendente (`PEND-9-04`):

```bash
docker compose exec -T postgres psql -U tech_lead_hub tech_lead_hub < ~/backup-tlh-2026-10-19.sql
```

---

## 7. ⚠️ Cuidado: o que NÃO fazer

| Comando                                | Por quê                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `docker compose down -v`               | O `-v` **apaga o banco de dados**. Todos os dados se perdem. |
| Apagar o arquivo `.env`                | Sem ele, a aplicação não consegue acessar o banco existente. |
| "Clean / Purge data" no Docker Desktop | Também apaga os volumes, ou seja, os dados.                  |

Para desligar, use sempre `docker compose stop` (ou `docker compose down`, **sem** `-v`).

---

## 8. Problemas comuns

**A página não abre em localhost:3000**

1. Confira se o Docker Desktop está aberto.
2. Rode `docker compose ps`. Todos os serviços devem estar `running`, menos o `migrate`, que termina como `exited (0)`.
3. Se algum não estiver, veja o motivo com `docker compose logs api`.

**A página mostra "HTTP ERROR 431"**

A aplicação está funcionando. O problema está no navegador, que está mandando **cookies demais** para `localhost`.

Os cookies de `localhost` são compartilhados entre **todas as portas**. Então outros projetos que você já rodou em `localhost:3001`, `localhost:5173`, etc. deixam cookies que também são enviados para o Tech Lead Hub. Quando eles passam de cerca de 16 KB, o servidor recusa a requisição com o erro 431.

Resolva de um destes jeitos:

1. **Mais rápido:** acesse <http://127.0.0.1:3000>. Para o navegador, é outro endereço, e os cookies de `localhost` não vão junto.
2. **Definitivo:** apague os cookies de `localhost`. No Chrome, abra `chrome://settings/content/all`, busque por `localhost` e clique no ícone de lixeira. Depois faça login de novo.

Se usar a opção 1, use sempre o mesmo endereço. O login feito em um não vale no outro.

**Erro dizendo que a porta 3000 (ou 5432) já está em uso**

Outro programa está usando a porta, por exemplo um `pnpm dev` ou um Postgres instalado no Mac. Feche esse programa e rode `docker compose up -d` de novo.

**Erro "defina POSTGRES_PASSWORD no .env"**

O arquivo `.env` não existe. Volte ao [passo 1 da primeira vez](#3-primeira-vez-só-uma-vez).

**Esqueci minha senha / a conta foi bloqueada**

Depois de 5 tentativas erradas, o login fica bloqueado por 15 minutos. Espere e tente de novo.

---

## Cola rápida

```bash
docker compose up -d            # ligar
docker compose stop             # desligar
docker compose ps               # status
docker compose logs -f api web  # logs
git pull && docker compose up -d --build   # atualizar
```

Endereço: <http://localhost:3000>
