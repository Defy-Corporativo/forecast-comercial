import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@iadefysolutions/design-system';

import { AuthProvider } from './contexts/AuthContext';
import { StageProvider } from './contexts/StageContext';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Settings from './components/settings/Settings';
import Opportunities from './components/opportunities/Opportunities';
import Dashboard from './components/dashboard/Dashboard';
import Actions from './components/actions/Actions';
import Clients from './components/clients/Clients';
import DebugLogViewer from './components/debug/DebugLogViewer';
import ResponsibleActions from './components/actions/ResponsibleActions';
import AcoesRedirect from './components/actions/AcoesRedirect';



// RouteLogger removed

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <StageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              {/* Rota pública - /acoes sem UUID redireciona para o link do usuário logado */}
              <Route path="/acoes" element={<AcoesRedirect />} />
              {/* Rota pública - ações do responsável com UUID */}
              <Route path="/acoes/:responsibleId" element={<ResponsibleActions />} />
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
                <Route path="actions" element={<Actions />} />
                <Route path="clients" element={<Clients />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Router>
          <DebugLogViewer />
        </AuthProvider>
      </StageProvider>
    </ThemeProvider>
  );
}

export default App;

