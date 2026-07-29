import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Starting message read status database migration...");

// 1. Add is_read column
await sql`
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false
`;
console.log("- Added column messages.is_read");

// 2. Add email_notified column
await sql`
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS email_notified boolean NOT NULL DEFAULT false
`;
console.log("- Added column messages.email_notified");

// 3. Create index on (is_read, email_notified)
await sql`
  CREATE INDEX IF NOT EXISTS messages_is_read_email_notified_idx ON messages(is_read, email_notified)
`;
console.log("- Created index on messages(is_read, email_notified)");

console.log("Migration successfully completed!");
process.exit(0);
