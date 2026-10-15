import { useMemo, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatCurrency, titleCase } from "../lib/format";
import { invoiceStatusTone } from "../domain/presentation";
import { invoiceTotal } from "../domain/finance";
import type { Customer } from "../domain/types";

export function CustomersPage() {
  const store = useAppStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => store.customers.find((c) => c.id === selectedId) ?? null, [store.customers, selectedId]);

  const relatedLoads = useMemo(() => (selected ? store.loads.filter((l) => l.customerId === selected.id) : []), [store.loads, selected]);
  const relatedInvoices = useMemo(() => (selected ? store.invoices.filter((i) => i.customerId === selected.id) : []), [store.invoices, selected]);

  const columns: Column<Customer>[] = [
    { key: "name", header: "Customer", sortValue: (c) => c.name, render: (c) => <strong>{c.name}</strong> },
    { key: "city", header: "Location", render: (c) => `${c.billingAddress.city}, ${c.billingAddress.state}` },
    { key: "terms", header: "Payment terms", align: "right", render: (c) => `${c.paymentTermsDays} days` },
    { key: "credit", header: "Credit limit", align: "right", sortValue: (c) => c.creditLimit, render: (c) => formatCurrency(c.creditLimit) },
    { key: "status", header: "Status", render: (c) => <Badge label={titleCase(c.status)} tone={c.status === "active" ? "success" : "neutral"} /> },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Customers</div>
          <div className="page-header__subtitle">{store.customers.length} customers on file</div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={store.customers}
          getRowId={(c) => c.id}
          onRowClick={(c) => setSelectedId(c.id)}
          searchText={(c) => c.name}
          searchPlaceholder="Search customers..."
          pageSize={10}
        />
      </Card>

      <Modal open={!!selected} title={selected?.name ?? ""} onClose={() => setSelectedId(null)} width={640}>
        {selected && (
          <div className="stack">
            <FieldRow label="Billing address">
              {selected.billingAddress.line1}, {selected.billingAddress.city}, {selected.billingAddress.state} {selected.billingAddress.zip}
            </FieldRow>
            <FieldRow label="Contact">
              {selected.contactName} · {selected.contactEmail}
            </FieldRow>
            <FieldRow label="Phone">{selected.contactPhone}</FieldRow>
            <FieldRow label="Payment terms">{selected.paymentTermsDays} days</FieldRow>
            <FieldRow label="Credit limit">{formatCurrency(selected.creditLimit)}</FieldRow>

            <hr className="section-divider" />
            <strong>Loads ({relatedLoads.length})</strong>
            {relatedLoads.slice(0, 6).map((l) => (
              <FieldRow key={l.id} label={l.loadNumber}>
                {titleCase(l.status)}
              </FieldRow>
            ))}

            <strong>Invoices ({relatedInvoices.length})</strong>
            {relatedInvoices.map((i) => (
              <FieldRow key={i.id} label={i.invoiceNumber}>
                {formatCurrency(invoiceTotal(i.lineItems))} · <Badge label={titleCase(i.status)} tone={invoiceStatusTone(i.status)} />
              </FieldRow>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
