-- Migration: Add AI scan fields to ausgaben table
-- Run this in Supabase SQL Editor

ALTER TABLE ausgaben
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS receipt_date date,
  ADD COLUMN IF NOT EXISTS amount_gross numeric(10,2),
  ADD COLUMN IF NOT EXISTS amount_net numeric(10,2),
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS vat_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ausgaben_vendor ON ausgaben(vendor);
CREATE INDEX IF NOT EXISTS idx_ausgaben_receipt_date ON ausgaben(receipt_date);
CREATE INDEX IF NOT EXISTS idx_ausgaben_category ON ausgaben(category);

-- Track scan usage per buchhalter (on majstors table)
ALTER TABLE majstors
  ADD COLUMN IF NOT EXISTS scan_count integer DEFAULT 0;
