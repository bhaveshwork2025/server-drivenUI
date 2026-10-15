import { useCallback, useEffect, useState } from "react";
import type { SduiScreen } from "./types";
import { API_BASE_URL } from "./config";

interface ScreenState {
  screen: SduiScreen | null;
  error: string | null;
  loading: boolean;
  lastFetchedAt: Date | null;
}

// This is the one network call the whole pattern hinges on: ask the
// server "what does this screen look like right now?" every time the
// app opens, resumes, or the user pulls to refresh. Nothing about the
// UI is baked into the client build.
export function useScreen(screenId: string) {
  const [state, setState] = useState<ScreenState>({
    screen: null,
    error: null,
    loading: true,
    lastFetchedAt: null,
  });

  const fetchScreen = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/screen/${screenId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }
      const json = (await res.json()) as SduiScreen;
      setState({ screen: json, error: null, loading: false, lastFetchedAt: new Date() });
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to load screen",
        loading: false,
      }));
    }
  }, [screenId]);

  useEffect(() => {
    fetchScreen();
  }, [fetchScreen]);

  // Simulates "app resumed" -- refetch whenever the tab/app regains focus.
  useEffect(() => {
    const onFocus = () => fetchScreen();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchScreen();
    });
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchScreen]);

  return { ...state, refetch: fetchScreen };
}
