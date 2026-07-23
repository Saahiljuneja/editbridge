import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS showcase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    video_url text NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    added_by_id uuid NOT NULL REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: showcase_items table created");
process.exit(0);
