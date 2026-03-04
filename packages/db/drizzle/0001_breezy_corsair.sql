CREATE TABLE "ai_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label" varchar(100) DEFAULT 'default' NOT NULL,
	"provider" varchar(20) NOT NULL,
	"model" varchar(100) NOT NULL,
	"system_prompt" text,
	"temperature" real,
	"max_output_tokens" integer,
	"thinking_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_configs_tenant_label_uniq" UNIQUE("tenant_id","label")
);
--> statement-breakpoint
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_configs_tenant_id_idx" ON "ai_configs" USING btree ("tenant_id");