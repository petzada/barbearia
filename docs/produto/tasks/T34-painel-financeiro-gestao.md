# T34 — Painel do admin, financeiro e aba Gestão no mobile

| Campo | Valor |
|---|---|
| Fase | 8 |
| Iniciar após | T22, T25, T29, T14 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0038, D0047, D0068, D0076 |
| PRD | §4.3 (D01, D08, G01), §5.15 (INT-12), §9.5 |
| Área de escrita | `src/modules/reporting/**`, rotas `src/routes/admin/index.tsx`, `src/routes/admin/financeiro/**` (exceto ocorrências de T22), `src/routes/equipe/gestao/**` |
| Não tocar | Dados de origem (só leituras) |
| Paralelizável com | T32, T33, T35 |

## Objetivo

O admin responde em uma tela as quatro perguntas do negócio (assinaturas, receita do mês, comissões a pagar, agenda e pendências) e entende o dinheiro sem confundir recebido, pendente, devolvido e comissões — nunca chamando de lucro.

## Ler antes

PRD §4.3, INT-12, §9.5; D0038, D0068.

## Escopo

1. **Leituras de relatório** (consultas parametrizadas por período, com índices; materialização opcional reconstruível):
   - **Assinaturas:** ativos, suspensos, cancelados (no fim do ciclo e encerrados) por plano; novas e cancelamentos no período; MRR (mensalidades efetivas das ativas com renovação habilitada), separado das canceladas no fim do ciclo; ocupação do teto por plano.
   - **Receita do mês:** assinaturas recebidas por provedor (bruto; taxa e líquido quando informados, senão rótulo INT-12); avulsos recebidos por forma de pagamento; pendências de clientes (devido − recebido); devoluções (solicitadas, concluídas).
   - **Comissões:** por barbeiro e período: devido, pago, saldo; status do período.
   - **Agenda e pendências:** ocupação de hoje e da semana por barbeiro (minutos reservados ÷ jornada líquida), atendimentos sem desfecho, faltas recentes, escolhas de cobertura abertas, ocorrências e pendências de integração.
2. **D01 Painel (desktop):** quatro blocos com seletor de período e drill-down para CRM (T33), financeiro, comissões (T29), agenda (T14).
3. **D08 Financeiro (desktop):** recebido, pendente, devolvido, comissões, cada um com lista de origem; filtros; exportação CSV (admin, auditada); link para ocorrências (T22). Nenhum rótulo "lucro" ou "resultado".
4. **G01 Gestão (mobile, admin):** os quatro blocos em cartões só de leitura, alertas que pedem ação (sem desfecho, suspensas, ocorrências), link "Abrir gestão completa"; nenhuma ação sensível.

## Fora do escopo

Métricas de produto internas (T36), ações (cada módulo).

## Contratos (publica)

`reporting.dashboard(periodo)`, `reporting.finance(periodo, filtros)`, `reporting.export`.

## Regras e checklist defensivo

- Totais batem com a soma das origens (teste de reconciliação interna).
- Período em fuso da loja; fronteiras de mês corretas.
- Exportação sem dados desnecessários (telefone mascarado).

## Testes obrigatórios

- Fixture de um mês completo: números do painel batem com cálculo independente no teste.
- MRR não inclui canceladas no fim do ciclo (mostradas à parte).
- Recebido não inclui devolvidos; devolvidos aparecem separados.
- Barbeiro sem acesso a D01/D08; G01 só para admin.
- Desempenho: painel com 12 meses de dados fictícios em < 1 s local.

## Critérios de aceite

D01, D08 e G01 completos, com totais reconciliados.

## Entrega

Relatório (PRD §11.5) com prints.
