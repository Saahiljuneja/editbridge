import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const result = await sql`SELECT id, name, email, image, role FROM users`;
  console.log("Users in DB:", result);
}

run().catch(console.error);
