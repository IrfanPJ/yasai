-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Initial Schema
-- Migration: 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── User Profiles ─────────────────────────────────────────────
-- Extends Supabase auth.users with role and profile info
CREATE TABLE public.user_profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'operations', 'warehouse', 'viewer')),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS
  'Extended user profiles with role-based access';

-- ─── GCN Sequences (one per year) ────────────────────────────
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2025 START 1;
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2027 START 1;
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2028 START 1;
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2029 START 1;
CREATE SEQUENCE IF NOT EXISTS gcn_seq_2030 START 1;

-- ─── Generate Collection Number ───────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_collection_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year     TEXT;
  v_seq      BIGINT;
  v_seq_name TEXT;
  v_number   TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;
  v_seq_name := 'gcn_seq_' || v_year;

  -- Dynamically get next value from the year's sequence
  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_seq;

  v_number := 'YAS-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- ─── Goods Collection Notes ───────────────────────────────────
CREATE TABLE public.goods_collection_notes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_number    TEXT UNIQUE NOT NULL,

  -- Shipper
  shipper_name         TEXT NOT NULL,

  -- Consignee
  consignee_name       TEXT NOT NULL,
  contact_person       TEXT,
  phone                TEXT,
  email                TEXT,

  -- Cargo details
  destination          TEXT NOT NULL,
  commodity            TEXT NOT NULL,
  cargo_type           TEXT NOT NULL
                         CHECK (cargo_type IN ('air', 'sea', 'land')),
  shipping_mark        TEXT,
  doc_ref_number       TEXT,
  special_instructions TEXT,

  -- Package
  num_packages         TEXT,
  package_type         TEXT,
  volume_cbm           NUMERIC(10, 3),
  weight_kg            NUMERIC(10, 3),

  -- Billing
  billing_type         TEXT CHECK (billing_type IN ('customer', 'supplier')),

  -- Signatures (base64 PNG data URLs)
  receiver_signature   TEXT,
  staff_signature      TEXT,

  -- Status
  status               TEXT NOT NULL DEFAULT 'collected'
                         CHECK (status IN (
                           'collected', 'in_warehouse', 'in_transit',
                           'customs_clearance', 'out_for_delivery', 'delivered'
                         )),

  -- Generated files
  pdf_url              TEXT,
  qr_url               TEXT,

  -- Metadata
  created_by           UUID REFERENCES public.user_profiles(id),
  updated_by           UUID REFERENCES public.user_profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

COMMENT ON TABLE public.goods_collection_notes IS
  'Core table storing all Goods Collection Notes';

-- ─── Attachments ─────────────────────────────────────────────
CREATE TABLE public.attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gcn_id      UUID NOT NULL REFERENCES public.goods_collection_notes(id)
                ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT,
  file_size   INTEGER,
  uploaded_by UUID REFERENCES public.user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Activity Logs ───────────────────────────────────────────
CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.user_profiles(id),
  action      TEXT NOT NULL,   -- CREATE, UPDATE, DELETE, LOGIN, EXPORT
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_gcn_collection_number ON public.goods_collection_notes (collection_number);
CREATE INDEX idx_gcn_status            ON public.goods_collection_notes (status);
CREATE INDEX idx_gcn_cargo_type        ON public.goods_collection_notes (cargo_type);
CREATE INDEX idx_gcn_created_at        ON public.goods_collection_notes (created_at DESC);
CREATE INDEX idx_gcn_deleted_at        ON public.goods_collection_notes (deleted_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_gcn_shipper           ON public.goods_collection_notes
  USING gin (to_tsvector('english', shipper_name));
CREATE INDEX idx_gcn_consignee         ON public.goods_collection_notes
  USING gin (to_tsvector('english', consignee_name));
CREATE INDEX idx_attachments_gcn       ON public.attachments (gcn_id);
CREATE INDEX idx_logs_user             ON public.activity_logs (user_id);
CREATE INDEX idx_logs_entity           ON public.activity_logs (entity_type, entity_id);
CREATE INDEX idx_logs_created_at       ON public.activity_logs (created_at DESC);

-- ─── Triggers: updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_gcn_updated_at
  BEFORE UPDATE ON public.goods_collection_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Trigger: auto-create user_profile on signup ─────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_collection_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs          ENABLE ROW LEVEL SECURITY;

-- user_profiles: users see own profile; admins see all
CREATE POLICY "users_select_own" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admins_all_profiles" ON public.user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- goods_collection_notes: all authenticated users can read
CREATE POLICY "auth_select_gcn" ON public.goods_collection_notes
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "auth_insert_gcn" ON public.goods_collection_notes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'operations', 'warehouse')
        AND p.is_active = TRUE
    )
  );

CREATE POLICY "auth_update_gcn" ON public.goods_collection_notes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'operations')
        AND p.is_active = TRUE
    )
  );

CREATE POLICY "admin_delete_gcn" ON public.goods_collection_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.is_active = TRUE
    )
  );

-- attachments: same as GCN
CREATE POLICY "auth_select_attachments" ON public.attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_insert_attachments" ON public.attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- activity_logs: all authenticated users can insert; admins see all
CREATE POLICY "auth_insert_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth_select_logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'operations')
    )
  );
