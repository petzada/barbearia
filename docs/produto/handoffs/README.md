# Handoffs humanos

Um handoff é um ponto do plano em que o agente **para** e pede ao humano algo que só ele pode fazer ou decidir: criar contas, colar credenciais em painéis, aprovar textos, decidir uma regra comercial, autorizar um lançamento. O PRD trata dos gates em [§10](../PRD-MVP.md#10-gates-humanos).

| Gate | Título | Pedido em | Obrigatório em | Quem responde |
|---|---|---|---|---|
| [H00](H00-ambiente-local.md) | Ambiente local de desenvolvimento | T01 | T01 | Dono do produto |
| [H01](H01-decisoes-residuais.md) | Decisões residuais de produto | T00 | ramos de T15, T16, T19, T20, T21, T23, T24, T26, T28, T29 | Dono do produto |
| [H02](H02-contas-de-teste-e-staging.md) | Contas de teste, sandbox e staging | T00 (pedir cedo) | T38 | Dono do produto |
| [H03](H03-identidade-e-privacidade.md) | Identidade, recuperação e privacidade | T00 | T33, T35, T40 | Dono do produto + responsável jurídico, se houver |
| [H04](H04-dados-reais-e-marca.md) | Dados reais e marca da Barbearia do Moura | T00 | T40 | Dono da barbearia |
| [H05](H05-producao-e-contas-reais.md) | Produção e contas reais | T40 | T40 | Dono do produto + dono da barbearia |
| [H06](H06-aceite-e-lancamento.md) | Aceite operacional e lançamento | T39 | T39, T40 | Dono do produto + dono da barbearia |
| [H07](H07-pos-mvp.md) | Pós-MVP: números, contas e replicação | depois do MVP | — | Dono do produto |

## Regras para o agente

1. **Preparar antes de pedir.** O pedido sempre vai com o artefato pronto (formulário, roteiro, rascunho de texto, lista de opções com recomendação e impacto) e com o critério de saída.
2. **Parar o ramo dependente.** Marcar a task como `blocked_human (Hxx)` em [STATUS.md](../tasks/STATUS.md), escrever o pedido em [registro.md](registro.md) e apresentar ao humano. Continuar outras tasks independentes.
3. **Nunca pedir segredo no chat.** Credenciais vão direto para o painel do Railway (variáveis), para o `.env.local` da máquina do humano (não versionado) ou para o painel do provedor. O agente só confirma que a variável existe e funciona.
4. **Silêncio não é aprovação.** Sem resposta, o ramo continua bloqueado. Não inventar valor padrão para decisão comercial.
5. **Registrar a resposta.** Em [registro.md](registro.md): data, quem respondeu, o que foi decidido/configurado (sem segredo), evidência do critério de saída, tasks desbloqueadas. Se for decisão de produto, criar `docs/decisoes/NNNN-*.md` e atualizar o índice, o PRD e as tasks afetadas.

## Mensagem padrão de parada

```
🛑 PARADA — handoff humano necessário (Hxx — título)

Task: Txx — título
Por que parei: ...
O que já está pronto: ...
O que preciso de você (checklist): ...
Como entregar (sem colar segredos aqui): ...
Como vou confirmar: ...
Enquanto isso, continuo em: Tyy, Tzz (independentes)
```
