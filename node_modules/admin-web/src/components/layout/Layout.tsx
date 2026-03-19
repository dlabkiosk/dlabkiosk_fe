import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <>
      <Sidebar />
      <Navbar />
      <main className={styles.content}>
        <Outlet />
      </main>
    </>
  );
}
