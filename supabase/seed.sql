-- ═══════════════════════════════════════════════════════════════
-- YASAI Logistics – Seed Data
-- ═══════════════════════════════════════════════════════════════
-- NOTE: Run this after creating your first admin user via Supabase Auth.
-- Replace 'YOUR_ADMIN_USER_ID' with the actual UUID from auth.users.

-- ─── Update the first user to admin role ─────────────────────
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'admin@yasailogistics.com';

-- ─── Sample Goods Collection Notes ───────────────────────────
-- These are for development/testing only. Remove from production.

-- INSERT INTO public.goods_collection_notes (
--   collection_number, shipper_name, consignee_name, destination,
--   commodity, cargo_type, status, weight_kg, volume_cbm, num_packages
-- ) VALUES
-- ('YAS-2026-0001', 'GUEDCO AUTO SPARE PARTS', 'TAIF AL SHARQ',
--  'KSA', 'Spare Parts', 'land', 'delivered', 328.00, 0.60, '1 PLT'),
-- ('YAS-2026-0002', 'EMIRATES ELECTRONICS LLC', 'RIYADH TECH DIST',
--  'Riyadh, KSA', 'Electronics', 'air', 'in_transit', 145.50, 0.32, '3 CTN'),
-- ('YAS-2026-0003', 'DUBAI PHARMA EXPORTS', 'JEDDAH MED SUPPLIES',
--  'Jeddah, KSA', 'Pharmaceuticals', 'sea', 'in_warehouse', 850.00, 2.40, '10 CTN');
