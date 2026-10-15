import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { Badge, ButtonRow, Card, EmptyState, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { Tabs } from "../components/ui/Tabs";
import { useToast } from "../components/ui/Toast";
import { formatCurrency, formatDateTime, relativeTime, titleCase } from "../lib/format";
import { loadStatusTone, priorityTone } from "../domain/presentation";
import { getNextStatuses, validateTransition } from "../domain/statusMachine";
import { loadCost, loadMargin, loadMarginPct, loadRevenue } from "../domain/finance";
import { canManageLoads } from "../domain/permissions";
import type { DocumentType, Load, LoadStatus } from "../domain/types";

export function LoadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useAppStore();
  const toast = useToast();

  const loadOrUndefined = store.loads.find((l) => l.id === id);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [carrierModalOpen, setCarrierModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pendingCancelStatus, setPendingCancelStatus] = useState<LoadStatus | null>(null);

  const customer = useMemo(() => store.customers.find((c) => c.id === loadOrUndefined?.customerId), [store.customers, loadOrUndefined]);
  const carrier = useMemo(() => store.carriers.find((c) => c.id === loadOrUndefined?.carrierId), [store.carriers, loadOrUndefined]);
  const driver = useMemo(() => store.drivers.find((d) => d.id === loadOrUndefined?.driverId), [store.drivers, loadOrUndefined]);
  const vehicle = useMemo(() => store.vehicles.find((v) => v.id === loadOrUndefined?.vehicleId), [store.vehicles, loadOrUndefined]);
  const documents = useMemo(
    () => store.documents.filter((d) => d.entityType === "load" && d.entityId === loadOrUndefined?.id),
    [store.documents, loadOrUndefined],
  );
  const exceptions = useMemo(() => store.exceptions.filter((e) => e.loadId === loadOrUndefined?.id), [store.exceptions, loadOrUndefined]);

  if (!loadOrUndefined) {
    return (
      <Card>
        <EmptyState title="Load not found" message="It may have been removed from the mock dataset." />
      </Card>
    );
  }

  const load: Load = loadOrUndefined;
  const canEdit = canManageLoads(store.currentRole);
  const nextStatuses = getNextStatuses(load);

  function applyStatus(next: LoadStatus, reason?: string) {
    const error = validateTransition(load, next);
    if (error) {
      toast.show(error, "danger");
      return;
    }
    store.updateLoadStatus(load.id, next, reason);
    toast.show(`${load.loadNumber} moved to "${titleCase(next)}"`);
    setStatusModalOpen(false);
    setPendingCancelStatus(null);
    setCancelReason("");
  }

  function handleStatusClick(next: LoadStatus) {
    if (next === "cancelled") {
      setPendingCancelStatus(next);
      return;
    }
    applyStatus(next);
  }

  const overviewTab = (
    <div className="grid grid--2col">
      <Card title="Load details">
        <FieldRow label="Customer">{customer?.name ?? "—"}</FieldRow>
        <FieldRow label="PO number">{load.poNumber}</FieldRow>
        <FieldRow label="Reference number">{load.referenceNumber}</FieldRow>
        <FieldRow label="Equipment">{load.equipmentType}</FieldRow>
        <FieldRow label="Commodity">{load.commodity}</FieldRow>
        <FieldRow label="Weight">{load.weightLbs.toLocaleString()} lbs</FieldRow>
        <FieldRow label="Pieces">{load.pieceCount}</FieldRow>
        <FieldRow label="Hazmat">{load.hazmat ? <Badge label="Yes" tone="warning" /> : "No"}</FieldRow>
        <FieldRow label="Temperature controlled">{load.tempControlled ? <Badge label="Yes" tone="info" /> : "No"}</FieldRow>
        <FieldRow label="Dispatcher">{load.dispatcherId ?? "—"}</FieldRow>
      </Card>

      <Card
        title="Assignment"
        actions={
          canEdit && (
            <ButtonRow>
              <button className="btn btn--ghost btn--sm" onClick={() => setCarrierModalOpen(true)}>
                Assign Carrier
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setDriverModalOpen(true)}>
                Assign Driver
              </button>
            </ButtonRow>
          )
        }
      >
        <FieldRow label="Carrier">{carrier ? carrier.name : <span className="muted">Unassigned</span>}</FieldRow>
        <FieldRow label="Driver">{driver ? driver.name : <span className="muted">Unassigned</span>}</FieldRow>
        <FieldRow label="Vehicle">{vehicle ? vehicle.unitNumber : <span className="muted">Unassigned</span>}</FieldRow>
        <hr className="section-divider" />
        <FieldRow label="Internal notes">{load.notesInternal || <span className="muted">None</span>}</FieldRow>
        <FieldRow label="Customer-visible notes">{load.notesCustomer || <span className="muted">None</span>}</FieldRow>
      </Card>
    </div>
  );

  const stopsTab = (
    <div className="grid grid--2col">
      {load.stops.map((stop) => (
        <Card key={stop.id} title={stop.kind === "pickup" ? "Pickup" : "Delivery"}>
          <FieldRow label="Address">
            {stop.address.line1}, {stop.address.city}, {stop.address.state} {stop.address.zip}
          </FieldRow>
          <FieldRow label="Contact">{stop.contactName}</FieldRow>
          <FieldRow label="Phone">{stop.contactPhone}</FieldRow>
          <FieldRow label="Appointment window">
            {formatDateTime(stop.apptStart)} – {formatDateTime(stop.apptEnd)}
          </FieldRow>
          <FieldRow label="Timezone">{stop.timezone}</FieldRow>
          <FieldRow label="Actual arrival">{stop.actualArrival ? formatDateTime(stop.actualArrival) : "—"}</FieldRow>
        </Card>
      ))}
    </div>
  );

  const ratesTab = (
    <Card title="Rates & charges">
      <FieldRow label="Customer rate">{formatCurrency(load.customerRate)}</FieldRow>
      <FieldRow label="Fuel surcharge">{formatCurrency(load.fuelSurcharge)}</FieldRow>
      {load.accessorials.map((a) => (
        <FieldRow key={a.id} label={a.label}>
          {formatCurrency(a.amount)}
        </FieldRow>
      ))}
      <FieldRow label="Total customer revenue">
        <strong>{formatCurrency(loadRevenue(load))}</strong>
      </FieldRow>
      <hr className="section-divider" />
      <FieldRow label="Carrier rate">{load.carrierRate ? formatCurrency(loadCost(load)) : "Not yet set"}</FieldRow>
      <FieldRow label="Gross margin">
        <strong>
          {formatCurrency(loadMargin(load))} ({loadMarginPct(load).toFixed(1)}%)
        </strong>
      </FieldRow>
      <hr className="section-divider" />
      <FieldRow label="Billing status">
        <Badge label={titleCase(load.billingStatus)} tone={load.billingStatus === "invoiced" ? "success" : load.billingStatus === "ready" ? "info" : "neutral"} />
      </FieldRow>
    </Card>
  );

  const documentsTab = (
    <Card
      title="Documents"
      actions={
        canEdit && (
          <button className="btn btn--ghost btn--sm" onClick={() => setUploadModalOpen(true)}>
            Upload
          </button>
        )
      }
    >
      {documents.length === 0 ? (
        <EmptyState title="No documents attached to this load" />
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {documents.map((d) => (
            <FieldRow key={d.id} label={`${titleCase(d.type)} — ${d.fileName}`}>
              <span className="muted">
                {d.sizeKb} KB · uploaded by {d.uploadedByName}
              </span>
            </FieldRow>
          ))}
        </div>
      )}
    </Card>
  );

  const activityTab = (
    <div className="stack">
      <Card title="Status history">
        <div className="timeline">
          {load.statusHistory
            .slice()
            .reverse()
            .map((h) => (
              <div className="timeline__item" key={h.id}>
                <div className="timeline__dot" />
                <div>
                  <div>
                    {h.from ? (
                      <>
                        <Badge label={titleCase(h.from)} tone="neutral" /> →{" "}
                      </>
                    ) : null}
                    <Badge label={titleCase(h.to)} tone={loadStatusTone(h.to)} />
                    <span className="muted"> by {h.byUserName}</span>
                  </div>
                  {h.reason && <div className="muted">Reason: {h.reason}</div>}
                  <div className="timeline__meta">{formatDateTime(h.at)} · {relativeTime(h.at)}</div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {exceptions.length > 0 && (
        <Card title="Related exceptions">
          <div className="stack" style={{ gap: 8 }}>
            {exceptions.map((e) => (
              <Link key={e.id} to="/exceptions" className="field-row" style={{ color: "inherit" }}>
                <div className="field-row__label">{e.description}</div>
                <div className="field-row__value">
                  <Badge label={titleCase(e.status)} tone="warning" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">
            {load.loadNumber} <Badge label={titleCase(load.status)} tone={loadStatusTone(load.status)} />{" "}
            <Badge label={titleCase(load.priority)} tone={priorityTone(load.priority)} />
          </div>
          <div className="page-header__subtitle">
            {customer?.name} · {load.stops[0]?.address.city}, {load.stops[0]?.address.state} → {load.stops[1]?.address.city},{" "}
            {load.stops[1]?.address.state}
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => navigate("/loads")}>
            Back to Loads
          </button>
          {canEdit && (
            <button className="btn btn--ghost" onClick={() => navigate(`/loads/${load.id}/edit`)}>
              Edit
            </button>
          )}
          {canEdit && nextStatuses.length > 0 && (
            <button className="btn btn--primary" onClick={() => setStatusModalOpen(true)}>
              Change Status
            </button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: overviewTab },
          { id: "stops", label: "Stops", content: stopsTab },
          { id: "rates", label: "Rates & Charges", content: ratesTab },
          { id: "documents", label: "Documents", content: documentsTab, badge: documents.length },
          { id: "activity", label: "Activity", content: activityTab, badge: exceptions.length },
        ]}
      />

      <Modal open={statusModalOpen} title="Change load status" onClose={() => setStatusModalOpen(false)}>
        <p className="muted">Only transitions valid from "{titleCase(load.status)}" are shown.</p>
        <div className="stack" style={{ gap: 8 }}>
          {nextStatuses.map((s) => (
            <button key={s} className="btn btn--ghost" style={{ justifyContent: "flex-start" }} onClick={() => handleStatusClick(s)}>
              <Badge label={titleCase(s)} tone={loadStatusTone(s)} />
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={pendingCancelStatus !== null}
        title="Cancel load"
        onClose={() => setPendingCancelStatus(null)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setPendingCancelStatus(null)}>
              Back
            </button>
            <button className="btn btn--danger" disabled={!cancelReason.trim()} onClick={() => applyStatus("cancelled", cancelReason.trim())}>
              Cancel Load
            </button>
          </>
        }
      >
        <label className="form-label">Cancellation reason (required)</label>
        <textarea className="input" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
      </Modal>

      <AssignCarrierModal open={carrierModalOpen} onClose={() => setCarrierModalOpen(false)} loadId={load.id} />
      <AssignDriverModal open={driverModalOpen} onClose={() => setDriverModalOpen(false)} loadId={load.id} />
      <UploadDocumentModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} loadId={load.id} loadNumber={load.loadNumber} />
    </div>
  );
}

function AssignCarrierModal({ open, onClose, loadId }: { open: boolean; onClose: () => void; loadId: string }) {
  const store = useAppStore();
  const toast = useToast();
  const [carrierId, setCarrierId] = useState("");

  return (
    <Modal
      open={open}
      title="Assign carrier"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={!carrierId}
            onClick={() => {
              store.assignCarrier(loadId, carrierId);
              toast.show("Carrier assigned");
              onClose();
            }}
          >
            Assign
          </button>
        </>
      }
    >
      <label className="form-label">Carrier</label>
      <select className="input" value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
        <option value="">Select a carrier...</option>
        {store.carriers
          .filter((c) => c.status === "approved")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.mcNumber})
            </option>
          ))}
      </select>
    </Modal>
  );
}

function AssignDriverModal({ open, onClose, loadId }: { open: boolean; onClose: () => void; loadId: string }) {
  const store = useAppStore();
  const toast = useToast();
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  return (
    <Modal
      open={open}
      title="Assign driver & vehicle"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            disabled={!driverId || !vehicleId}
            onClick={() => {
              store.assignDriverVehicle(loadId, driverId, vehicleId);
              toast.show("Driver and vehicle assigned");
              onClose();
            }}
          >
            Assign
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Driver</label>
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select a driver...</option>
            {store.drivers
              .filter((d) => d.status !== "inactive")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({titleCase(d.status)})
                </option>
              ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Vehicle</label>
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">Select a vehicle...</option>
            {store.vehicles
              .filter((v) => v.status !== "out_of_service")
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unitNumber} — {titleCase(v.type)} ({titleCase(v.status)})
                </option>
              ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function UploadDocumentModal({
  open,
  onClose,
  loadId,
  loadNumber,
}: {
  open: boolean;
  onClose: () => void;
  loadId: string;
  loadNumber: string;
}) {
  const store = useAppStore();
  const toast = useToast();
  const [type, setType] = useState<DocumentType>("rate_confirmation");
  const [fileName, setFileName] = useState("");

  function submit() {
    if (!fileName.trim()) return;
    store.addDocument({
      id: `doc-${Date.now()}`,
      type,
      entityType: "load",
      entityId: loadId,
      entityLabel: loadNumber,
      fileName: fileName.trim(),
      uploadedByName: store.currentUserName,
      uploadedAt: new Date().toISOString(),
      expiresAt: null,
      sizeKb: Math.round(50 + Math.random() * 400),
    });
    toast.show("Document added (mock upload — not sent anywhere)");
    setFileName("");
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Upload document"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!fileName.trim()} onClick={submit}>
            Upload
          </button>
        </>
      }
    >
      <p className="muted">This is a UI-only mock — it adds a record locally, nothing is actually uploaded.</p>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Document type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
            <option value="rate_confirmation">Rate Confirmation</option>
            <option value="bill_of_lading">Bill of Lading</option>
            <option value="proof_of_delivery">Proof of Delivery</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">File name</label>
          <input className="input" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. signed-bol.pdf" />
        </div>
      </div>
    </Modal>
  );
}
