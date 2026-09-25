export interface BasketTypeResponse {
  id: number;
  name: string;
  is_active: boolean;
  notes: string | null;
}

export interface BasketTypeOverviewItemResponse extends BasketTypeResponse {
  item_count: number;
  estimated_value: string;
  updated_at: string;
}

export interface BasketTypeCreatePayload {
  name: string;
  is_active: boolean;
  notes: string | null;
}

export interface BasketTypeItemCreatePayload {
  item_id: number;
  required_quantity: number;
}

export interface BasketTypeRecipeItemResponse {
  id: number;
  item_id: number;
  item_name: string;
  category_name: string;
  unit_measure: string;
  tracks_expiration: boolean;
  reference_unit_value: string;
  image_path: string | null;
  image_source: string | null;
  image_attribution: string | null;
  required_quantity: number;
}

export interface BasketTypeDetailResponse extends BasketTypeResponse {
  basket_items: BasketTypeRecipeItemResponse[];
}

export interface BasketAvailabilityItemResponse {
  item_id: number;
  item_name: string;
  unit_measure: string;
  required_quantity: number;
  available_quantity: number;
  possible_from_item: number;
  missing_for_next_basket: number;
}

export interface BasketAvailabilityResponse {
  basket_type_id: number;
  basket_type_name: string;
  possible_baskets: number;
  limiting_item_ids: number[];
  items: BasketAvailabilityItemResponse[];
}
