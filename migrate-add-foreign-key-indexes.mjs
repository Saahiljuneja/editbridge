import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

console.log("Starting migration to add missing foreign key indexes (corrected)...");

const queries = [
  `CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`,
  `CREATE INDEX IF NOT EXISTS skills_editor_id_idx ON skills (editor_id)`,
  `CREATE INDEX IF NOT EXISTS tools_editor_id_idx ON tools (editor_id)`,
  `CREATE INDEX IF NOT EXISTS portfolio_items_editor_id_idx ON portfolio_items (editor_id)`,
  `CREATE INDEX IF NOT EXISTS portfolio_items_order_id_idx ON portfolio_items (order_id)`,
  `CREATE INDEX IF NOT EXISTS portfolio_likes_user_id_idx ON portfolio_likes (user_id)`,
  `CREATE INDEX IF NOT EXISTS portfolio_comments_user_id_idx ON portfolio_comments (user_id)`,
  `CREATE INDEX IF NOT EXISTS portfolio_views_user_id_idx ON portfolio_views (user_id)`,
  `CREATE INDEX IF NOT EXISTS packages_editor_id_idx ON packages (editor_id)`,
  `CREATE INDEX IF NOT EXISTS orders_client_id_idx ON orders (client_id)`,
  `CREATE INDEX IF NOT EXISTS orders_editor_id_idx ON orders (editor_id)`,
  `CREATE INDEX IF NOT EXISTS orders_package_id_idx ON orders (package_id)`,
  `CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON deliveries (order_id)`,
  `CREATE INDEX IF NOT EXISTS deliveries_uploaded_by_idx ON deliveries (uploaded_by)`,
  `CREATE INDEX IF NOT EXISTS messages_order_id_idx ON messages (order_id)`,
  `CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages (sender_id)`,
  `CREATE INDEX IF NOT EXISTS revision_requests_order_id_idx ON revision_requests (order_id)`,
  `CREATE INDEX IF NOT EXISTS revision_requests_delivery_id_idx ON revision_requests (delivery_id)`,
  `CREATE INDEX IF NOT EXISTS revision_requests_requested_by_idx ON revision_requests (requested_by)`,
  `CREATE INDEX IF NOT EXISTS disputes_order_id_idx ON disputes (order_id)`,
  `CREATE INDEX IF NOT EXISTS disputes_opened_by_idx ON disputes (opened_by)`,
  `CREATE INDEX IF NOT EXISTS disputes_resolved_by_idx ON disputes (resolved_by)`,
  `CREATE INDEX IF NOT EXISTS dispute_messages_dispute_id_idx ON dispute_messages (dispute_id)`,
  `CREATE INDEX IF NOT EXISTS dispute_messages_sender_id_idx ON dispute_messages (sender_id)`,
  `CREATE INDEX IF NOT EXISTS payouts_editor_id_idx ON payouts (editor_id)`,
  `CREATE INDEX IF NOT EXISTS payouts_order_id_idx ON payouts (order_id)`,
  `CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON order_events (order_id)`,
  `CREATE INDEX IF NOT EXISTS order_events_actor_id_idx ON order_events (actor_id)`,
  `CREATE INDEX IF NOT EXISTS saved_editors_client_id_idx ON saved_editors (client_id)`,
  `CREATE INDEX IF NOT EXISTS saved_editors_editor_id_idx ON saved_editors (editor_id)`,
  `CREATE INDEX IF NOT EXISTS profile_events_editor_id_idx ON profile_events (editor_id)`,
  `CREATE INDEX IF NOT EXISTS profile_events_viewer_id_idx ON profile_events (viewer_id)`,
  `CREATE INDEX IF NOT EXISTS showcase_items_editor_id_idx ON showcase_items (editor_id)`,
  `CREATE INDEX IF NOT EXISTS client_notes_editor_id_idx ON client_notes (editor_id)`,
  `CREATE INDEX IF NOT EXISTS client_notes_client_id_idx ON client_notes (client_id)`,
];

for (const q of queries) {
  try {
    await sql.query(q);
    console.log(`Executed: ${q}`);
  } catch (err) {
    console.error(`Failed: ${q}`, err);
  }
}

console.log("Migration complete: all foreign key indexes created successfully");
process.exit(0);
