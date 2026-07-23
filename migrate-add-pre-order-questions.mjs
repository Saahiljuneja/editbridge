import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS pre_order_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    editor_id uuid NOT NULL REFERENCES editors(id) ON DELETE CASCADE,
    question text NOT NULL,
    answer text,
    asked_at timestamp NOT NULL DEFAULT now(),
    answered_at timestamp,
    converted_order_id uuid REFERENCES orders(id)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS pre_order_questions_editor_id_idx ON pre_order_questions (editor_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS pre_order_questions_client_editor_idx ON pre_order_questions (client_id, editor_id)
`;

console.log("Migration complete: pre_order_questions table created");
process.exit(0);
