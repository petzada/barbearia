ALTER TABLE "barbeiros" ALTER COLUMN "usuario_id" SET DATA TYPE uuid USING "usuario_id"::uuid;
--> statement-breakpoint
ALTER TABLE "habilitacoes" ADD COLUMN "revisao" integer NOT NULL DEFAULT 1;
