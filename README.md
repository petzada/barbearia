# Barbearia do Moura

![Status](https://img.shields.io/badge/status-em%20desenvolvimento%20ativo-brightgreen) ![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green) ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

Aplicativo web de **agendamento, gestão e assinaturas** da Barbearia do Moura (Mauá/SP): o cliente agenda pelo celular, a equipe gerencia a agenda e o clube de assinatura cobra sozinho, sem planilha nem caderno.

## Índice

- [Status do projeto](#status-do-projeto)
- [Demonstração](#demonstração)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos e instalação](#pré-requisitos-e-instalação)
- [Como utilizar](#como-utilizar)
- [Publicação](#publicação)
- [Testes](#testes)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Autor e contato](#autor-e-contato)

## Status do projeto

🟢 **Em desenvolvimento ativo**: o app está em produção no Cloudflare Workers (a `main` é o que está no ar) e recebe melhorias contínuas.

## Demonstração

O app unifica as antigas marcas `barbeariadomoura` e `mourabarber` em um só lugar, com três perfis de uso:

**Cliente**
- Login sem senha: **código pelo WhatsApp** ou conta **Google**.
- Escolhe serviço, barbeiro, dia e horário e confirma o agendamento.
- Vê, remarca e cancela os próprios horários; recebe **lembretes no WhatsApp**.
- Assina o **Clube Moura** com cartão (checkout transparente) ou Pix e acompanha a assinatura.

**Barbeiro**
- Agenda do dia em linha do tempo e visão de várias agendas lado a lado.
- Atualiza o status dos atendimentos e mantém o próprio perfil com foto.

**Administração**
- Cadastro de serviços, barbeiros, horários de funcionamento e imagens.
- Gestão do clube: encerrar assinatura, cobrar na hora e estornar o último pagamento.
- Indicadores com gráficos e configuração do horário dos lembretes.

**Cobrança automática do clube** (Cron Trigger de hora em hora)
- **Cartão:** cobrado no fim do ciclo; se recusar, tenta de novo a cada 24 h (3 vezes), avisa no WhatsApp e mantém 3 dias de carência.
- **Pix:** a renovação é gerada e enviada no WhatsApp 3 dias antes do vencimento.
- Toda tentativa grava antes uma linha em `payments` com chave de idempotência: nada é cobrado em dobro.

As decisões de produto de cada tela estão em [`docs/DECISOES.md`](docs/DECISOES.md).

## Tecnologias utilizadas

| Camada | Tecnologias |
|---|---|
| Front-end e servidor | **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript** |
| Interface | **Tailwind CSS 4**, **shadcn/ui** (Base UI), Recharts |
| Infraestrutura | **Cloudflare Workers** via **OpenNext**, **D1** (SQLite), **R2** (fotos), Cron Trigger |
| Dados | **Drizzle ORM** e migrations versionadas |
| Autenticação | **Better Auth** (código no WhatsApp via WhatsMiau e Google) |
| Pagamentos | **AbacatePay** (Pix e cartão em checkout transparente) |
| Qualidade | **Vitest** (unidade, integração com D1 via Miniflare, componentes em jsdom), **Playwright**, ESLint, lefthook |

## Pré-requisitos e instalação

**Pré-requisitos**

- [Node.js](https://nodejs.org) **22** ou superior (versão de referência em `.nvmrc`) e npm
- Git
- Conta na Cloudflare apenas para publicar (o desenvolvimento usa um D1 local descartável)

**Instalação**

```bash
git clone https://github.com/petzada/barbearia.git
cd barbearia
npm install                          # também instala os hooks do lefthook
cp .dev.vars.example .dev.vars       # preencha o que for usar
npm run db:migrate:local             # cria o D1 local com dados iniciais
```

Para desenvolver sem WhatsApp, defina no `.dev.vars`:

```env
AUTH_DEV_OTP=123456
ADMIN_PHONE_NUMBERS=5511999999999
```

Com isso o código de login aparece no log do servidor, `123456` também é aceito (só fora de produção) e os telefones listados viram admin e barbeiro no primeiro login.

`npm run setup` faz perguntas e grava as variáveis de pagamento e webhooks para você.

## Como utilizar

```bash
npm run dev          # http://localhost:3000
```

1. Abra `http://localhost:3000` e entre com o telefone de `ADMIN_PHONE_NUMBERS`.
2. Digite o código `123456`.
3. Cadastre serviços e barbeiros no painel admin e faça um agendamento como cliente.

**Comandos úteis**

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção do Next.js |
| `npm run preview` | Build OpenNext e prévia no runtime do Workers |
| `npm run db:generate` | Gera migration após alterar `src/server/db/schema.ts` |
| `npm run check` | Lint + typecheck + testes + build |

## Publicação

O deploy é feito pelo responsável pelo projeto, nunca por automação de agentes:

```bash
npm run db:migrate:remote                # aplica as migrations no D1 de produção
wrangler secret put BETTER_AUTH_SECRET   # e os demais segredos do .dev.vars.example
npm run deploy                           # build OpenNext + deploy do Worker
```

O webhook do AbacatePay deve apontar para `<APP_BASE_URL>/api/webhooks/abacatepay?webhookSecret=<segredo>` com os eventos `transparent.completed`, `transparent.refunded`, `transparent.disputed` e `transparent.lost`.

## Testes

| Comando | O que roda |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest: unidade, integração com D1 real (Miniflare) e componentes (jsdom) |
| `npm run test:related` | Só os testes ligados aos arquivos alterados |
| `npm run test:e2e` | Playwright contra `next dev` com um D1 descartável em `.wrangler/e2e` |

O E2E precisa da porta 3000 livre e do `.dev.vars` com `AUTH_DEV_OTP=123456` e `ADMIN_PHONE_NUMBERS=5511999999999`. No dia a dia o **lefthook** roda o ESLint no commit e o typecheck + testes do diff no push; a suíte completa e o build rodam no **GitHub Actions** em todo PR.

## Contribuição

Contribuições são bem-vindas! Para propor uma melhoria:

1. Abra uma **issue** descrevendo o problema ou a ideia antes de começar algo grande.
2. Faça um **fork** e crie um branch a partir da `main`: `<tipo>/<nome-kebab>` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
3. Use **commits semânticos** em português: `<tipo>(<escopo>): <descrição no imperativo>`.
4. Rode lint e testes antes de enviar (veja [Testes](#testes)).
5. Abra o **Pull Request** em *draft*, explicando o quê e o porquê. O merge é feito pelo autor.

Não inclua segredos (`.env`, chaves de API, tokens) em commits ou PRs.

Detalhes do fluxo (branches, PR em draft, o que roda onde) estão em [`AGENTS.md`](AGENTS.md).

## Licença

Distribuído sob a licença **MIT**, de código aberto. Isso significa que você **pode** usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e até vender cópias do código, inclusive em projetos comerciais, **desde que** mantenha o aviso de copyright e o texto da licença. O software é fornecido "no estado em que se encontra", **sem garantias**, e o autor não se responsabiliza por danos decorrentes do uso.

Texto completo em [`LICENSE`](LICENSE).

## Autor e contato

**Marcio Petigrosso** ("petzada"): idealização e desenvolvimento.

- GitHub: [@petzada](https://github.com/petzada)
- LinkedIn: [in/petigrosso](https://www.linkedin.com/in/petigrosso)
