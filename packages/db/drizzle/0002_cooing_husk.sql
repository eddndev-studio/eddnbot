CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_account_id" uuid NOT NULL,
	"contact_phone" varchar(30) NOT NULL,
	"contact_name" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"window_expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_account_phone_uniq" UNIQUE("whatsapp_account_id","contact_phone")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"wa_message_id" varchar(255),
	"direction" varchar(10) NOT NULL,
	"type" varchar(20) NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone_number_id" varchar(50) NOT NULL,
	"waba_id" varchar(50) NOT NULL,
	"display_phone_number" varchar(30),
	"access_token" text NOT NULL,
	"webhook_verify_token" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_accounts_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_whatsapp_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_whatsapp_account_id_idx" ON "conversations" USING btree ("whatsapp_account_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_wa_message_id_idx" ON "messages" USING btree ("wa_message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_accounts_tenant_id_idx" ON "whatsapp_accounts" USING btree ("tenant_id");