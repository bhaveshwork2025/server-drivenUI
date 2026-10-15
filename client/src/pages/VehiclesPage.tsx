import { useMemo, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatDate, isPast, isWithinDays, titleCase } from "../lib/format";
import { vehicleStatusTone } from "../domain/presentation";
import { indexById } from "../lib/collections";
import type { Vehicle } from "../domain/types";

function expiryBadge(iso: string) {
  if (isPast(iso)) return <Badge label="Expired" tone="danger" />;
  if (isWithinDays(iso, 30)) return <Badge label="Expiring soon" tone="warning" />;
  return <Badge label="Valid" tone="success" />;
}

export function VehiclesPage() {
  const store = useAppStore();
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const carriersById = useMemo(() => indexById(store.carriers), [store.carriers]);

  const columns: Column<Vehicle>[] = [
    { key: "unitNumber", header: "Unit #", sortValue: (v) => v.unitNumber, render: (v) => <strong>{v.unitNumber}</strong> },
    { key: "type", header: "Type", render: (v) => titleCase(v.type) },
    { key: "status", header: "Status", sortValue: (v) => v.status, render: (v) => <Badge label={titleCase(v.status)} tone={vehicleStatusTone(v.status)} /> },
    { key: "ownership", header: "Ownership", render: (v) => (v.ownership === "carrier" ? carriersById[v.carrierId ?? ""]?.name ?? "Carrier" : "Company") },
    { key: "insurance", header: "Insurance", render: (v) => expiryBadge(v.insuranceExpiry) },
    { key: "inspection", header: "Inspection", render: (v) => expiryBadge(v.inspectionExpiry) },
    { key: "capacity", header: "Capacity", align: "right", render: (v) => `${v.capacityLbs.toLocaleString()} lbs` },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Vehicles & Equipment</div>
          <div className="page-header__subtitle">{store.vehicles.length} units on file</div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={store.vehicles}
          getRowId={(v) => v.id}
          onRowClick={setSelected}
          searchText={(v) => `${v.unitNumber} ${v.vin}`}
          searchPlaceholder="Search unit # or VIN..."
          pageSize={10}
        />
      </Card>

      <Modal open={!!selected} title={selected?.unitNumber ?? ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="stack">
            <FieldRow label="Type">{titleCase(selected.type)}</FieldRow>
            <FieldRow label="Status">
              <Badge label={titleCase(selected.status)} tone={vehicleStatusTone(selected.status)} />
            </FieldRow>
            <FieldRow label="VIN">{selected.vin}</FieldRow>
            <FieldRow label="Capacity">{selected.capacityLbs.toLocaleString()} lbs</FieldRow>
            <FieldRow label="Ownership">{selected.ownership === "carrier" ? carriersById[selected.carrierId ?? ""]?.name : "Company-owned"}</FieldRow>
            <FieldRow label="Insurance expiry">
              {formatDate(selected.insuranceExpiry)} {expiryBadge(selected.insuranceExpiry)}
            </FieldRow>
            <FieldRow label="Inspection expiry">
              {formatDate(selected.inspectionExpiry)} {expiryBadge(selected.inspectionExpiry)}
            </FieldRow>
            <FieldRow label="Registration expiry">
              {formatDate(selected.registrationExpiry)} {expiryBadge(selected.registrationExpiry)}
            </FieldRow>
          </div>
        )}
      </Modal>
    </div>
  );
}
