import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StageProvider } from './contexts/StageContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Settings from './components/settings/Settings';
import Opportunities from './components/opportunities/Opportunities';
import Dashboard from './components/dashboard/Dashboard';
import Clients from './components/clients/Clients';
import DebugLogViewer from './components/debug/DebugLogViewer';

function App() {
  return (
    <AuthProvider>
      <StageProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="opportunities" element={<Opportunities />} />
              <Route path="clients" element={<Clients />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
        <DebugLogViewer />
      </StageProvider>
    </AuthProvider>
  );
}

export default App;
