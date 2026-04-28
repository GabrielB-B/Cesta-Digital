export interface AuditLogItemResponse {
  id: number;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_user_id: number | null;
  actor_email: string | null;
  request_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AuditLogItemResponse[];
}
