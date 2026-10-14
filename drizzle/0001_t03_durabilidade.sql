CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"versao" integer NOT NULL,
	"agregado_id" text NOT NULL,
	"revisao_agregado" integer NOT NULL,
	"ocorrido_em" timestamp with time zone NOT NULL,
	"correlation_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"proxima_tentativa_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone,
	CONSTRAINT "outbox_estado_valido" CHECK ("outbox"."estado" in ('pendente', 'processado', 'falhou'))
);
--> statement-breakpoint
CREATE TABLE "outbox_entregas" (
	"handler" text NOT NULL,
	"evento_id" uuid NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"entregue_em" timestamp with time zone NOT NULL,
	CONSTRAINT "outbox_entregas_handler_evento_id_pk" PRIMARY KEY("handler","evento_id")
);
--> statement-breakpoint
CREATE TABLE "inbox_provedor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"conta" text NOT NULL,
	"ambiente" text NOT NULL,
	"evento_externo_id" text NOT NULL,
	"hash_corpo" text NOT NULL,
	"cabecalhos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"corpo" text NOT NULL,
	"recebido_em" timestamp with time zone NOT NULL,
	"estado" text DEFAULT 'recebido' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"ultimo_erro" text,
	"processado_em" timestamp with time zone,
	"reprocessamentos" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_provedor_hash_sha256" CHECK ("inbox_provedor"."hash_corpo" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "inbox_provedor_estado_valido" CHECK ("inbox_provedor"."estado" in ('recebido', 'processando', 'processado', 'falhou'))
);
--> statement-breakpoint
CREATE TABLE "operacoes_externas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"tipo" text NOT NULL,
	"chave_idempotente" text NOT NULL,
	"alvo" text NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"reconciliacoes" integer DEFAULT 0 NOT NULL,
	"ultimo_erro" text,
	"entrada" jsonb,
	"resultado" jsonb,
	"iniciada_em" timestamp with time zone,
	CONSTRAINT "operacoes_externas_estado_valido" CHECK ("operacoes_externas"."estado" in ('pendente', 'em_andamento', 'confirmada', 'incerta', 'falhou'))
);
--> statement-breakpoint
CREATE TABLE "estado_recuperacao" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"ponto_restaurado" timestamp with time zone,
	"ativado_por" text,
	"motivo" text,
	"ativado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_entregas" ADD CONSTRAINT "outbox_entregas_evento_id_outbox_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."outbox"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_entregas" ADD CONSTRAINT "outbox_entregas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_provedor" ADD CONSTRAINT "inbox_provedor_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operacoes_externas" ADD CONSTRAINT "operacoes_externas_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estado_recuperacao" ADD CONSTRAINT "estado_recuperacao_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_pendentes_idx" ON "outbox" USING btree ("proxima_tentativa_em") WHERE "outbox"."estado" = 'pendente';--> statement-breakpoint
CREATE INDEX "outbox_agregado_idx" ON "outbox" USING btree ("barbearia_id","agregado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_provedor_evento_uidx" ON "inbox_provedor" USING btree ("barbearia_id","provedor","conta","ambiente","evento_externo_id");--> statement-breakpoint
CREATE INDEX "inbox_provedor_estado_idx" ON "inbox_provedor" USING btree ("barbearia_id","estado","recebido_em");--> statement-breakpoint
CREATE UNIQUE INDEX "operacoes_externas_chave_uidx" ON "operacoes_externas" USING btree ("barbearia_id","tipo","chave_idempotente");--> statement-breakpoint
CREATE INDEX "operacoes_externas_estado_idx" ON "operacoes_externas" USING btree ("barbearia_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "estado_recuperacao_barbearia_uidx" ON "estado_recuperacao" USING btree ("barbearia_id");