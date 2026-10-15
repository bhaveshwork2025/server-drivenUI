import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../sdui/config";
import { DEFAULT_DASHBOARD_WIDGETS, type DashboardWidgetsConfig } from "../domain/stocks";

interface State {
  widgets: DashboardWidgetsConfig;
  source: "server" | "default";
}

// Same trick as useScreen, applied to the Markets dashboard's watchlist
// instead of a full SDUI node tree: ask the backend "what should this
// look like right now?" on load and on refetch. This is a progressive
// enhancement -- the Dashboard still works standalone (with the default
// watchlist below) if the backend is unreachable.
export function useDashboardWidgets() {
  const [state, setState] = useState<State>({ widgets: DEFAULT_DASHBOARD_WIDGETS, source: "default" });

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard-widgets`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = (await res.json()) as DashboardWidgetsConfig;
      setState({ widgets: json, source: "server" });
    } catch {
      setState((s) => (s.source === "server" ? s : { widgets: DEFAULT_DASHBOARD_WIDGETS, source: "default" }));
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  return { ...state, refetch: fetchWidgets };
}
