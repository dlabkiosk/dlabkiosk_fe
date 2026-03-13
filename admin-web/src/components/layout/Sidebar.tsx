import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuUsers,
  LuClock,
  LuCalendarCheck,
  LuUtensils,
  LuMonitor,
  LuArmchair,
  LuSmartphone,
  LuStar,
  LuWallet,
  LuMegaphone,
  LuSettings,
} from 'react-icons/lu';
import type { MenuItem } from '../../types/menu';
import logoImg from '../../assets/logo.png';
import styles from './Sidebar.module.css';

const MENU_ITEMS: MenuItem[] = [
  { label: '대시보드', path: '/', icon: LuLayoutDashboard },
  // { label: '학생관리', path: '/students', icon: LuUsers, children: [] },
  { label: '순공관리', path: '/study-time', icon: LuClock, children: [] },
  {
    label: '출결관리',
    path: '/attendance',
    icon: LuCalendarCheck,
    children: [],
  },
  { label: '식사관리', path: '/meals', icon: LuUtensils, children: [] },
  { label: '비대면 신청', path: '/remote', icon: LuMonitor },
  { label: '좌석 현황', path: '/seats', icon: LuArmchair, children: [] },
  // { label: '휴대폰관리', path: '/phones', icon: LuSmartphone, children: [] },
  // {
  //   label: '상·벌점관리',
  //   path: '/points',
  //   icon: LuStar,
  //   children: [],
  // },
  // { label: '수납관리', path: '/billing', icon: LuWallet, children: [] },
  { label: '공지관리', path: '/notices', icon: LuMegaphone, children: [] },
  { label: '설정', path: '/settings', icon: LuSettings, children: [] },
];

export default function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  const toggleMenu = (path: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src={logoImg} alt="D'Lab" className={styles.logoImage} />
      </div>

      <nav className={styles.nav}>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus.has(item.path);

          if (hasChildren) {
            return (
              <div key={item.path} className={styles.menuGroup}>
                <button
                  className={`${styles.menuItem} ${isActive(item.path) ? styles.active : ''}`}
                  onClick={() => toggleMenu(item.path)}
                  type="button"
                >
                  <Icon className={styles.menuIcon} />
                  <span className={styles.menuLabel}>{item.label}</span>
                </button>
                {isOpen && (
                  <div className={styles.subMenu}>
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive: active }) =>
                          `${styles.subMenuItem} ${active ? styles.active : ''}`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`${styles.menuItem} ${item.children ? '' : ''} ${isActive(item.path) ? styles.active : ''}`}
            >
              <Icon className={styles.menuIcon} />
              <span className={styles.menuLabel}>{item.label}</span>
              {item.children !== undefined }
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
