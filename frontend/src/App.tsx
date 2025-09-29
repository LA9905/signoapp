import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { api } from "./services/http";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Recover from "./pages/Recover";
import ResetPassword from "./pages/ResetPassword";
import AddProduct from "./pages/AddProduct";
import ProductList from "./pages/ProductList";
import CreateDispatch from "./pages/CreateDispatch";
import Clients from "./pages/Clients";
import Drivers from "./pages/Drivers";
import Tracking from "./pages/Tracking";
import EditProfile from "./pages/EditProfile";
import AdminBilling from "./pages/AdminBilling";
import SupplierList from "./pages/SupplierList";
import ReceiveSupplier from "./pages/ReceiveSupplier"; 
import SupplierTracking from "./pages/SupplierTracking"; 
import ProtectedShell from "./layouts/ProtectedShell";

// Hace un ping silencioso al backend para "despertarlo" en Render
const WarmBoot: React.FC = () => {
  useEffect(() => {
    let mounted = true;
    api.get("/health").catch(() => {});
    const t = window.setTimeout(() => {
      if (mounted) api.get("/health").catch(() => {});
    }, 10000);
    return () => {
      mounted = false;
      window.clearTimeout(t);
    };
  }, []);
  return null;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WarmBoot />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protegidas (envueltas con Shell) */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedShell>
              <Dashboard />
            </ProtectedShell>
          }
        />
        <Route
          path="/add-product"
          element={
            <ProtectedShell>
              <AddProduct />
            </ProtectedShell>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedShell>
              <ProductList />
            </ProtectedShell>
          }
        />
        <Route
          path="/CreateDispatch"
          element={
            <ProtectedShell>
              <CreateDispatch />
            </ProtectedShell>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedShell>
              <Clients />
            </ProtectedShell>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedShell>
              <Drivers />
            </ProtectedShell>
          }
        />
        <Route
          path="/tracking"
          element={
            <ProtectedShell>
              <Tracking />
            </ProtectedShell>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <ProtectedShell>
              <EditProfile />
            </ProtectedShell>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <ProtectedShell>
              <AdminBilling />
            </ProtectedShell>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedShell>
              <SupplierList />
            </ProtectedShell>
          }
        />
        <Route
          path="/receive-supplier"
          element={
            <ProtectedShell>
              <ReceiveSupplier />
            </ProtectedShell>
          }
        />
        <Route
          path="/supplier-tracking"
          element={
            <ProtectedShell>
              <SupplierTracking />
            </ProtectedShell>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;