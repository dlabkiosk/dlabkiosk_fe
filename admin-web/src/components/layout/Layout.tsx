import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

const SIDEBAR_COLLAPSED_KEY = 'admin:sidebarCollapsed';

export default function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div className={collapsed ? styles.layoutCollapsed : ''}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Navbar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
