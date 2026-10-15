import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAppStore } from "../store/AppStore";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card } from "../components/ui/primitives";
import { formatCurrency, formatDate, titleCase } from "../lib/format";
import { loadStatusTone, priorityTone } from "../domain/presentation";
import { indexById } from "../lib/collections";
import { LOAD_STATUS_ORDER } from "../domain/statusMachine";
import { canManageLoads } from "../domain/permissions";
import { downloadCsv } from "../lib/csv";
import type { Load } from "../domain/types";

export function LoadsListPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const customersById = useMemo(() => indexById(store.customers), [store.customers]);
  const carriersById = useMemo(() => indexById(store.carriers), [store.carriers]);
  const driversById = useMemo(() => indexById(store.drivers), [store.drivers]);

  const filtered = useMemo(
    () =>
      store.loads.filter((l) => {
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (customerFilter !== "all" && l.customerId !== customerFilter) return false;
        return true;
      }),
    [store.loads, statusFilter, customerFilter],
  );

  const columns: Column<Load>[] = [
    {
      key: "loadNumber",
      header: "Load #",
      sortValue: (l) => l.loadNumber,
      render: (l) => <strong>{l.loadNumber}</strong>,
    },
    {
      key: "customer",
      header: "Customer",
      sortValue: (l) => customersById[l.customerId]?.name ?? "",
      render: (l) => customersById[l.customerId]?.name ?? "—",
    },
    {
      key: "route",
      header: "Route",
      render: (l) => (
        <span className="muted">
          {l.stops[0]?.address.city}, {l.stops[0]?.address.state} → {l.stops[1]?.address.city}, {l.stops[1]?.address.state}
        </span>
      ),
    },
    {
      key: "pickup",
      header: "Pickup",
      sortValue: (l) => l.stops[0]?.apptStart ?? "",
      render: (l) => formatDate(l.stops[0]?.apptStart),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (l) => l.status,
      render: (l) => <Badge label={titleCase(l.status)} tone={loadStatusTone(l.status)} />,
    },
    {
      key: "priority",
      header: "Priority",
      sortValue: (l) => l.priority,
      render: (l) => <Badge label={titleCase(l.priority)} tone={priorityTone(l.priority)} />,
    },
    {
      key: "carrier",
      header: "Carrier / Driver",
      render: (l) => (
        <span className="muted">
          {l.carrierId ? carriersById[l.carrierId]?.name : "Unassigned"}
          {l.driverId ? ` · ${driversById[l.driverId]?.name}` : ""}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Customer rate",
      align: "right",
      sortValue: (l) => l.customerRate,
      render: (l) => formatCurrency(l.customerRate),
    },
  ];

  function exportSelection() {
    const rows = (selected.size > 0 ? filtered.filter((l) => selected.has(l.id)) : filtered).map((l) => ({
      loadNumber: l.loadNumber,
      customer: customersById[l.customerId]?.name ?? "",
      status: l.status,
      priority: l.priority,
      pickup: l.stops[0]?.apptStart,
      delivery: l.stops[1]?.apptStart,
      customerRate: l.customerRate,
      carrierRate: l.carrierRate ?? "",
    }));
    downloadCsv("loads-export.csv", rows, [
      { key: "loadNumber", label: "Load #" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "pickup", label: "Pickup" },
      { key: "delivery", label: "Delivery" },
      { key: "customerRate", label: "Customer Rate" },
      { key: "carrierRate", label: "Carrier Rate" },
    ]);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Loads</div>
          <div className="page-header__subtitle">{filtered.length} loads match the current filters</div>
        </div>
        <div className="page-header__actions">
          {canManageLoads(store.currentRole) && (
            <button className="btn btn--primary" onClick={() => navigate("/loads/new")}>
              <Plus size={16} /> New Load
            </button>
          )}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(l) => l.id}
          onRowClick={(l) => navigate(`/loads/${l.id}`)}
          searchText={(l) => `${l.loadNumber} ${l.poNumber} ${l.referenceNumber} ${customersById[l.customerId]?.name ?? ""}`}
          searchPlaceholder="Search load #, PO, reference, customer..."
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          pageSize={12}
          emptyTitle="No loads match these filters"
          toolbar={
            <>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 180 }}>
                <option value="all">All statuses</option>
                {LOAD_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
              <select className="input" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ width: 180 }}>
                <option value="all">All customers</option>
                {store.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="btn btn--ghost" onClick={exportSelection}>
                Export CSV
              </button>
            </>
          }
        />
      </Card>
    </div>
  );
}
