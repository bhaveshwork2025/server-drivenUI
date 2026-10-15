import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import { buildSeedData, type SeedData } from "../mock/seed";
import type {
  AppUser,
  CarrierStatus,
  DocumentRecord,
  ExceptionComment,
  ExceptionRecord,
  Invoice,
  Load,
  LoadStatus,
  Role,
  UserStatus,
} from "../domain/types";

interface State extends SeedData {
  currentRole: Role;
}

type Action =
  | { type: "SET_ROLE"; role: Role }
  | { type: "UPDATE_LOAD_STATUS"; loadId: string; next: LoadStatus; reason?: string; byUserName: string }
  | { type: "ASSIGN_CARRIER"; loadId: string; carrierId: string }
  | { type: "UPDATE_CARRIER_STATUS"; id: string; status: CarrierStatus }
  | { type: "ASSIGN_DRIVER_VEHICLE"; loadId: string; driverId: string; vehicleId: string }
  | { type: "CREATE_LOAD"; load: Load }
  | { type: "UPDATE_LOAD"; loadId: string; patch: Partial<Load> }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "ADD_EXCEPTION"; exception: ExceptionRecord }
  | { type: "UPDATE_EXCEPTION"; id: string; patch: Partial<ExceptionRecord> }
  | { type: "ADD_EXCEPTION_COMMENT"; id: string; comment: ExceptionComment }
  | { type: "INVITE_USER"; user: AppUser }
  | { type: "UPDATE_USER_STATUS"; id: string; status: UserStatus }
  | { type: "ADD_DOCUMENT"; doc: DocumentRecord }
  | { type: "DELETE_DOCUMENT"; id: string }
  | { type: "MARK_INVOICE_PAID"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, currentRole: action.role };

    case "UPDATE_LOAD_STATUS":
      return {
        ...state,
        loads: state.loads.map((l) =>
          l.id === action.loadId
            ? {
                ...l,
                status: action.next,
                updatedAt: new Date().toISOString(),
                statusHistory: [
                  ...l.statusHistory,
                  {
                    id: `sh-${l.statusHistory.length}-${action.loadId}`,
                    from: l.status,
                    to: action.next,
                    at: new Date().toISOString(),
                    byUserName: action.byUserName,
                    reason: action.reason,
                  },
                ],
              }
            : l,
        ),
      };

    case "ASSIGN_CARRIER":
      return {
        ...state,
        loads: state.loads.map((l) => (l.id === action.loadId ? { ...l, carrierId: action.carrierId } : l)),
      };

    case "UPDATE_CARRIER_STATUS":
      return {
        ...state,
        carriers: state.carriers.map((c) => (c.id === action.id ? { ...c, status: action.status } : c)),
      };

    case "ASSIGN_DRIVER_VEHICLE":
      return {
        ...state,
        loads: state.loads.map((l) =>
          l.id === action.loadId ? { ...l, driverId: action.driverId, vehicleId: action.vehicleId } : l,
        ),
      };

    case "CREATE_LOAD":
      return { ...state, loads: [action.load, ...state.loads] };

    case "UPDATE_LOAD":
      return {
        ...state,
        loads: state.loads.map((l) => (l.id === action.loadId ? { ...l, ...action.patch, updatedAt: new Date().toISOString() } : l)),
      };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };

    case "ADD_EXCEPTION":
      return { ...state, exceptions: [action.exception, ...state.exceptions] };

    case "UPDATE_EXCEPTION":
      return {
        ...state,
        exceptions: state.exceptions.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      };

    case "ADD_EXCEPTION_COMMENT":
      return {
        ...state,
        exceptions: state.exceptions.map((e) =>
          e.id === action.id ? { ...e, comments: [...e.comments, action.comment] } : e,
        ),
      };

    case "INVITE_USER":
      return { ...state, users: [...state.users, action.user] };

    case "UPDATE_USER_STATUS":
      return { ...state, users: state.users.map((u) => (u.id === action.id ? { ...u, status: action.status } : u)) };

    case "ADD_DOCUMENT":
      return { ...state, documents: [action.doc, ...state.documents] };

    case "DELETE_DOCUMENT":
      return { ...state, documents: state.documents.filter((d) => d.id !== action.id) };

    case "MARK_INVOICE_PAID":
      return {
        ...state,
        invoices: state.invoices.map((i): Invoice =>
          i.id === action.id
            ? { ...i, status: "paid", paidAmount: i.lineItems.reduce((s, li) => s + li.amount, 0) }
            : i,
        ),
      };

    default:
      return state;
  }
}

interface AppStoreApi extends State {
  currentUserName: string;
  setRole: (role: Role) => void;
  updateLoadStatus: (loadId: string, next: LoadStatus, reason?: string) => void;
  assignCarrier: (loadId: string, carrierId: string) => void;
  updateCarrierStatus: (id: string, status: CarrierStatus) => void;
  assignDriverVehicle: (loadId: string, driverId: string, vehicleId: string) => void;
  createLoad: (load: Load) => void;
  updateLoad: (loadId: string, patch: Partial<Load>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addException: (exception: ExceptionRecord) => void;
  updateException: (id: string, patch: Partial<ExceptionRecord>) => void;
  addExceptionComment: (id: string, comment: ExceptionComment) => void;
  inviteUser: (user: AppUser) => void;
  updateUserStatus: (id: string, status: UserStatus) => void;
  addDocument: (doc: DocumentRecord) => void;
  deleteDocument: (id: string) => void;
  markInvoicePaid: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreApi | null>(null);

function initState(): State {
  return { ...buildSeedData(), currentRole: "dispatcher" };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const currentUserName = useMemo(() => {
    const match = state.users.find((u) => u.role === state.currentRole);
    return match?.name ?? "You";
  }, [state.users, state.currentRole]);

  const api = useMemo<AppStoreApi>(
    () => ({
      ...state,
      currentUserName,
      setRole: (role) => dispatch({ type: "SET_ROLE", role }),
      updateLoadStatus: (loadId, next, reason) =>
        dispatch({ type: "UPDATE_LOAD_STATUS", loadId, next, reason, byUserName: currentUserName }),
      assignCarrier: (loadId, carrierId) => dispatch({ type: "ASSIGN_CARRIER", loadId, carrierId }),
      updateCarrierStatus: (id, status) => dispatch({ type: "UPDATE_CARRIER_STATUS", id, status }),
      assignDriverVehicle: (loadId, driverId, vehicleId) =>
        dispatch({ type: "ASSIGN_DRIVER_VEHICLE", loadId, driverId, vehicleId }),
      createLoad: (load) => dispatch({ type: "CREATE_LOAD", load }),
      updateLoad: (loadId, patch) => dispatch({ type: "UPDATE_LOAD", loadId, patch }),
      markNotificationRead: (id) => dispatch({ type: "MARK_NOTIFICATION_READ", id }),
      markAllNotificationsRead: () => dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" }),
      addException: (exception) => dispatch({ type: "ADD_EXCEPTION", exception }),
      updateException: (id, patch) => dispatch({ type: "UPDATE_EXCEPTION", id, patch }),
      addExceptionComment: (id, comment) => dispatch({ type: "ADD_EXCEPTION_COMMENT", id, comment }),
      inviteUser: (user) => dispatch({ type: "INVITE_USER", user }),
      updateUserStatus: (id, status) => dispatch({ type: "UPDATE_USER_STATUS", id, status }),
      addDocument: (doc) => dispatch({ type: "ADD_DOCUMENT", doc }),
      deleteDocument: (id) => dispatch({ type: "DELETE_DOCUMENT", id }),
      markInvoicePaid: (id) => dispatch({ type: "MARK_INVOICE_PAID", id }),
    }),
    [state, currentUserName],
  );

  return <AppStoreContext.Provider value={api}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreApi {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
