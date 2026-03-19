export interface DashboardBasketSummaryResponse {
  basket_type_id: number;
  basket_type_name: string;
  possible_baskets: number;
}

export interface DashboardRevaluationResponse {
  family_id: number;
  internal_code: string;
  status: string;
  next_revaluation_date: string;
}

export interface DashboardStockAlertResponse {
  item_id: number;
  item_name: string;
  category_name: string;
  minimum_stock_alert: number;
  total_quantity: number;
  is_below_minimum: boolean;
}

export interface DashboardOverviewResponse {
  total_families: number;
  active_families: number;
  recurring_eligible_families: number;
  emergency_eligible_families: number;
  under_review_families: number;
  inactive_families: number;
  pending_schedules: number;
  deliveries_this_month: number;
  upcoming_revaluations_count: number;
  items_below_minimum_count: number;
  basket_summaries: DashboardBasketSummaryResponse[];
  upcoming_revaluations: DashboardRevaluationResponse[];
  stock_alerts: DashboardStockAlertResponse[];
}