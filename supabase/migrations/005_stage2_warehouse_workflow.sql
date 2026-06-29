-- ═══════════════════════════════════════════════════════════════
-- Stage 2: Goods Receival at Origin Warehouse
-- Migration: 005_stage2_warehouse_workflow.sql
-- ═══════════════════════════════════════════════════════════════

-- Add the "Warehouse Incharge - 2" role
ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'operations', 'warehouse', 'warehouse_supervisor', 'viewer'));

-- Warehouse receiving + approval workflow fields
ALTER TABLE public.goods_collection_notes
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS palletized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warehouse_received_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS warehouse_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warehouse_verified_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS warehouse_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warehouse_report_status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (warehouse_report_status IN ('not_submitted', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS warehouse_report_notes TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_report_submitted_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS warehouse_report_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warehouse_report_approved_by UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS warehouse_report_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warehouse_report_rejection_reason TEXT;

COMMENT ON COLUMN public.goods_collection_notes.warehouse_report_status IS
  'Stage 2 approval sub-workflow, independent of the main status field';
