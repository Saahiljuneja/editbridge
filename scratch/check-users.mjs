import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT 
    email, 
    email_verified IS NOT NULL AS verified,
    hashed_password IS NOT NULL AS has_pwd,
    role,
    created_at
  FROM users 
  ORDER BY created_at DESC 
  LIMIT 10
`;

console.log("Recent users:");
console.table(rows);
process.exit(0);
