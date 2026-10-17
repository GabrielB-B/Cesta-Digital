export interface ItemCategoryResponse {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ItemCategoryPayload {
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ItemCreatePayload {
  category_id: number;
  name: string;
  barcode: string | null;
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  reference_unit_value: number;
  minimum_stock_alert: number;
  notes: string | null;
}

export interface ItemDetailResponse {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  barcode: string | null;
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  reference_unit_value: string;
  minimum_stock_alert: number;
  notes: string | null;
  has_image: boolean;
  image_path: string | null;
  image_source: string | null;
  image_attribution: string | null;
}

export interface StockSummaryResponse {
  item_id: number;
  item_name: string;
  barcode: string | null;
  category_id: number;
  category_name: string;
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  minimum_stock_alert: number;
  total_quantity: number;
  total_batches: number;
  is_below_minimum: boolean;
  image_path: string | null;
  image_source: string | null;
  image_attribution: string | null;
}

export interface OpenFactsCandidateResponse {
  barcode: string;
  found: boolean;
  has_image: boolean;
  product_name: string | null;
  brands: string | null;
  quantity: string | null;
  image_url: string | null;
  source_name: string;
  attribution: string;
  license_name: string;
  license_url: string;
}

export interface ItemImageMetadataResponse {
  item_id: number;
  image_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  source: string;
  source_url: string | null;
  attribution: string | null;
}

export type StockOverviewAttention =
  | "estoque_baixo"
  | "vencendo_em_breve"
  | "vencido"
  | "validade_ausente"
  | "restrito";

export interface StockOverviewItemResponse extends StockSummaryResponse {
  next_expiration_date: string | null;
  expiring_soon_batches: number;
  expired_batches: number;
  missing_expiration_batches: number;
  restricted_batches: number;
}

export interface StockOverviewSummaryResponse {
  total_items: number;
  active_items: number;
  low_stock_items: number;
  expiring_soon_batches: number;
  expired_batches: number;
  missing_expiration_batches: number;
  restricted_batches: number;
}

export interface StockOverviewResponse {
  items: StockOverviewItemResponse[];
  total: number;
  limit: number;
  offset: number;
  reference_date: string;
  due_soon_days: number;
  summary: StockOverviewSummaryResponse;
}

export interface StockBatchCreatePayload {
  item_id: number;
  batch_code: string | null;
  source_type: string;
  status: StockBatchStatus;
  entry_quantity: number;
  entry_date: string;
  expiration_date: string | null;
  storage_location: string | null;
  quarantine_reason: string | null;
  estimated_unit_value: number;
  notes: string | null;
}

export type StockBatchStatus = "disponivel" | "quarentena" | "bloqueado";

export interface StockBatchMetadataUpdatePayload {
  batch_code?: string | null;
  status?: StockBatchStatus;
  storage_location?: string | null;
  quarantine_reason?: string | null;
  notes?: string | null;
}

export interface StockBatchResponse {
  id: number;
  item_id: number;
  batch_code: string | null;
  source_type: string;
  status: StockBatchStatus;
  entry_quantity: number;
  current_quantity: number;
  entry_date: string;
  expiration_date: string | null;
  storage_location: string | null;
  quarantine_reason: string | null;
  estimated_unit_value: string;
  notes: string | null;
  created_by_user_id: number;
}

export interface StockMovementResponse {
  id: number;
  batch_id: number;
  item_id: number;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_by_user_id: number;
}

export type ItemUpdatePayload = ItemCreatePayload;

export interface StockMovementCreatePayload {
  batch_id: number;
  movement_type: string;
  quantity: number;
  notes: string | null;
}
