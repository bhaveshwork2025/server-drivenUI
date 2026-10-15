import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { ButtonRow, Card } from "../components/ui/primitives";
import type { Load, LoadPriority } from "../domain/types";

interface FormState {
  customerId: string;
  poNumber: string;
  referenceNumber: string;
  equipmentType: string;
  commodity: string;
  weightLbs: string;
  pieceCount: string;
  hazmat: boolean;
  tempControlled: boolean;
  priority: LoadPriority;
  pickupCity: string;
  pickupState: string;
  pickupLine1: string;
  pickupAppt: string;
  pickupContact: string;
  pickupPhone: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryLine1: string;
  deliveryAppt: string;
  deliveryContact: string;
  deliveryPhone: string;
  customerRate: string;
  fuelSurcharge: string;
  notesInternal: string;
  notesCustomer: string;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  const in2days = toDatetimeLocal(new Date(Date.now() + 48 * 3600 * 1000).toISOString());
  const in4days = toDatetimeLocal(new Date(Date.now() + 96 * 3600 * 1000).toISOString());
  return {
    customerId: "",
    poNumber: "",
    referenceNumber: "",
    equipmentType: "Dry Van",
    commodity: "",
    weightLbs: "",
    pieceCount: "",
    hazmat: false,
    tempControlled: false,
    priority: "normal",
    pickupCity: "",
    pickupState: "",
    pickupLine1: "",
    pickupAppt: in2days,
    pickupContact: "",
    pickupPhone: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryLine1: "",
    deliveryAppt: in4days,
    deliveryContact: "",
    deliveryPhone: "",
    customerRate: "",
    fuelSurcharge: "",
    notesInternal: "",
    notesCustomer: "",
  };
}

function loadToForm(load: Load): FormState {
  return {
    customerId: load.customerId,
    poNumber: load.poNumber,
    referenceNumber: load.referenceNumber,
    equipmentType: load.equipmentType,
    commodity: load.commodity,
    weightLbs: String(load.weightLbs),
    pieceCount: String(load.pieceCount),
    hazmat: load.hazmat,
    tempControlled: load.tempControlled,
    priority: load.priority,
    pickupCity: load.stops[0]?.address.city ?? "",
    pickupState: load.stops[0]?.address.state ?? "",
    pickupLine1: load.stops[0]?.address.line1 ?? "",
    pickupAppt: toDatetimeLocal(load.stops[0]?.apptStart ?? new Date().toISOString()),
    pickupContact: load.stops[0]?.contactName ?? "",
    pickupPhone: load.stops[0]?.contactPhone ?? "",
    deliveryCity: load.stops[1]?.address.city ?? "",
    deliveryState: load.stops[1]?.address.state ?? "",
    deliveryLine1: load.stops[1]?.address.line1 ?? "",
    deliveryAppt: toDatetimeLocal(load.stops[1]?.apptStart ?? new Date().toISOString()),
    deliveryContact: load.stops[1]?.contactName ?? "",
    deliveryPhone: load.stops[1]?.contactPhone ?? "",
    customerRate: String(load.customerRate),
    fuelSurcharge: String(load.fuelSurcharge),
    notesInternal: load.notesInternal,
    notesCustomer: load.notesCustomer,
  };
}

export function LoadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useAppStore();
  const toast = useToast();

  const existing = useMemo(() => (id ? store.loads.find((l) => l.id === id) : undefined), [id, store.loads]);
  const [form, setForm] = useState<FormState>(existing ? loadToForm(existing) : emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(full: boolean): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = "Customer is required.";
    if (full) {
      if (!form.pickupCity || !form.pickupState) e.pickupCity = "Pickup city and state are required.";
      if (!form.deliveryCity || !form.deliveryState) e.deliveryCity = "Delivery city and state are required.";
      if (!form.pickupAppt) e.pickupAppt = "Pickup appointment is required.";
      if (!form.deliveryAppt) e.deliveryAppt = "Delivery appointment is required.";
      if (form.pickupAppt && form.deliveryAppt && new Date(form.deliveryAppt) <= new Date(form.pickupAppt)) {
        e.deliveryAppt = "Delivery appointment must be after pickup.";
      }
      const rate = Number(form.customerRate);
      if (!form.customerRate || Number.isNaN(rate) || rate <= 0) e.customerRate = "Enter a customer rate greater than 0.";
      const weight = Number(form.weightLbs);
      if (!form.weightLbs || Number.isNaN(weight) || weight <= 0) e.weightLbs = "Enter a valid weight.";
    }
    return e;
  }

  function buildLoad(status: Load["status"]): Load {
    const now = new Date().toISOString();
    const base: Load = existing ?? {
      id: `load-new-${Date.now()}`,
      loadNumber: `LD-${100000 + store.loads.length + 1}`,
      customerId: "",
      poNumber: "",
      referenceNumber: "",
      status: "draft",
      priority: "normal",
      equipmentType: "Dry Van",
      commodity: "",
      weightLbs: 0,
      pieceCount: 0,
      hazmat: false,
      tempControlled: false,
      stops: [],
      customerRate: 0,
      carrierRate: null,
      fuelSurcharge: 0,
      accessorials: [],
      dispatcherId: store.currentUserName,
      carrierId: null,
      driverId: null,
      vehicleId: null,
      notesInternal: "",
      notesCustomer: "",
      billingStatus: "not_ready",
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ id: `sh-${Date.now()}`, from: null, to: "draft", at: now, byUserName: store.currentUserName }],
    };

    return {
      ...base,
      customerId: form.customerId,
      poNumber: form.poNumber,
      referenceNumber: form.referenceNumber,
      equipmentType: form.equipmentType,
      commodity: form.commodity,
      weightLbs: Number(form.weightLbs) || 0,
      pieceCount: Number(form.pieceCount) || 0,
      hazmat: form.hazmat,
      tempControlled: form.tempControlled,
      priority: form.priority,
      status,
      stops: [
        {
          id: base.stops[0]?.id ?? `stop-${Date.now()}-p`,
          kind: "pickup",
          sequence: 1,
          address: { line1: form.pickupLine1, city: form.pickupCity, state: form.pickupState, zip: "", country: "USA" },
          contactName: form.pickupContact,
          contactPhone: form.pickupPhone,
          apptStart: form.pickupAppt ? new Date(form.pickupAppt).toISOString() : now,
          apptEnd: form.pickupAppt ? new Date(new Date(form.pickupAppt).getTime() + 2 * 3600000).toISOString() : now,
          timezone: "America/Chicago",
          actualArrival: base.stops[0]?.actualArrival ?? null,
          actualDeparture: base.stops[0]?.actualDeparture ?? null,
        },
        {
          id: base.stops[1]?.id ?? `stop-${Date.now()}-d`,
          kind: "delivery",
          sequence: 2,
          address: { line1: form.deliveryLine1, city: form.deliveryCity, state: form.deliveryState, zip: "", country: "USA" },
          contactName: form.deliveryContact,
          contactPhone: form.deliveryPhone,
          apptStart: form.deliveryAppt ? new Date(form.deliveryAppt).toISOString() : now,
          apptEnd: form.deliveryAppt ? new Date(new Date(form.deliveryAppt).getTime() + 2 * 3600000).toISOString() : now,
          timezone: "America/Chicago",
          actualArrival: base.stops[1]?.actualArrival ?? null,
          actualDeparture: base.stops[1]?.actualDeparture ?? null,
        },
      ],
      customerRate: Number(form.customerRate) || 0,
      fuelSurcharge: Number(form.fuelSurcharge) || 0,
      notesInternal: form.notesInternal,
      notesCustomer: form.notesCustomer,
      updatedAt: now,
    };
  }

  function handleSave(asDraft: boolean) {
    const validation = validate(!asDraft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.show("Fix the highlighted fields before continuing.", "danger");
      return;
    }

    const status = asDraft ? "draft" : existing && existing.status !== "draft" ? existing.status : "submitted";
    const load = buildLoad(status);

    if (existing) {
      store.updateLoad(existing.id, load);
      toast.show(`${load.loadNumber} updated`);
      navigate(`/loads/${existing.id}`);
    } else {
      store.createLoad(load);
      toast.show(`${load.loadNumber} created${asDraft ? " as draft" : ""}`);
      navigate(`/loads/${load.id}`);
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">{existing ? `Edit ${existing.loadNumber}` : "New Load"}</div>
          <div className="page-header__subtitle">Draft saves skip full validation; submitting requires complete stop and rate info.</div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </div>

      <Card>
        <div className="form-section">
          <div className="form-section__title">Shipment</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Customer *</label>
              <select className="input" value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
                <option value="">Select customer...</option>
                {store.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.customerId && <div className="form-error">{errors.customerId}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">PO number</label>
              <input className="input" value={form.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Reference number</label>
              <input className="input" value={form.referenceNumber} onChange={(e) => set("referenceNumber", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Equipment</label>
              <select className="input" value={form.equipmentType} onChange={(e) => set("equipmentType", e.target.value)}>
                {["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only"].map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Commodity</label>
              <input className="input" value={form.commodity} onChange={(e) => set("commodity", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Weight (lbs) *</label>
              <input className="input" type="number" value={form.weightLbs} onChange={(e) => set("weightLbs", e.target.value)} />
              {errors.weightLbs && <div className="form-error">{errors.weightLbs}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Piece count</label>
              <input className="input" type="number" value={form.pieceCount} onChange={(e) => set("pieceCount", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => set("priority", e.target.value as LoadPriority)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-field form-field--checkbox">
              <input id="hazmat" type="checkbox" checked={form.hazmat} onChange={(e) => set("hazmat", e.target.checked)} />
              <label htmlFor="hazmat">Hazardous material</label>
            </div>
            <div className="form-field form-field--checkbox">
              <input id="temp" type="checkbox" checked={form.tempControlled} onChange={(e) => set("tempControlled", e.target.checked)} />
              <label htmlFor="temp">Temperature controlled</label>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Pickup</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Address line</label>
              <input className="input" value={form.pickupLine1} onChange={(e) => set("pickupLine1", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">City *</label>
              <input className="input" value={form.pickupCity} onChange={(e) => set("pickupCity", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">State *</label>
              <input className="input" value={form.pickupState} onChange={(e) => set("pickupState", e.target.value)} maxLength={2} />
              {errors.pickupCity && <div className="form-error">{errors.pickupCity}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Appointment *</label>
              <input className="input" type="datetime-local" value={form.pickupAppt} onChange={(e) => set("pickupAppt", e.target.value)} />
              {errors.pickupAppt && <div className="form-error">{errors.pickupAppt}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Contact name</label>
              <input className="input" value={form.pickupContact} onChange={(e) => set("pickupContact", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Contact phone</label>
              <input className="input" value={form.pickupPhone} onChange={(e) => set("pickupPhone", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Delivery</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Address line</label>
              <input className="input" value={form.deliveryLine1} onChange={(e) => set("deliveryLine1", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">City *</label>
              <input className="input" value={form.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">State *</label>
              <input className="input" value={form.deliveryState} onChange={(e) => set("deliveryState", e.target.value)} maxLength={2} />
              {errors.deliveryCity && <div className="form-error">{errors.deliveryCity}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Appointment *</label>
              <input className="input" type="datetime-local" value={form.deliveryAppt} onChange={(e) => set("deliveryAppt", e.target.value)} />
              {errors.deliveryAppt && <div className="form-error">{errors.deliveryAppt}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Contact name</label>
              <input className="input" value={form.deliveryContact} onChange={(e) => set("deliveryContact", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Contact phone</label>
              <input className="input" value={form.deliveryPhone} onChange={(e) => set("deliveryPhone", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Rates</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Customer rate *</label>
              <input className="input" type="number" value={form.customerRate} onChange={(e) => set("customerRate", e.target.value)} />
              {errors.customerRate && <div className="form-error">{errors.customerRate}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Fuel surcharge</label>
              <input className="input" type="number" value={form.fuelSurcharge} onChange={(e) => set("fuelSurcharge", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__title">Notes</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Internal notes</label>
              <textarea className="input" rows={3} value={form.notesInternal} onChange={(e) => set("notesInternal", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Customer-visible notes</label>
              <textarea className="input" rows={3} value={form.notesCustomer} onChange={(e) => set("notesCustomer", e.target.value)} />
            </div>
          </div>
        </div>

        <ButtonRow>
          <button className="btn btn--ghost" onClick={() => handleSave(true)}>
            Save as Draft
          </button>
          <button className="btn btn--primary" onClick={() => handleSave(false)}>
            {existing ? "Save Changes" : "Submit Load"}
          </button>
        </ButtonRow>
      </Card>
    </div>
  );
}
