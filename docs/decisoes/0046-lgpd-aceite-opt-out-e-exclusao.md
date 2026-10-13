# 0046 — LGPD: aceite registrado, opt-out de lembretes e exclusão de conta

- **Data:** 2026-10-13
- **Status:** aceita (exclusão de conta substituída pela [0072](0072-exclusao-de-conta-no-fim-do-periodo.md); SAIR em [0073](0073-sair-desliga-so-lembretes.md))

## Decisão
- **No cadastro:** aceite de **Termos de Uso** e **Política de Privacidade**, registrado com data, hora e versão do documento.
- **Mensagens transacionais** (código de login, confirmação de horário, avisos de assinatura e pagamento, cancelamento pela barbearia) **não podem ser desligadas**: sem elas o serviço não funciona.
- **Lembretes de horário** ficam ligados por padrão, com opção de **desligar no Perfil** ou respondendo **SAIR** ([0073](0073-sair-desliga-so-lembretes.md)).
- **"Excluir minha conta"** no Perfil: interrompe a renovação na hora e ~~anonimiza na hora~~ → **conclui a exclusão no fim do ciclo pago ou do crédito de reposição** ([0072](0072-exclusao-de-conta-no-fim-do-periodo.md)), anonimizando os dados pessoais e **mantendo os registros financeiros e de comissão** pelo prazo legal, sem identificação do cliente.

## Consequências
- Termos e Política precisam ser redigidos antes do go-live, de preferência revisados por advogado, citando o uso do WhatsApp e dos gateways de pagamento.
- Os textos ficam na configuração por barbearia ([0019](0019-um-codigo-varios-deploys-barbearia-id.md)).

## Revisão adversarial (2026-10-13)
- Aceite e opt-out mantidos. Exclusão concluída no fim do ciclo pago ou do crédito ([0072](0072-exclusao-de-conta-no-fim-do-periodo.md)); SAIR desliga só lembretes ([0073](0073-sair-desliga-so-lembretes.md)). Não houve validação jurídica de retenção e anonimização.
