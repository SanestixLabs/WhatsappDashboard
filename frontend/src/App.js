import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import TeamPage         from './pages/TeamPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import SignupPage       from './pages/SignupPage';
import FlowsPage        from './pages/FlowsPage';
import FlowBuilderPage  from './pages/FlowBuilderPage';

const PrivateRoute = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<SignupPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/team"          element={<PrivateRoute><TeamPage /></PrivateRoute>} />
        <Route path="/flows"          element={<PrivateRoute><FlowsPage /></PrivateRoute>} />
        <Route path="/flows/:id"      element={<PrivateRoute><FlowBuilderPage /></PrivateRoute>} />
        <Route path="/*"             element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
