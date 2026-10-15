import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppStore } from "../store/AppStore";
import { Card } from "../components/ui/primitives";
import { formatCurrency, titleCase } from "../lib/format";
import { loadRevenue } from "../domain/finance";
import { downloadCsv } from "../lib/csv";
import { isOpenStatus } from "../domain/statusMachine";
import { indexById } from "../lib/collections";

const DONE_STATUSES = ["delivered", "pending_pod", "delivery_confirmed", "ready_for_billing", "invoiced", "closed"];

export function ReportsPage() {
  const store = useAppStore();
  const customersById = useMemo(() => indexById(store.customers), [store.customers]);
  const carriersById = useMemo(() => indexById(store.carriers), [store.carriers]);

  const revenueByCustomer = useMemo(() => {
    const totals = new Map<string, number>();
    for (const l of store.loads) {
      if (!isOpenStatus(l.status) && l.status !== "closed") continue;
      totals.set(l.customerId, (totals.get(l.customerId) ?? 0) + loadRevenue(l));
    }
    return Array.from(totals.entries())
      .map(([customerId, revenue]) => ({ name: customersById[customerId]?.name ?? "Unknown", revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [store.loads, customersById]);

  const revenueByLane = useMemo(() => {
    const totals = new Map<string, number>();
    for (const l of store.loads) {
      const lane = `${l.stops[0]?.address.city} → ${l.stops[1]?.address.city}`;
      totals.set(lane, (totals.get(lane) ?? 0) + loadRevenue(l));
    }
    return Array.from(totals.entries())
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [store.loads]);

  const carrierPerformance = useMemo(() => {
    const byCarrier = new Map<string, { count: number; onTime: number }>();
    for (const l of store.loads) {
      if (!l.carrierId || !DONE_STATUSES.includes(l.status)) continue;
      const entry = byCarrier.get(l.carrierId) ?? { count: 0, onTime: 0 };
      entry.count += 1;
      const deliveryWindow = l.stops[1]?.apptEnd;
      if (deliveryWindow && new Date(l.updatedAt) <= new Date(deliveryWindow)) entry.onTime += 1;
      byCarrier.set(l.carrierId, entry);
    }
    return Array.from(byCarrier.entries())
      .map(([carrierId, v]) => ({
        name: carriersById[carrierId]?.name ?? "Unknown",
        loads: v.count,
        onTimePct: v.count > 0 ? Math.round((v.onTime / v.count) * 100) : 0,
      }))
      .sort((a, b) => b.loads - a.loads);
  }, [store.loads, carriersById]);

  const exceptionsByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of store.exceptions) totals.set(e.category, (totals.get(e.category) ?? 0) + 1);
    return Array.from(totals.entries()).map(([name, count]) => ({ name: titleCase(name), count }));
  }, [store.exceptions]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Reports</div>
          <div className="page-header__subtitle">Figures are computed from the current mock dataset, not a live warehouse.</div>
        </div>
      </div>

      <div className="grid grid--charts">
        <Card
          title="Revenue by customer"
          actions={
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                downloadCsv(
                  "revenue-by-customer.csv",
                  revenueByCustomer,
                  [
                    { key: "name", label: "Customer" },
                    { key: "revenue", label: "Revenue" },
                  ],
                )
              }
            >
              Export CSV
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByCustomer} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Revenue by lane"
          actions={
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                downloadCsv(
                  "revenue-by-lane.csv",
                  revenueByLane,
                  [
                    { key: "name", label: "Lane" },
                    { key: "revenue", label: "Revenue" },
                  ],
                )
              }
            >
              Export CSV
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByLane} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="revenue" fill="#15803d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Carrier performance (on-time %, completed loads)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={carrierPerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="onTimePct" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Exception frequency by category">
          {exceptionsByCategory.length === 0 ? (
            <p className="muted">No exceptions recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={exceptionsByCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#b91c1c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
