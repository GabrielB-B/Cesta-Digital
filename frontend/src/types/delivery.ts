export interface DeliveryScheduleResponse {
  id: number;
  family_id: number;
  basket_type_id: number;
  scheduled_date: string;
  status: string;
  notes: string | null;
  created_by_user_id: number;
}

export interface DeliveryResponse {
  id: number;
  delivery_schedule_id: number | null;
  family_id: number;
  basket_type_id: number;
  delivery_date: string;
  delivered_by_user_id: number;
  status: string;
  notes: string | null;
  items: DeliveryTraceItemResponse[];
}

export interface DeliveryScheduleCreatePayload {
  family_id: number;
  basket_type_id: number;
  scheduled_date: string;
  status: string;
  notes: string | null;
}

export interface DeliveryTraceItemResponse {
  movement_id: number;
  item_id: number;
  item_name: string;
  unit_measure: string;
  batch_id: number;
  batch_code: string | null;
  batch_status: string;
  storage_location: string | null;
  expiration_date: string | null;
  quantity: number;
}

export interface DeliveryScheduleUpdatePayload {
  scheduled_date: string;
  status: string;
  notes: string | null;
}

export interface DeliveryFromScheduleCreatePayload {
  delivery_date: string;
  status: string;
  notes: string | null;
}
