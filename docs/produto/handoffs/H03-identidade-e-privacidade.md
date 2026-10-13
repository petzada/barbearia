# H03 — Identidade, recuperação assistida e privacidade

- **Pedido por:** T00 (para dar tempo de revisão); os rascunhos são produzidos por T33 e T35.
- **Bloqueia:** ativação da recuperação assistida (T33), conclusão real de exclusões (T35) e go-live (T40).
- **Quem responde:** dono do produto; se possível, revisão de advogado (D0046 recomenda, sem obrigar). A validação com contador da conta Woovi foi **dispensada** (D0030) e não é reaberta aqui.

## Por que é necessário

D0070 manda detalhar no PRD o procedimento de conferência assistida e a proteção contra número reutilizado. D0072 e D0046 exigem anonimização e retenção de registros financeiros "pelo prazo legal", sem validação jurídica feita. O agente não inventa prazo legal nem texto jurídico definitivo.

## O que o agente prepara antes de pedir

1. **Procedimento de conferência assistida** (`docs/operacao/recuperacao-assistida.md`, rascunho de T33): passos, evidências aceitas, o que nunca revelar, registro, revogação de sessões, casos de número reciclado e de pré-cadastro com número de terceiro.
2. **Inventário de dados pessoais** (`docs/operacao/inventario-pii.md`, T35): onde cada dado vive (tabelas, auth, R2, logs, inbox/outbox, provedores), finalidade, base, retenção proposta como lacuna.
3. **Rascunhos de Termos de Uso e Política de Privacidade** (`config/textos/termos.md`, `config/textos/privacidade.md`), marcados como **rascunho não jurídico**, citando WhatsApp, Mercado Pago, Woovi, R2, Railway, cancelamento, exclusão diferida e SAIR.
4. **Matriz de retenção** com campos vazios para o humano preencher.

## Checklist para o humano

- [ ] Aprovar (ou ajustar) o procedimento de conferência assistida.
- [ ] Definir quem na barbearia pode executar a recuperação (admins).
- [ ] Preencher a matriz de retenção: registros financeiros, comissões, auditoria, logs, backups (prazos).
- [ ] Aprovar os textos de Termos e Política (com ou sem advogado) e informar a versão.
- [ ] Confirmar o nome/razão social e o contato de privacidade exibidos nos textos.

## Como entregar

Editar os arquivos de rascunho ou responder com as alterações. Nada de segredo.

## Critério de saída

Textos versionados em `config/textos/` com hash registrado; procedimento aprovado; matriz de retenção completa; T33 libera a flag `recuperacao_assistida_ativa`; T35 libera a flag `exclusao_real_ativa`; registro em [registro.md](registro.md).

## Se não houver resposta

Recuperação assistida e conclusão de exclusão ficam desligadas por flag (os pedidos são aceitos e ficam aguardando). Go-live com clientes reais não acontece.
