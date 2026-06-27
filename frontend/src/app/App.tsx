import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from 'pages/dashboard';
import { ReviewerPage } from 'pages/reviewer';
import { HistoryPage } from 'pages/history';
import { NavBar } from 'widgets/nav-bar';

export const App = () => (
  <BrowserRouter>
    <NavBar />
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/reviewer" element={<ReviewerPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
