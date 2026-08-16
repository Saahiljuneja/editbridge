import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  ALTER TABLE editors ADD COLUMN IF NOT EXISTS custom_commission_rate integer;
`;

await sql`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_processing_fee_rate integer;
`;

console.log("Migration complete: custom commission and processing fee columns added");
process.exit(0);
