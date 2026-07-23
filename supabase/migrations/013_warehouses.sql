-- Warehouses lookup table
CREATE TABLE public.warehouses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  country    TEXT NOT NULL CHECK (country IN ('UAE', 'KSA')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default warehouses
INSERT INTO public.warehouses (code, name, country) VALUES
  ('UW01', 'UAE Warehouse 1', 'UAE'),
  ('UW02', 'UAE Warehouse 2', 'UAE'),
  ('UW03', 'UAE Warehouse 3', 'UAE'),
  ('KR',   'Saudi Riyadh',    'KSA'),
  ('KJ',   'Saudi Jeddah',    'KSA'),
  ('KD',   'Saudi Dammam',    'KSA');

-- Assign a warehouse to a user (for warehouse / warehouse_supervisor roles)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

-- RLS: authenticated users can read warehouses
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_warehouses" ON public.warehouses
  FOR SELECT TO authenticated USING (true);
