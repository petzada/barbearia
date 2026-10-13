CREATE TABLE "barbearias" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"fuso" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barbearias_slug_formato" CHECK ("barbearias"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"ocorrida_em" timestamp with time zone NOT NULL,
	"ator_id" text,
	"ator_papeis" text[] DEFAULT '{}' NOT NULL,
	"acao" text NOT NULL,
	"recurso_tipo" text NOT NULL,
	"recurso_id" text NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"motivo" text,
	"correlation_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chaves_idempotencia" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"ator_id" text NOT NULL,
	"operacao" text NOT NULL,
	"chave" text NOT NULL,
	"hash_payload" text NOT NULL,
	"resultado" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chaves_idempotencia_hash_sha256" CHECK ("chaves_idempotencia"."hash_payload" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chaves_idempotencia" ADD CONSTRAINT "chaves_idempotencia_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "barbearias_slug_uidx" ON "barbearias" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "auditoria_recurso_idx" ON "auditoria" USING btree ("barbearia_id","recurso_tipo","recurso_id","ocorrida_em");--> statement-breakpoint
CREATE INDEX "auditoria_ocorrida_idx" ON "auditoria" USING btree ("barbearia_id","ocorrida_em");--> statement-breakpoint
CREATE INDEX "auditoria_correlation_idx" ON "auditoria" USING btree ("barbearia_id","correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chaves_idempotencia_escopo_uidx" ON "chaves_idempotencia" USING btree ("barbearia_id","ator_id","operacao","chave");
--> statement-breakpoint
-- PRD 6.2: auditoria e append-only. Trigger escrito a mao (o drizzle-kit nao modela triggers); nao apague ao regenerar.
CREATE FUNCTION "auditoria_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auditoria e append-only: UPDATE e DELETE sao proibidos' USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "auditoria_append_only_trg" BEFORE UPDATE OR DELETE ON "auditoria" FOR EACH ROW EXECUTE FUNCTION "auditoria_append_only"();
