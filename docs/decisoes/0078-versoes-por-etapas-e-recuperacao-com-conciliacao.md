# 0078 — Versões liberadas por etapas; recuperação inclui conciliação com os provedores

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** revisão adversarial, Q36 e Q37
- **Substitui:** em [0019](0019-um-codigo-varios-deploys-barbearia-id.md), "um push atualiza todas as barbearias"
- **Detalha:** [0014](0014-hospedagem-railway.md), [0016](0016-fila-de-jobs-pg-boss.md)

## Contexto
Atualizar todas as barbearias ao mesmo tempo amplia o impacto de um erro de código ou de banco. E restaurar o banco não desfaz pagamentos, cancelamentos ou mensagens que aconteceram depois do backup: as automações podem repetir efeitos ou ignorar pagamentos válidos.

## Decisão

### Distribuição de versões
- O repositório continua **único**, sem código diferente por cliente.
- Versões são liberadas **por etapas**: **teste → primeira barbearia (Barbearia do Moura) → demais**.
- O app **registra a versão** de cada instalação.

### Recuperação
- Depois de restaurar um backup, **conciliar com os provedores** (Mercado Pago, Woovi) **antes de retomar as automações** afetadas (jobs, lembretes, renovações), reconstruir os estados e **impedir efeitos duplicados**.
- O **teste de recuperação** da [0014](0014-hospedagem-railway.md) cobre esse cenário, e não só mostra que o banco volta a funcionar.
