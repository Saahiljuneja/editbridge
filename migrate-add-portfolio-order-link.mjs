import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL`;

console.log("Migration complete: portfolio_items.order_id added");
process.exit(0);
