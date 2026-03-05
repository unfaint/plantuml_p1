ALTER TABLE "diagram_versions" ADD COLUMN IF NOT EXISTS "ydoc_update" bytea NOT NULL DEFAULT '\x';
--> statement-breakpoint
