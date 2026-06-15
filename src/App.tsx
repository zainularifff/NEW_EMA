import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Hardware from "./pages/Hardware";
import Settings from "./pages/Settings";
import ServiceDesk from "./pages/ServiceDesk";
import TaskList from "./pages/TaskList";
import Report from "./pages/ReportDynamicWrapper";
import Software from "./pages/Software";
import AppMetering from "./pages/AppMetering";
import AppRestriction from "./pages/AppRestriction";
import WebRestriction from "./pages/WebRestriction";
import SoftwareDistribution from "./pages/SoftwareDistribution";
import PatchManagement from "./pages/PatchManagement";
import InternetMetering from "./pages/InternetMetering";
import NetworkInventory from "./pages/NetworkInventory";
import ManagementDashboard from "./pages/ManagementDashboard";
//import ITOperationsDashboard from "./pages/ITOperationsDashboard";


import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hardware" element={<Hardware />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/service-desk" element={<ServiceDesk />} />
        <Route path="/tasklist" element={<TaskList />} />
        <Route path="/report" element={<Report />} />
        <Route path="/software" element={<Software />} />
        <Route path="/appmetering" element={<AppMetering />} />
        <Route path="/app-restriction" element={<AppRestriction />} />
        <Route path="/web-restriction" element={<WebRestriction />} />
        <Route path="/software-distribution" element={<SoftwareDistribution />} />
        <Route path="/patch-management" element={<PatchManagement />} />
        <Route path="/internet-metering" element={<InternetMetering />} />
        <Route path="/network-metering" element={<NetworkInventory />} />
        <Route path="/network-inventory" element={<NetworkInventory />} />
        <Route path="/management-dashboard" element={<ManagementDashboard />} />
        {/* <Route path="/itdashboard" element={<ITOperationsDashboard />} /> */}
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
