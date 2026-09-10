export type UserRole = "admin" | "operations" | "warehouse" | "warehouse_supervisor" | "finance" | "viewer";

export type WarehouseReportStatus = "not_submitted" | "submitted" | "approved" | "rejected";

export type CargoType = "air" | "sea" | "land";

export type BillingType = "customer" | "supplier";

export type CollectionStatus =
  | "collected"
  | "in_warehouse"
  | "in_transit"
  | "customs_clearance"
  | "out_for_delivery"
  | "delivered";

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  country: "UAE" | "KSA";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  warehouse_id?: string | null;
  warehouse?: Warehouse;
  created_at: string;
  updated_at: string;
}

export interface GoodsCollectionNote {
  id: string;
  collection_number: string;

  // Shipper
  shipper_name: string;

  // Consignee
  consignee_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;

  // Cargo details
  destination: string;
  commodity: string;
  cargo_type: CargoType;
  shipping_mark?: string;
  doc_ref_number?: string;
  special_instructions?: string;

  // Package info
  num_packages?: string;
  package_type?: string;
  volume_cbm?: number;
  weight_kg?: number;

  // Billing
  billing_type?: BillingType;

  // Signatures
  receiver_signature?: string;
  staff_signature?: string;

  // Goods photo
  goods_image_url?: string;

  // Warehouse receiving (Stage 2)
  storage_location?: string;
  palletized: boolean;
  warehouse_received_by?: string;
  warehouse_received_at?: string;
  warehouse_verified_by?: string;
  warehouse_verified_at?: string;
  warehouse_report_status: WarehouseReportStatus;
  warehouse_report_notes?: string;
  warehouse_report_submitted_by?: string;
  warehouse_report_submitted_at?: string;
  warehouse_report_approved_by?: string;
  warehouse_report_approved_at?: string;
  warehouse_report_rejection_reason?: string;

  // Status
  status: CollectionStatus;

  // Files
  pdf_url?: string;
  qr_url?: string;
  commercial_invoice_url?: string | null;
  packing_list_url?: string | null;
  country_of_origin_url?: string | null;

  // Status timeline
  status_history?: { status: CollectionStatus; changed_at: string }[];

  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joined
  creator?: UserProfile;
}

export interface DeliveryNoteItem {
  item_description: string;
  qty: string | number;
  unit: string;
  total_pallets: string | number;
  remark: string;
}

export interface DeliveryNote {
  id: string;
  collection_id: string;
  doc_number: string | null;
  doc_date: string | null;
  job_number: string | null;
  shipper: string | null;
  ref_number: string | null;
  destination: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  items: DeliveryNoteItem[];
  receiver_name: string | null;
  received_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  gcn_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  user?: UserProfile;
}

export interface DashboardStats {
  total_collections: number;
  today_collections: number;
  pending_deliveries: number;
  total_weight: number;
  by_cargo_type: {
    air: number;
    sea: number;
    land: number;
  };
}

export interface CollectionFormData {
  shipper_name: string;
  consignee_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  destination: string;
  commodity: string;
  cargo_type: CargoType;
  shipping_mark?: string;
  doc_ref_number?: string;
  special_instructions?: string;
  num_packages?: string;
  package_type?: string;
  volume_cbm?: number;
  weight_kg?: number;
  billing_type?: BillingType;
  receiver_signature?: string;
  staff_signature?: string;
  goods_image_url?: string;
}

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  collected: "Collected",
  in_warehouse: "In Warehouse",
  in_transit: "In Transit",
  customs_clearance: "Customs Clearance",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export const STATUS_COLORS: Record<CollectionStatus, string> = {
  collected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_warehouse: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  customs_clearance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  out_for_delivery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  air: "Air Freight",
  sea: "Sea Freight",
  land: "Land Freight",
};

export const WAREHOUSE_REPORT_LABELS: Record<WarehouseReportStatus, string> = {
  not_submitted: "Not Submitted",
  submitted: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

// ── Job Orders (Stages 3–8) ─────────────────────────────────────

export type JobOrderStatus =
  | "draft"
  | "ready_for_collection"
  | "goods_collected"
  | "export_documentation_complete"
  | "uae_customs_clearance"
  | "border_exit"
  | "saudi_customs_clearance"
  | "in_transit_saudi"
  | "delivered"
  | "closed";

export type TruckStatus =
  | "created"
  | "goods_collected"
  | "documents_uploaded"
  | "uae_customs_submitted"
  | "naql_foc_received"
  | "bayan_received"
  | "fazza_generated"
  | "fazza_sent_to_driver"
  | "reached_saudi_border"
  | "inspection"
  | "duty_payment"
  | "entered_saudi_arabia"
  | "delivered"
  | "completed";

export type GmApprovalStatus = "pending" | "approved" | "rejected";

export interface JobOrderTruck {
  id: string;
  job_order_id: string;
  truck_number?: string;
  trailer_number?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_passport_url?: string;
  driver_id_url?: string;
  status: TruckStatus;
  border_status?: string;
  fazza_token?: string;
  customs_duty_amount?: number;
  customs_duty_paid_at?: string;
  naql_foc_received_at?: string;
  bayan_received_at?: string;
  fazza_generated_at?: string;
  fazza_sent_at?: string;
  reached_border_at?: string;
  entered_saudi_at?: string;
  delivered_at?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JobStatusUpdate {
  id: string;
  job_order_id: string;
  truck_id?: string;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface JobOrder {
  id: string;
  job_number: string;
  destination: string;
  status: JobOrderStatus;

  // Shipment parties
  customer_name?: string;
  consignee_name?: string;

  // Documents
  commercial_invoice_url?: string;
  packing_list_url?: string;
  country_of_origin_url?: string;
  other_documents_urls?: string[];

  // Legacy single-truck fields (kept for backwards compat)
  truck_number?: string;
  driver_name?: string;
  driver_phone?: string;
  transporter_name?: string;
  departure_date?: string;

  // Capacity (derived from linked GCNs)
  total_weight_kg?: number;
  total_cbm?: number;

  // GM approval
  gm_approval_status: GmApprovalStatus;
  gm_approved_by?: string;
  gm_approved_at?: string;
  gm_rejection_reason?: string;
  submitted_by?: string;
  submitted_at?: string;

  // Stage 4: dispatch
  loaded_by?: string;
  loaded_at?: string;
  driver_signature_received: boolean;
  dispatched_by?: string;
  dispatched_at?: string;

  // Stage 5: transit
  transit_notes?: string;
  customs_cleared_at?: string;
  customs_cleared_by?: string;
  finance_notified_at?: string;

  // Stage 6: destination scheduling
  delivery_scheduled_at?: string;
  delivery_driver?: string;

  // Stage 8: final delivery
  destination_received_at?: string;
  destination_received_by?: string;
  pod_collected_at?: string;
  pod_collected_by?: string;

  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Joined
  gcns?: GoodsCollectionNote[];
  transit_updates?: JobTransitUpdate[];
  trucks?: JobOrderTruck[];
  status_updates?: JobStatusUpdate[];
}

export interface JobOrderGcn {
  job_order_id: string;
  gcn_id: string;
  added_by?: string;
  added_at: string;
  gcn?: GoodsCollectionNote;
}

export interface JobTransitUpdate {
  id: string;
  job_order_id: string;
  update_text: string;
  created_by?: string;
  created_at: string;
}

export const JOB_STATUS_LABELS: Record<JobOrderStatus, string> = {
  draft: "Draft",
  ready_for_collection: "Ready for Collection",
  goods_collected: "Goods Collected",
  export_documentation_complete: "Export Docs Complete",
  uae_customs_clearance: "UAE Customs Clearance",
  border_exit: "Border Exit",
  saudi_customs_clearance: "Saudi Customs Clearance",
  in_transit_saudi: "In Transit (Saudi)",
  delivered: "Delivered",
  closed: "Closed",
};

export const JOB_STATUS_COLORS: Record<JobOrderStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ready_for_collection: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  goods_collected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  export_documentation_complete: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  uae_customs_clearance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  border_exit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  saudi_customs_clearance: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  in_transit_saudi: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  created: "Created",
  goods_collected: "Goods Collected",
  documents_uploaded: "Documents Uploaded",
  uae_customs_submitted: "UAE Customs Submitted",
  naql_foc_received: "NAQL FOC Received",
  bayan_received: "Bayan Received",
  fazza_generated: "FAZZA Generated",
  fazza_sent_to_driver: "FAZZA Sent to Driver",
  reached_saudi_border: "Reached Saudi Border",
  inspection: "Under Inspection",
  duty_payment: "Duty Payment",
  entered_saudi_arabia: "Entered Saudi Arabia",
  delivered: "Delivered",
  completed: "Completed",
};

export const TRUCK_STATUS_COLORS: Record<TruckStatus, string> = {
  created: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  goods_collected: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  documents_uploaded: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  uae_customs_submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  naql_foc_received: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  bayan_received: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  fazza_generated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  fazza_sent_to_driver: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  reached_saudi_border: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  inspection: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  duty_payment: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  entered_saudi_arabia: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

export const MANUAL_STATUS_OPTIONS = [
  "Collected",
  "Not Collected",
  "Documents Submitted",
  "Token Received",
  "Waiting for Reply",
  "UAE Customs Clearance",
  "Saudi Customs Clearance",
  "Customs Duty Pending",
  "Customs Duty Paid",
  "In Transit",
  "Delivered",
  "Completed",
] as const;

// ── Finance Invoices (Stage 7) ──────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceLineItem {
  description: string;
  model_description?: string;
  qty: number;
  unit_price: number;
  country_of_origin?: string;
  vat_amount?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  job_order_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_contact_person?: string;
  shipper?: string;
  payment_terms?: string;
  manual_job_number?: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_at?: string;
  due_date?: string;
  paid_at?: string;
  payment_notes?: string;
  invoice_type?: "standard" | "freight" | "uploaded";
  uploaded_file_url?: string;
  port_of_loading?: string;
  packages_count?: string;
  final_destination?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;

  // Joined
  job_order?: JobOrder;
}

// ─── Finance Module Types ──────────────────────────────────────

export type FundCollectionStatus = "pending" | "approved" | "verified";
export type FundCollectionPaymentMode = "cash" | "bank_transfer" | "cheque";
export type FundTransferMode = "cash_third_party" | "bank_transfer";
export type FundTransferStatus = "initiated" | "in_transit" | "delivered" | "confirmed";
export type SupplierPaymentMode = "bank_transfer" | "cdm" | "cash_hand";
export type SupplierPaymentStatus = "pending" | "paid" | "confirmed";
export type BackupDocType = "pi" | "po";

export interface FundCollection {
  id: string;
  collection_number: string;
  invoice_id?: string;
  customer_name: string;
  amount: number;
  currency: string;
  payment_mode: FundCollectionPaymentMode;
  collection_date: string;
  transfer_rate?: number;
  bank_reference?: string;
  destination_account?: string;
  bank_name?: string;
  iban?: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  collected_by?: string;
  customer_phone?: string;
  status: FundCollectionStatus;
  sales_manager_approved_by?: string;
  sales_manager_approved_at?: string;
  accounts_verified_by?: string;
  accounts_verified_at?: string;
  proof_url?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FundTransfer {
  id: string;
  transfer_number: string;
  fund_collection_id?: string;
  transfer_mode: FundTransferMode;
  amount: number;
  currency: string;
  source_region: string;
  destination_region: string;
  third_party_name?: string;
  third_party_location?: string;
  third_party_scheduled_at?: string;
  third_party_receipt_url?: string;
  destination_bank_account?: string;
  bank_reference?: string;
  backup_document_url?: string;
  status: FundTransferStatus;
  transferred_by?: string;
  transferred_at?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  received_amount?: number;
  receipt_date?: string;
  receipt_url?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPayment {
  id: string;
  payment_number: string;
  fund_transfer_id?: string;
  supplier_name: string;
  amount: number;
  currency: string;
  payment_mode: SupplierPaymentMode;
  payment_date: string;
  bank_reference?: string;
  cdm_account?: string;
  messenger_name?: string;
  proof_url?: string;
  status: SupplierPaymentStatus;
  operations_notified: boolean;
  operations_notified_at?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BackupDocument {
  id: string;
  doc_number: string;
  doc_type: BackupDocType;
  fund_transfer_id?: string;
  supplier_name: string;
  amount: number;
  currency: string;
  doc_url?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export const FUND_COLLECTION_STATUS_LABELS: Record<FundCollectionStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  verified: "Verified",
};

export const FUND_TRANSFER_STATUS_LABELS: Record<FundTransferStatus, string> = {
  initiated: "Initiated",
  in_transit: "In Transit",
  delivered: "Delivered",
  confirmed: "Confirmed",
};

export const SUPPLIER_PAYMENT_STATUS_LABELS: Record<SupplierPaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  confirmed: "Confirmed",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

// ── Waybills ────────────────────────────────────────────────────

export type WaybillTransportMode = "road" | "air" | "sea";

export interface WaybillCargoItem {
  truck_number?: string;
  seal_no?: string;
  invoice_number?: string;
  invoice_value?: string;
  invoice_currency?: string;
  num_packages?: string;
  description?: string;
  weight?: string;
  measurement?: string;
}

export interface Waybill {
  id: string;
  waybill_number: string;

  shipper_name: string;
  shipper_address?: string;

  consignee_name: string;
  consignee_address?: string;

  port_of_loading: string;
  port_of_discharge: string;
  shipment_date: string;
  mode_of_transport: WaybillTransportMode;
  remarks?: string;
  job_number?: string;
  final_destination?: string;

  cargo_items: WaybillCargoItem[];

  prepared_by?: string;
  num_originals?: number;
  place_of_issue?: string;
  issue_date?: string;
  delivery_contact?: string;

  pdf_url?: string;

  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export const WAYBILL_TRANSPORT_LABELS: Record<WaybillTransportMode, string> = {
  road: "Road",
  air: "Air",
  sea: "Sea",
};
