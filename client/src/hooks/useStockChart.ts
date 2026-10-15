import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../sdui/config";
import type { ChartRange, StockChartResponse } from "../domain/stocks";
import { CHART_RANGES } from "../domain/stocks";

interface State {
  data: StockChartResponse | null;
  loading: boolean;
  error: string | null;
}

export function useStockChart(symbol: string, range: ChartRange) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  const fetchChart = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const interval = CHART_RANGES.find((r) => r.value === range)?.interval ?? "1d";
      const res = await fetch(`${API_BASE_URL}/api/stocks/chart/${symbol}?range=${range}&interval=${interval}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = (await res.json()) as StockChartResponse;
      setState({ data: json, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : "Failed to load chart" });
    }
  }, [symbol, range]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  return { ...state, refetch: fetchChart };
}
