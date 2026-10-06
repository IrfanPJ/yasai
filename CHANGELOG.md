# Changelog

All notable updates to YASAI Logistics, by date. Newest first.

## 2026-10-06
- GR Report table: the wide table's horizontal scrollbar was easy to miss, so added a visible "Scroll for more columns" hint with left/right arrow buttons (disabled at each end) above the table, in addition to normal scroll/swipe
- Fixed those buttons doing nothing: the shared Table component renders its own internal scroll container, one level deeper than the div we'd wrapped it in, so our scroll commands were hitting the wrong element. Now targets the real one via the table ref
- Added click-and-drag panning on the GR Report table (mouse only — touch already scrolls natively): grab anywhere and drag to pan horizontally, cursor shows a grab/grabbing hand

## 2026-10-05 (5)
- **Fixed a real bug**: converting a Manifest sheet to a Job Order never filled in the GR Report's Job#/Job Date for the GCNs it linked — only the separate "link a single GCN to a job" action did that. Since Manifest conversion is the main way jobs get created, this had been silently leaving GR Report job numbers blank for every bulk-converted sheet. `convertSheetToManifest()` now fills them in the same way the single-link route does
- Backfilled production GR Report: Zone filled on 48 rows (from each entry's GCN's `origin_zone`), Destination filled on 177 rows. Job#/Job Date backfill found 0 rows needing it — the previously-converted manifests that would've needed it were since deleted (their `job_order_gcns` links went with them), so there's nothing currently broken, just the forward-fix
- 129 GR Report rows still have no Zone — their underlying GCN never had `origin_zone` set in the first place (pre-dates the zone-collection workflow), so there's no source data to backfill from. Needs manual correction if those need filling

## 2026-10-05 (4)
- Fixed Settings page layout: the whole page (including the Users & Roles and Warehouses tabs) was capped at `max-w-4xl`, which is right for the narrow Profile/Appearance/Company forms but left wide stat-card grids and the Users & Roles table needlessly cramped with a horizontal scrollbar and a large unused gap on wide screens. The width cap now only applies to the three narrow tabs; Users & Roles and Warehouses use the full available width
- Role overview cards (6 roles) now lay out up to 6-per-row on large screens instead of always wrapping to 2 rows
- Settings tab bar now scrolls horizontally instead of silently clipping tabs on narrow/mobile screens

## 2026-10-05 (3)
- Fixed Freight Invoice job number precedence: a manually-typed job number now correctly overrides a linked Job Order's number wherever it's shown (PDF, invoice list, invoice detail) — it was backwards before, with the linked job always winning even when a manual number was explicitly entered
- Invoice list and invoice detail page previously showed nothing for a manual-only job number (no linked Job Order) — now both display it, tagged "(Manual)" or "(Linked)" so the source is always clear
- Manifest exports (PDF, Excel) and the Manifest sheet detail page now show the Job Number once a sheet has been converted — previously the converted sheet's linked Job Order existed in the data but was never surfaced on the exported document, only reachable by clicking through
- GR Report: the "Pickup Point" column is actually always the GCN's collection zone (Mainland/JAFZA), so relabeled it "Zone" everywhere (grid, PDF export, Excel export) and it's now auto-filled from the GCN at entry creation instead of being left blank for manual entry
- Added a "Destination" column to the GR Report (grid, PDF export, Excel export), auto-filled from the GCN's destination. Requires migration `028_gr_report_destination.sql` (`gr_report_entries.destination`)

## 2026-10-05 (2)
- Added per-user module access control. Admins can now restrict a specific user to only certain sidebar modules (Collections, Job Orders, Manifest, Invoices, GR Report, Records, Waybills, Finance, Audit Logs) from Settings → Users & Roles — it only narrows what their role already allows, never grants more. Enforced at three layers: the sidebar hides restricted items, a new per-module page `layout.tsx` redirects home if a restricted user navigates there directly, and each module's top-level list/create API route rejects restricted users server-side. Requires migration `027_user_module_access.sql` (`user_profiles.module_access`, nullable — `NULL` = unrestricted, so every existing user is unaffected by default). Nested action routes (e.g. `/api/jobs/[id]/approve`) are not individually re-gated in this first pass — a deliberate v1 scope call, not an oversight

## 2026-10-05
- Fixed the SAR (Alinma Bank) account number and IBAN on the Freight Invoice — both the printed PDF and the read-only preview in the invoice form had the wrong trailing digit and transposed IBAN check digits (`...42000`/`SA 410...` instead of the correct `...42001`/`SA 140...`), per the bank's own customer-info certificate

## 2026-09-30
- Added this CHANGELOG.md, kept updated with every change going forward
- Deleted `feature/gr-report` (local + GitHub) — fully merged into `feature/manifest`, which now carries both Manifest and GR Report
- Applied `025_manifest_cbm_threshold.sql` to production (was missing — schema had `consolidation_sheets`/`items` but no `cbm`/`cbm_total` columns)
- Production data backfill from the 29-09-26 KSA pending consolidation PDFs (Mainland + JAFZA): fixed `origin_zone` on 9 already-existing GCNs, created 21 new GCNs for shipments that had never been entered, seeded 25 missing `gr_report_entries` rows, and built the two zones' first-ever pending consolidation sheets (19 items/19 pallets Mainland, 11 items/27 pallets JAFZA) — both stay pending, well under the auto-conversion thresholds
- Added a new "Package" package type (dropdown + PackageType enum) for generic/unspecified packages that aren't a Pallet/Piece/Box/Carton/Each
- Fixed the 21 backfilled GCNs' package data to use real dropdown-defined types (Ctn/Ctns -> Carton, Pallet/Pallets -> Pallet, Pkgs -> the new Package type) instead of raw PDF wording, matching how the form itself would save them
- Normalized 135 of the remaining 138 production GCNs (all the pre-existing ones that had never been through the structured package-lines UI) to real `package_items` — fixed casing/spelling/abbreviation inconsistencies (PLT/PLTS/Ctns/pkgs/etc.) and split the 9 rows that mixed two types in one string into two lines each. Left 3 alone as agreed: 2 with blank package data, 1 ("8 cartoon 3 bundle") with a type that doesn't map cleanly
- Fixed the last one too — "8 cartoon 3 bundle" (`YAS-10020`) -> 8 Carton + 3 Each. Only the 2 blank ones remain untouched (no data to parse)
- Added a Mainland/JAFZA zone filter (+ column, + CSV export) to the main Collections list
- Changed the zone filter from a dropdown to one-click toggle buttons (All / Mainland / JAFZA)
- GCN detail page now shows a "GR Report Documents" section (Freight Invoice / Delivery Note / Invoice) with view/upload, same data as GR Report and the Manifest sheet
- Merged `feature/manifest` into `main` — Manifest/consolidation sheets, GR Report, and everything built on top of them are now part of `main`

## 2026-10-03
- Ran a full 14-point security audit (read-only, no fixes applied) — report delivered, awaiting decision on what to fix and in what order
- Production data cleanup on the Mainland pending consolidation sheet: added GCN `FC-2026-0111`, permanently deleted the stale `FC-2026-0112` removal-history record
- Reserved manifest sheet number 24 for whichever zone (Mainland or JAFZA) converts to a manifest next, without touching the two sheets that exist right now
- Deleted the two old converted-to-manifest `consolidation_sheets` rows (`CS-MAINLAND-2026-0002`, `CS-JAFZA-2026-0003`) and their linked Job Orders (`JOB-2026-0004`, `JOB-2026-0005`) — no GCNs were deleted
- **Removed automatic CBM/pallet-count conversion entirely.** Converting a pending sheet to a manifest is now manual-only via the "Convert to Manifest" button; the 40.5 CBM / 45 pallet auto-trigger and its UI progress bars are gone (dashboard cards and sheet detail page now just show the running totals, no limit)

## 2026-10-01
- Invoice detail page shows who created it and when, with an admin-only edit control to correct the creation date and reassign the creator (works regardless of invoice status, not just drafts)
- Added an "Invoice Date" field to all three invoice creation forms (standard, freight, uploaded) so the creator can backdate it instead of always defaulting to today — open to anyone who can already create invoices, same as before
- Opened up the invoice creation-date/creator edit control to all users, not just admins (for now)
- Closed audit-log gaps across Manifest, GR Report, Invoices, and Job Orders: sheet items added/updated/removed/restored, requeue batches, GR Report field edits and F/D/I uploads/removals, invoice edits and creation-date/creator corrections, job order edits/deletes, and GCN link/unlink on job orders all now write to activity_logs (previously silent)
- Added an onInvalid handler to the GCN edit form so a failed client-side validation now shows a toast naming the problem field, instead of the Save button silently doing nothing
- **Fixed the real bug behind "Save Changes does nothing"**: `billing_type` was `z.enum(...).optional()`, which does not accept `null` — but the DB stores `NULL` for any GCN where billing was never set, so editing *any* such GCN (the majority) silently failed validation unless the user happened to pick a billing type first. Changed to `.nullable().optional()`.

## 2026-09-29
- Invoice PDFs: new warehouse address, updated mobile number, legal name → YASAI LOGISTICS LLC, added TRN (`main`)

## 2026-09-28
- GR Report module: auto-logged sheet per GCN, editable grid, search, Excel/PDF date-range export (`feature/gr-report` / `feature/manifest`)
- Freight Invoice / Delivery Note / Invoice upload status (✓/✗) shown on GCN rows in GR Report and on the pending consolidation sheet
- Job Order shows a "View Manifest" button instead of Packing List when created from a Manifest sheet
- Inline undo/restore on the consolidation sheet page; removal history split by zone (Mainland / JAFZA)
- Removal queue for pending consolidation sheets (undo, restore, history log)
- GCN package types expanded to PAL, PCS, BOX, CRTN, EA
- Mixed package types per GCN (pallets, pieces, cartons, boxes) re-added after a temporary revert
- Accounting-style number formatting on invoices (e.g. 17,456.00)
- ESLint warnings cleaned up across branches

## 2026-09-24
- Manifest / consolidation sheets by zone (Mainland/JAFZA), auto-converting to a Job Order at 40.5 CBM or 45 pallets, whichever comes first
- Invoice editing support + Reference Number field
- Freight invoice VAT/total accuracy fix; halala/fils/cents no longer dropped from amount-in-words
- UAE phone number fix on freight invoice PDF
- Fixed duplicate migration version-prefix bug (011, 012)

## 2026-09-21
- Warehouse tracking module merged with Finance currency/banking work (`feature/warehouse-and-finance`)

## 2026-09-15 – 2026-09-17
- Warehouse tracking module: simplified GCN status, event timeline
- Source/destination currency pairs, reusable bank profiles
- "By Currency" dashboard: live balances, collection traceability, over-transfer reason logging
- Pallet dimension calculator for GCN volume (CBM)

## 2026-09-09 – 2026-09-10
- Freight invoice: matches reference template, AED bank details, manual job number, meta box (No/Date/Job No/Shipper/Destination/Payment)
- Auto-fill delivery note from GCN data
- Finance mobile nav layout behind a feature flag

## 2026-09-01 – 2026-09-04
- Finance module: fund collections, transfers, supplier payments, backup documents
- Finance dashboard, uploads, chain view, filters, receipt PDF
- Searchable record-picker for finance link fields

## 2026-08-06 – 2026-08-14
- Waybill module: create, view, edit, PDF download, Supabase Storage
- Password reset (admin-triggered) added to Settings

## 2026-07-22 – 2026-07-27
- Job Orders, Invoices, and CRM stages (3–8) added
- Warehouse management: codes, settings tab, user assignment
- 10-step job order status flow with stepper UI
- GCN document uploads, status history, tracking timestamps
- Multi-truck UAE → Saudi shipment workflow

## 2026-07-14
- Delivery Note added to collections (form, detail, PDF) with full YASAI branding

## 2026-06-29
- Stage 2 warehouse receiving and approval workflow
- Fixed infinite-recursion RLS bug on user_profiles

## 2026-06-08 – 2026-06-23
- Initial YASAI Logistics GCN system
- Sidebar, PDF template, user management, logo/favicon
- Collection number format changed to YAS-NNNNN
