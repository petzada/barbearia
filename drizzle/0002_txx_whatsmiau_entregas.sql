CREATE TABLE "entregas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"canal" text NOT NULL,
	"instancia" text,
	"destinatario_mascarado" text NOT NULL,
	"telefone_hash" text NOT NULL,
	"template" text,
	"chave_idempotente" text NOT NULL,
	"hash_payload" text NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"id_externo" text,
	"ultimo_erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entregas_canal_valido" CHECK ("entregas"."canal" in ('otp', 'avisos')),
	CONSTRAINT "entregas_estado_valido" CHECK ("entregas"."estado" in ('pendente', 'enviado', 'falhou', 'confirmado')),
	CONSTRAINT "entregas_tentativas_nao_negativas" CHECK ("entregas"."tentativas" >= 0),
	CONSTRAINT "entregas_hash_sha256" CHECK ("entregas"."telefone_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "entregas_payload_hash_sha256" CHECK ("entregas"."hash_payload" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entregas_chave_uidx" ON "entregas" USING btree ("barbearia_id","chave_idempotente");--> statement-breakpoint
CREATE UNIQUE INDEX "entregas_id_externo_uidx" ON "entregas" USING btree ("barbearia_id","instancia","id_externo") WHERE "entregas"."id_externo" is not null;--> statement-breakpoint
CREATE INDEX "entregas_estado_idx" ON "entregas" USING btree ("barbearia_id","estado","criado_em");