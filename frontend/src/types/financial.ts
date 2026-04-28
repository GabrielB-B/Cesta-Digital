export interface FinancialCategorySummaryResponse {
  category_id: number;
  category_name: string;
  estimated_stock_value: string;
}

export interface FinancialSummaryResponse {
  estimated_total_stock_value: string;
  estimated_total_entries_value: string;
  estimated_total_output_value: string;
  active_benefits_total_value: string;
  categories: FinancialCategorySummaryResponse[];
}
