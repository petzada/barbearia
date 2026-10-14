CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE "servicos" (
  "id" uuid PRIMARY KEY NOT NULL,
  "barbearia_id" uuid NOT NULL REFERENCES "barbearias"("id"),
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "atualizado_em" timestamptz NOT NULL DEFAULT now(),
  "revisao" integer NOT NULL DEFAULT 1,
  "nome" text NOT NULL,
  "descricao" text,
  "preco_centavos" bigint NOT NULL,
  "duracao_minutos" integer NOT NULL,
  "tipo" text NOT NULL,
  "ativo" boolean NOT NULL DEFAULT true,
  "foto_key" text,
  "componentes_assinatura" text,
  CONSTRAINT "servicos_barbearia_id_id_uidx" UNIQUE ("barbearia_id", "id"),
  CONSTRAINT "servicos_preco_positivo" CHECK ("preco_centavos" > 0),
  CONSTRAINT "servicos_duracao_positiva" CHECK ("duracao_minutos" > 0),
  CONSTRAINT "servicos_tipo_valido" CHECK ("tipo" IN ('simples', 'combo')),
  CONSTRAINT "servicos_assinatura_combo" CHECK (
    ("tipo" = 'simples' AND "componentes_assinatura" IS NULL) OR
    ("tipo" = 'combo' AND "componentes_assinatura" IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "combo_componentes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "barbearia_id" uuid NOT NULL REFERENCES "barbearias"("id"),
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "combo_id" uuid NOT NULL,
  "componente_id" uuid NOT NULL,
  CONSTRAINT "combo_componentes_par_uidx" UNIQUE ("barbearia_id", "combo_id", "componente_id"),
  CONSTRAINT "combo_componentes_combo_fk" FOREIGN KEY ("barbearia_id", "combo_id") REFERENCES "servicos"("barbearia_id", "id"),
  CONSTRAINT "combo_componentes_componente_fk" FOREIGN KEY ("barbearia_id", "componente_id") REFERENCES "servicos"("barbearia_id", "id"),
  CONSTRAINT "combo_componentes_sem_autorreferencia" CHECK ("combo_id" <> "componente_id")
);
--> statement-breakpoint
CREATE TABLE "barbeiros" (
  "id" uuid PRIMARY KEY NOT NULL,
  "barbearia_id" uuid NOT NULL REFERENCES "barbearias"("id"),
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "atualizado_em" timestamptz NOT NULL DEFAULT now(),
  "revisao" integer NOT NULL DEFAULT 1,
  "usuario_id" text NOT NULL,
  "nome_exibicao" text NOT NULL,
  "foto_key" text,
  "bio" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "ordem" integer NOT NULL DEFAULT 0,
  CONSTRAINT "barbeiros_barbearia_id_id_uidx" UNIQUE ("barbearia_id", "id"),
  CONSTRAINT "barbeiros_ordem_nao_negativa" CHECK ("ordem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "habilitacoes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "barbearia_id" uuid NOT NULL REFERENCES "barbearias"("id"),
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "barbeiro_id" uuid NOT NULL,
  "servico_id" uuid NOT NULL,
  "habilitado" boolean NOT NULL DEFAULT false,
  CONSTRAINT "habilitacoes_barbearia_par_uidx" UNIQUE ("barbearia_id", "barbeiro_id", "servico_id"),
  CONSTRAINT "habilitacoes_barbeiro_fk" FOREIGN KEY ("barbearia_id", "barbeiro_id") REFERENCES "barbeiros"("barbearia_id", "id"),
  CONSTRAINT "habilitacoes_servico_fk" FOREIGN KEY ("barbearia_id", "servico_id") REFERENCES "servicos"("barbearia_id", "id")
);
--> statement-breakpoint
CREATE TABLE "comissao_vigencias" (
  "id" uuid PRIMARY KEY NOT NULL,
  "barbearia_id" uuid NOT NULL REFERENCES "barbearias"("id"),
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "barbeiro_id" uuid NOT NULL,
  "servico_id" uuid NOT NULL,
  "pct_avulso_bp" integer NOT NULL,
  "pct_assinante_bp" integer NOT NULL,
  "inicio" date NOT NULL,
  "fim" date,
  CONSTRAINT "comissao_vigencias_inicio_uidx" UNIQUE ("barbearia_id", "barbeiro_id", "servico_id", "inicio"),
  CONSTRAINT "comissao_vigencias_barbeiro_fk" FOREIGN KEY ("barbearia_id", "barbeiro_id") REFERENCES "barbeiros"("barbearia_id", "id"),
  CONSTRAINT "comissao_vigencias_servico_fk" FOREIGN KEY ("barbearia_id", "servico_id") REFERENCES "servicos"("barbearia_id", "id"),
  CONSTRAINT "comissao_vigencias_bp_validos" CHECK (
    "pct_avulso_bp" BETWEEN 0 AND 10000 AND "pct_assinante_bp" BETWEEN 0 AND 10000
  ),
  CONSTRAINT "comissao_vigencias_fim_valido" CHECK ("fim" IS NULL OR "fim" >= "inicio"),
  CONSTRAINT "comissao_vigencias_sem_sobreposicao" EXCLUDE USING gist (
    "barbearia_id" WITH =,
    "barbeiro_id" WITH =,
    "servico_id" WITH =,
    daterange("inicio", "fim", '[]') WITH &&
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "servicos_combo_ativo_componentes_uidx"
  ON "servicos" USING btree ("barbearia_id", "componentes_assinatura")
  WHERE "tipo" = 'combo' AND "ativo";
--> statement-breakpoint
CREATE INDEX "servicos_barbearia_ativo_nome_idx" ON "servicos" USING btree ("barbearia_id", "ativo", "nome");
--> statement-breakpoint
CREATE INDEX "combo_componentes_combo_idx" ON "combo_componentes" USING btree ("barbearia_id", "combo_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "barbeiros_usuario_uidx" ON "barbeiros" USING btree ("barbearia_id", "usuario_id");
--> statement-breakpoint
CREATE INDEX "barbeiros_publicos_idx" ON "barbeiros" USING btree ("barbearia_id", "ativo", "ordem", "nome_exibicao");
--> statement-breakpoint
CREATE INDEX "habilitacoes_servico_idx" ON "habilitacoes" USING btree ("barbearia_id", "servico_id", "habilitado");
--> statement-breakpoint
CREATE INDEX "comissao_vigencias_par_inicio_idx" ON "comissao_vigencias" USING btree ("barbearia_id", "barbeiro_id", "servico_id", "inicio");
