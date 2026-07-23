-- Resubmission limit tracking
ALTER TABLE editors ADD COLUMN IF NOT EXISTS kyc_rejection_count integer NOT NULL DEFAULT 0;

-- Admin internal notes (not visible to editors)
ALTER TABLE kyc_applications ADD COLUMN IF NOT EXISTS admin_notes text;

-- Submission number for history tracking
ALTER TABLE kyc_applications ADD COLUMN IF NOT EXISTS submission_number integer NOT NULL DEFAULT 1;
