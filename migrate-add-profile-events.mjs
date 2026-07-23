import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`DO $$ BEGIN
  CREATE TYPE profile_event_type AS ENUM ('profile_view', 'package_click', 'portfolio_view');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$`;

await sql`
  CREATE TABLE IF NOT EXISTS profile_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    event_type profile_event_type NOT NULL,
    entity_id uuid,
    viewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS profile_events_editor_type_created_idx ON profile_events (editor_id, event_type, created_at)`;

console.log("Migration complete: profile_events table created");
process.exit(0);
