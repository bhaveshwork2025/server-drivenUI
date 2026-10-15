import { useMemo, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatCurrency, formatDate, isPast, isWithinDays, titleCase } from "../lib/format";
import { carrierStatusTone, carrierBillStatusTone } from "../domain/presentation";
import { canManageFleet } from "../domain/permissions";
import type { Carrier } from "../domain/types";

export function CarriersPage() {
  const store = useAppStore();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canManage = canManageFleet(store.currentRole);

  const selected = useMemo(() => store.carriers.find((c) => c.id === selectedId) ?? null, [store.carriers, selectedId]);
  const relatedLoads = useMemo(() => (selected ? store.loads.filter((l) => l.carrierId === selected.id) : []), [store.loads, selected]);
  const relatedBills = useMemo(() => (selected ? store.carrierBills.filter((b) => b.carrierId === selected.id) : []), [store.carrierBills, selected]);

  function insuranceBadge(iso: string) {
    if (isPast(iso)) return <Badge label="Expired" tone="danger" />;
    if (isWithinDays(iso, 30)) return <Badge label="Expiring soon" tone="warning" />;
    return <Badge label="Valid" tone="success" />;
  }

  const columns: Column<Carrier>[] = [
    { key: "name", header: "Carrier", sortValue: (c) => c.name, render: (c) => <strong>{c.name}</strong> },
    { key: "mc", header: "MC / DOT", render: (c) => `${c.mcNumber} / ${c.dotNumber}` },
    { key: "status", header: "Status", sortValue: (c) => c.status, render: (c) => <Badge label={titleCase(c.status)} tone={carrierStatusTone(c.status)} /> },
    { key: "equipment", header: "Equipment", render: (c) => c.equipmentTypes.join(", ") },
    { key: "insurance", header: "Insurance", render: (c) => insuranceBadge(c.insuranceExpiry) },
    { key: "rating", header: "Rating", align: "right", sortValue: (c) => c.rating, render: (c) => `★ ${c.rating}` },
  ];

  function approveCarrier(carrier: Carrier) {
    store.updateCarrierStatus(carrier.id, "approved");
    toast.show(`${carrier.name} approved`);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Carriers</div>
          <div className="page-header__subtitle">{store.carriers.length} carriers on file</div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={store.carriers}
          getRowId={(c) => c.id}
          onRowClick={(c) => setSelectedId(c.id)}
          searchText={(c) => `${c.name} ${c.mcNumber} ${c.dotNumber}`}
          searchPlaceholder="Search carrier, MC, DOT..."
          pageSize={10}
        />
      </Card>

      <Modal open={!!selected} title={selected?.name ?? ""} onClose={() => setSelectedId(null)} width={620}>
        {selected && (
          <div className="stack">
            <FieldRow label="Status">
              <Badge label={titleCase(selected.status)} tone={carrierStatusTone(selected.status)} />
            </FieldRow>
            <FieldRow label="MC number">{selected.mcNumber}</FieldRow>
            <FieldRow label="DOT number">{selected.dotNumber}</FieldRow>
            <FieldRow label="Equipment types">{selected.equipmentTypes.join(", ")}</FieldRow>
            <FieldRow label="Service regions">{selected.serviceRegions.join(", ") || "—"}</FieldRow>
            <FieldRow label="Contact">
              {selected.contactName} · {selected.contactPhone}
            </FieldRow>
            <FieldRow label="Insurance expiry">
              {formatDate(selected.insuranceExpiry)} {insuranceBadge(selected.insuranceExpiry)}
            </FieldRow>
            <FieldRow label="Rating">★ {selected.rating}</FieldRow>

            {canManage && selected.status === "pending" && (
              <div className="button-row">
                <button className="btn btn--primary btn--sm" onClick={() => approveCarrier(selected)}>
                  Approve carrier
                </button>
              </div>
            )}

            <hr className="section-divider" />
            <strong>Loads ({relatedLoads.length})</strong>
            {relatedLoads.slice(0, 6).map((l) => (
              <FieldRow key={l.id} label={l.loadNumber}>
                {titleCase(l.status)}
              </FieldRow>
            ))}

            <strong>Carrier bills ({relatedBills.length})</strong>
            {relatedBills.slice(0, 6).map((b) => (
              <FieldRow key={b.id} label={b.billNumber}>
                {formatCurrency(b.amount)} · <Badge label={titleCase(b.status)} tone={carrierBillStatusTone(b.status)} />
              </FieldRow>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
