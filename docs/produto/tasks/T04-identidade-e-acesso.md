# T04 — Identidade, login, papéis, sessão e autenticação recente

| Campo | Valor |
|---|---|
| Fase | 1 |
| Iniciar após | T02 |
| Concluir requer | T05 (telas A01, A02, D04-papéis) |
| Gate humano | — (Google e WhatsApp reais são homologados em T38/H02) |
| Decisões | D0002, D0017, D0034 (pré-cadastro), D0046 (aceite), D0070, D0071, D0073 (preferência preservada) |
| PRD | RN01, RN13 (aceites), §4.4, §7.3, §7.8 |
| Área de escrita | `src/modules/identity/**`, `src/platform/auth/**`, rotas `src/routes/(publico)/entrar/**`, `src/routes/app/perfil/numero/**`, `src/routes/admin/equipe/papeis/**` |
| Não tocar | `src/contracts` (propor), catálogo/matriz (T06) |
| Paralelizável com | T03, T05 |

## Objetivo

Login por código no WhatsApp e Google vinculado, conta com UUID permanente, papéis combináveis, sessão longa com autenticação recente para ações sensíveis, revogação imediata da equipe, aceite de termos e o modelo de pré-cadastro/ativação.

## Ler antes

PRD RN01, RN13, §4.4; D0017, D0070, D0071; documentação do Better Auth (plugin de telefone, Google, sessões) na versão fixada.

## Escopo

1. **Better Auth** configurado com Drizzle; plugin de número de telefone com `sendOTP` chamando `NotificationProvider` canal `otp` (fake em dev; real em T09); Google OAuth (variáveis em `.env.example`).
2. **Tabelas próprias:** `usuarios` (UUID, nome, estado `pre_cadastrado/ativo/exclusao_agendada/anonimizado`), `papeis_usuario` (papel, ativo, concedido_por, revogado_em), `vinculos_telefone` (E.164, verificado_em, ativo; unicidade parcial onde ativo), `documentos_legais` (tipo, versão, hash, vigente), `aceites_documentos`.
3. **OTP:** 6 dígitos, 5 min, 5 tentativas, hash, uso único, reenvio invalida o anterior sem zerar contadores; rate limit por telefone e por IP (padrões do PRD RN01, configuráveis). Mensagens de erro não revelam existência do número. Falha do provedor → erro `IDENTITY.OTP_DELIVERY_FAILED` com mensagem honesta ("não conseguimos enviar agora").
4. **Primeiro acesso:** telefone → OTP → nome → aceite de Termos e Política vigentes (registrar versão, hash, instante, canal `app`) → destino original.
5. **Google:** primeira vinculação exige OTP do WhatsApp; depois entra sem OTP. Nunca vincular por igualdade de e-mail.
6. **Sessão:** 90 dias, renovada no uso; cookie seguro; `auth_time` registrado; `requireRecentAuth` (1 h, configurável) com fluxo de reautenticação (novo OTP ou Google) que volta para a ação.
7. **`SessionResolver`** real implementando o contrato de T02.
8. **Papéis:** conceder/revogar `barbeiro`/`admin` (admin, desktop, auth recente). Revogar invalida **na hora** sessões com contexto de equipe e emite evento `TeamRoleRevoked` (T30 desativa push). Se a pessoa é cliente, mantém a conta de cliente. Impedir remover o último admin.
9. **Troca de WhatsApp (A02):** logado; OTP no número novo; colisão com conta ativa → rejeitar com orientação de suporte (`IDENTITY.PHONE_IN_USE`); histórico preservado; auditoria.
10. **Pré-cadastro:** API `identity.createPreRegistered({ nome, telefone, registradoPor })` (usada por T19) que reutiliza a conta se o telefone já existir (ativa ou pré-cadastrada) e devolve `{ usuarioId, jaExistia }`; **ativação** = primeiro login por OTP no mesmo telefone → estado `ativo` + aceite de termos; preferências (inclusive lembretes desligados) preservadas.
11. **Telas:** A01 (entrar, com todos os estados de erro), A02 (trocar número), D04-papéis (lista de membros, conceder/revogar).

## Fora do escopo

Recuperação assistida (T33); matriz de serviços (T06); push (T30); exclusão (T35).

## Contratos (publica)

`SessionResolver`, `identity.getUser`, `identity.createPreRegistered`, `identity.findByPhone` (restrito à equipe; retorna dados mínimos), `requireRecentAuth`, eventos `UserActivated`, `TeamRoleGranted`, `TeamRoleRevoked`, `PhoneChanged`.

## Regras e checklist defensivo

- Telefone sempre normalizado para E.164 (validação brasileira) antes de comparar.
- Pré-cadastro com telefone de conta **ativa** não cria nova conta: devolve a existente (a equipe vê só dados mínimos).
- Sem enumeração de usuários por mensagem ou tempo de resposta perceptível.
- Logs nunca contêm OTP; telefone mascarado.

## Testes obrigatórios

- OTP: expiração no limite exato; 5ª tentativa errada bloqueia; reenvio invalida o anterior; rate limit por telefone e IP; provedor fora → erro honesto.
- Google: primeira vez exige OTP; segunda não; e-mail igual não vincula.
- Auth recente: 59 min passa, 61 min exige reautenticação.
- Revogação: sessão de equipe recusada na próxima requisição; conta de cliente segue funcionando.
- Último admin não pode ser removido.
- Troca de número com colisão rejeitada; sem colisão preserva assinatura/histórico (fixture).
- Pré-cadastro → ativação preserva histórico e preferência de lembrete.
- E2E: login completo mobile, com aceite de termos e retorno ao deep link.

## Critérios de aceite

Todos os testes verdes com `NotificationProvider` fake; A01/A02/D04-papéis funcionais nos dois viewports.

## Entrega

Relatório (PRD §11.5).
