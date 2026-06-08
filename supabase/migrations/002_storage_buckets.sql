-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Supabase Storage Setup
-- Migration: 002_storage_buckets.sql
-- ═══════════════════════════════════════════════════════════════

-- Create the storage bucket for GCN files (PDFs + QR codes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'goods-collection-notes',
  'goods-collection-notes',
  TRUE,
  52428800,  -- 50 MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public               = TRUE,
  file_size_limit      = 52428800,
  allowed_mime_types   = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- ─── Storage RLS Policies ─────────────────────────────────────

-- Public read (anyone can access PDF and QR code links)
CREATE POLICY "public_read_gcn_files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'goods-collection-notes');

-- Authenticated write
CREATE POLICY "auth_upload_gcn_files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'goods-collection-notes'
    AND auth.uid() IS NOT NULL
  );

-- Authenticated update
CREATE POLICY "auth_update_gcn_files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'goods-collection-notes'
    AND auth.uid() IS NOT NULL
  );

-- Admin delete
CREATE POLICY "admin_delete_gcn_files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'goods-collection-notes'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
