# H04 — Dados reais e marca da Barbearia do Moura

- **Pedido por:** T00 (para coletar com antecedência); o formulário é gerado por T08.
- **Bloqueia:** carga de configuração de produção (T40). Staging pode usar dados reais ou fictícios.
- **Quem responde:** dono da Barbearia do Moura (com o dono do produto).

## Por que é necessário

Preços e durações dos serviços, equipe, habilitações, percentuais, jornadas e marca não estão nas decisões. O código não pode ter esses valores fixos (D0012, D0019) e o agente não inventa números comerciais.

## O que o agente prepara antes de pedir

- `config/templates/barbearia.example.yaml` (T08): estrutura comentada, com exemplos fictícios marcados como tal.
- Validador: `pnpm config:validate config/barbearia-moura.yaml` aponta erros com linha e campo.
- Prévia: `pnpm config:preview` gera um resumo legível (planos, serviços, matriz, jornadas) para conferência.

## Checklist para o humano

**Marca**
- [ ] Nome de exibição, logo (SVG ou PNG em alta), cores principais, foto de capa (opcional).
- [ ] Textos das boas-vindas (2–3 telas) ou aprovação dos textos propostos.
- [ ] Endereço e horário de funcionamento para exibição (opcional).

**Serviços**
- [ ] Lista de serviços simples: nome, preço cheio, duração em minutos, descrição curta, foto (opcional).
- [ ] Combos: componentes, preço, duração própria.

**Equipe**
- [ ] Cada barbeiro: nome de exibição, telefone WhatsApp, foto, bio curta (opcional).
- [ ] Quem é admin (e se também atende).
- [ ] Matriz barbeiro × serviço: habilitado (sim/não), % avulso, % assinante (padrão = % avulso).
- [ ] Jornada semanal de cada barbeiro: dias, início, fim, intervalos.

**Planos (D0022 já decidido; confirmar)**
- [ ] BLACK R$ 129,90 (corte, todos os dias, 4 usos); GOLD LIMITADO R$ 179,90 (corte e barba, terça e quarta, 4 usos); PREMIUM R$ 199,90 (corte e barba, todos os dias, 4 usos).
- [ ] Qual serviço cadastrado corresponde a "corte" e a "barba" (e ao combo corte + barba).
- [ ] Teto de assinaturas por plano (opcional; deixar vazio = sem teto).

**Parâmetros (D0081 e outros; confirmar ou alterar)**
- [ ] Limite geral 4; antecedência 2 h; prazo sem perda 2 h; grade 30 min; vaga 30 min; auth recente 1 h; fuso America/Sao_Paulo.

## Como entregar

Preencher `config/barbearia-moura.yaml` (sem segredos) e colocar logo/fotos em `config/assets/`. Ou enviar planilha, e o agente transcreve e devolve a prévia para conferência.

## Critério de saída

`pnpm config:validate` sem erros; prévia aprovada pelo dono da barbearia ("prévia conferida"); registro em [registro.md](registro.md). A carga em produção acontece em T40.

## Se não houver resposta

Produção não recebe configuração; T40 fica `blocked_human (H04)`.
