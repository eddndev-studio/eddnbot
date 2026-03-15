CREATE TABLE "whatsapp_account_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_account_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_assignments_account_member_uq" UNIQUE("whatsapp_account_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_account_assignments" ADD CONSTRAINT "whatsapp_account_assignments_whatsapp_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_account_assignments" ADD CONSTRAINT "whatsapp_account_assignments_member_id_tenant_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."tenant_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_account_assignments" ADD CONSTRAINT "whatsapp_account_assignments_assigned_by_accounts_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wa_assignments_whatsapp_account_id_idx" ON "whatsapp_account_assignments" USING btree ("whatsapp_account_id");--> statement-breakpoint
CREATE INDEX "wa_assignments_member_id_idx" ON "whatsapp_account_assignments" USING btree ("member_id");