import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { AuthProvider } from 'shared/auth/session';
import { AppProvider } from 'shared/qamqor-context/AppContext';
import { DashboardProvider } from 'shared/qamqor-context/DashboardContext';
import { InvestigationsProvider } from 'shared/qamqor-context/InvestigationsContext';
import QamqorLanding from 'pages/qamqor-landing';
import QamqorEmployee from 'pages/qamqor-employee';
import QamqorManager from 'pages/qamqor-manager';
import QamqorDashboard from 'pages/qamqor-dashboard';
import AdminPanel from 'pages/admin';

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <InvestigationsProvider>
            <DashboardProvider>
              <Routes>
                <Route path="/" element={<QamqorLanding />} />
                <Route path="/employee" element={<QamqorEmployee />} />
                <Route path="/manager" element={<QamqorManager />} />
                <Route path="/dashboard" element={<QamqorDashboard />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DashboardProvider>
          </InvestigationsProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
