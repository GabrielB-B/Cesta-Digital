export interface ItemCategoryResponse {
  id: number;
  name: string;
  description: string | null;
}

export interface ItemCreatePayload {
  category_id: number;
  name: string;
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
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  reference_unit_value: string;
  minimum_stock_alert: number;
  notes: string | null;
}

export interface StockSummaryResponse {
  item_id: number;
  item_name: string;
  category_id: number;
  category_name: string;
  unit_measure: string;
  tracks_expiration: boolean;
  is_active: boolean;
  minimum_stock_alert: number;
  total_quantity: number;
  total_batches: number;
  is_below_minimum: boolean;
}

export interface StockBatchCreatePayload {
  item_id: number;
  source_type: string;
  entry_quantity: number;
  entry_date: string;
  expiration_date: string | null;
  estimated_unit_value: number;
  notes: string | null;
}

export interface StockBatchResponse {
  id: number;
  item_id: number;
  source_type: string;
  entry_quantity: number;
  current_quantity: number;
  entry_date: string;
  expiration_date: string | null;
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