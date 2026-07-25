import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AppShell from "@/pages/AppShell";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import KavachaAI from "@/pages/KavachaAI";
import Analytics from "@/pages/Analytics";
import NetworkGraph from "@/pages/NetworkGraph";
import MapIntel from "@/pages/MapIntel";
import Predictions from "@/pages/Predictions";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Audit from "@/pages/Audit";
import Uploads from "@/pages/Uploads";
import Alerts from "@/pages/Alerts";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}

function App() {
  useEffect(() => { document.title = "Namma Kavacha — AI Crime Intelligence"; }, []);
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<Protected><AppShell /></Protected>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:id" element={<CaseDetail />} />
              <Route path="kavacha" element={<KavachaAI />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="network" element={<NetworkGraph />} />
              <Route path="map" element={<MapIntel />} />
              <Route path="predictions" element={<Predictions />} />
              <Route path="reports" element={<Reports />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="users" element={<Protected roles={["admin"]}><Users /></Protected>} />
              <Route path="uploads" element={<Protected roles={["admin","analyst"]}><Uploads /></Protected>} />
              <Route path="audit" element={<Protected roles={["admin","supervisor"]}><Audit /></Protected>} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
