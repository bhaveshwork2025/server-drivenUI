import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppStoreProvider } from "./store/AppStore";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoadsListPage } from "./pages/LoadsListPage";
import { LoadDetailPage } from "./pages/LoadDetailPage";
import { LoadFormPage } from "./pages/LoadFormPage";
import { PlanningBoardPage } from "./pages/PlanningBoardPage";
import { DispatchBoardPage } from "./pages/DispatchBoardPage";
import { DriversPage } from "./pages/DriversPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { CarriersPage } from "./pages/CarriersPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { BillingPage } from "./pages/BillingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ExceptionsPage } from "./pages/ExceptionsPage";
import { SettingsUsersPage } from "./pages/SettingsUsersPage";
import { SduiDemoPage } from "./pages/SduiDemoPage";
import "./styles/app.css";

export default function App() {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsListPage />} />
              <Route path="/loads/new" element={<LoadFormPage />} />
              <Route path="/loads/:id" element={<LoadDetailPage />} />
              <Route path="/loads/:id/edit" element={<LoadFormPage />} />
              <Route path="/planning" element={<PlanningBoardPage />} />
              <Route path="/dispatch" element={<DispatchBoardPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/carriers" element={<CarriersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/exceptions" element={<ExceptionsPage />} />
              <Route path="/settings" element={<SettingsUsersPage />} />
              <Route path="/sdui-demo" element={<SduiDemoPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppStoreProvider>
  );
}
