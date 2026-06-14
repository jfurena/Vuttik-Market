/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import BusinessSelector from './pages/BusinessSelector';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Shifts from './pages/Shifts';
import Layout from './components/Layout';
import Expenses from './pages/Expenses';
import SalesHistory from './pages/SalesHistory';
import ActivityLog from './pages/ActivityLog';
import Quotations from './pages/Quotations';
import EmployeeManager from './pages/EmployeeManager';
import ClientsManager from './pages/ClientsManager';
import { UserRole } from './types';

// Route: requires the user to be logged in (any role)
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center font-sans text-white bg-slate-900">Cargando...</div>;
  if (!user) return <Navigate to={`/login${window.location.search}`} replace />;
  return <>{children}</>;
}

// Route: requires owner to have selected a business
function RequireBusiness({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center font-sans text-white bg-slate-900">Cargando...</div>;
  if (!user) return <Navigate to={`/login${window.location.search}`} replace />;
  // If owner but no business selected, go to business selector
  if (!profile?.business_id) return <Navigate to="/businesses" />;
  return <>{children}</>;
}

// Route: requires admin/owner role inside a business
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.business_id) return <Navigate to="/businesses" />;
  if (profile.rol !== UserRole.ADMIN) return <Navigate to="/pos" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Owner: business selector (no business needed, just owner login) */}
          <Route path="/businesses" element={
            <RequireAuth>
              <BusinessSelector />
            </RequireAuth>
          } />

          {/* App routes: require business context */}
          <Route path="/" element={
            <RequireBusiness>
              <Layout />
            </RequireBusiness>
          }>
            <Route index element={<RootRedirect />} />
            <Route path="pos" element={<POS />} />
            <Route path="sales" element={<SalesHistory />} />
            <Route path="clients" element={<ClientsManager />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="quotes" element={<Quotations />} />
            {/* Admin-only routes */}
            <Route path="admin" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
            <Route path="audit" element={<RequireAdmin><ActivityLog /></RequireAdmin>} />
            <Route path="employees" element={<RequireAdmin><EmployeeManager /></RequireAdmin>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function RootRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.business_id) return <Navigate to="/businesses" />;
  if (profile.rol === UserRole.ADMIN) return <Navigate to="/admin" />;
  return <Navigate to="/pos" />;
}
