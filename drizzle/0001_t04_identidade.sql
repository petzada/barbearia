CREATE TABLE "aceites_documentos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"versao" text NOT NULL,
	"hash" text NOT NULL,
	"aceito_em" timestamp with time zone NOT NULL,
	"canal" text NOT NULL,
	"registrado_por" uuid,
	CONSTRAINT "aceites_documentos_uq" UNIQUE("usuario_id","documento_id"),
	CONSTRAINT "aceites_documentos_canal_valido" CHECK ("aceites_documentos"."canal" in ('app', 'balcao', 'telefone'))
);
--> statement-breakpoint
CREATE TABLE "auth_contas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_externa_id" text NOT NULL,
	"provedor" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expira_em" timestamp with time zone,
	"refresh_token_expira_em" timestamp with time zone,
	"scope" text,
	"password" text,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"usuario_id" uuid NOT NULL,
	"auth_time" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_sessoes_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verificacoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos_legais" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"tipo" text NOT NULL,
	"versao" text NOT NULL,
	"hash" text NOT NULL,
	"texto" text NOT NULL,
	"vigente" boolean DEFAULT false NOT NULL,
	CONSTRAINT "documentos_legais_versao_uq" UNIQUE("barbearia_id","tipo","versao"),
	CONSTRAINT "documentos_legais_tipo_valido" CHECK ("documentos_legais"."tipo" in ('termos', 'privacidade')),
	CONSTRAINT "documentos_legais_hash_sha256" CHECK ("documentos_legais"."hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "otp_desafios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"telefone" text NOT NULL,
	"finalidade" text NOT NULL,
	"usuario_id" uuid,
	"codigo_hash" text NOT NULL,
	"ip_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"max_tentativas" integer DEFAULT 5 NOT NULL,
	"invalidado_em" timestamp with time zone,
	"verificado_em" timestamp with time zone,
	"continuacao_hash" text,
	"continuacao_expira_em" timestamp with time zone,
	"continuacao_usada_em" timestamp with time zone,
	CONSTRAINT "otp_desafios_finalidade_valida" CHECK ("otp_desafios"."finalidade" in ('login', 'troca_telefone', 'reautenticacao'))
);
--> statement-breakpoint
CREATE TABLE "papeis_usuario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"concedido_por" uuid,
	"revogado_em" timestamp with time zone,
	"revogado_por" uuid,
	"motivo_revogacao" text,
	CONSTRAINT "papeis_usuario_papel_valido" CHECK ("papeis_usuario"."papel" in ('barbeiro', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisao" integer DEFAULT 1 NOT NULL,
	"nome" text NOT NULL,
	"estado" text DEFAULT 'ativo' NOT NULL,
	"email" text,
	"email_interno" text GENERATED ALWAYS AS ((id::text || '@usuarios.invalid')) STORED,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagem" text,
	"lembretes_ativos" boolean DEFAULT true NOT NULL,
	"registrado_por" uuid,
	"ativado_em" timestamp with time zone,
	CONSTRAINT "usuarios_barbearia_id_id" UNIQUE("barbearia_id","id"),
	CONSTRAINT "usuarios_estado_valido" CHECK ("usuarios"."estado" in ('pre_cadastrado', 'ativo', 'exclusao_agendada', 'anonimizado'))
);
--> statement-breakpoint
CREATE TABLE "vinculos_telefone" (
	"id" uuid PRIMARY KEY NOT NULL,
	"barbearia_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"telefone" text NOT NULL,
	"verificado_em" timestamp with time zone,
	"ativo" boolean DEFAULT true NOT NULL,
	"desativado_em" timestamp with time zone,
	"motivo_desativacao" text,
	CONSTRAINT "vinculos_telefone_e164" CHECK ("vinculos_telefone"."telefone" ~ '^\+55[1-9][1-9]9[0-9]{8}$')
);
--> statement-breakpoint
ALTER TABLE "aceites_documentos" ADD CONSTRAINT "aceites_documentos_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aceites_documentos" ADD CONSTRAINT "aceites_documentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aceites_documentos" ADD CONSTRAINT "aceites_documentos_documento_id_documentos_legais_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos_legais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_contas" ADD CONSTRAINT "auth_contas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessoes" ADD CONSTRAINT "auth_sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_legais" ADD CONSTRAINT "documentos_legais_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_desafios" ADD CONSTRAINT "otp_desafios_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_desafios" ADD CONSTRAINT "otp_desafios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papeis_usuario" ADD CONSTRAINT "papeis_usuario_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papeis_usuario" ADD CONSTRAINT "papeis_usuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_telefone" ADD CONSTRAINT "vinculos_telefone_barbearia_id_barbearias_id_fk" FOREIGN KEY ("barbearia_id") REFERENCES "public"."barbearias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vinculos_telefone" ADD CONSTRAINT "vinculos_telefone_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aceites_documentos_usuario_idx" ON "aceites_documentos" USING btree ("barbearia_id","usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_contas_provedor_uidx" ON "auth_contas" USING btree ("provedor","conta_externa_id");--> statement-breakpoint
CREATE INDEX "auth_contas_usuario_idx" ON "auth_contas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "auth_sessoes_usuario_idx" ON "auth_sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_legais_vigente_uidx" ON "documentos_legais" USING btree ("barbearia_id","tipo") WHERE "documentos_legais"."vigente";--> statement-breakpoint
CREATE INDEX "otp_desafios_telefone_idx" ON "otp_desafios" USING btree ("barbearia_id","telefone","criado_em");--> statement-breakpoint
CREATE INDEX "otp_desafios_ip_idx" ON "otp_desafios" USING btree ("barbearia_id","ip_hash","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "otp_desafios_continuacao_uidx" ON "otp_desafios" USING btree ("continuacao_hash") WHERE "otp_desafios"."continuacao_hash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "papeis_usuario_ativo_uidx" ON "papeis_usuario" USING btree ("barbearia_id","usuario_id","papel") WHERE "papeis_usuario"."ativo";--> statement-breakpoint
CREATE INDEX "papeis_usuario_papel_idx" ON "papeis_usuario" USING btree ("barbearia_id","papel","ativo");--> statement-breakpoint
CREATE INDEX "usuarios_estado_idx" ON "usuarios" USING btree ("barbearia_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "vinculos_telefone_ativo_uidx" ON "vinculos_telefone" USING btree ("barbearia_id","telefone") WHERE "vinculos_telefone"."ativo";--> statement-breakpoint
CREATE INDEX "vinculos_telefone_usuario_idx" ON "vinculos_telefone" USING btree ("barbearia_id","usuario_id","ativo");