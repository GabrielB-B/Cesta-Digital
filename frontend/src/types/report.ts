export type ReportKey =
  | "attendances"
  | "deliveries"
  | "stock_movements"
  | "benefits"
  | "families"
  | "stock_alerts";

export interface ReportKpisResponse {
  families_served: number;
  baskets_delivered: number;
  items_distributed: number;
}

export interface ReportDefinitionResponse {
  key: ReportKey;
  title: string;
  description: string;
  format: "csv";
  uses_period: boolean;
}

export interface ReportsOverviewResponse {
  start_date: string;
  end_date: string;
  generated_at: string;
  kpis: ReportKpisResponse;
  available_reports: ReportDefinitionResponse[];
}
