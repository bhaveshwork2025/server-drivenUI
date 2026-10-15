import { useMemo, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatDate, formatDateTime, isPast, isWithinDays, titleCase } from "../lib/format";
import type { DocumentEntityType, DocumentRecord, DocumentType } from "../domain/types";

function expiryBadge(iso: string | null) {
  if (!iso) return null;
  if (isPast(iso)) return <Badge label="Expired" tone="danger" />;
  if (isWithinDays(iso, 30)) return <Badge label="Expiring soon" tone="warning" />;
  return <Badge label="Valid" tone="success" />;
}

export function DocumentsPage() {
  const store = useAppStore();
  const toast = useToast();
  const [entityFilter, setEntityFilter] = useState<"all" | DocumentEntityType>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>("other");
  const [uploadFileName, setUploadFileName] = useState("");

  const filtered = useMemo(
    () => store.documents.filter((d) => entityFilter === "all" || d.entityType === entityFilter),
    [store.documents, entityFilter],
  );

  const columns: Column<DocumentRecord>[] = [
    { key: "fileName", header: "File", sortValue: (d) => d.fileName, render: (d) => <strong>{d.fileName}</strong> },
    { key: "type", header: "Type", render: (d) => titleCase(d.type) },
    { key: "entity", header: "Related to", render: (d) => `${titleCase(d.entityType)}: ${d.entityLabel}` },
    { key: "uploadedBy", header: "Uploaded by", render: (d) => d.uploadedByName },
    { key: "uploadedAt", header: "Uploaded", sortValue: (d) => d.uploadedAt, render: (d) => formatDateTime(d.uploadedAt) },
    { key: "expires", header: "Expiry", render: (d) => (d.expiresAt ? <>{formatDate(d.expiresAt)} {expiryBadge(d.expiresAt)}</> : "—") },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <button
          className="btn btn--ghost btn--sm"
          onClick={(e) => {
            e.stopPropagation();
            store.deleteDocument(d.id);
            toast.show("Document removed");
          }}
        >
          Remove
        </button>
      ),
    },
  ];

  function submitUpload() {
    if (!uploadFileName.trim()) return;
    store.addDocument({
      id: `doc-${Date.now()}`,
      type: uploadType,
      entityType: "load",
      entityId: "unlinked",
      entityLabel: "Unlinked upload",
      fileName: uploadFileName.trim(),
      uploadedByName: store.currentUserName,
      uploadedAt: new Date().toISOString(),
      expiresAt: null,
      sizeKb: Math.round(50 + Math.random() * 400),
    });
    toast.show("Document added (mock upload)");
    setUploadFileName("");
    setUploadOpen(false);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Document Center</div>
          <div className="page-header__subtitle">{store.documents.length} documents across loads, carriers, and drivers</div>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setUploadOpen(true)}>
            Upload document
          </button>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(d) => d.id}
          searchText={(d) => `${d.fileName} ${d.entityLabel}`}
          searchPlaceholder="Search documents..."
          pageSize={12}
          toolbar={
            <select className="input" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value as "all" | DocumentEntityType)} style={{ width: 180 }}>
              <option value="all">All entity types</option>
              <option value="load">Loads</option>
              <option value="carrier">Carriers</option>
              <option value="driver">Drivers</option>
              <option value="vehicle">Vehicles</option>
              <option value="customer">Customers</option>
            </select>
          }
        />
      </Card>

      <Modal
        open={uploadOpen}
        title="Upload document"
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </button>
            <button className="btn btn--primary" disabled={!uploadFileName.trim()} onClick={submitUpload}>
              Upload
            </button>
          </>
        }
      >
        <p className="muted">This is a UI-only mock — it adds a record locally, nothing is actually uploaded or stored.</p>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Document type</label>
            <select className="input" value={uploadType} onChange={(e) => setUploadType(e.target.value as DocumentType)}>
              <option value="rate_confirmation">Rate Confirmation</option>
              <option value="bill_of_lading">Bill of Lading</option>
              <option value="proof_of_delivery">Proof of Delivery</option>
              <option value="insurance_certificate">Insurance Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">File name</label>
            <input className="input" value={uploadFileName} onChange={(e) => setUploadFileName(e.target.value)} placeholder="e.g. w9-form.pdf" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
