# Changelog

All notable updates to YASAI Logistics, by date. Newest first.

## 2026-09-30
- Added this CHANGELOG.md, kept updated with every change going forward
- Deleted `feature/gr-report` (local + GitHub) — fully merged into `feature/manifest`, which now carries both Manifest and GR Report
- Applied `025_manifest_cbm_threshold.sql` to production (was missing — schema had `consolidation_sheets`/`items` but no `cbm`/`cbm_total` columns)
- Production data backfill from the 29-09-26 KSA pending consolidation PDFs (Mainland + JAFZA): fixed `origin_zone` on 9 already-existing GCNs, created 21 new GCNs for shipments that had never been entered, seeded 25 missing `gr_report_entries` rows, and built the two zones' first-ever pending consolidation sheets (19 items/19 pallets Mainland, 11 items/27 pallets JAFZA) — both stay pending, well under the auto-conversion thresholds
- Added a new "Package" package type (dropdown + PackageType enum) for generic/unspecified packages that aren't a Pallet/Piece/Box/Carton/Each
- Fixed the 21 backfilled GCNs' package data to use real dropdown-defined types (Ctn/Ctns -> Carton, Pallet/Pallets -> Pallet, Pkgs -> the new Package type) instead of raw PDF wording, matching how the form itself would save them
- Normalized 135 of the remaining 138 production GCNs (all the pre-existing ones that had never been through the structured package-lines UI) to real `package_items` — fixed casing/spelling/abbreviation inconsistencies (PLT/PLTS/Ctns/pkgs/etc.) and split the 9 rows that mixed two types in one string into two lines each. Left 3 alone as agreed: 2 with blank package data, 1 ("8 cartoon 3 bundle") with a type that doesn't map cleanly

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
