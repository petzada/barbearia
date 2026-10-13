# T32 — Área do cliente: Início, Plano, Perfil e Minhas reservas

| Campo | Valor |
|---|---|
| Fase | 8 |
| Iniciar após | T18, T20, T21, T23, T24, T31 |
| Concluir requer | — |
| Gate humano | — |
| Decisões | D0025 (regras explícitas), D0046, D0047, D0048, D0060 (sem tela só de limites), D0072, D0073, D0076 |
| PRD | §4.1, §4.3 (C01, C05, C06, C07), RN04, RN12, RN13 |
| Área de escrita | rotas `src/routes/app/{inicio,plano,perfil,reservas}/**` (composição), `src/modules/client-home/**` (leituras agregadas) |
| Não tocar | Comandos dos módulos (só chama as APIs) |
| Paralelizável com | T33, T34, T35 |

## Objetivo

Juntar numa experiência coerente o que os módulos já entregam: o cliente abre o app e entende em segundos seus próximos horários, o estado do plano, o que precisa fazer e como mudar qualquer coisa.

## Ler antes

PRD §4; READMEs dos módulos de T15–T24, T30, T31, T35.

## Escopo

1. **Leitura agregada** (`clientHome.summary`): próximas reservas (com cobertura e prazo), assinatura (estado, plano, versão, ciclo atual, fim, saldo, previsão da próxima renovação, créditos com validade), pendências abertas (escolhas de cobertura, transferências, reautorização Pix, migração, regularização, reajuste), contador da central. Uma consulta eficiente (sem N+1).
2. **C01 Início:** cartões em ordem de urgência — pendências que exigem ação; próxima reserva (com "cancelar até HH:MM" se vigente); estado do plano (ex.: "3 de 4 usos disponíveis até 12/11"); atalho Agendar; botão de notificações.
3. **C05 Plano:**
   - sem assinatura: vitrine e CTA (T20);
   - com assinatura: ciclo e saldo; reservas que usam o plano; créditos; histórico de pagamentos (aprovado, recusado, devolvido, com datas); regras da versão contratada em linguagem simples (gerada dos dados); ações: regularizar (T21), trocar plano (T24), aceitar migração (T24), reautorizar Pix (T24), cancelar assinatura (T23), ver protocolos;
   - estados honestos: "cancelamento solicitado — protocolo X, aguardando confirmação", "troca programada para DD/MM", "troca aguardando sua autorização no banco".
   - D0060: limites e créditos aparecem integrados aqui, sem tela separada só para limites.
4. **C06 Perfil:** nome, WhatsApp (trocar — T04), Google (vincular — T04), lembretes on/off (T31), termos aceitos (versão e data), Como funciona (boas-vindas de T05), sair da sessão, excluir conta (T35) com data prevista.
5. **C07 Minhas reservas:** futuras e passadas com estado, desfecho, cobertura e valores; detalhe leva a C03 (T18).
6. Estados de carregamento, vazio e erro em todas as telas; acessibilidade.

## Fora do escopo

Regras e comandos (já existem nos módulos).

## Contratos (publica)

`clientHome.summary`, componentes de cartão reutilizáveis.

## Regras e checklist defensivo

- Nenhuma regra recalculada na UI: textos e números vêm prontos do servidor.
- Cliente só vê os próprios dados (testar com ID alheio).

## Testes obrigatórios

- E2E jornadas do cliente (mobile): novo usuário → login → explorar → assinar (fake) → agendar → ver no Início → cancelar no prazo → remarcar; pendência de escolha aparece e some ao resolver; perfil desliga lembretes.
- Leitura agregada com dados de todos os estados de assinatura (fixtures).
- Acesso a recurso de outro cliente → 403/404.

## Critérios de aceite

Navegação Início · Agendar · Plano · Perfil completa, sem stub, nos dois viewports.

## Entrega

Relatório (PRD §11.5) com prints de cada estado.
