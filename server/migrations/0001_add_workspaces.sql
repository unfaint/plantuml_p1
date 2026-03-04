CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name"       text NOT NULL,
	"owner_id"   text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id"      text NOT NULL,
	"role"         "workspace_role" DEFAULT 'member' NOT NULL,
	"joined_at"    timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invites" (
	"id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invited_by"   text NOT NULL,
	"email"        text NOT NULL,
	"role"         "workspace_role" DEFAULT 'member' NOT NULL,
	"token"        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
	"used"         boolean DEFAULT false NOT NULL,
	"created_at"   timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "diagrams" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diagrams" ADD CONSTRAINT "diagrams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_members_user_id_idx" ON "workspace_members" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagrams_workspace_id_idx" ON "diagrams" ("workspace_id");
