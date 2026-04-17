import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Building2, ClipboardList, DatabaseBackup, Download, LayoutDashboard, LogOut, Mail, Menu, Moon, Settings, Sun, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useApp } from '../contexts/AppContext';
import { formatDateTime, roleLabel } from '../lib/helpers';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/tasks', label: 'المهام', icon: ClipboardList },
  { to: '/messages', label: 'المراسلات', icon: Mail },
  { to: '/structure', label: 'الهيكل الإداري', icon: Building2 },
  { to: '/users', label: 'المستخدمون', icon: Users },
  { to: '/backups', label: 'النسخ الاحتياطية', icon: DatabaseBackup },
  { to: '/settings', label: 'الإعدادات', icon: Settings }
];

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, branding, notifications, signOut, markNotificationRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  };

  return (
    <div className="app-shell">
      <button className="mobile-menu-btn icon-btn" onClick={() => setMobileMenuOpen(true)} title="فتح القائمة"><Menu size={18} /></button>
      <aside className={`sidebar card ${mobileMenuOpen ? 'open' : ''}`}>
        <div>
          <div className="brand-row">
            <div className="brand">
              {branding.logo_data_url ? <img src={branding.logo_data_url} className="brand-logo" alt="logo" /> : <div className="brand-mark">ع</div>}
              <div>
                <h1>{branding.company_name}</h1>
                <p>{branding.company_tagline}</p>
              </div>
            </div>
            <button className="mobile-close-btn icon-btn" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
          </div>
          <nav className="nav-list">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="mini-user">
            <div className="avatar">{currentUser?.name?.[0] || 'م'}</div>
            <div>
              <strong>{currentUser?.name || currentUser?.full_name_ar || 'مستخدم النظام'}</strong>
              <p>{roleLabel(currentUser?.role || currentUser?.role_key)} — {currentUser?.orgUnitName || 'بدون جهة'}</p>
            </div>
          </div>
        </div>
      </aside>
      {mobileMenuOpen ? <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} /> : null}

      <main className="content-area">
        <header className="topbar card">
          <div>
            <h2>نظام {branding.company_name}</h2>
            <p>{formatDateTime(clock)} — {currentUser?.orgUnitName || 'بدون جهة إدارية'}</p>
          </div>
          <div className="topbar-actions">
            {installPrompt ? (
              <button className="secondary-btn install-btn" onClick={handleInstallApp} title="تثبيت التطبيق">
                <Download size={16} />
                <span>تثبيت</span>
              </button>
            ) : null}
            <button className="icon-btn" onClick={toggleTheme} title="تبديل الوضع">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notification-wrap">
              <button className="icon-btn" title="الإشعارات" onClick={() => setShowNotifications((prev) => !prev)}>
                <Bell size={18} />
                {unreadCount ? <span className="notif-dot">{unreadCount}</span> : null}
              </button>
              {showNotifications ? (
                <div className="notification-panel card">
                  <div className="section-header compact"><h3>الإشعارات</h3></div>
                  <div className="list-stack notifications-list">
                    {notifications.length ? notifications.map((item) => (
                      <button key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`} onClick={() => markNotificationRead(item.id)}>
                        <strong>{item.title_ar}</strong>
                        <p>{item.body_ar}</p>
                        <small>{formatDateTime(item.created_at)}</small>
                      </button>
                    )) : <p className="muted">لا توجد إشعارات</p>}
                  </div>
                </div>
              ) : null}
            </div>
            <button className="icon-btn" title="تسجيل الخروج" onClick={signOut}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
