# T35 — Privacidade: exclusão de conta diferida e anonimização

| Campo | Valor |
|---|---|
| Fase | 8 |
| Iniciar após | T23, T22, T15, T08 |
| Concluir requer | — |
| Gate humano | **H03** (textos, retenção, ativar conclusão real) |
| Decisões | D0007, D0046, D0059, D0072, D0078 (restore) |
| PRD | RN13, §4.3 (C06-excluir, D13), §7.7 |
| Área de escrita | `src/modules/privacy/**`, rotas `src/routes/app/perfil/excluir/**`, `src/routes/admin/privacidade/**`, `docs/operacao/inventario-pii.md`, `config/textos/{termos,privacidade}.md` (rascunhos) |
| Não tocar | Módulos donos dos dados (cada um expõe um `anonymize(usuarioId)` pedido por esta task via orquestrador, se ainda não existir) |
| Paralelizável com | T32, T33, T34 |

## Objetivo

Excluir conta sem tirar do cliente o que ele já pagou: a renovação para na hora, o acesso continua até o fim do período pago e dos créditos, e na conclusão todos os dados pessoais somem de todos os lugares, mantendo os registros financeiros sem identificação.

## Ler antes

PRD RN13, §7.7; D0072, D0046; [H03](../handoffs/H03-identidade-e-privacidade.md).

## Escopo

1. **Pedido** (`privacy.requestDeletion`, cliente dono, auth recente): cria `pedidos_exclusao` (solicitado_em, previsto_para, bloqueios); chama `cancellation.request` (T23, solicitante `exclusao_conta`); estado do usuário `exclusao_agendada`; mostra data prevista = máximo entre fim do ciclo pago, validade dos créditos de reposição e resolução de devoluções/pendências com identificação; atualiza a data se surgir crédito (ex.: casa cancelou uma reserva). Sem opção de encerramento imediato.
2. **Job de conclusão:** quando não houver bloqueios → anonimizar:
   - inventário em `docs/operacao/inventario-pii.md` (todas as tabelas, Better Auth, sessões, vínculos de telefone, Google, arquivos R2 via `files.removeByOwner`, `entregas`, payloads de inbox/outbox com PII, logs dentro da retenção, casos de suporte);
   - cada módulo expõe `anonymize(usuarioId)` idempotente; esta task orquestra e verifica;
   - registros financeiros e de comissão permanecem com id pseudônimo, sem nome/telefone;
   - revogar sessões; liberar o telefone para novo cadastro;
   - `registro_exclusoes` (id pseudônimo, concluído_em, módulos executados) — **sobrevive a restore** e é reaplicado (T39).
3. **Flag** `exclusao_real_ativa`: desligada até H03; pedidos são aceitos e ficam aguardando, com a data prevista exibida.
4. **Telas:** C06 "Excluir minha conta" (consequências, data prevista, confirmação com reautenticação, acompanhamento); D13 (lista de exclusões, bloqueios, previsão, conclusão, falhas).
5. **Rascunhos dos textos legais** (Termos e Política) marcados como "rascunho não jurídico", citando WhatsApp (WhatsMiau), Mercado Pago, Woovi (e o nome que aparece no Pix), R2, Railway, cancelamento, exclusão diferida, SAIR; e matriz de retenção com lacunas para o H03.

## Fora do escopo

Validação jurídica (H03); retenção inventada.

## Contratos (publica)

`privacy.requestDeletion/status`, contrato `Anonymizable` por módulo, `registro_exclusoes`, `privacy.reapplyAfterRestore()`.

## Regras e checklist defensivo

- Conclusão idempotente e retomável (falha no meio não deixa dados meio-apagados sem registro).
- Nada de PII em logs de execução da anonimização.
- Exclusão nunca apaga lançamentos financeiros ou de comissão.

## Testes obrigatórios

- Pedido com ciclo pago até 12/11 → previsto 12/11; crédito válido até 20/11 → previsto 20/11; devolução pendente → aguarda.
- Renovação interrompida com protocolo.
- Conclusão: nenhuma linha com o nome/telefone (varredura por teste em todas as tabelas), arquivos R2 removidos, sessões revogadas, financeiro preservado sem identificação.
- Reaplicação após restore remove dados que voltaram.
- Flag desligada: pedido aceito, conclusão não executa.

## 🛑 Handoff humano (H03)

Com o inventário, os rascunhos de textos e a matriz de retenção prontos: **PARAR** antes de ligar `exclusao_real_ativa` e antes de publicar os textos como vigentes; marcar essas partes `blocked_human (H03)`; enviar a mensagem padrão pedindo aprovação dos textos, prazos de retenção e confirmação do inventário. Todo o resto é entregue.

## Critérios de aceite

Fluxo completo com flag ligada em teste; inventário e rascunhos prontos para o H03.

## Entrega

Relatório (PRD §11.5).
