import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { Badge, Card, EmptyState } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatCurrency, formatDateTime, titleCase } from "../lib/format";
import { loadStatusTone } from "../domain/presentation";
import { validateTransition } from "../domain/statusMachine";
import { indexById } from "../lib/collections";
import type { Load } from "../domain/types";

const PLANNING_STATUSES: Load["status"][] = ["ready_for_planning", "awaiting_carrier", "carrier_assigned", "driver_assigned"];

export function PlanningBoardPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [planningLoad, setPlanningLoad] = useState<Load | null>(null);
  const [carrierId, setCarrierId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const customersById = useMemo(() => indexById(store.customers), [store.customers]);
  const unplanned = useMemo(() => store.loads.filter((l) => PLANNING_STATUSES.includes(l.status)), [store.loads]);
  const availableDrivers = useMemo(() => store.drivers.filter((d) => d.status === "available"), [store.drivers]);
  const availableVehicles = useMemo(() => store.vehicles.filter((v) => v.status === "available"), [store.vehicles]);
  const approvedCarriers = useMemo(() => store.carriers.filter((c) => c.status === "approved"), [store.carriers]);

  function openPlanning(load: Load) {
    setPlanningLoad(load);
    setCarrierId(load.carrierId ?? "");
    setDriverId(load.driverId ?? "");
    setVehicleId(load.vehicleId ?? "");
  }

  function savePlanning() {
    if (!planningLoad) return;
    if (carrierId && carrierId !== planningLoad.carrierId) store.assignCarrier(planningLoad.id, carrierId);
    if (driverId && vehicleId) store.assignDriverVehicle(planningLoad.id, driverId, vehicleId);

    const updated: Load = { ...planningLoad, carrierId: carrierId || planningLoad.carrierId, driverId: driverId || planningLoad.driverId, vehicleId: vehicleId || planningLoad.vehicleId };
    let next: Load["status"] | null = null;
    if (updated.status === "ready_for_planning" && carrierId) next = "awaiting_carrier";
    if (updated.status === "awaiting_carrier" && carrierId) next = "carrier_assigned";
    if ((updated.status === "carrier_assigned" || next === "carrier_assigned") && driverId && vehicleId) next = "driver_assigned";

    if (next) {
      const error = validateTransition(updated, next);
      if (!error) store.updateLoadStatus(planningLoad.id, next);
    }

    toast.show(`${planningLoad.loadNumber} planning updated`);
    setPlanningLoad(null);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Load Planning</div>
          <div className="page-header__subtitle">{unplanned.length} loads need a carrier, driver, or vehicle assigned</div>
        </div>
      </div>

      <div className="grid grid--2col">
        <Card title="Unplanned & in-progress planning">
          {unplanned.length === 0 ? (
            <EmptyState title="Nothing waiting on planning right now" />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {unplanned.map((l) => (
                <div key={l.id} className="board-card" onClick={() => openPlanning(l)}>
                  <div className="board-card__top">
                    <strong>{l.loadNumber}</strong>
                    <Badge label={titleCase(l.status)} tone={loadStatusTone(l.status)} />
                  </div>
                  <div className="board-card__route">
                    {customersById[l.customerId]?.name} · {l.stops[0]?.address.city}, {l.stops[0]?.address.state} →{" "}
                    {l.stops[1]?.address.city}, {l.stops[1]?.address.state}
                  </div>
                  <div className="muted">
                    Pickup {formatDateTime(l.stops[0]?.apptStart)} · {formatCurrency(l.customerRate)} · {l.equipmentType}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="stack">
          <Card title={`Available drivers (${availableDrivers.length})`}>
            {availableDrivers.length === 0 ? (
              <EmptyState title="No drivers currently available" />
            ) : (
              availableDrivers.map((d) => (
                <div className="field-row" key={d.id}>
                  <span>{d.name}</span>
                  <span className="muted">{d.homeBase}</span>
                </div>
              ))
            )}
          </Card>
          <Card title={`Available vehicles (${availableVehicles.length})`}>
            {availableVehicles.length === 0 ? (
              <EmptyState title="No vehicles currently available" />
            ) : (
              availableVehicles.map((v) => (
                <div className="field-row" key={v.id}>
                  <span>{v.unitNumber}</span>
                  <span className="muted">{titleCase(v.type)}</span>
                </div>
              ))
            )}
          </Card>
          <Card title={`Approved carriers (${approvedCarriers.length})`}>
            {approvedCarriers.map((c) => (
              <div className="field-row" key={c.id}>
                <span>{c.name}</span>
                <span className="muted">★ {c.rating}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal
        open={planningLoad !== null}
        title={planningLoad ? `Plan ${planningLoad.loadNumber}` : ""}
        onClose={() => setPlanningLoad(null)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => planningLoad && navigate(`/loads/${planningLoad.id}`)}>
              Open full load
            </button>
            <button className="btn btn--primary" onClick={savePlanning}>
              Save planning
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Carrier</label>
            <select className="input" value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
              <option value="">Unassigned</option>
              {approvedCarriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Driver</label>
            <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Unassigned</option>
              {store.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({titleCase(d.status)})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Vehicle</label>
            <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Unassigned</option>
              {store.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unitNumber} ({titleCase(v.status)})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Saving advances the load's status automatically when the required assignment for the next step is complete.
        </p>
      </Modal>
    </div>
  );
}
