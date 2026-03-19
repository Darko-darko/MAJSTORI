-- Add uploaded_by column to ausgaben table
-- Tracks who uploaded the receipt (majstor or buchhalter)
-- If uploaded_by != majstor_id, it was uploaded by the buchhalter

ALTER TABLE ausgaben ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Backfill: existing records were uploaded by the majstor themselves
UPDATE ausgaben SET uploaded_by = majstor_id WHERE uploaded_by IS NULL;
