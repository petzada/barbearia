# 01 — Entrada, login e conta

O link da barbearia abre o app. Não há home de vendas, lista de outras barbearias nem loja de aplicativos ([0001](../decisoes/0001-produto-web-mobile-first-estilo-app.md)). Qualquer pessoa cria a conta ([0020](../decisoes/0020-cadastro-aberto-admin-gerencia-no-backoffice.md)).

A identidade é o telefone ([0017](../decisoes/0017-login-whatsapp-otp-e-google.md)). Não há senha. O código de 6 dígitos chega no WhatsApp, vale 5 minutos e aceita 5 tentativas. Google é o reserva: no primeiro acesso por ali, a pessoa confirma o mesmo telefone com o mesmo código. As duas entradas ficam na mesma conta. A sessão dura 90 dias e se renova cada vez que o app é usado.

SMS e e-mail de código foram descartados na mesma decisão. O texto que a pessoa lê no celular está em [10-mensagens-whatsapp.md](10-mensagens-whatsapp.md).

Referência usada: Booksy e Gendo abrem pelo link; theCut pede nome e telefone; AppBarber entra com e-mail, senha e rede social, e um review de 2023 reclama de login toda hora. Aqui a sessão longa responde a isso, e o Google não é oferecido no meio do primeiro acesso.

```
link da casa
    |
    +-- sessão válida ------------------> Início do papel (cliente,
    |                                      barbeiro ou admin)
    |
    +-- sem sessão --> celular --+--> código --> conta
                     |           |
                     +--> Google +--> se o telefone já está
                                      na conta: entra
                                      se não: confirma o telefone
                                      com código
```

Quem se cadastra sozinho nasce **cliente**. Barbeiro e admin entram pelo mesmo código, no telefone que o admin cadastrou na equipe ([08-admin-casa.md](08-admin-casa.md)). Um telefone, uma conta: os papéis se somam ([0002](../decisoes/0002-tres-perfis-de-usuario.md)).

---

## E1 — O link, sem sessão

```
+----------------------------------+
|                                  |
|         [ marca ]                |
|    Barbearia do Moura            |
|                                  |
|    [ Entrar com o celular ]      |
|                                  |
|    [ Entrar com Google ]         |
|                                  |
|  O celular é a sua conta.        |
|  Sem senha.                      |
|                                  |
+----------------------------------+
```

Não há carrossel de benefícios, preço de plano nem "baixe na App Store". Plano se vê depois de entrar, em [05-cliente-planos.md](05-cliente-planos.md).

`Entrar com o celular` abre E2. `Entrar com Google` abre o Google e volta em E7 ou direto no app, se aquele Google já confirmou um telefone.

---

## E2 — Celular

```
+----------------------------------+
| <                                |
|                                  |
|  Qual é o seu celular?           |
|                                  |
|  +----------------------------+  |
|  | +55  (11) 9____-____       |  |
|  +----------------------------+  |
|                                  |
|  [ Receber código no WhatsApp ]  |
|                                  |
|  Vamos enviar 6 dígitos.         |
|  O código vale 5 minutos.        |
|                                  |
+----------------------------------+
```

O botão só segue com DDD e número completos. Não existe "continuar sem conta": horário, plano e histórico dependem desse número.

---

## E3 — Código

```
+----------------------------------+
| <                                |
|                                  |
|  Digite o código                 |
|  Enviado no WhatsApp para        |
|  +55 11 9****-1234               |
|                                  |
|     [ 4 ] [ 8 ] [ 2 ]            |
|     [ 1 ] [ 9 ] [ _ ]            |
|                                  |
|  Vale por mais 4:12              |
|  Tentativa 1 de 5                |
|                                  |
|  Reenviar código                 |
|  Este não é o meu número         |
|                                  |
+----------------------------------+
```

No piloto, códigos e lembretes saem do mesmo número. Depois da validação, o código sai de um número que não manda lembrete ([0031](../decisoes/0031-whatsmiau-planos-e-numeros-por-fase.md)). A tela não explica essa operação; a pessoa só vê a conversa da barbearia.

| O que aconteceu | O que a tela faz |
| --- | --- |
| 6 dígitos certos, telefone novo | E4, e em seguida o nome |
| 6 dígitos certos, telefone já usado | Entra. Se a casa pré-cadastrou esse número, E6 |
| Dígito errado | Os campos limpam. "Código incorreto. Tentativa 2 de 5." |
| 5 erros no mesmo código | O código morre. Só `Reenviar código` ou voltar ao celular |
| Passou 5 minutos | "Esse código expirou." O campo trava até reenviar |
| Muitos envios do mesmo telefone ou da mesma rede | E5. O teto numérico de envios não está fechado; a tela existe |

`Reenviar` gera outro código e zera as 5 tentativas desse código novo. O anterior deixa de valer.

---

## E4 — WhatsApp não entrega

```
+----------------------------------+
| <                                |
|                                  |
|  O código não saiu               |
|                                  |
|  Não conseguimos falar com o     |
|  WhatsApp da barbearia agora.    |
|                                  |
|  Se você já entrou com Google    |
|  neste celular, use o Google.    |
|                                  |
|  [ Entrar com Google ]           |
|                                  |
|  Conta nova precisa do código.   |
|  Sem o WhatsApp, ela espera.     |
|                                  |
+----------------------------------+
```

É o risco aceito em [0017](../decisoes/0017-login-whatsapp-otp-e-google.md): com o número caído, só entra quem já vinculou o Google. Quem nunca entrou, mesmo pelo Google, para no pedido de código. Quem está no meio dos 90 dias nem vê esta tela.

Não há campo de e-mail, SMS nem "falar com o suporte para liberar".

---

## E5 — Envios demais

```
+----------------------------------+
| <                                |
|                                  |
|  Espere um pouco                 |
|                                  |
|  Muitos códigos pedidos para     |
|  este celular ou desta rede.     |
|                                  |
|  [ Voltar ]                      |
|                                  |
+----------------------------------+
```

---

## E6 — Número pré-cadastrado

A casa marcou horário só com nome e telefone ([0034](../decisoes/0034-agendamento-feito-pela-barbearia.md)). O login com esse telefone acorda a conta. O histórico já está nela.

```
+----------------------------------+
|                                  |
|  Achamos você                    |
|                                  |
|  Carlos                          |
|  +55 11 9****-1234               |
|                                  |
|  Qui 15 out · 15:00              |
|  Corte · coberto pelo plano      |
|                                  |
|  [ Sou eu, entrar ]              |
|  [ O nome está errado ]          |
|                                  |
+----------------------------------+
```

`O nome está errado` abre o campo de nome e guarda o novo. Não cria outra conta: o telefone continua sendo a chave. Dois clientes no mesmo chip não cabem neste desenho.

---

## E7 — Google ainda sem telefone

```
+----------------------------------+
|                                  |
|  Confirme o celular              |
|                                  |
|  Você entrou como                |
|  carlos@email.com                |
|                                  |
|  O horário e o plano ficam no    |
|  número de celular, não no Gmail.|
|                                  |
|  +----------------------------+  |
|  | +55  (11) 9____-____       |  |
|  +----------------------------+  |
|                                  |
|  [ Receber código no WhatsApp ]  |
|                                  |
+----------------------------------+
```

O código é o de E3. Se o telefone já tinha conta (criada pelo app ou pré-cadastro), o Google passa a abrir **essa** conta. Se o telefone é novo, nasce a conta e segue para o nome.

Não há tela pedindo para "proteger a conta com Google" depois do código. A decisão proíbe esse incentivo no onboarding. No perfil, a ligação fica quieta (E10).

---

## E8 — Nome, só na conta nova

```
+----------------------------------+
|                                  |
|  Como podemos te chamar?         |
|                                  |
|  +----------------------------+  |
|  | Nome                       |  |
|  +----------------------------+  |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+
```

Pré-cadastro que já tem nome pula esta tela e cai em E6.

---

## E9 — Avisos e tela inicial

Dois passos, um atrás do outro. Os dois podem ser adiados. O de instalar volta no perfil enquanto o app abrir no navegador, porque [0001](../decisoes/0001-produto-web-mobile-first-estilo-app.md) pede que o onboarding conduza a instalação.

```
+----------------------------------+
|                                  |
|  Avisos no WhatsApp              |
|                                  |
|  [x] Lembrete de horário         |
|  [x] Aviso de assinatura         |
|  [x] Se a casa cancelar ou       |
|      trocar meu horário          |
|                                  |
|  O código de entrada não         |
|  depende desta escolha.          |
|                                  |
|  [ Continuar ]                   |
|                                  |
+----------------------------------+

        |
        v

+----------------------------------+
|                                  |
|  Abrir como app                  |
|                                  |
|  Adicione a Barbearia do Moura   |
|  à tela inicial. Ela abre em     |
|  tela cheia.                     |
|                                  |
|  Os avisos continuam no          |
|  WhatsApp.                       |
|                                  |
|  No iPhone: Compartilhar,        |
|  Adicionar à Tela de Início.     |
|                                  |
|  No Android: Instalar.           |
|                                  |
|  [ Adicionar agora ]             |
|  [ Agora não ]                   |
|                                  |
+----------------------------------+
```

`Adicionar agora` dispara o pedido do navegador. `Agora não` vai para o início. Sem tutorial de como agendar.

Quem desmarca os avisos não recebe lembrete, cobrança nem cancelamento da casa no WhatsApp ([0010](../decisoes/0010-whatsapp-via-whatsmiau.md)). Continua vendo os mesmos fatos dentro do app.

---

## E10 — Perfil

Aba `Eu` do cliente. Barbeiro e admin têm a mesma conta no canto da tela deles, com o mesmo telefone e o mesmo Google.

```
+----------------------------------+
| Eu                               |
|                                  |
|  Carlos                          |
|  +55 11 9****-1234               |
|                                  |
|  Google                          |
|  Não vinculado                   |
|  Vincular                        |
|                                  |
|  Avisos no WhatsApp        [on]  |
|  Adicionar à tela inicial    >   |
|                                  |
|  [ Sair ]                        |
|                                  |
| Início  Horários  Plano  Eu      |
+----------------------------------+
```

`Vincular` repete o Google e grava na conta já aberta. Não há selo, desconto nem frase de medo. `Sair` encerra a sessão neste aparelho. Entrar de novo pede código ou Google.

O telefone aparece sem lápis de editar. Trocar o número de uma conta já existente não está decidido.
