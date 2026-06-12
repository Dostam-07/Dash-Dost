export type DashboardComponentType =
  | 'kpi_card'
  | 'bar_chart'
  | 'line_chart'
  | 'area_chart'
  | 'pie_chart'
  | 'scatter_chart'
  | 'map_chart'
  | 'geo_map';

export type FilterType = 'date_range' | 'category_select';

export interface LayoutConfig {
  sm: number; // grid columns on mobile out of 12
  md: number; // grid columns on tablet out of 12
  lg: number; // grid columns on desktop out of 12
}

export interface KPITrend {
  direction: 'up' | 'down' | 'neutral';
  label: string;
}

export interface ComponentConfig {
  xAxisKey?: string;
  yAxisKeys?: string[];
  stacked?: boolean;
  colors?: string[]; // Array of colors or fallback
  seriesColors?: Record<string, string>; // Map of series key to color
  kpiValue?: string;
  kpiTrend?: KPITrend;
  showAnomalies?: boolean;
  showTrendline?: boolean;
  mapType?: 'world' | 'us';
}

export interface DashboardComponent {
  id: string;
  type: DashboardComponentType;
  title: string;
  description?: string;
  tab?: string; // Optional page/tab identifier to split into multiple views
  layout: LayoutConfig;
  config: ComponentConfig;
  seriesData: Record<string, any>[];
}

export interface DashboardFilter {
  id: string;
  type: FilterType;
  targetKeys: string[];
  label: string;
  options?: string[];
}

export interface MasterDashboardPayload {
  dashboardId: string;
  title: string;
  subtitle?: string;
  filters: DashboardFilter[];
  components: DashboardComponent[];
  tabOrder?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  associatedPayload?: MasterDashboardPayload; // Optional link to a specific dashboard state
}

export interface SavedDashboardMeta {
  dashboardId: string;
  title: string;
  subtitle?: string;
  savedAt: string;
  prompt: string;
}
