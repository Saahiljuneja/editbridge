import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS client_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason text,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE (editor_id, client_id)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS client_blocks_client_id_idx ON client_blocks (client_id)
`;

console.log("Migration complete: client_blocks table created");
process.exit(0);
