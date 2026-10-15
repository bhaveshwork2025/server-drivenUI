import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  MoreHorizontal,
  Package,
  Receipt,
  Route as RouteIcon,
  Send,
  Settings,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useAppStore } from "../../store/AppStore";
import { ROLE_LABELS, type Role } from "../../domain/types";
import { isPortalRole } from "../../domain/permissions";
import { relativeTime } from "../../lib/format";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  hideForPortal?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Markets", icon: LayoutDashboard },
  { to: "/loads", label: "Loads", icon: Package },
  { to: "/planning", label: "Planning", icon: RouteIcon, hideForPortal: true },
  { to: "/dispatch", label: "Dispatch", icon: Send, hideForPortal: true },
  { to: "/drivers", label: "Drivers", icon: UserRound, hideForPortal: true },
  { to: "/vehicles", label: "Vehicles", icon: Truck, hideForPortal: true },
  { to: "/carriers", label: "Carriers", icon: Building2, hideForPortal: true },
  { to: "/customers", label: "Customers", icon: Building2, hideForPortal: true },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/billing", label: "Billing", icon: Receipt, hideForPortal: true },
  { to: "/reports", label: "Reports", icon: BarChart3, hideForPortal: true },
  { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, hideForPortal: true },
  { to: "/settings", label: "Settings", icon: Settings, hideForPortal: true },
  { to: "/sdui-demo", label: "SDUI Demo", icon: LayoutTemplate },
];

// The bottom tab bar can't fit all nav items on a phone, so a handful of
// likely-frequent destinations get their own tab and everything else goes
// behind "More". Order here also controls their order in the tab bar.
const MOBILE_PRIMARY_PATHS = ["/", "/loads", "/dispatch", "/documents"];

export function AppShell() {
  const store = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const portal = isPortalRole(store.currentRole);

  const visibleNav = useMemo(() => NAV_ITEMS.filter((item) => !(portal && item.hideForPortal)), [portal]);
  const unreadCount = store.notifications.filter((n) => !n.read).length;

  const { primaryTabs, moreItems } = useMemo(() => {
    const primary = visibleNav.filter((item) => MOBILE_PRIMARY_PATHS.includes(item.to));
    const rest = visibleNav.filter((item) => !MOBILE_PRIMARY_PATHS.includes(item.to));
    // Folding a single leftover item behind "More" wastes a tab on nothing
    // useful — just give it its own tab instead.
    if (rest.length <= 1) return { primaryTabs: [...primary, ...rest], moreItems: [] };
    return { primaryTabs: primary, moreItems: rest };
  }, [visibleNav]);

  const isMoreActive = moreItems.some((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)));

  function goTo(to: string) {
    setMoreOpen(false);
    navigate(to);
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-mark">NL</span>
          <span className="shell__brand-name">Northbate LM</span>
        </div>
        <nav className="shell__nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `shell__nav-link ${isActive ? "shell__nav-link--active" : ""}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="shell__sidebar-footer">UI prototype — no backend, data resets on reload.</div>
      </aside>

      <div className="shell__main">
        <header className="shell__topbar">
          <div className="shell__topbar-title">
            <span className="shell__topbar-title-text">Load Management</span>
            <span className="shell__topbar-brand">
              <span className="shell__brand-mark shell__brand-mark--sm">NL</span>
              Northbate LM
            </span>
          </div>
          <div className="shell__topbar-actions">
            <label className="role-switcher">
              <span>Viewing as</span>
              <select value={store.currentRole} onChange={(e) => store.setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="notif-bell-wrap">
              <button className="icon-button" aria-label="Notifications" onClick={() => setNotifOpen((v) => !v)}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-bell__badge">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown__header">
                    <strong>Notifications</strong>
                    <button className="btn btn--ghost btn--sm" onClick={() => store.markAllNotificationsRead()}>
                      Mark all read
                    </button>
                  </div>
                  <div className="notif-dropdown__list">
                    {store.notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? "" : "notif-item--unread"}`}
                        onClick={() => store.markNotificationRead(n.id)}
                      >
                        <div className="notif-item__title">{n.title}</div>
                        <div className="notif-item__time">{relativeTime(n.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="current-user">
              <span className="current-user__avatar">{store.currentUserName.charAt(0)}</span>
              <div>
                <div className="current-user__name">{store.currentUserName}</div>
                <div className="current-user__role">{ROLE_LABELS[store.currentRole]}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="shell__content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {primaryTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {moreItems.length > 0 && (
          <button
            className={`bottom-nav__item ${isMoreActive ? "bottom-nav__item--active" : ""}`}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="more-sheet-overlay" onMouseDown={() => setMoreOpen(false)}>
          <div className="more-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="more-sheet__header">
              <strong>More</strong>
              <button className="icon-button" aria-label="Close" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="more-sheet__grid">
              {moreItems.map((item) => (
                <button key={item.to} className="more-sheet__item" onClick={() => goTo(item.to)}>
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
