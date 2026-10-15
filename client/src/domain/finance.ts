import type { Load } from "./types";

export function loadRevenue(load: Load): number {
  return load.customerRate + load.fuelSurcharge + load.accessorials.reduce((sum, a) => sum + a.amount, 0);
}

export function loadCost(load: Load): number {
  return load.carrierRate ?? 0;
}

export function loadMargin(load: Load): number {
  return loadRevenue(load) - loadCost(load);
}

export function loadMarginPct(load: Load): number {
  const revenue = loadRevenue(load);
  return revenue > 0 ? (loadMargin(load) / revenue) * 100 : 0;
}

export function invoiceTotal(lineItems: { amount: number }[]): number {
  return lineItems.reduce((sum, li) => sum + li.amount, 0);
}
