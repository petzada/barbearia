# 0007 — Arquivos no Cloudflare R2

- **Data:** 2026-10-13
- **Status:** aceita

## Decisão
Arquivos (fotos de perfil, fotos de barbeiros, identidade visual, etc.) ficam no **Cloudflare R2**.

## Consequências
- Acesso pela API compatível com S3. Upload direto do navegador com URL pré-assinada gerada pelo monolito, sem o arquivo passar pelo servidor.
- Funciona igual com qualquer hospedagem escolhida.

## Revisão adversarial (2026-10-13)
- R2 mantido. A exclusão de conta precisa apagar também os arquivos pessoais no R2 ([0072](0072-exclusao-de-conta-no-fim-do-periodo.md)).
