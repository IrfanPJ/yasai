-- Per-user module visibility/access override.
-- NULL (default) = unrestricted: the user gets full access per their role,
-- exactly as before this column existed.
-- A non-null array narrows that further to only the listed module keys —
-- it can only take access away, never grant more than the role already allows.
ALTER TABLE public.user_profiles
  ADD COLUMN module_access TEXT[];

COMMENT ON COLUMN public.user_profiles.module_access IS
  'Per-user module allow-list overlay. NULL = unrestricted (role-only access, default). Non-null = restrict this user to only these module keys (see src/lib/modules.ts for the canonical list), in addition to whatever their role already permits.';
