import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// An empty, code-unreferenced `feature_flags` table with a different shape
// (id/label/description/created_by_id columns) already existed in this DB
// from an earlier, abandoned attempt — drop it so the shape matches schema.ts.
await sql`DROP TABLE IF EXISTS feature_flags`;

await sql`
  CREATE TABLE feature_flags (
    key text PRIMARY KEY,
    enabled boolean NOT NULL DEFAULT true,
    updated_by uuid REFERENCES users(id),
    updated_at timestamp NOT NULL DEFAULT now()
  )
`;

console.log("Migration complete: feature_flags table created");
process.exit(0);
