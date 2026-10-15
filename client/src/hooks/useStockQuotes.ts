import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../sdui/config";
import type { StockQuote } from "../domain/stocks";

const POLL_MS = 30_000;

interface State {
  quotes: Record<string, StockQuote>;
  loading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}

/** Fetches a quote per symbol (the backend has no batch endpoint) and polls every 30s. */
export function useStockQuotes(symbols: string[]) {
  const [state, setState] = useState<State>({ quotes: {}, loading: true, error: null, lastFetchedAt: null });
  const symbolsKey = symbols.join(",");

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) return;
    setState((s) => ({ ...s, loading: true }));
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const res = await fetch(`${API_BASE_URL}/api/stocks/quote/${symbol}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${symbol}: server responded ${res.status}`);
        return (await res.json()) as StockQuote;
      }),
    );

    const quotes: Record<string, StockQuote> = {};
    let firstError: string | null = null;
    for (const r of results) {
      if (r.status === "fulfilled") quotes[r.value.symbol] = r.value;
      else firstError = firstError ?? (r.reason instanceof Error ? r.reason.message : "Failed to load quote");
    }

    setState((prev) => ({
      quotes: { ...prev.quotes, ...quotes },
      loading: false,
      error: Object.keys(quotes).length === 0 ? firstError : null,
      lastFetchedAt: new Date(),
    }));
    // symbolsKey (not symbols) is the real dependency -- it's the stable,
    // order-sensitive identity of the symbol list across renders.
  }, [symbolsKey]);

  const fetchRef = useRef(fetchQuotes);
  useEffect(() => {
    fetchRef.current = fetchQuotes;
  });

  useEffect(() => {
    fetchRef.current();
    const id = setInterval(() => fetchRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, [symbolsKey]);

  return { ...state, refetch: fetchQuotes };
}
