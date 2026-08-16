import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    const res = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log("Tables in database:", res.map(r => r.tablename));
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

run();
