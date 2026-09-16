CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assessment_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"form_id" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dosen_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"signature" text
);
--> statement-breakpoint
CREATE TABLE "exam_schedule_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_schedule_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"hari" text NOT NULL,
	"tanggal" text NOT NULL,
	"jam" text NOT NULL,
	"semester" text NOT NULL,
	"golongan" text NOT NULL,
	"kode_mk" text NOT NULL,
	"mata_kuliah" text NOT NULL,
	"ruang" text NOT NULL,
	"pengawas" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_schedule_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"color" text DEFAULT 'default' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"schedule_id" text NOT NULL,
	"no" integer NOT NULL,
	"mata_kuliah" text DEFAULT '' NOT NULL,
	"hari" text DEFAULT '' NOT NULL,
	"tempat" text DEFAULT '' NOT NULL,
	"jam" text DEFAULT '' NOT NULL,
	"prodi" text DEFAULT '' NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"golongan" text DEFAULT '' NOT NULL,
	"default_pengajar" text DEFAULT '' NOT NULL,
	"default_teknisi" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"nim" text NOT NULL,
	"name" text NOT NULL,
	"prodi" text DEFAULT '' NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"golongan" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"active_week" integer DEFAULT 1 NOT NULL,
	"academic_year" text DEFAULT '2025/2026' NOT NULL,
	"academic_semester" text DEFAULT 'Genap' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_data_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "weekly_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"schedule_id" text NOT NULL,
	"pengajar" text DEFAULT '' NOT NULL,
	"materi" text DEFAULT '' NOT NULL,
	"tanggal" text DEFAULT '' NOT NULL,
	"teknisi" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "weekly_entries_user_id_week_number_schedule_id_unique" UNIQUE("user_id","week_number","schedule_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekly_entry_id" uuid NOT NULL,
	"student_no" integer NOT NULL,
	"nim" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archives" ADD CONSTRAINT "archives_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_forms" ADD CONSTRAINT "assessment_forms_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dosen_list" ADD CONSTRAINT "dosen_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule_entries" ADD CONSTRAINT "exam_schedule_entries_exam_schedule_id_exam_schedules_id_fk" FOREIGN KEY ("exam_schedule_id") REFERENCES "public"."exam_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule_entries" ADD CONSTRAINT "exam_schedule_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule_notes" ADD CONSTRAINT "exam_schedule_notes_entry_id_exam_schedule_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."exam_schedule_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule_notes" ADD CONSTRAINT "exam_schedule_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_master" ADD CONSTRAINT "student_master_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_data" ADD CONSTRAINT "user_data_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_entries" ADD CONSTRAINT "weekly_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_students" ADD CONSTRAINT "weekly_students_weekly_entry_id_weekly_entries_id_fk" FOREIGN KEY ("weekly_entry_id") REFERENCES "public"."weekly_entries"("id") ON DELETE cascade ON UPDATE no action;