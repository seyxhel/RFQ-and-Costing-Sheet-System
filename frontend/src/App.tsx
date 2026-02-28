import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// RFQ module
import RFQList from './pages/rfq/RFQList';
import RFQForm from './pages/rfq/RFQForm';
import RFQDetail from './pages/rfq/RFQDetail';
import SupplierList from './pages/rfq/SupplierList';
import SupplierForm from './pages/rfq/SupplierForm';
import QuotationList from './pages/rfq/QuotationList';
import QuotationForm from './pages/rfq/QuotationForm';
import QuotationCompare from './pages/rfq/QuotationCompare';

// Costing module
import CostingList from './pages/costing/CostingList';
import CostingForm from './pages/costing/CostingForm';
import CostingDetail from './pages/costing/CostingDetail';
import ScenarioList from './pages/costing/ScenarioList';
import ScenarioForm from './pages/costing/ScenarioForm';

// Users
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route path="/" element={<Dashboard />} />

                {/* RFQ */}
                <Route path="/rfq" element={<RFQList />} />
                <Route path="/rfq/new" element={<RFQForm />} />
                <Route path="/rfq/:id" element={<RFQDetail />} />
                <Route path="/rfq/:id/edit" element={<RFQForm />} />
                <Route path="/rfq/:id/compare" element={<QuotationCompare />} />

                {/* Suppliers */}
                <Route path="/suppliers" element={<SupplierList />} />
                <Route path="/suppliers/new" element={<SupplierForm />} />
                <Route path="/suppliers/:id/edit" element={<SupplierForm />} />

                {/* Quotations */}
                <Route path="/quotations" element={<QuotationList />} />
                <Route path="/quotations/new" element={<QuotationForm />} />
                <Route path="/quotations/:id/edit" element={<QuotationForm />} />

                {/* Costing */}
                <Route path="/costing" element={<CostingList />} />
                <Route path="/costing/new" element={<CostingForm />} />
                <Route path="/costing/:id" element={<CostingDetail />} />
                <Route path="/costing/:id/edit" element={<CostingForm />} />
                <Route path="/costing/:sheetId/scenarios" element={<ScenarioList />} />
                <Route path="/costing/:sheetId/scenarios/new" element={<ScenarioForm />} />

                {/* Users (admin) */}
                <Route path="/users" element={<AdminRoute><UserList /></AdminRoute>} />
                <Route path="/users/new" element={<AdminRoute><UserForm /></AdminRoute>} />
                <Route path="/users/:id/edit" element={<AdminRoute><UserForm /></AdminRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}
