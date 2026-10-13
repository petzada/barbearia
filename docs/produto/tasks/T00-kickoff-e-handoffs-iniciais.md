# T00 — Kickoff do orquestrador e handoffs iniciais

| Campo | Valor |
|---|---|
| Fase | 0 |
| Iniciar após | — |
| Concluir requer | — |
| Gate humano | Abre H01, H02, H03, H04 (não bloqueiam T01–T02) |
| Decisões | D0005 |
| PRD | §1, §10, §11 |
| Área de escrita | `docs/produto/tasks/STATUS.md`, `docs/produto/handoffs/registro.md` |
| Não tocar | Código, decisões existentes |
| Paralelizável com | — (primeira task) |

## Objetivo

Preparar a execução: inventariar o estado real do repositório, inicializar o quadro de estado e **pedir cedo** os handoffs que levam tempo (decisões residuais, contas de teste, textos de privacidade, dados reais), sem bloquear o início da fundação.

## Ler antes

- PRD completo (este é o único momento em que o orquestrador lê tudo de uma vez).
- [handoffs/README.md](../handoffs/README.md) e H01–H04.
- `git status`, `git log`, árvore do repositório.

## Escopo

1. Verificar se existe código no repositório e se algo diverge do plano (ex.: arquivos de app já criados). Registrar no STATUS.
2. Conferir que todas as tasks e handoffs citados no PRD existem (links válidos).
3. Marcar T00 `running`, depois `done`; marcar T01 `ready`.
4. Apresentar ao humano, numa única mensagem, os pedidos:
   - **H01** (responder Q1–Q6 e confirmar INT-01–13);
   - **H02** (começar a criar contas de teste; não é urgente para os próximos dias, mas é o caminho crítico da homologação);
   - **H03** (aviso: os rascunhos virão de T33/T35; já pode pensar em retenção e em quem fará a revisão);
   - **H04** (começar a juntar marca, serviços, preços, durações, equipe e jornadas).
5. Registrar cada pedido em `handoffs/registro.md` e no bloco "Handoffs" do STATUS (`pedido`).

## Fora do escopo

Escrever código; responder pelas perguntas do H01; criar contas.

## Regras e checklist defensivo

- Não marcar nenhum handoff como respondido sem resposta explícita.
- Se o repositório já tiver código conflitante com o plano, **parar** e perguntar ao humano se deve ser preservado, movido ou descartado (nunca apagar).

## Critérios de aceite

- STATUS inicializado; T01 `ready`.
- Pedidos H01–H04 apresentados e registrados.
- Lista de inconsistências (se houver) entregue.

## 🛑 Handoff humano

Esta task **não para** esperando respostas: ela só **faz os pedidos**. A parada efetiva acontece nas tasks que dependem de cada resposta. Use a mensagem padrão de [handoffs/README.md](../handoffs/README.md), agrupando H01–H04, e diga explicitamente: "Pode responder no seu ritmo; vou começar a fundação (T01–T05) enquanto isso. H01 é o mais urgente."

## Entrega

Relatório (PRD §11.5) com o inventário e os pedidos feitos.
