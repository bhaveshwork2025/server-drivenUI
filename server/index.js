import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const ADMIN_DIR = path.join(__dirname, "public", "admin");
const DASHBOARD_WIDGETS_FILE = "dashboard-widgets.json";

const KNOWN_NODE_TYPES = new Set([
  "screen",
  "container",
  "text",
  "image",
  "banner",
  "button",
  "card",
  "spacer",
]);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/admin", express.static(ADMIN_DIR));

// Screen ids become file names on disk, so this is the one thing that
// must be locked down before adding a write endpoint: without it,
// "../../../etc/something" would walk right out of DATA_DIR.
const SAFE_SCREEN_ID = /^[a-zA-Z0-9_-]+$/;

function screenFilePath(screenId) {
  if (!SAFE_SCREEN_ID.test(screenId)) return null;
  return path.join(DATA_DIR, `${screenId}.json`);
}

// Not a full schema validator -- just enough to stop the admin UI (or a
// stray curl command) from writing something the renderer can't draw,
// so a bad "publish" fails loudly here instead of blanking the app.
function validateNode(node, pathLabel = "root") {
  if (typeof node !== "object" || node === null) {
    return `${pathLabel}: must be an object`;
  }
  if (!KNOWN_NODE_TYPES.has(node.type)) {
    return `${pathLabel}: unknown node type "${node.type}"`;
  }
  if (node.style !== undefined && typeof node.style !== "object") {
    return `${pathLabel}: style must be an object`;
  }
  if (node.props !== undefined && typeof node.props !== "object") {
    return `${pathLabel}: props must be an object`;
  }
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      return `${pathLabel}: children must be an array`;
    }
    for (let i = 0; i < node.children.length; i++) {
      const err = validateNode(node.children[i], `${pathLabel}.children[${i}]`);
      if (err) return err;
    }
  }
  return null;
}

function validateScreen(body) {
  if (typeof body !== "object" || body === null) {
    return "body must be a JSON object";
  }
  if (typeof body.root !== "object" || body.root === null) {
    return "body.root must be an object";
  }
  return validateNode(body.root, "root");
}

function writeScreenAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  fs.renameSync(tmpPath, filePath);
}

// This is the whole trick: the client never hardcodes its UI.
// It asks this endpoint "what should screen X look like right now?"
// and we read the answer fresh off disk every time. Edit a file in
// data/ and save it -- that's your "backend deploy". No app rebuild,
// no store review, the next time the app opens (or pulls to refresh)
// it looks different.
app.get("/api/screen/:screenId", (req, res) => {
  const filePath = screenFilePath(req.params.screenId);
  if (!filePath) return res.status(400).json({ error: "Invalid screen id" });
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Unknown screen "${req.params.screenId}"` });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Failed to read screen config", detail: String(err) });
  }
});

// What the admin page calls to list the screens it can edit. The
// dashboard-widgets file is excluded -- it's a flat {banner, kpis} config,
// not a {root: SduiNode} tree, so it doesn't fit the admin's form/validator.
app.get("/api/screens", (_req, res) => {
  const ids = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && f !== DASHBOARD_WIDGETS_FILE)
    .map((f) => f.replace(/\.json$/, ""));
  res.json({ screens: ids });
});

// A second, independent server-driven surface: instead of a generic node
// tree, this is a flat list of {key, label, tone} widgets that the
// Dashboard maps onto metrics it already computes client-side from the
// mock data. The server controls *which* metrics show, in what order,
// under what label/color -- the same "arrangement over the wire, data
// stays local" split described for SDUI in general. Hand-edit the file
// and refresh the Dashboard to see it change, same as the SDUI demo.
app.get("/api/dashboard-widgets", (_req, res) => {
  const filePath = path.join(DATA_DIR, DASHBOARD_WIDGETS_FILE);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "dashboard-widgets.json not found" });
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: "Failed to read dashboard widgets config", detail: String(err) });
  }
});

// The "deploy a UI change" step, as an actual API call instead of a
// hand-edited file. Same effect either way -- the next GET above
// returns whatever was written here -- this just adds validation,
// versioning and a timestamp instead of trusting a manual edit.
app.put("/api/screen/:screenId", (req, res) => {
  const filePath = screenFilePath(req.params.screenId);
  if (!filePath) return res.status(400).json({ error: "Invalid screen id" });

  const validationError = validateScreen(req.body);
  if (validationError) {
    return res.status(400).json({ error: "Invalid screen payload", detail: validationError });
  }

  const previousVersion = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, "utf-8")).version ?? 0
    : 0;

  const next = {
    screenId: req.params.screenId,
    version: previousVersion + 1,
    updatedAt: new Date().toISOString(),
    root: req.body.root,
  };

  try {
    writeScreenAtomic(filePath, next);
    res.json(next);
  } catch (err) {
    res.status(500).json({ error: "Failed to write screen config", detail: String(err) });
  }
});

// ---------------------------------------------------------------------
// Stock market data -- proxies Yahoo Finance's unquoted chart endpoint
// server-side (avoids browser CORS entirely, and keeps this on the same
// "the client only ever talks to our own backend" pattern as everything
// else here). This is real market data, not mocked, but it's an
// unofficial/undocumented Yahoo endpoint with no SLA or published terms
// -- fine for a demo, not something to depend on in production.
// ---------------------------------------------------------------------
const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0" };
const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"]);
const VALID_INTERVALS = new Set(["5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]);
const SAFE_SYMBOL = /^[A-Za-z0-9.\-^]{1,12}$/;

// Tiny TTL cache so a watchlist of N symbols polled every 30s by one or
// more open tabs doesn't turn into N upstream calls per poll -- Yahoo's
// unofficial endpoint has no published rate limit, so this is just being
// a reasonable citizen rather than working around an enforced one.
const quoteCache = new Map(); // key -> { at, data }
function cached(key, ttlMs, loader) {
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data);
  return loader().then((data) => {
    quoteCache.set(key, { at: Date.now(), data });
    return data;
  });
}

async function fetchYahooChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}`), { status: 502 });
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw Object.assign(new Error(`Unknown symbol "${symbol}"`), { status: 404 });
  return result;
}

app.get("/api/stocks/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!SAFE_SYMBOL.test(symbol)) return res.status(400).json({ error: "Invalid symbol" });

  try {
    const result = await cached(`quote:${symbol}`, 20_000, () => fetchYahooChart(symbol, "1d", "1d"));
    const m = result.meta;
    const previousClose = m.chartPreviousClose ?? m.previousClose;
    const change = previousClose != null ? m.regularMarketPrice - previousClose : null;
    res.json({
      symbol: m.symbol,
      name: m.longName || m.shortName || m.symbol,
      currency: m.currency,
      price: m.regularMarketPrice,
      previousClose,
      change,
      changePercent: change != null && previousClose ? (change / previousClose) * 100 : null,
      dayHigh: m.regularMarketDayHigh,
      dayLow: m.regularMarketDayLow,
      volume: m.regularMarketVolume,
      fiftyTwoWeekHigh: m.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: m.fiftyTwoWeekLow,
      marketTime: m.regularMarketTime,
    });
  } catch (err) {
    res.status(err.status ?? 502).json({ error: "Failed to fetch quote", detail: err.message });
  }
});

app.get("/api/stocks/chart/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!SAFE_SYMBOL.test(symbol)) return res.status(400).json({ error: "Invalid symbol" });
  const range = VALID_RANGES.has(req.query.range) ? req.query.range : "3mo";
  const interval = VALID_INTERVALS.has(req.query.interval) ? req.query.interval : "1d";

  try {
    const result = await cached(`chart:${symbol}:${range}:${interval}`, 60_000, () => fetchYahooChart(symbol, range, interval));
    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const candles = timestamps
      .map((t, i) => ({
        time: t,
        open: q.open?.[i] ?? null,
        high: q.high?.[i] ?? null,
        low: q.low?.[i] ?? null,
        close: q.close?.[i] ?? null,
        volume: q.volume?.[i] ?? null,
      }))
      .filter((c) => c.open != null && c.high != null && c.low != null && c.close != null);

    res.json({
      symbol,
      range,
      interval,
      currency: result.meta.currency,
      name: result.meta.longName || result.meta.shortName || symbol,
      candles,
    });
  } catch (err) {
    res.status(err.status ?? 502).json({ error: "Failed to fetch chart", detail: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SDUI backend listening on http://localhost:${PORT}`);
  console.log(`Try:   http://localhost:${PORT}/api/screen/home`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
});
