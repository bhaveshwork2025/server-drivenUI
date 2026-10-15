import type {
  AppUser,
  Carrier,
  Customer,
  Driver,
  DocumentRecord,
  ExceptionRecord,
  Invoice,
  CarrierBill,
  Load,
  LoadStatus,
  LoadStop,
  NotificationRecord,
  Role,
  Vehicle,
} from "../domain/types";
import { choice, daysFromNow, hoursFromNow, makeRng, randInt, weightedChoice, type Rng } from "./rng";

const CITIES: { city: string; state: string }[] = [
  { city: "Chicago", state: "IL" },
  { city: "Dallas", state: "TX" },
  { city: "Atlanta", state: "GA" },
  { city: "Columbus", state: "OH" },
  { city: "Memphis", state: "TN" },
  { city: "Charlotte", state: "NC" },
  { city: "Indianapolis", state: "IN" },
  { city: "Kansas City", state: "MO" },
  { city: "Denver", state: "CO" },
  { city: "Phoenix", state: "AZ" },
  { city: "Los Angeles", state: "CA" },
  { city: "Seattle", state: "WA" },
  { city: "Newark", state: "NJ" },
  { city: "Louisville", state: "KY" },
  { city: "Nashville", state: "TN" },
  { city: "Jacksonville", state: "FL" },
];

const EQUIPMENT_TYPES = ["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only"];
const COMMODITIES = [
  "General Freight",
  "Packaged Foods",
  "Consumer Electronics",
  "Building Materials",
  "Paper Products",
  "Produce",
  "Auto Parts",
  "Industrial Equipment",
];

function address(rng: Rng) {
  const { city, state } = choice(rng, CITIES);
  return {
    line1: `${randInt(rng, 100, 9800)} ${choice(rng, ["Freight Ln", "Commerce Dr", "Distribution Pkwy", "Harbor Rd", "Industrial Blvd"])}`,
    city,
    state,
    zip: String(randInt(rng, 10000, 99999)),
    country: "USA",
  };
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString().padStart(4, "0")}`;
}

const FIRST_NAMES = ["Alex", "Jordan", "Priya", "Marcus", "Elena", "Sam", "Nina", "Derek", "Carlos", "Jade", "Omar", "Rachel", "Tyrell", "Sofia", "Ben", "Lucia"];
const LAST_NAMES = ["Rivera", "Chen", "Patel", "Okafor", "Novak", "Reyes", "Hughes", "Kowalski", "Singh", "Marsh", "Dubois", "Alvarez", "Finch", "Brennan"];

function personName(rng: Rng): string {
  return `${choice(rng, FIRST_NAMES)} ${choice(rng, LAST_NAMES)}`;
}

export interface SeedData {
  users: AppUser[];
  customers: Customer[];
  carriers: Carrier[];
  drivers: Driver[];
  vehicles: Vehicle[];
  loads: Load[];
  invoices: Invoice[];
  carrierBills: CarrierBill[];
  documents: DocumentRecord[];
  exceptions: ExceptionRecord[];
  notifications: NotificationRecord[];
}

function buildUsers(rng: Rng): AppUser[] {
  const roles: Role[] = [
    "company_admin",
    "ops_manager",
    "dispatcher",
    "dispatcher",
    "load_planner",
    "fleet_manager",
    "billing_finance",
    "compliance_manager",
    "auditor",
  ];
  return roles.map((role, i) => {
    const name = personName(rng);
    return {
      id: nextId("usr"),
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@northbate-lm.test`,
      role,
      status: i === roles.length - 1 ? "invited" : "active",
      lastActiveAt: i === roles.length - 1 ? null : hoursFromNow(-randInt(rng, 0, 72)),
      createdAt: daysFromNow(-randInt(rng, 30, 400)),
    };
  });
}

function buildCustomers(rng: Rng): Customer[] {
  const names = [
    "Brightline Retail Group",
    "Coastal Produce Co.",
    "Meridian Electronics",
    "Summit Building Supply",
    "Harborview Foods",
    "Vantage Auto Parts",
    "Crestwood Paper Mills",
    "Apex Industrial Supply",
  ];
  return names.map((name) => ({
    id: nextId("cus"),
    name,
    billingAddress: address(rng),
    contactName: personName(rng),
    contactEmail: `ap@${name.split(" ")[0].toLowerCase()}.test`,
    contactPhone: `(${randInt(rng, 200, 989)}) 555-${String(randInt(rng, 1000, 9999))}`,
    paymentTermsDays: choice(rng, [15, 30, 45, 60]),
    creditLimit: choice(rng, [25000, 50000, 75000, 100000, 150000]),
    status: "active",
  }));
}

function buildCarriers(rng: Rng): Carrier[] {
  const names = [
    "Redline Freight LLC",
    "Prairie Haul Carriers",
    "BlueOx Transport",
    "Ironclad Logistics",
    "Southern Cross Trucking",
    "Pinnacle Carrier Group",
  ];
  return names.map((name) => ({
    id: nextId("car"),
    name,
    mcNumber: `MC-${randInt(rng, 100000, 999999)}`,
    dotNumber: `DOT-${randInt(rng, 1000000, 9999999)}`,
    status: weightedChoice(rng, [["approved", 8], ["pending", 1], ["suspended", 1]] as const),
    equipmentTypes: [choice(rng, EQUIPMENT_TYPES), choice(rng, EQUIPMENT_TYPES)].filter((v, i, a) => a.indexOf(v) === i),
    serviceRegions: ["Midwest", "Southeast", "Southwest", "Northeast", "West Coast"].filter(() => rng() > 0.5),
    insuranceExpiry: daysFromNow(randInt(rng, -10, 180)),
    contactName: personName(rng),
    contactPhone: `(${randInt(rng, 200, 989)}) 555-${String(randInt(rng, 1000, 9999))}`,
    contactEmail: `dispatch@${name.split(" ")[0].toLowerCase()}.test`,
    rating: Math.round((3 + rng() * 2) * 10) / 10,
  }));
}

function buildVehicles(rng: Rng, carrierIds: string[]): Vehicle[] {
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < 14; i++) {
    const type = choice(rng, ["tractor", "trailer", "reefer", "flatbed", "straight_truck"] as const);
    const ownership = weightedChoice(rng, [["company", 2], ["carrier", 1]] as const);
    vehicles.push({
      id: nextId("veh"),
      unitNumber: `${type === "tractor" ? "T" : type === "trailer" ? "TR" : "V"}-${randInt(rng, 100, 999)}`,
      type,
      vin: `1FUJ${randInt(rng, 100000, 999999)}${randInt(rng, 1000, 9999)}`,
      capacityLbs: type === "trailer" || type === "reefer" || type === "flatbed" ? 45000 : 80000,
      ownership,
      carrierId: ownership === "carrier" ? choice(rng, carrierIds) : null,
      status: weightedChoice(rng, [["available", 6], ["in_use", 5], ["maintenance", 2], ["out_of_service", 1]] as const),
      insuranceExpiry: daysFromNow(randInt(rng, -5, 200)),
      inspectionExpiry: daysFromNow(randInt(rng, -5, 200)),
      registrationExpiry: daysFromNow(randInt(rng, 10, 365)),
    });
  }
  return vehicles;
}

function buildDrivers(rng: Rng, carrierIds: string[], vehicleIds: string[]): Driver[] {
  const drivers: Driver[] = [];
  for (let i = 0; i < 10; i++) {
    const employment = weightedChoice(rng, [["company", 2], ["owner_operator", 1]] as const);
    const name = personName(rng);
    drivers.push({
      id: nextId("drv"),
      name,
      phone: `(${randInt(rng, 200, 989)}) 555-${String(randInt(rng, 1000, 9999))}`,
      email: `${name.toLowerCase().replace(" ", ".")}@drivers.test`,
      employment,
      carrierId: employment === "owner_operator" ? choice(rng, carrierIds) : null,
      licenseNumber: `CDL-${randInt(rng, 1000000, 9999999)}`,
      licenseExpiry: daysFromNow(randInt(rng, -5, 365)),
      status: weightedChoice(rng, [["available", 5], ["on_load", 4], ["off_duty", 2], ["inactive", 1]] as const),
      assignedVehicleId: rng() > 0.3 ? choice(rng, vehicleIds) : null,
      homeBase: `${choice(rng, CITIES).city}, ${choice(rng, CITIES).state}`,
    });
  }
  return drivers;
}

function buildStop(rng: Rng, kind: "pickup" | "delivery", sequence: number, apptOffsetHours: number): LoadStop {
  const start = hoursFromNow(apptOffsetHours);
  return {
    id: nextId("stop"),
    kind,
    sequence,
    address: address(rng),
    contactName: personName(rng),
    contactPhone: `(${randInt(rng, 200, 989)}) 555-${String(randInt(rng, 1000, 9999))}`,
    apptStart: start,
    apptEnd: hoursFromNow(apptOffsetHours + 2),
    timezone: "America/Chicago",
    actualArrival: null,
    actualDeparture: null,
  };
}

const STATUS_DISTRIBUTION: readonly (readonly [LoadStatus, number])[] = [
  ["draft", 3],
  ["submitted", 3],
  ["pending_review", 2],
  ["ready_for_planning", 4],
  ["awaiting_carrier", 3],
  ["carrier_assigned", 3],
  ["driver_assigned", 3],
  ["planned", 3],
  ["dispatched", 3],
  ["in_transit", 5],
  ["delivered", 3],
  ["pending_pod", 2],
  ["delivery_confirmed", 2],
  ["ready_for_billing", 3],
  ["invoiced", 4],
  ["closed", 3],
  ["on_hold", 1],
  ["delayed", 2],
  ["exception", 1],
  ["cancelled", 1],
];

function loadNumber(n: number): string {
  return `LD-${(100000 + n).toString()}`;
}

function buildLoads(
  rng: Rng,
  customerIds: string[],
  carrierIds: string[],
  driverIds: string[],
  vehicleIds: string[],
  dispatcherIds: string[],
): Load[] {
  const loads: Load[] = [];
  let seq = 0;

  for (const [status, count] of STATUS_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      seq += 1;
      const createdOffsetDays = -randInt(rng, 1, 20);
      const pickupOffsetHours = status === "delivered" || status === "pending_pod" || status === "delivery_confirmed" ||
        status === "ready_for_billing" || status === "invoiced" || status === "closed"
        ? -randInt(rng, 24, 240)
        : randInt(rng, -36, 96);

      const customerRate = randInt(rng, 800, 6500);
      const hasCarrier = !["draft", "submitted", "pending_review", "ready_for_planning", "awaiting_carrier"].includes(status);
      const hasDriver = !["draft", "submitted", "pending_review", "ready_for_planning", "awaiting_carrier", "carrier_assigned"].includes(status);
      const carrierRate = hasCarrier ? Math.round(customerRate * (0.68 + rng() * 0.15)) : null;

      const assignedDriverId = hasDriver ? choice(rng, driverIds) : null;
      const assignedVehicleId = hasDriver ? choice(rng, vehicleIds) : null;

      const createdAt = daysFromNow(createdOffsetDays);
      const history: Load["statusHistory"] = [
        { id: nextId("sh"), from: null, to: "draft", at: createdAt, byUserName: choice(rng, dispatcherIds) },
      ];
      if (status !== "draft") {
        history.push({ id: nextId("sh"), from: "draft", to: status, at: hoursFromNow(pickupOffsetHours - 12), byUserName: choice(rng, dispatcherIds) });
      }

      loads.push({
        id: nextId("load"),
        loadNumber: loadNumber(seq),
        customerId: choice(rng, customerIds),
        poNumber: `PO-${randInt(rng, 10000, 99999)}`,
        referenceNumber: `REF-${randInt(rng, 1000, 9999)}`,
        status,
        priority: weightedChoice(rng, [["normal", 6], ["high", 2], ["critical", 1], ["low", 1]] as const),
        equipmentType: choice(rng, EQUIPMENT_TYPES),
        commodity: choice(rng, COMMODITIES),
        weightLbs: randInt(rng, 5000, 44000),
        pieceCount: randInt(rng, 1, 26),
        hazmat: rng() > 0.9,
        tempControlled: rng() > 0.85,
        stops: [buildStop(rng, "pickup", 1, pickupOffsetHours), buildStop(rng, "delivery", 2, pickupOffsetHours + randInt(rng, 10, 48))],
        customerRate,
        carrierRate,
        fuelSurcharge: Math.round(customerRate * 0.08),
        accessorials: rng() > 0.7 ? [{ id: nextId("acc"), label: "Liftgate", amount: 75 }] : [],
        dispatcherId: choice(rng, dispatcherIds),
        carrierId: hasCarrier ? choice(rng, carrierIds) : null,
        driverId: assignedDriverId,
        vehicleId: assignedVehicleId,
        notesInternal: "",
        notesCustomer: "",
        billingStatus:
          status === "invoiced" || status === "closed"
            ? "invoiced"
            : status === "ready_for_billing"
              ? "ready"
              : "not_ready",
        createdAt,
        updatedAt: hoursFromNow(pickupOffsetHours - 6),
        statusHistory: history,
      });
    }
  }
  return loads;
}

function buildInvoices(rng: Rng, loads: Load[]): Invoice[] {
  const invoiced = loads.filter((l) => l.billingStatus === "invoiced");
  const byCustomer = new Map<string, Load[]>();
  for (const l of invoiced) {
    byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
  }
  let n = 5000;
  const invoices: Invoice[] = [];
  for (const [customerId, customerLoads] of byCustomer) {
    n += 1;
    const issueDate = daysFromNow(-randInt(rng, 5, 40));
    const termsDays = choice(rng, [15, 30, 45]);
    const dueDate = new Date(new Date(issueDate).getTime() + termsDays * 86400000).toISOString();
    const isOverdue = new Date(dueDate) < new Date();
    invoices.push({
      id: nextId("inv"),
      invoiceNumber: `INV-${n}`,
      customerId,
      lineItems: customerLoads.map((l) => ({
        id: nextId("li"),
        loadId: l.id,
        description: `${l.loadNumber} — ${l.commodity}`,
        amount: l.customerRate + l.fuelSurcharge + l.accessorials.reduce((s, a) => s + a.amount, 0),
      })),
      issueDate,
      dueDate,
      status: isOverdue ? "overdue" : weightedChoice(rng, [["paid", 3], ["issued", 3], ["partially_paid", 1]] as const),
      paidAmount: 0,
    });
  }
  for (const inv of invoices) {
    const total = inv.lineItems.reduce((s, li) => s + li.amount, 0);
    if (inv.status === "paid") inv.paidAmount = total;
    if (inv.status === "partially_paid") inv.paidAmount = Math.round(total * 0.4);
  }
  return invoices;
}

function buildCarrierBills(rng: Rng, loads: Load[]): CarrierBill[] {
  const withCarrier = loads.filter((l) => l.carrierId && l.carrierRate);
  let n = 7000;
  return withCarrier.map((l) => {
    n += 1;
    return {
      id: nextId("cb"),
      billNumber: `CB-${n}`,
      carrierId: l.carrierId as string,
      loadId: l.id,
      amount: l.carrierRate as number,
      status: weightedChoice(rng, [["paid", 3], ["approved", 2], ["under_review", 2], ["submitted", 2], ["disputed", 1]] as const),
      dueDate: daysFromNow(randInt(rng, -10, 30)),
    };
  });
}

function buildDocuments(rng: Rng, loads: Load[], drivers: Driver[], carriers: Carrier[]): DocumentRecord[] {
  const docs: DocumentRecord[] = [];
  for (const l of loads.slice(0, 20)) {
    docs.push({
      id: nextId("doc"),
      type: "rate_confirmation",
      entityType: "load",
      entityId: l.id,
      entityLabel: l.loadNumber,
      fileName: `${l.loadNumber}-rate-confirmation.pdf`,
      uploadedByName: "System",
      uploadedAt: l.createdAt,
      expiresAt: null,
      sizeKb: randInt(rng, 80, 400),
    });
    if (["delivered", "pending_pod", "delivery_confirmed", "ready_for_billing", "invoiced", "closed"].includes(l.status)) {
      docs.push({
        id: nextId("doc"),
        type: "proof_of_delivery",
        entityType: "load",
        entityId: l.id,
        entityLabel: l.loadNumber,
        fileName: `${l.loadNumber}-pod.pdf`,
        uploadedByName: choice(rng, drivers).name,
        uploadedAt: l.updatedAt,
        expiresAt: null,
        sizeKb: randInt(rng, 200, 900),
      });
    }
  }
  for (const c of carriers) {
    docs.push({
      id: nextId("doc"),
      type: "insurance_certificate",
      entityType: "carrier",
      entityId: c.id,
      entityLabel: c.name,
      fileName: `${c.mcNumber}-coi.pdf`,
      uploadedByName: "Compliance",
      uploadedAt: daysFromNow(-randInt(rng, 10, 300)),
      expiresAt: c.insuranceExpiry,
      sizeKb: randInt(rng, 100, 300),
    });
  }
  for (const d of drivers) {
    docs.push({
      id: nextId("doc"),
      type: "driver_license",
      entityType: "driver",
      entityId: d.id,
      entityLabel: d.name,
      fileName: `${d.licenseNumber}.pdf`,
      uploadedByName: "Compliance",
      uploadedAt: daysFromNow(-randInt(rng, 10, 300)),
      expiresAt: d.licenseExpiry,
      sizeKb: randInt(rng, 60, 200),
    });
  }
  return docs;
}

function buildExceptions(rng: Rng, loads: Load[]): ExceptionRecord[] {
  const flagged = loads.filter((l) => ["exception", "delayed", "on_hold"].includes(l.status));
  const categories = [
    "late_pickup",
    "late_delivery",
    "vehicle_breakdown",
    "missing_paperwork",
    "customer_dispute",
    "rate_discrepancy",
  ] as const;
  return flagged.map((l) => ({
    id: nextId("exc"),
    category: choice(rng, categories),
    severity: weightedChoice(rng, [["low", 2], ["medium", 3], ["high", 2], ["critical", 1]] as const),
    loadId: l.id,
    description: `${l.loadNumber} flagged while in status "${l.status}".`,
    ownerName: "Ops Manager",
    status: weightedChoice(rng, [["open", 2], ["in_progress", 2], ["resolved", 1]] as const),
    createdAt: hoursFromNow(-randInt(rng, 1, 48)),
    resolutionDeadline: hoursFromNow(randInt(rng, 2, 48)),
    comments: [],
  }));
}

function buildNotifications(rng: Rng, loads: Load[]): NotificationRecord[] {
  const recent = [...loads].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 12);
  return recent.map((l) => {
    const isException = ["exception", "delayed", "on_hold"].includes(l.status);
    return {
      id: nextId("ntf"),
      title: isException ? `Attention needed on ${l.loadNumber}` : `${l.loadNumber} updated`,
      message: isException
        ? `${l.loadNumber} is now ${l.status.replace("_", " ")} — review and resolve.`
        : `${l.loadNumber} moved to "${l.status.replace(/_/g, " ")}".`,
      relatedLoadId: l.id,
      read: rng() > 0.6,
      createdAt: l.updatedAt,
      severity: isException ? "warning" : "info",
    };
  });
}

export function buildSeedData(): SeedData {
  idCounter = 0;
  const rng = makeRng(42);

  const users = buildUsers(rng);
  const customers = buildCustomers(rng);
  const carriers = buildCarriers(rng);
  const vehicles = buildVehicles(rng, carriers.map((c) => c.id));
  const drivers = buildDrivers(rng, carriers.map((c) => c.id), vehicles.map((v) => v.id));
  const dispatcherIds = users.filter((u) => u.role === "dispatcher").map((u) => u.name);
  const loads = buildLoads(
    rng,
    customers.map((c) => c.id),
    carriers.map((c) => c.id),
    drivers.map((d) => d.id),
    vehicles.map((v) => v.id),
    dispatcherIds.length ? dispatcherIds : ["Dispatch"],
  );
  const invoices = buildInvoices(rng, loads);
  const carrierBills = buildCarrierBills(rng, loads);
  const documents = buildDocuments(rng, loads, drivers, carriers);
  const exceptions = buildExceptions(rng, loads);
  const notifications = buildNotifications(rng, loads);

  return { users, customers, carriers, drivers, vehicles, loads, invoices, carrierBills, documents, exceptions, notifications };
}
