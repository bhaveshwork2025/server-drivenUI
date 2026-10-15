import type { Load, LoadStatus } from "./types";

// The forward-path lifecycle. Hold/cancel are handled separately below since
// they can interrupt almost any state rather than following one linear path.
const FORWARD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  draft: ["submitted"],
  submitted: ["pending_review"],
  pending_review: ["ready_for_planning"],
  ready_for_planning: ["awaiting_carrier"],
  awaiting_carrier: ["carrier_assigned"],
  carrier_assigned: ["driver_assigned"],
  driver_assigned: ["planned"],
  planned: ["dispatched"],
  dispatched: ["at_pickup"],
  at_pickup: ["loading"],
  loading: ["picked_up"],
  picked_up: ["in_transit"],
  in_transit: ["at_delivery"],
  at_delivery: ["unloading"],
  unloading: ["delivered"],
  delivered: ["pending_pod"],
  pending_pod: ["delivery_confirmed"],
  delivery_confirmed: ["ready_for_billing"],
  ready_for_billing: ["invoiced"],
  invoiced: ["closed"],
  closed: [],
  on_hold: [],
  delayed: [],
  exception: [],
  cancelled: [],
};

const TERMINAL: LoadStatus[] = ["closed", "cancelled"];

// Statuses "in motion" on the road, where a hold is recorded as "delayed"
// instead of the generic "on_hold" (which is reserved for pre-dispatch holds).
const IN_TRANSIT_STATUSES: LoadStatus[] = [
  "dispatched",
  "at_pickup",
  "loading",
  "picked_up",
  "in_transit",
  "at_delivery",
  "unloading",
];

export function canCancel(status: LoadStatus): boolean {
  return !TERMINAL.includes(status) && !IN_TRANSIT_STATUSES.includes(status) && status !== "delivered";
}

export function canHold(status: LoadStatus): boolean {
  return !TERMINAL.includes(status) && status !== "on_hold" && status !== "delayed" && status !== "exception";
}

export function canFlagException(status: LoadStatus): boolean {
  return !TERMINAL.includes(status) && status !== "exception";
}

/** Statuses a load can move to next, given its resume point when parked on hold/delayed/exception. */
export function getNextStatuses(load: Load): LoadStatus[] {
  const next = new Set<LoadStatus>();

  if (load.status === "on_hold" || load.status === "delayed" || load.status === "exception") {
    const resumeTo = resolveResumeStatus(load);
    if (resumeTo) next.add(resumeTo);
  } else {
    for (const s of FORWARD_TRANSITIONS[load.status]) next.add(s);
  }

  if (canHold(load.status)) {
    next.add(IN_TRANSIT_STATUSES.includes(load.status) ? "delayed" : "on_hold");
  }
  if (canFlagException(load.status)) next.add("exception");
  if (canCancel(load.status)) next.add("cancelled");

  next.delete(load.status);
  return Array.from(next);
}

/** Where a held/delayed/exception load should resume to — the status before it was parked. */
function resolveResumeStatus(load: Load): LoadStatus | null {
  for (let i = load.statusHistory.length - 1; i >= 0; i--) {
    const entry = load.statusHistory[i];
    if (entry.to === load.status && entry.from && !["on_hold", "delayed", "exception"].includes(entry.from)) {
      return entry.from;
    }
  }
  return "ready_for_planning";
}

/** Required-field guard for a transition. Returns an error message, or null if the move is allowed. */
export function validateTransition(load: Load, next: LoadStatus): string | null {
  if (next === "cancelled" && !canCancel(load.status)) {
    return "This load is already in transit or delivered and can no longer be cancelled.";
  }
  if (next === "carrier_assigned" && !load.carrierId) {
    return "Assign a carrier before moving this load to Carrier Assigned.";
  }
  if (next === "driver_assigned" && (!load.driverId || !load.vehicleId)) {
    return "Assign both a driver and a vehicle before moving this load to Driver Assigned.";
  }
  if (next === "invoiced" && load.billingStatus !== "ready") {
    return "This load must be marked ready for billing before it can be invoiced.";
  }
  if (!getNextStatuses(load).includes(next)) {
    return `A load cannot move directly from "${load.status}" to "${next}".`;
  }
  return null;
}

export const LOAD_STATUS_ORDER: LoadStatus[] = [
  "draft",
  "submitted",
  "pending_review",
  "ready_for_planning",
  "awaiting_carrier",
  "carrier_assigned",
  "driver_assigned",
  "planned",
  "dispatched",
  "at_pickup",
  "loading",
  "picked_up",
  "in_transit",
  "at_delivery",
  "unloading",
  "delivered",
  "pending_pod",
  "delivery_confirmed",
  "ready_for_billing",
  "invoiced",
  "closed",
  "on_hold",
  "delayed",
  "exception",
  "cancelled",
];

export function isOpenStatus(status: LoadStatus): boolean {
  return !TERMINAL.includes(status);
}
