import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS response_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    shortcut text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: response_templates table created");
process.exit(0);
