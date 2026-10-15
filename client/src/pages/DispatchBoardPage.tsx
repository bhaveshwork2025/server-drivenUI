import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { Badge } from "../components/ui/primitives";
import { titleCase } from "../lib/format";
import { getNextStatuses, validateTransition } from "../domain/statusMachine";
import { loadStatusTone } from "../domain/presentation";
import { canManageLoads } from "../domain/permissions";
import { indexById } from "../lib/collections";
import type { Load, LoadStatus } from "../domain/types";

const BOARD_COLUMNS: LoadStatus[] = [
  "planned",
  "dispatched",
  "at_pickup",
  "loading",
  "picked_up",
  "in_transit",
  "at_delivery",
  "unloading",
  "delivered",
];

function primaryNext(load: Load): LoadStatus | null {
  const candidates = getNextStatuses(load).filter((s) => !["on_hold", "delayed", "exception", "cancelled"].includes(s));
  return candidates[0] ?? null;
}

export function DispatchBoardPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const canAdvance = canManageLoads(store.currentRole);

  const customersById = useMemo(() => indexById(store.customers), [store.customers]);
  const driversById = useMemo(() => indexById(store.drivers), [store.drivers]);

  const columns = useMemo(
    () => BOARD_COLUMNS.map((status) => ({ status, loads: store.loads.filter((l) => l.status === status) })),
    [store.loads],
  );

  function advance(load: Load) {
    const next = primaryNext(load);
    if (!next) return;
    const error = validateTransition(load, next);
    if (error) {
      toast.show(error, "danger");
      return;
    }
    store.updateLoadStatus(load.id, next);
    toast.show(`${load.loadNumber} → ${titleCase(next)}`);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Dispatch Board</div>
          <div className="page-header__subtitle">
            Click a card to open the full load. Use the arrow to move a load one step forward in its lifecycle.
          </div>
        </div>
      </div>

      <div className="board">
        {columns.map((col) => (
          <div key={col.status} className="board__column">
            <div className="board__column-header">
              <span>{titleCase(col.status)}</span>
              <Badge label={String(col.loads.length)} tone={loadStatusTone(col.status)} />
            </div>
            <div className="board__column-body">
              {col.loads.map((l) => (
                <div key={l.id} className="board-card" onClick={() => navigate(`/loads/${l.id}`)}>
                  <div className="board-card__top">
                    <strong>{l.loadNumber}</strong>
                    {canAdvance && primaryNext(l) && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          advance(l);
                        }}
                        title={`Advance to ${titleCase(primaryNext(l) ?? "")}`}
                      >
                        →
                      </button>
                    )}
                  </div>
                  <div className="board-card__route">
                    {customersById[l.customerId]?.name} · {l.stops[0]?.address.city} → {l.stops[1]?.address.city}
                  </div>
                  <div className="muted">{l.driverId ? driversById[l.driverId]?.name : "No driver assigned"}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
