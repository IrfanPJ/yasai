-- GR Report: add a Destination column, auto-filled from the GCN's
-- destination at entry-creation time (same as how pickup_point is now
-- auto-filled from the GCN's origin_zone instead of being left blank).
ALTER TABLE public.gr_report_entries
  ADD COLUMN destination TEXT;
