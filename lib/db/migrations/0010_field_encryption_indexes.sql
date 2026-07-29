-- Add pan_number_hash column for searchable encrypted PAN deduplication
ALTER TABLE editors ADD COLUMN IF NOT EXISTS pan_number_hash text;

-- Performance indexes for high-frequency query patterns
CREATE INDEX IF NOT EXISTS orders_client_id_idx           ON orders (client_id);
CREATE INDEX IF NOT EXISTS orders_editor_status_idx       ON orders (editor_id, status);
CREATE INDEX IF NOT EXISTS orders_deadline_idx            ON orders (deadline);
CREATE INDEX IF NOT EXISTS orders_delivered_at_idx        ON orders (delivered_at);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx    ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS payouts_editor_id_idx          ON payouts (editor_id);
CREATE INDEX IF NOT EXISTS messages_order_id_idx          ON messages (order_id);
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx        ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee_id_idx        ON reviews (reviewee_id);
CREATE INDEX IF NOT EXISTS point_transactions_user_reason_idx ON point_transactions (user_id, reason);
