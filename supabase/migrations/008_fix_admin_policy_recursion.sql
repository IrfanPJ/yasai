-- The real source of the 42P17 "infinite recursion" error is the original
-- admins_all_profiles policy (migration 001): its EXISTS subquery reads
-- user_profiles from within a policy protecting user_profiles, which is
-- itself subject to the same policy recursively. This never fired before
-- because every prior write went through the service-role client (which
-- bypasses RLS); the new self-update policy was the first to exercise a
-- regular RLS-bound query path against this table.
--
-- Fix: check admin status via a SECURITY DEFINER function instead of an
-- inline self-referencing subquery, exactly like 007 did for role/is_active.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "admins_all_profiles" ON public.user_profiles;

CREATE POLICY "admins_all_profiles" ON public.user_profiles
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());
