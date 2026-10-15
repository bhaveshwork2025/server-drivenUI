export interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number;
  dayLow: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketTime: number;
}

export interface StockCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface StockChartResponse {
  symbol: string;
  range: string;
  interval: string;
  currency: string;
  name: string;
  candles: StockCandle[];
}

export type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "ytd" | "max";

export const CHART_RANGES: { value: ChartRange; label: string; interval: string }[] = [
  { value: "1d", label: "1D", interval: "5m" },
  { value: "5d", label: "5D", interval: "15m" },
  { value: "1mo", label: "1M", interval: "1d" },
  { value: "3mo", label: "3M", interval: "1d" },
  { value: "6mo", label: "6M", interval: "1d" },
  { value: "1y", label: "1Y", interval: "1wk" },
  { value: "ytd", label: "YTD", interval: "1d" },
  { value: "max", label: "Max", interval: "1mo" },
];

export interface WatchlistSymbol {
  symbol: string;
  label: string;
}

export interface DashboardWidgetsConfig {
  screenId: string;
  version: number;
  banner: { enabled: boolean; text: string; backgroundColor: string; color: string } | null;
  watchlist: WatchlistSymbol[];
  defaultSymbol: string;
}

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetsConfig = {
  screenId: "dashboard-widgets",
  version: 0,
  banner: null,
  watchlist: [
    { symbol: "AAPL", label: "Apple" },
    { symbol: "MSFT", label: "Microsoft" },
    { symbol: "GOOGL", label: "Alphabet" },
    { symbol: "AMZN", label: "Amazon" },
    { symbol: "TSLA", label: "Tesla" },
    { symbol: "NVDA", label: "Nvidia" },
    { symbol: "META", label: "Meta" },
    { symbol: "NFLX", label: "Netflix" },
  ],
  defaultSymbol: "AAPL",
};
