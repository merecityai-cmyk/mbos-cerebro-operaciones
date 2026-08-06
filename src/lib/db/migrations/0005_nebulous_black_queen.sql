CREATE TYPE "public"."kpi_item_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "kpi_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"phase" varchar(50) NOT NULL,
	"item_key" varchar(100) NOT NULL,
	"status" "kpi_item_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_monthly_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"observations" text,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kpi_records_client_month_idx" UNIQUE("client_id","year","month")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "has_nomina" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "nomina_cycle" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "has_documentos_soporte" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kpi_checklist_items" ADD CONSTRAINT "kpi_checklist_items_record_id_kpi_monthly_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."kpi_monthly_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_checklist_items" ADD CONSTRAINT "kpi_checklist_items_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_monthly_records" ADD CONSTRAINT "kpi_monthly_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;