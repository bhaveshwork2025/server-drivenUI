import type {
  CarrierBillStatus,
  CarrierStatus,
  DriverStatus,
  ExceptionSeverity,
  ExceptionStatus,
  InvoiceStatus,
  LoadPriority,
  LoadStatus,
  UserStatus,
  VehicleStatus,
} from "./types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const IN_PROGRESS: LoadStatus[] = [
  "dispatched",
  "at_pickup",
  "loading",
  "picked_up",
  "in_transit",
  "at_delivery",
  "unloading",
];
const PLANNING: LoadStatus[] = ["ready_for_planning", "awaiting_carrier", "carrier_assigned", "driver_assigned", "planned"];
const DONE: LoadStatus[] = ["delivered", "pending_pod", "delivery_confirmed", "ready_for_billing", "invoiced", "closed"];
const ATTENTION: LoadStatus[] = ["on_hold", "delayed"];
const BLOCKED: LoadStatus[] = ["exception", "cancelled"];

export function loadStatusTone(status: LoadStatus): Tone {
  if (DONE.includes(status)) return "success";
  if (ATTENTION.includes(status)) return "warning";
  if (BLOCKED.includes(status)) return "danger";
  if (IN_PROGRESS.includes(status) || PLANNING.includes(status)) return "info";
  return "neutral";
}

export function priorityTone(priority: LoadPriority): Tone {
  switch (priority) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "low":
      return "neutral";
    default:
      return "info";
  }
}

export function carrierStatusTone(status: CarrierStatus): Tone {
  return status === "approved" ? "success" : status === "pending" ? "warning" : "danger";
}

export function driverStatusTone(status: DriverStatus): Tone {
  switch (status) {
    case "available":
      return "success";
    case "on_load":
      return "info";
    case "off_duty":
      return "neutral";
    default:
      return "danger";
  }
}

export function vehicleStatusTone(status: VehicleStatus): Tone {
  switch (status) {
    case "available":
      return "success";
    case "in_use":
      return "info";
    case "maintenance":
      return "warning";
    default:
      return "danger";
  }
}

export function invoiceStatusTone(status: InvoiceStatus): Tone {
  switch (status) {
    case "paid":
      return "success";
    case "overdue":
    case "disputed":
    case "void":
      return "danger";
    case "partially_paid":
      return "warning";
    default:
      return "info";
  }
}

export function carrierBillStatusTone(status: CarrierBillStatus): Tone {
  switch (status) {
    case "paid":
    case "approved":
      return "success";
    case "disputed":
      return "danger";
    case "under_review":
      return "warning";
    default:
      return "info";
  }
}

export function exceptionSeverityTone(severity: ExceptionSeverity): Tone {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}

export function exceptionStatusTone(status: ExceptionStatus): Tone {
  switch (status) {
    case "resolved":
      return "success";
    case "escalated":
      return "danger";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}

export function userStatusTone(status: UserStatus): Tone {
  return status === "active" ? "success" : status === "invited" ? "info" : "danger";
}
