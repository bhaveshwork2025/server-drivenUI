import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card, FieldRow } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatDateTime, titleCase } from "../lib/format";
import { exceptionSeverityTone, exceptionStatusTone } from "../domain/presentation";
import { canResolveExceptions } from "../domain/permissions";
import { indexById } from "../lib/collections";
import type { ExceptionRecord } from "../domain/types";

export function ExceptionsPage() {
  const store = useAppStore();
  const toast = useToast();
  const canResolve = canResolveExceptions(store.currentRole);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const loadsById = useMemo(() => indexById(store.loads), [store.loads]);
  const selected = useMemo(() => store.exceptions.find((e) => e.id === selectedId) ?? null, [store.exceptions, selectedId]);

  const columns: Column<ExceptionRecord>[] = [
    { key: "category", header: "Category", render: (e) => titleCase(e.category) },
    { key: "load", header: "Load", render: (e) => (e.loadId ? loadsById[e.loadId]?.loadNumber ?? "—" : "—") },
    { key: "severity", header: "Severity", sortValue: (e) => e.severity, render: (e) => <Badge label={titleCase(e.severity)} tone={exceptionSeverityTone(e.severity)} /> },
    { key: "status", header: "Status", sortValue: (e) => e.status, render: (e) => <Badge label={titleCase(e.status)} tone={exceptionStatusTone(e.status)} /> },
    { key: "owner", header: "Owner", render: (e) => e.ownerName },
    { key: "createdAt", header: "Opened", sortValue: (e) => e.createdAt, render: (e) => formatDateTime(e.createdAt) },
  ];

  function resolve(id: string) {
    store.updateException(id, { status: "resolved" });
    toast.show("Exception resolved");
  }

  function escalate(id: string) {
    store.updateException(id, { status: "escalated", severity: "critical" });
    toast.show("Exception escalated");
  }

  function addComment() {
    if (!selected || !comment.trim()) return;
    store.addExceptionComment(selected.id, { id: `c-${Date.now()}`, byName: store.currentUserName, at: new Date().toISOString(), text: comment.trim() });
    setComment("");
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Exceptions</div>
          <div className="page-header__subtitle">{store.exceptions.filter((e) => e.status !== "resolved").length} open exceptions</div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={store.exceptions}
          getRowId={(e) => e.id}
          onRowClick={(e) => setSelectedId(e.id)}
          searchText={(e) => `${e.category} ${e.description}`}
          searchPlaceholder="Search exceptions..."
          pageSize={10}
          emptyTitle="No exceptions recorded"
        />
      </Card>

      <Modal open={!!selected} title={selected ? titleCase(selected.category) : ""} onClose={() => setSelectedId(null)} width={640}>
        {selected && (
          <div className="stack">
            <FieldRow label="Severity">
              <Badge label={titleCase(selected.severity)} tone={exceptionSeverityTone(selected.severity)} />
            </FieldRow>
            <FieldRow label="Status">
              <Badge label={titleCase(selected.status)} tone={exceptionStatusTone(selected.status)} />
            </FieldRow>
            <FieldRow label="Related load">
              {selected.loadId ? <Link to={`/loads/${selected.loadId}`}>{loadsById[selected.loadId]?.loadNumber}</Link> : "—"}
            </FieldRow>
            <FieldRow label="Owner">{selected.ownerName}</FieldRow>
            <FieldRow label="Opened">{formatDateTime(selected.createdAt)}</FieldRow>
            <FieldRow label="Resolution deadline">{selected.resolutionDeadline ? formatDateTime(selected.resolutionDeadline) : "—"}</FieldRow>
            <FieldRow label="Description">{selected.description}</FieldRow>

            {canResolve && selected.status !== "resolved" && (
              <div className="button-row">
                <button className="btn btn--ghost btn--sm" onClick={() => escalate(selected.id)}>
                  Escalate
                </button>
                <button className="btn btn--primary btn--sm" onClick={() => resolve(selected.id)}>
                  Mark Resolved
                </button>
              </div>
            )}

            <hr className="section-divider" />
            <strong>Comments ({selected.comments.length})</strong>
            <div className="stack" style={{ gap: 6 }}>
              {selected.comments.map((c) => (
                <div key={c.id} className="field-row">
                  <div>
                    <strong>{c.byName}</strong>
                    <div className="muted">{c.text}</div>
                  </div>
                  <div className="muted">{formatDateTime(c.at)}</div>
                </div>
              ))}
            </div>
            <div className="form-field">
              <textarea className="input" rows={2} placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="button-row" style={{ marginTop: 8 }}>
                <button className="btn btn--ghost btn--sm" disabled={!comment.trim()} onClick={addComment}>
                  Add comment
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
