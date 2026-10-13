# H06 — Aceite operacional e lançamento

- **Pedido por:** T39 (parte 1: retomar automações depois do ensaio de restore; parte 2: aceite dos fluxos) e T40 (parte 3: autorizar o lançamento e a transação real controlada).
- **Bloqueia:** retomada de jobs após restore no ensaio; abertura do piloto.
- **Quem responde:** dono do produto e dono da barbearia (com a equipe para o PWA).

## Por que é necessário

D0078: depois de restaurar um backup, as automações só voltam após conciliação com os provedores. O lançamento afeta clientes reais e dinheiro real; precisa de aceite humano explícito.

## O que o agente prepara antes de pedir

- **Parte 1:** relatório do ensaio de recuperação (ponto restaurado, eventos conciliados, divergências, efeitos bloqueados, plano de retomada).
- **Parte 2:** roteiro de aceite (UAT) por perfil, com contas de teste em staging: cliente (agendar, cancelar, assinar, regularizar, trocar, cancelar assinatura, excluir conta), barbeiro (agenda, bloqueio, encaixe, pré-cadastro, desfecho, recebimento, inclusão, ganhos, push), admin (CRM, correção, fechamento, repasse, financeiro, configurações, recuperação assistida).
- **Parte 3:** checklist de go-live, plano de rollback, manual curto de suporte, lista de pendências conhecidas com impacto.

## Checklist para o humano

**Parte 1 — retomada pós-restore (T39)**
- [ ] Li o relatório de conciliação e autorizo retomar as automações no ambiente do ensaio.

**Parte 2 — aceite (T39)**
- [ ] Executei (ou acompanhei) o roteiro de cada perfil e registrei os problemas.
- [ ] Cada barbeiro instalou o PWA no próprio celular e recebeu um push de teste.
- [ ] Os textos das telas e mensagens estão corretos.

**Parte 3 — lançamento (T40)**
- [ ] Autorizo uma transação real controlada (assinatura de um cliente interno, cancelamento e devolução, se aplicável).
- [ ] Autorizo abrir o piloto, com data e canal de divulgação definidos pela barbearia.
- [ ] Definidos os responsáveis por alertas e suporte.

## Como entregar

Responder com "H06 parte N aprovada" e a lista de problemas encontrados (o orquestrador transforma em tarefas P0–P3).

## Critério de saída

Respostas registradas em [registro.md](registro.md); problemas P0/P1 resolvidos antes do lançamento; P2/P3 listados com responsável.

## Se não houver resposta

Jobs do ambiente restaurado permanecem pausados; produção não abre para clientes.
