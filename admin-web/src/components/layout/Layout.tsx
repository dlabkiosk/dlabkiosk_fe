import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

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
