import { useMemo, useState } from "react";
import { Badge, Card, EmptyState } from "../components/ui/primitives";
import { CandlestickChart } from "../components/charts/CandlestickChart";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets";
import { useStockQuotes } from "../hooks/useStockQuotes";
import { useStockChart } from "../hooks/useStockChart";
import { CHART_RANGES, type ChartRange } from "../domain/stocks";

function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function DashboardPage() {
  const { widgets, source, refetch: refetchWidgets } = useDashboardWidgets();
  const symbols = useMemo(() => widgets.watchlist.map((w) => w.symbol), [widgets.watchlist]);
  const [selectedSymbol, setSelectedSymbol] = useState(widgets.defaultSymbol);
  const [range, setRange] = useState<ChartRange>("3mo");

  const { quotes, loading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useStockQuotes(symbols);
  const { data: chart, loading: chartLoading, error: chartError } = useStockChart(selectedSymbol, range);

  const selectedQuote = quotes[selectedSymbol];
  const selectedLabel = widgets.watchlist.find((w) => w.symbol === selectedSymbol)?.label;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Markets</div>
          <div className="page-header__subtitle">
            Live quotes and charts from Yahoo Finance&apos;s public endpoint — real market data, refreshed every 30s.
          </div>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--ghost"
            onClick={() => {
              refetchWidgets();
              refetchQuotes();
            }}
            title="Re-fetch the watchlist layout from server/data/dashboard-widgets.json"
          >
            <Badge label={source === "server" ? "Live layout" : "Default layout"} tone={source === "server" ? "success" : "neutral"} /> Refresh
          </button>
        </div>
      </div>

      {widgets.banner?.enabled && (
        <div className="dashboard-banner" style={{ backgroundColor: widgets.banner.backgroundColor, color: widgets.banner.color }}>
          {widgets.banner.text}
        </div>
      )}

      <div className="grid grid--2col">
        <Card
          title={
            <span>
              {selectedLabel ? `${selectedLabel} · ${selectedSymbol}` : selectedSymbol}
              {chart?.name && chart.name !== selectedLabel && <span className="muted"> ({chart.name})</span>}
            </span>
          }
          actions={
            <div className="range-selector">
              {CHART_RANGES.map((r) => (
                <button
                  key={r.value}
                  className={`range-selector__btn ${range === r.value ? "range-selector__btn--active" : ""}`}
                  onClick={() => setRange(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
        >
          {selectedQuote && (
            <div className="stock-summary">
              <div className="stock-summary__price">
                {formatPrice(selectedQuote.price, selectedQuote.currency)}
                {selectedQuote.change != null && selectedQuote.changePercent != null && (
                  <span className={`stock-change ${selectedQuote.change >= 0 ? "stock-change--up" : "stock-change--down"}`}>
                    {selectedQuote.change >= 0 ? "▲" : "▼"} {Math.abs(selectedQuote.change).toFixed(2)} (
                    {Math.abs(selectedQuote.changePercent).toFixed(2)}%)
                  </span>
                )}
              </div>
              <div className="stock-summary__stats">
                <div>
                  <span className="muted">Day range</span> {formatPrice(selectedQuote.dayLow, selectedQuote.currency)} –{" "}
                  {formatPrice(selectedQuote.dayHigh, selectedQuote.currency)}
                </div>
                <div>
                  <span className="muted">52w range</span> {formatPrice(selectedQuote.fiftyTwoWeekLow, selectedQuote.currency)} –{" "}
                  {formatPrice(selectedQuote.fiftyTwoWeekHigh, selectedQuote.currency)}
                </div>
                <div>
                  <span className="muted">Volume</span> {formatCompact(selectedQuote.volume)}
                </div>
                <div>
                  <span className="muted">As of</span> {formatTime(selectedQuote.marketTime)}
                </div>
              </div>
            </div>
          )}

          {chartError ? (
            <EmptyState title="Couldn't load chart data" message={chartError} />
          ) : chartLoading && !chart ? (
            <div className="muted" style={{ padding: "60px 0", textAlign: "center" }}>
              Loading chart...
            </div>
          ) : chart && chart.candles.length > 0 ? (
            <CandlestickChart candles={chart.candles} />
          ) : (
            <EmptyState title="No candle data for this range" />
          )}
        </Card>

        <Card title="Watchlist" actions={quotesError && <Badge label="Fetch error" tone="danger" />}>
          {symbols.length === 0 ? (
            <EmptyState title="No symbols configured" message="Add some to server/data/dashboard-widgets.json" />
          ) : (
            <div className="stack" style={{ gap: 2 }}>
              {widgets.watchlist.map((w) => {
                const q = quotes[w.symbol];
                const up = q?.change != null && q.change >= 0;
                return (
                  <button
                    key={w.symbol}
                    className={`watchlist-row ${w.symbol === selectedSymbol ? "watchlist-row--active" : ""}`}
                    onClick={() => setSelectedSymbol(w.symbol)}
                  >
                    <div className="watchlist-row__label">
                      <strong>{w.symbol}</strong>
                      <span className="muted">{w.label}</span>
                    </div>
                    {q ? (
                      <div className="watchlist-row__quote">
                        <span>{formatPrice(q.price, q.currency)}</span>
                        {q.changePercent != null && (
                          <span className={`stock-change stock-change--sm ${up ? "stock-change--up" : "stock-change--down"}`}>
                            {up ? "▲" : "▼"} {Math.abs(q.changePercent).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="muted">{quotesLoading ? "Loading..." : "—"}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
