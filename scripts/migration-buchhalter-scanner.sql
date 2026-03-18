-- Migration: Buchhalter Scanner (externe Belege)
-- Run in Supabase SQL Editor

-- 1. Folders for organizing external companies
CREATE TABLE IF NOT EXISTS buchhalter_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buchhalter_id UUID NOT NULL REFERENCES majstors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buchhalter_folders_user ON buchhalter_folders(buchhalter_id);

-- 2. Belege (receipts) uploaded by Buchhalter for external clients
CREATE TABLE IF NOT EXISTS buchhalter_belege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buchhalter_id UUID NOT NULL REFERENCES majstors(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES buchhalter_folders(id) ON DELETE CASCADE,
  month INTEGER,
  year INTEGER,
  storage_path TEXT NOT NULL,
  filename TEXT,
  file_type TEXT,
  -- scan results (same as ausgaben)
  vendor TEXT,
  receipt_date DATE,
  amount_gross DECIMAL(12,2),
  amount_net DECIMAL(12,2),
  vat_rate DECIMAL(5,2),
  vat_amount DECIMAL(12,2),
  category TEXT,
  description TEXT,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buchhalter_belege_user ON buchhalter_belege(buchhalter_id);
CREATE INDEX idx_buchhalter_belege_folder ON buchhalter_belege(folder_id);
CREATE INDEX idx_buchhalter_belege_period ON buchhalter_belege(year, month);

-- 3. Add scan_count column if not exists (for tracking free scans)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'majstors' AND column_name = 'scan_count') THEN
    ALTER TABLE majstors ADD COLUMN scan_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 4. Storage bucket for buchhalter belege
INSERT INTO storage.buckets (id, name, public)
VALUES ('buchhalter-belege', 'buchhalter-belege', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies
CREATE POLICY "buchhalter_belege_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'buchhalter-belege' AND auth.role() = 'authenticated');

CREATE POLICY "buchhalter_belege_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'buchhalter-belege' AND auth.role() = 'authenticated');

CREATE POLICY "buchhalter_belege_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'buchhalter-belege' AND auth.role() = 'authenticated');
