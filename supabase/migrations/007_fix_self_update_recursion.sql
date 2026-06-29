-- The 006 policy's WITH CHECK subquery referenced user_profiles from within
-- a policy protecting user_profiles, causing "infinite recursion detected
-- in policy for relation user_profiles" (surfaced as a 500 from PostgREST).
-- Fix: use SECURITY DEFINER helper functions, which bypass RLS internally
-- and avoid the recursive policy evaluation.

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_profile_is_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_active FROM public.user_profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.current_profile_role()
    AND is_active = public.current_profile_is_active()
  );
