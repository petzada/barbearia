# H00 — Ambiente local de desenvolvimento

- **Pedido por:** T01, somente se algum item abaixo faltar na máquina.
- **Bloqueia:** T01 (e, por consequência, todo o plano).
- **Quem responde:** dono do produto.

## Por que é necessário

O agente não deve instalar runtimes, Docker ou alterar configurações do sistema operacional sem autorização. O projeto precisa de Node, gerenciador de pacotes e um Postgres real para os testes de integração.

## O que o agente prepara antes de pedir

- Resultado de `node -v`, `pnpm -v`, `docker version`, `git --version` e do sistema operacional (Windows 11 neste ambiente).
- Lista exata do que falta e o comando oficial de instalação de cada item.

## Checklist para o humano

- [ ] Node.js LTS ativo (≥ 22) instalado.
- [ ] pnpm instalado (`corepack enable` e `corepack prepare pnpm@latest --activate`, ou instalador oficial).
- [ ] Docker Desktop instalado e em execução (para Postgres local e testes de integração).
- [ ] Git configurado com nome e e-mail.
- [ ] (Opcional) Repositório remoto (GitHub) criado e autorizado, se quiser CI hospedado.

## Como entregar

Instalar e responder "H00 pronto". Nada de segredo envolvido.

## Critério de saída

O agente executa `node -v`, `pnpm -v`, `docker run --rm postgres:17 postgres --version` e `git status` com sucesso e registra os resultados em [registro.md](registro.md).

## Se não houver resposta

T01 permanece `blocked_human (H00)`. Nenhuma outra task de código pode começar. O orquestrador pode adiantar apenas trabalho documental (T00).
