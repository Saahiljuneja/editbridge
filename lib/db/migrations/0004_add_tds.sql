-- Add TDS columns to payouts table
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS tds_amount integer NOT NULL DEFAULT 0;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS tds_rate_pct integer NOT NULL DEFAULT 0;

-- Add PAN document URL to KYC applications
ALTER TABLE kyc_applications ADD COLUMN IF NOT EXISTS pan_document_url text;

-- Add KYC expiry support
ALTER TYPE kyc_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TABLE editors ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;
