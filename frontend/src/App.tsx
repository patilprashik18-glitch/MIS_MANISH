import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyMillReport from './pages/DailyMillReport';
import PadtalReport from './pages/PadtalReport';
import AdminUsers from './pages/AdminUsers';
import AdminMasterData from './pages/AdminMasterData';
import AdminSettings from './pages/AdminSettings';
import AdminAuditLog from './pages/AdminAuditLog';
import AuditLogDetail from './pages/AuditLogDetail';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" />;
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/daily-mill" element={<DailyMillReport />} />
        <Route path="/padtal" element={<PadtalReport />} />
        <Route path="/users" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/master-data" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminMasterData />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="/audit-log" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminAuditLog />
          </ProtectedRoute>
        } />
        <Route path="/audit-log/:date" element={
          <ProtectedRoute requireAdmin={true}>
            <AuditLogDetail />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
