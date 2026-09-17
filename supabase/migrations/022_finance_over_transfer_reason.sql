-- When a Fund Transfer linked to a Fund Collection exceeds what's left of
-- that collection's amount (after other transfers already drawn against
-- it), the form requires a reason before letting it through. Stored here
-- rather than folded into the general `notes` field so it's a distinct,
-- queryable audit trail of every over-draw and why.
ALTER TABLE public.fund_transfers
  ADD COLUMN over_transfer_reason TEXT;

COMMENT ON COLUMN public.fund_transfers.over_transfer_reason IS
  'Required only when this transfer''s amount exceeded the linked collection''s remaining (unattributed) balance at submission time.';
