import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Starting settings isolation database migration...");

// 1. Create user_preferences table
await sql`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_preferences text,
    notif_preferences text,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  )
`;
console.log("- Created table user_preferences");

// 2. Create index on user_id
await sql`
  CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id)
`;
console.log("- Created index on user_id");

// 3. Migrate notifications preferences from users table
await sql`
  INSERT INTO user_preferences (user_id, notif_preferences)
  SELECT id, notif_preferences FROM users
  WHERE notif_preferences IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
  SET notif_preferences = EXCLUDED.notif_preferences
`;
console.log("- Migrated notification preferences from users table");

// 4. Migrate preferences from editors table
await sql`
  INSERT INTO user_preferences (user_id, email_preferences, notif_preferences)
  SELECT user_id, email_preferences, notif_preferences FROM editors
  WHERE email_preferences IS NOT NULL OR notif_preferences IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
  SET email_preferences = EXCLUDED.email_preferences,
      notif_preferences = COALESCE(EXCLUDED.notif_preferences, user_preferences.notif_preferences)
`;
console.log("- Migrated email and notification preferences from editors table");

// 5. Drop legacy columns
await sql`
  ALTER TABLE users DROP COLUMN IF EXISTS notif_preferences
`;
console.log("- Dropped column users.notif_preferences");

await sql`
  ALTER TABLE editors DROP COLUMN IF EXISTS email_preferences
`;
console.log("- Dropped column editors.email_preferences");

await sql`
  ALTER TABLE editors DROP COLUMN IF EXISTS notif_preferences
`;
console.log("- Dropped column editors.notif_preferences");

console.log("Migration successfully completed!");
process.exit(0);
