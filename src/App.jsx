import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import MessagesPage from './pages/MessagesPage';
import StructurePage from './pages/StructurePage';
import UsersPage from './pages/UsersPage';
import BackupsPage from './pages/BackupsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { useApp } from './contexts/AppContext';

export default function App() {
  const { session, loading, error } = useApp();

  if (loading) {
    return <div className="full-center"><div className="card loading-card">جارٍ تحميل بيانات النظام...</div></div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <Layout>
      {error ? <div className="alert error">{error}</div> : null}
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/structure" element={<StructurePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
