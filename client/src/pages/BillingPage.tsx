import { useMemo } from "react";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, KpiCard } from "../components/ui/primitives";
import { Tabs } from "../components/ui/Tabs";
import { formatCurrency, formatDate, isPast, titleCase } from "../lib/format";
import { invoiceStatusTone, carrierBillStatusTone } from "../domain/presentation";
import { invoiceTotal } from "../domain/finance";
import { canManageBilling } from "../domain/permissions";
import { indexById } from "../lib/collections";
import type { CarrierBill, Invoice } from "../domain/types";

export function BillingPage() {
  const store = useAppStore();
  const toast = useToast();
  const canManage = canManageBilling(store.currentRole);

  const customersById = useMemo(() => indexById(store.customers), [store.customers]);
  const carriersById = useMemo(() => indexById(store.carriers), [store.carriers]);
  const loadsById = useMemo(() => indexById(store.loads), [store.loads]);

  const aging = useMemo(() => {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
    for (const inv of store.invoices) {
      if (inv.status === "paid" || inv.status === "void") continue;
      const balance = invoiceTotal(inv.lineItems) - inv.paidAmount;
      const daysPastDue = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
      if (daysPastDue <= 0) buckets.current += balance;
      else if (daysPastDue <= 30) buckets.d30 += balance;
      else if (daysPastDue <= 60) buckets.d60 += balance;
      else buckets.d90 += balance;
    }
    return buckets;
  }, [store.invoices]);

  const invoiceColumns: Column<Invoice>[] = [
    { key: "invoiceNumber", header: "Invoice #", sortValue: (i) => i.invoiceNumber, render: (i) => <strong>{i.invoiceNumber}</strong> },
    { key: "customer", header: "Customer", render: (i) => customersById[i.customerId]?.name ?? "—" },
    { key: "issueDate", header: "Issued", sortValue: (i) => i.issueDate, render: (i) => formatDate(i.issueDate) },
    {
      key: "dueDate",
      header: "Due",
      sortValue: (i) => i.dueDate,
      render: (i) => (
        <span className={isPast(i.dueDate) && i.status !== "paid" ? "muted" : ""} style={isPast(i.dueDate) && i.status !== "paid" ? { color: "var(--color-danger)" } : undefined}>
          {formatDate(i.dueDate)}
        </span>
      ),
    },
    { key: "total", header: "Total", align: "right", sortValue: (i) => invoiceTotal(i.lineItems), render: (i) => formatCurrency(invoiceTotal(i.lineItems)) },
    { key: "balance", header: "Balance", align: "right", render: (i) => formatCurrency(invoiceTotal(i.lineItems) - i.paidAmount) },
    { key: "status", header: "Status", sortValue: (i) => i.status, render: (i) => <Badge label={titleCase(i.status)} tone={invoiceStatusTone(i.status)} /> },
    {
      key: "actions",
      header: "",
      render: (i) =>
        canManage && i.status !== "paid" && i.status !== "void" ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              store.markInvoicePaid(i.id);
              toast.show(`${i.invoiceNumber} marked paid`);
            }}
          >
            Mark Paid
          </button>
        ) : null,
    },
  ];

  const billColumns: Column<CarrierBill>[] = [
    { key: "billNumber", header: "Bill #", sortValue: (b) => b.billNumber, render: (b) => <strong>{b.billNumber}</strong> },
    { key: "carrier", header: "Carrier", render: (b) => carriersById[b.carrierId]?.name ?? "—" },
    { key: "load", header: "Load", render: (b) => loadsById[b.loadId]?.loadNumber ?? "—" },
    { key: "amount", header: "Amount", align: "right", sortValue: (b) => b.amount, render: (b) => formatCurrency(b.amount) },
    { key: "dueDate", header: "Due", sortValue: (b) => b.dueDate, render: (b) => formatDate(b.dueDate) },
    { key: "status", header: "Status", sortValue: (b) => b.status, render: (b) => <Badge label={titleCase(b.status)} tone={carrierBillStatusTone(b.status)} /> },
  ];

  const invoicesTab = (
    <div className="stack">
      <div className="grid grid--kpis">
        <KpiCard label="Current" value={formatCurrency(aging.current)} />
        <KpiCard label="1-30 days past due" value={formatCurrency(aging.d30)} tone="warning" />
        <KpiCard label="31-60 days past due" value={formatCurrency(aging.d60)} tone="warning" />
        <KpiCard label="60+ days past due" value={formatCurrency(aging.d90)} tone="danger" />
      </div>
      <Card>
        <DataTable
          columns={invoiceColumns}
          rows={store.invoices}
          getRowId={(i) => i.id}
          searchText={(i) => `${i.invoiceNumber} ${customersById[i.customerId]?.name ?? ""}`}
          searchPlaceholder="Search invoices..."
          pageSize={10}
          emptyTitle="No invoices yet"
        />
      </Card>
    </div>
  );

  const billsTab = (
    <Card>
      <DataTable
        columns={billColumns}
        rows={store.carrierBills}
        getRowId={(b) => b.id}
        searchText={(b) => `${b.billNumber} ${carriersById[b.carrierId]?.name ?? ""}`}
        searchPlaceholder="Search carrier bills..."
        pageSize={10}
        emptyTitle="No carrier bills yet"
      />
    </Card>
  );

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Billing</div>
          <div className="page-header__subtitle">Customer invoicing and carrier payables</div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "invoices", label: "Customer Invoices", content: invoicesTab },
          { id: "bills", label: "Carrier Bills", content: billsTab },
        ]}
      />
    </div>
  );
}
