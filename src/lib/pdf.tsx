import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image, renderToBuffer,
} from "@react-pdf/renderer";
import type { GoodsCollectionNote } from "@/types";
import { format } from "date-fns";

// Helper so we don't have to type React.createElement every time
const el = React.createElement;

// Coerce any value to a plain string — prevents React element objects being
// passed as Text children which triggers React error #31 in @react-pdf/renderer
const str = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

// ─── Brand colours ─────────────────────────────────────────────────────────
const NAVY   = "#071A3A";
const ORANGE = "#E67A32";
const BORDER = "#C8A882";
const HDR_BG = "#E8B88A";
const WHITE  = "#FFFFFF";

// ─── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111",
    backgroundColor: WHITE,
    padding: 0,
  },

  // ── LETTERHEAD HEADER ─────────────────────────────────────────────────
  lhHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 22,
    paddingBottom: 14,
  },
  logoImg: {
    width: 170,
    height: 64,
  },
  contactBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  contactText: {
    fontSize: 8,
    color: "#333",
    marginRight: 6,
  },
  contactBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
  },
  contactBadgeText: {
    fontSize: 7,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  // Orange separator
  orangeLine: {
    height: 3,
    backgroundColor: ORANGE,
  },

  // ── BODY ──────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 30,
    paddingTop: 14,
    paddingBottom: 14,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  noLabel: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#222" },
  noValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: ORANGE },
  badge: {
    backgroundColor: ORANGE,
    paddingHorizontal: 22,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: { fontFamily: "Helvetica-Bold", fontSize: 13, color: WHITE },

  // ── TABLE ─────────────────────────────────────────────────────────────
  table:    { borderWidth: 1.5, borderColor: BORDER },
  tRow:     { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: BORDER },
  tRowLast: { flexDirection: "row" },

  hCell: {
    backgroundColor: HDR_BG,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1.5,
    borderRightColor: BORDER,
  },
  hText: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#333", textAlign: "center" },

  subRow:  { flexDirection: "row", borderTopWidth: 1.5, borderTopColor: BORDER },
  subCell: { flex: 1, alignItems: "center", paddingVertical: 3, borderRightWidth: 1.5, borderRightColor: BORDER },
  subText: { fontSize: 6.5, color: "#333", fontFamily: "Helvetica-Bold" },

  dCell: {
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1.5,
    borderRightColor: BORDER,
    minHeight: 40,
    backgroundColor: WHITE,
  },
  dBold: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#111" },
  dNorm: { fontFamily: "Helvetica", fontSize: 9, color: "#222" },
  dSm:   { fontFamily: "Helvetica", fontSize: 7.5, color: "#666", marginTop: 2 },

  sigCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1.5,
    borderRightColor: BORDER,
    minHeight: 68,
    justifyContent: "flex-start",
    backgroundColor: WHITE,
  },
  sigImg:  { width: 90, height: 42, objectFit: "contain" },
  sigLine: { borderBottomWidth: 1, borderBottomColor: "#BBBBBB", marginTop: 48 },

  cb:       { width: 12, height: 12, borderWidth: 1.5, borderColor: "#444", justifyContent: "center", alignItems: "center" },
  cbFilled: { backgroundColor: NAVY, borderColor: NAVY },
  cbMark:   { color: WHITE, fontSize: 8, fontFamily: "Helvetica-Bold" },

  qrRow:   { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10 },
  qrLabel: { fontSize: 6.5, color: "#999", textAlign: "right", marginRight: 8 },
  qrImg:   { width: 50, height: 50 },

  // ── LETTERHEAD FOOTER ─────────────────────────────────────────────────
  lhFooter: {
    backgroundColor: NAVY,
    paddingHorizontal: 30,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  footerRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  pinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ORANGE,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  pinCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ORANGE,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  pinDot: { fontSize: 8, color: ORANGE, fontFamily: "Helvetica-Bold" },
  footerTextBlock: { flexDirection: "column" },
  footerCompanyEN: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3 },
  footerAddrEN:    { fontSize: 7, color: "#AAAAAA", lineHeight: 1.5 },
  footerCompanyAR: { fontSize: 9, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 3, textAlign: "right" },
  footerAddrAR:    { fontSize: 7, color: "#AAAAAA", lineHeight: 1.5, textAlign: "right" },
  footerTextRight: { flexDirection: "column", alignItems: "flex-end" },
});

// ─── Helper components ──────────────────────────────────────────────────────

function Checkbox({ checked }: { checked: boolean }) {
  // Don't spread an empty {} into the style array — causes renderer issues
  return el(View, { style: checked ? [S.cb, S.cbFilled] : S.cb },
    checked ? el(Text, { style: S.cbMark }, "X") : null,
  );
}

function ContactRow({ symbol, text }: { symbol: string; text: string }) {
  return el(View, { style: S.contactRow },
    el(Text, { style: S.contactText }, text),
    el(View, { style: S.contactBadge },
      el(Text, { style: S.contactBadgeText }, symbol),
    ),
  );
}

// ─── Main document ─────────────────────────────────────────────────────────

interface Props {
  data: GoodsCollectionNote;
  qrDataUrl?: string;
  logoDataUrl: string;
}

function buildDoc({ data, qrDataUrl, logoDataUrl }: Props) {
  const date = format(new Date(data.created_at), "dd-M-yy");

  const cargoLabel =
    data.cargo_type === "air" ? "Air Freight"
    : data.cargo_type === "sea" ? "Sea Freight"
    : "Land Freight";

  return el(Document,
    { title: `YASAI GCN ${str(data.collection_number)}`, author: "YASAI Logistics", subject: "Goods Collection Note" },

    el(Page, { size: "A4", style: S.page },

      // ══ LETTERHEAD HEADER ════════════════════════════════════════
      el(View, { style: S.lhHeader },
        el(Image, { src: logoDataUrl, style: S.logoImg }),
        el(View, { style: S.contactBlock },
          el(ContactRow, { key: "ph", symbol: "T", text: "+966 55 932 6687" }),
          el(ContactRow, { key: "em", symbol: "@", text: "info@yasailogistics.com" }),
          el(ContactRow, { key: "ww", symbol: "W", text: "www.yasailogistics.com" }),
        ),
      ),

      // ── Orange separator
      el(View, { style: S.orangeLine }),

      // ══ BODY ═════════════════════════════════════════════════════
      el(View, { style: S.body },

        // Title row — "No.: 123" uses a flex-row View instead of nested Text
        // (nested Text inside Text triggers React error #31 in react-pdf + Next.js 15)
        el(View, { style: S.titleRow },
          el(View, { style: S.titleLeft },
            el(Text, { style: S.noLabel }, "No.:  "),
            el(Text, { style: S.noValue }, str(data.collection_number)),
          ),
          el(View, { style: S.badge },
            el(Text, { style: S.badgeText }, "Goods Collection Note"),
          ),
        ),

        // ── TABLE ────────────────────────────────────────────────
        el(View, { style: S.table },

          // Row 1: Shipper | Consignee headers
          el(View, { style: S.tRow },
            el(View, { style: [S.hCell, { flex: 1 }] }, el(Text, { style: S.hText }, "Shipper")),
            el(View, { style: [S.hCell, { flex: 1, borderRightWidth: 0 }] }, el(Text, { style: S.hText }, "Consignee")),
          ),

          // Row 2: Shipper | Consignee values
          el(View, { style: S.tRow },
            el(View, { style: [S.dCell, { flex: 1 }] },
              el(Text, { style: S.dBold }, str(data.shipper_name)),
            ),
            el(View, { style: [S.dCell, { flex: 1, borderRightWidth: 0 }] },
              el(Text, { style: S.dBold }, str(data.consignee_name)),
              data.contact_person ? el(Text, { style: S.dSm }, "Contact: " + str(data.contact_person)) : null,
              data.phone ? el(Text, { style: S.dSm }, "Tel: " + str(data.phone)) : null,
            ),
          ),

          // Row 3: Cargo headers — Mode of Transport compound header
          el(View, { style: S.tRow },
            el(View, { style: [S.hCell, { flex: 1.5 }] }, el(Text, { style: S.hText }, "Cargo Particulars")),
            el(View, { style: [S.hCell, { flex: 1.5 }] }, el(Text, { style: S.hText }, "Shipping Mark")),
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Cargo type")),
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Date")),
            el(View, { style: [S.hCell, { flex: 2.2, borderRightWidth: 0, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 5 }] },
              el(Text, { style: [S.hText, { marginBottom: 3 }] }, "Mode of Transport"),
              el(View, { style: S.subRow },
                el(View, { style: S.subCell },                        el(Text, { style: S.subText }, "Sea Freight")),
                el(View, { style: S.subCell },                        el(Text, { style: S.subText }, "Air Freight")),
                el(View, { style: [S.subCell, { borderRightWidth: 0 }] }, el(Text, { style: S.subText }, "Land Freight")),
              ),
            ),
          ),

          // Row 4: Cargo values + transport checkboxes
          el(View, { style: S.tRow },
            el(View, { style: [S.dCell, { flex: 1.5 }] }, el(Text, { style: S.dNorm }, str(data.commodity))),
            el(View, { style: [S.dCell, { flex: 1.5 }] }, el(Text, { style: S.dNorm }, str(data.shipping_mark) || "-")),
            el(View, { style: [S.dCell, { flex: 1 }] },   el(Text, { style: S.dNorm }, cargoLabel)),
            el(View, { style: [S.dCell, { flex: 1, alignItems: "center", justifyContent: "center" }] },
              el(Text, { style: S.dBold }, date),
            ),
            el(View, { style: [S.dCell, { flex: 2.2, borderRightWidth: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }] },
              el(Checkbox, { key: "sea",  checked: data.cargo_type === "sea" }),
              el(Checkbox, { key: "air",  checked: data.cargo_type === "air" }),
              el(Checkbox, { key: "land", checked: data.cargo_type === "land" }),
            ),
          ),

          // Row 5: Destination headers — Billing of compound header
          el(View, { style: S.tRow },
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Destination")),
            el(View, { style: [S.hCell, { flex: 1.5 }] },  el(Text, { style: S.hText }, "Commodity")),
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Doc. Ref: No.")),
            el(View, { style: [S.hCell, { flex: 1.5 }] },  el(Text, { style: S.hText }, "Special Instructions")),
            el(View, { style: [S.hCell, { flex: 1.5, borderRightWidth: 0, paddingHorizontal: 0, paddingBottom: 0, paddingTop: 5 }] },
              el(Text, { style: [S.hText, { marginBottom: 3 }] }, "Billing of"),
              el(View, { style: S.subRow },
                el(View, { style: S.subCell },                            el(Text, { style: S.subText }, "Customer")),
                el(View, { style: [S.subCell, { borderRightWidth: 0 }] }, el(Text, { style: S.subText }, "Supplier")),
              ),
            ),
          ),

          // Row 6: Destination values + billing checkboxes
          el(View, { style: S.tRow },
            el(View, { style: [S.dCell, { flex: 1 }] },   el(Text, { style: S.dBold }, str(data.destination))),
            el(View, { style: [S.dCell, { flex: 1.5 }] },  el(Text, { style: S.dNorm }, str(data.commodity))),
            el(View, { style: [S.dCell, { flex: 1 }] },   el(Text, { style: S.dNorm }, str(data.doc_ref_number) || "-")),
            el(View, { style: [S.dCell, { flex: 1.5 }] },  el(Text, { style: S.dNorm }, str(data.special_instructions) || "-")),
            el(View, { style: [S.dCell, { flex: 1.5, borderRightWidth: 0, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }] },
              el(Checkbox, { key: "cust", checked: data.billing_type === "customer" }),
              el(Checkbox, { key: "supp", checked: data.billing_type === "supplier" }),
            ),
          ),

          // Row 7: Package info headers
          el(View, { style: S.tRow },
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "No. of Packages")),
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Volume (CBM)")),
            el(View, { style: [S.hCell, { flex: 1 }] },   el(Text, { style: S.hText }, "Weight ( Kgs)")),
            el(View, { style: [S.hCell, { flex: 1.5 }] },  el(Text, { style: S.hText }, "Signature")),
            el(View, { style: [S.hCell, { flex: 1.5, borderRightWidth: 0 }] },
              el(Text, { style: S.hText }, "Receiver's\nName and Signature"),
            ),
          ),

          // Row 8: Package values + signatures
          el(View, { style: S.tRowLast },
            el(View, { style: [S.dCell, { flex: 1, minHeight: 68 }] },
              el(Text, { style: S.dBold }, str(data.num_packages) || "-"),
            ),
            el(View, { style: [S.dCell, { flex: 1 }] },
              el(Text, { style: S.dBold }, data.volume_cbm ? Number(data.volume_cbm).toFixed(2) : "-"),
            ),
            el(View, { style: [S.dCell, { flex: 1 }] },
              el(Text, { style: S.dBold }, data.weight_kg ? Number(data.weight_kg).toFixed(2) + " KGS" : "-"),
            ),
            el(View, { style: [S.sigCell, { flex: 1.5 }] },
              data.staff_signature
                ? el(Image, { src: str(data.staff_signature), style: S.sigImg })
                : el(View, { style: S.sigLine }),
            ),
            el(View, { style: [S.sigCell, { flex: 1.5, borderRightWidth: 0 }] },
              data.receiver_signature
                ? el(Image, { src: str(data.receiver_signature), style: S.sigImg })
                : el(View, { style: S.sigLine }),
            ),
          ),

        ), // end table

        // QR code
        qrDataUrl
          ? el(View, { style: S.qrRow },
              el(Text, { style: S.qrLabel }, "Scan to track\n" + str(data.collection_number)),
              el(Image, { src: qrDataUrl, style: S.qrImg }),
            )
          : null,

      ), // end body

      // ══ LETTERHEAD FOOTER ════════════════════════════════════════
      el(View, { style: S.lhFooter },

        // Left: pin circle + English address
        el(View, { style: S.footerLeft },
          el(View, { style: S.pinCircle },
            el(Text, { style: S.pinDot }, "o"),
          ),
          el(View, { style: S.footerTextBlock },
            el(Text, { style: S.footerCompanyEN }, "YASAI LOGISTICS COMPANY"),
            el(Text, { style: S.footerAddrEN }, "H.H Shaikh Saud Bin Saqar,\nAl Muteena Dubai - UAE"),
          ),
        ),

        // Right: Arabic address + pin circle
        el(View, { style: S.footerRight },
          el(View, { style: S.footerTextRight },
            el(Text, { style: S.footerCompanyAR }, "شركة ياساي اللوجستية"),
            el(Text, { style: S.footerAddrAR },
              "٧٥٧٩، ابن الملاح نهضة منطقة\nالرياض، المملكة العربية السعودية"
            ),
          ),
          el(View, { style: S.pinCircleRight },
            el(Text, { style: S.pinDot }, "o"),
          ),
        ),

      ), // end footer

    ), // end page
  ); // end document
}

// ─── Public export ──────────────────────────────────────────────────────────
export async function generateCollectionPDF(
  data: GoodsCollectionNote,
  qrDataUrl?: string,
  logoDataUrl?: string,
): Promise<Buffer> {
  const doc = buildDoc({ data, qrDataUrl, logoDataUrl: logoDataUrl || "" });
  const result = await renderToBuffer(doc);
  return result as unknown as Buffer;
}
