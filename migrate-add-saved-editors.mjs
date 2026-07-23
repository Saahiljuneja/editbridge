import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS saved_editors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (client_id, editor_id)
  )
`;

console.log("Migration complete: saved_editors table created");
process.exit(0);
