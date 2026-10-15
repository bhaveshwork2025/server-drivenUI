// Domain model for the Load Management prototype.
// NOTE: this whole app is a UI-only prototype — nothing here is persisted
// server-side. All data lives in AppStore's in-memory state and resets on
// reload. Shapes are still modeled realistically so the UI (forms, tables,
// status rules) behaves like it would against a real backend.

export type Role =
  | "super_admin"
  | "company_admin"
  | "ops_manager"
  | "dispatcher"
  | "load_planner"
  | "fleet_manager"
  | "driver"
  | "customer"
  | "carrier_admin"
  | "billing_finance"
  | "compliance_manager"
  | "auditor";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Administrator",
  company_admin: "Company Administrator",
  ops_manager: "Operations Manager",
  dispatcher: "Dispatcher",
  load_planner: "Load Planner",
  fleet_manager: "Fleet Manager",
  driver: "Driver",
  customer: "Customer / Shipper",
  carrier_admin: "Carrier Administrator",
  billing_finance: "Billing & Finance",
  compliance_manager: "Compliance Manager",
  auditor: "Read-Only Auditor",
};

export type UserStatus = "active" | "invited" | "suspended";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastActiveAt: string | null;
  createdAt: string;
}

export type LoadStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "ready_for_planning"
  | "awaiting_carrier"
  | "carrier_assigned"
  | "driver_assigned"
  | "planned"
  | "dispatched"
  | "at_pickup"
  | "loading"
  | "picked_up"
  | "in_transit"
  | "at_delivery"
  | "unloading"
  | "delivered"
  | "pending_pod"
  | "delivery_confirmed"
  | "ready_for_billing"
  | "invoiced"
  | "closed"
  | "on_hold"
  | "delayed"
  | "exception"
  | "cancelled";

export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_review: "Pending Review",
  ready_for_planning: "Ready for Planning",
  awaiting_carrier: "Awaiting Carrier",
  carrier_assigned: "Carrier Assigned",
  driver_assigned: "Driver Assigned",
  planned: "Planned",
  dispatched: "Dispatched",
  at_pickup: "At Pickup",
  loading: "Loading",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  at_delivery: "At Delivery",
  unloading: "Unloading",
  delivered: "Delivered",
  pending_pod: "Pending Proof of Delivery",
  delivery_confirmed: "Delivery Confirmed",
  ready_for_billing: "Ready for Billing",
  invoiced: "Invoiced",
  closed: "Closed",
  on_hold: "On Hold",
  delayed: "Delayed",
  exception: "Exception",
  cancelled: "Cancelled",
};

export type LoadPriority = "low" | "normal" | "high" | "critical";

export type BillingStatus = "not_ready" | "ready" | "invoiced" | "paid" | "disputed";

export interface Address {
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface LoadStop {
  id: string;
  kind: "pickup" | "delivery";
  sequence: number;
  address: Address;
  contactName: string;
  contactPhone: string;
  apptStart: string;
  apptEnd: string;
  timezone: string;
  actualArrival: string | null;
  actualDeparture: string | null;
}

export interface Accessorial {
  id: string;
  label: string;
  amount: number;
}

export interface StatusHistoryEntry {
  id: string;
  from: LoadStatus | null;
  to: LoadStatus;
  at: string;
  byUserName: string;
  reason?: string;
}

export interface Load {
  id: string;
  loadNumber: string;
  customerId: string;
  poNumber: string;
  referenceNumber: string;
  status: LoadStatus;
  priority: LoadPriority;
  equipmentType: string;
  commodity: string;
  weightLbs: number;
  pieceCount: number;
  hazmat: boolean;
  tempControlled: boolean;
  stops: LoadStop[];
  customerRate: number;
  carrierRate: number | null;
  fuelSurcharge: number;
  accessorials: Accessorial[];
  dispatcherId: string | null;
  carrierId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  notesInternal: string;
  notesCustomer: string;
  billingStatus: BillingStatus;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

export type CarrierStatus = "pending" | "approved" | "suspended";

export interface Carrier {
  id: string;
  name: string;
  mcNumber: string;
  dotNumber: string;
  status: CarrierStatus;
  equipmentTypes: string[];
  serviceRegions: string[];
  insuranceExpiry: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  rating: number;
}

export type DriverStatus = "available" | "on_load" | "off_duty" | "inactive";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  employment: "company" | "owner_operator";
  carrierId: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  assignedVehicleId: string | null;
  homeBase: string;
}

export type VehicleType = "tractor" | "trailer" | "straight_truck" | "reefer" | "flatbed";
export type VehicleStatus = "available" | "in_use" | "maintenance" | "out_of_service";

export interface Vehicle {
  id: string;
  unitNumber: string;
  type: VehicleType;
  vin: string;
  capacityLbs: number;
  ownership: "company" | "carrier";
  carrierId: string | null;
  status: VehicleStatus;
  insuranceExpiry: string;
  inspectionExpiry: string;
  registrationExpiry: string;
};

export type CustomerStatus = "active" | "inactive";

export interface Customer {
  id: string;
  name: string;
  billingAddress: Address;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentTermsDays: number;
  creditLimit: number;
  status: CustomerStatus;
}

export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "void" | "disputed";

export interface InvoiceLineItem {
  id: string;
  loadId: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  lineItems: InvoiceLineItem[];
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAmount: number;
}

export type CarrierBillStatus = "submitted" | "under_review" | "approved" | "paid" | "disputed";

export interface CarrierBill {
  id: string;
  billNumber: string;
  carrierId: string;
  loadId: string;
  amount: number;
  status: CarrierBillStatus;
  dueDate: string;
}

export type DocumentType =
  | "rate_confirmation"
  | "bill_of_lading"
  | "proof_of_delivery"
  | "carrier_invoice"
  | "insurance_certificate"
  | "driver_license"
  | "inspection_certificate"
  | "other";

export type DocumentEntityType = "load" | "driver" | "vehicle" | "carrier" | "customer";

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  entityType: DocumentEntityType;
  entityId: string;
  entityLabel: string;
  fileName: string;
  uploadedByName: string;
  uploadedAt: string;
  expiresAt: string | null;
  sizeKb: number;
}

export type ExceptionCategory =
  | "late_pickup"
  | "late_delivery"
  | "missed_appointment"
  | "vehicle_breakdown"
  | "driver_unavailable"
  | "carrier_cancellation"
  | "missing_paperwork"
  | "damaged_freight"
  | "quantity_discrepancy"
  | "rate_discrepancy"
  | "customer_dispute"
  | "compliance_issue";

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "in_progress" | "resolved" | "escalated";

export interface ExceptionComment {
  id: string;
  byName: string;
  at: string;
  text: string;
}

export interface ExceptionRecord {
  id: string;
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  loadId: string | null;
  description: string;
  ownerName: string;
  status: ExceptionStatus;
  createdAt: string;
  resolutionDeadline: string | null;
  comments: ExceptionComment[];
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  relatedLoadId: string | null;
  read: boolean;
  createdAt: string;
  severity: "info" | "warning" | "critical";
}
