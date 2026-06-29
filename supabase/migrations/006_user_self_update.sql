-- Allow any authenticated user to update their own profile (e.g. full_name),
-- while explicitly preventing self-escalation of role or is_active.
-- (Previously only the "admins_all_profiles" policy permitted UPDATE, so
-- non-admin users saving their profile in Settings was silently blocked by RLS.)
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM public.user_profiles WHERE id = auth.uid())
  );
