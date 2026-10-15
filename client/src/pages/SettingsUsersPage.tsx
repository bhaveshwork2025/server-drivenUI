import { useState } from "react";
import { useAppStore } from "../store/AppStore";
import { useToast } from "../components/ui/Toast";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Badge, Card } from "../components/ui/primitives";
import { Modal } from "../components/ui/Modal";
import { formatDateTime, relativeTime, titleCase } from "../lib/format";
import { userStatusTone } from "../domain/presentation";
import { canManageUsers } from "../domain/permissions";
import { ROLE_LABELS, type AppUser, type Role } from "../domain/types";

export function SettingsUsersPage() {
  const store = useAppStore();
  const toast = useToast();
  const canManage = canManageUsers(store.currentRole);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("dispatcher");

  const columns: Column<AppUser>[] = [
    { key: "name", header: "Name", sortValue: (u) => u.name, render: (u) => <strong>{u.name}</strong> },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "role", header: "Role", sortValue: (u) => u.role, render: (u) => ROLE_LABELS[u.role] },
    { key: "status", header: "Status", sortValue: (u) => u.status, render: (u) => <Badge label={titleCase(u.status)} tone={userStatusTone(u.status)} /> },
    { key: "lastActive", header: "Last active", render: (u) => (u.lastActiveAt ? relativeTime(u.lastActiveAt) : "Never") },
    {
      key: "actions",
      header: "",
      render: (u) =>
        canManage ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              const next = u.status === "suspended" ? "active" : "suspended";
              store.updateUserStatus(u.id, next);
              toast.show(`${u.name} ${next === "suspended" ? "suspended" : "reactivated"}`);
            }}
          >
            {u.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>
        ) : null,
    },
  ];

  function sendInvite() {
    if (!name.trim() || !email.trim()) return;
    store.inviteUser({
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: "invited",
      lastActiveAt: null,
      createdAt: new Date().toISOString(),
    });
    toast.show(`Invitation sent to ${email.trim()} (mock — no email sent)`);
    setName("");
    setEmail("");
    setInviteOpen(false);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-header__title">Users & Roles</div>
          <div className="page-header__subtitle">{store.users.length} users across {Object.keys(ROLE_LABELS).length} role types</div>
        </div>
        <div className="page-header__actions">
          {canManage && (
            <button className="btn btn--primary" onClick={() => setInviteOpen(true)}>
              Invite user
            </button>
          )}
        </div>
      </div>

      <Card>
        <DataTable columns={columns} rows={store.users} getRowId={(u) => u.id} searchText={(u) => `${u.name} ${u.email}`} searchPlaceholder="Search users..." pageSize={10} />
      </Card>

      <Card title="Role reference">
        <div className="stack" style={{ gap: 6 }}>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <div className="field-row" key={key}>
              <span>{label}</span>
              <span className="muted">{store.users.filter((u) => u.role === key).length} user(s)</span>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={inviteOpen}
        title="Invite a user"
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button className="btn btn--primary" disabled={!name.trim() || !email.trim()} onClick={sendInvite}>
              Send invite
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Invited at {formatDateTime(new Date().toISOString())}. No email is actually sent in this prototype.
        </p>
      </Modal>
    </div>
  );
}
