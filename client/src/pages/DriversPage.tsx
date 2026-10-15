import { useMemo, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatDate, isPast, isWithinDays, titleCase } from "../lib/format";
import { driverStatusTone } from "../domain/presentation";
import { indexById } from "../lib/collections";
import type { Driver } from "../domain/types";

export function DriversPage() {
  const store = useAppStore();
  const [selected, setSelected] = useState<Driver | null>(null);
  const vehiclesById = useMemo(() => indexById(store.vehicles), [store.vehicles]);

  function licenseBadge(d: Driver) {
    if (isPast(d.licenseExpiry)) return <Badge label="Expired" tone="danger" />;
    if (isWithinDays(d.licenseExpiry, 30)) return <Badge label="Expiring soon" tone="warning" />;
    return <Badge label="Valid" tone="success" />;
  }

  const columns: Column<Driver>[] = [
    { key: "name", header: "Name", sortValue: (d) => d.name, render: (d) => <strong>{d.name}</strong> },
    { key: "employment", header: "Type", render: (d) => titleCase(d.employment) },
    { key: "status", header: "Status", sortValue: (d) => d.status, render: (d) => <Badge label={titleCase(d.status)} tone={driverStatusTone(d.status)} /> },
    { key: "vehicle", header: "Vehicle", render: (d) => (d.assignedVehicleId ? vehiclesById[d.assignedVehicleId]?.unitNumber : "—") },
    { key: "license", header: "License", render: (d) => licenseBadge(d) },
    { key: "homeBase", header: "Home base", render: (d) => d.homeBase },
  ];

  const relatedLoads = useMemo(() => (selected ? store.loads.filter((l) => l.driverId === selected.id) : []), [store.loads, selected]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Drivers</div>
          <div className="page-header__subtitle">{store.drivers.length} drivers on file</div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={store.drivers}
          getRowId={(d) => d.id}
          onRowClick={setSelected}
          searchText={(d) => `${d.name} ${d.homeBase} ${d.licenseNumber}`}
          searchPlaceholder="Search drivers..."
          pageSize={10}
        />
      </Card>

      <Modal open={!!selected} title={selected?.name ?? ""} onClose={() => setSelected(null)}>
        {selected && (
          <div className="stack">
            <FieldRow label="Status">
              <Badge label={titleCase(selected.status)} tone={driverStatusTone(selected.status)} />
            </FieldRow>
            <FieldRow label="Employment">{titleCase(selected.employment)}</FieldRow>
            <FieldRow label="Phone">{selected.phone}</FieldRow>
            <FieldRow label="Email">{selected.email}</FieldRow>
            <FieldRow label="License number">{selected.licenseNumber}</FieldRow>
            <FieldRow label="License expiry">
              {formatDate(selected.licenseExpiry)} {licenseBadge(selected)}
            </FieldRow>
            <FieldRow label="Assigned vehicle">{selected.assignedVehicleId ? vehiclesById[selected.assignedVehicleId]?.unitNumber : "—"}</FieldRow>
            <FieldRow label="Home base">{selected.homeBase}</FieldRow>
            <hr className="section-divider" />
            <strong>Assigned loads ({relatedLoads.length})</strong>
            {relatedLoads.map((l) => (
              <FieldRow key={l.id} label={l.loadNumber}>
                {titleCase(l.status)}
              </FieldRow>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
