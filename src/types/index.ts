export type UserRole = "admin" | "operations" | "warehouse" | "viewer";

export type CargoType = "air" | "sea" | "land";

export type BillingType = "customer" | "supplier";

export type CollectionStatus =
  | "collected"
  | "in_warehouse"
  | "in_transit"
  | "customs_clearance"
  | "out_for_delivery"
  | "delivered";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
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

  // Status
  status: CollectionStatus;

  // Files
  pdf_url?: string;
  qr_url?: string;

  // Metadata
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joined
  creator?: UserProfile;
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
