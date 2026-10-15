import { useState } from "react";
import { SduiRenderer } from "../sdui/SduiRenderer";
import { useScreen } from "../sdui/useScreen";
// @ts-expect-error CSS imports are processed by the bundler, not TypeScript.
import "../sdui.css";

// The original demo: a screen whose look comes entirely from
// server/data/<id>.json, proving UI changes without a client rebuild.
export function SduiDemoPage() {
  const [screenId, setScreenId] = useState("home");
  const { screen, error, loading, lastFetchedAt, refetch } = useScreen(screenId);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Server-Driven UI Demo</div>
          <div className="page-header__subtitle">
            This screen's layout, text, and colors are fetched from the Express backend's{" "}
            <code>server/data/home.json</code> — edit that file and refresh, no rebuild needed.
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={refetch}>
            Refresh UI
          </button>
        </div>
      </div>

      <div className="app-shell">
        <div className="app-toolbar">
          <span>
            {loading ? "Loading..." : `Loaded v${screen?.version ?? "?"}`}
            {lastFetchedAt ? ` @ ${lastFetchedAt.toLocaleTimeString()}` : ""}
          </span>
        </div>

        {error && (
          <div className="app-error">
            Failed to reach backend: {error}. Is the server running on port 4000?
          </div>
        )}

        {screen && <SduiRenderer node={screen.root} navigate={setScreenId} />}
      </div>
    </div>
  );
}
