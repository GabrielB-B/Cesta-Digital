export interface DeliveryScheduleResponse {
  id: number;
  family_id: number;
  basket_type_id: number;
  scheduled_date: string;
  status: string;
  notes: string | null;
  created_by_user_id: number;
}

export type DeliveryOperationsPeriod = "hoje" | "amanha" | "semana" | "todos";

export type DeliveryOperationsStatus =
  | "agendado"
  | "reagendado"
  | "retirado"
  | "ocorrencia";

export interface DeliveryOperationItemResponse {
  id: number;
  family_id: number;
  family_code: string;
  family_status: string;
  basket_type_id: number;
  basket_type_name: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface DeliveryOperationsSummaryResponse {
  scheduled: number;
  rescheduled: number;
  completed: number;
  exceptions: number;
  total: number;
}

export interface DeliveryOperationsResponse {
  items: DeliveryOperationItemResponse[];
  total: number;
  limit: number;
  offset: number;
  reference_date: string;
  period: DeliveryOperationsPeriod;
  summary: DeliveryOperationsSummaryResponse;
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
