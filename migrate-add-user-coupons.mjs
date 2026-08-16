import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS user_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code text NOT NULL UNIQUE,
    discount_pct integer NOT NULL,
    max_discount_amount integer NOT NULL, -- paise
    is_used boolean NOT NULL DEFAULT false,
    expires_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  );
`;

console.log("Migration complete: user_coupons table created");
process.exit(0);
