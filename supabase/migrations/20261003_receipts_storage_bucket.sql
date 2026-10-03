-- Migration: 20261003_receipts_storage_bucket.sql
-- Setup Supabase Storage bucket 'receipts' and automated cleanup policies

-- 1. Create receipts bucket if not already existing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    true,
    5242880, -- 5 MB limit (clients compress to <= 300 KB)
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS policies for receipts bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access for receipts'
    ) THEN
        CREATE POLICY "Public Access for receipts" ON storage.objects
        FOR SELECT USING (bucket_id = 'receipts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Upload for receipts'
    ) THEN
        CREATE POLICY "Public Upload for receipts" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'receipts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Update for receipts'
    ) THEN
        CREATE POLICY "Public Update for receipts" ON storage.objects
        FOR UPDATE USING (bucket_id = 'receipts');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Delete for receipts'
    ) THEN
        CREATE POLICY "Public Delete for receipts" ON storage.objects
        FOR DELETE USING (bucket_id = 'receipts');
    END IF;
END $$;
