import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import type { MenuItem } from '../../types/menu';
import styles from './Sidebar.module.css';

import dashboardActive from '../../assets/dashboard_active.png';
import dashboardDisable from '../../assets/dashboard_disable.png';
import attendanceActive from '../../assets/attendance_active.png';
import attendanceDisable from '../../assets/attendance_disable.png';
import mealActive from '../../assets/meal_active.png';
import mealDisable from '../../assets/meal_disable.png';
import phoneActive from '../../assets/phone_active.png';
import phoneDisable from '../../assets/phone_disable.png';
import seatleaveActive from '../../assets/seatleave_active.png';
import seatleaveDisable from '../../assets/seatleave_disable.png';
import seatActive from '../../assets/seat_active.png';
import seatDisable from '../../assets/seat_disable.png';
import studyActive from '../../assets/study_active.png';
import studyDisable from '../../assets/study_disable.png';
import noticeActive from '../../assets/notice_active.png';
import noticeDisable from '../../assets/notice_disable.png';
import settingActive from '../../assets/setting_active.png';
import settingDisable from '../../assets/setting_disable.png';

const MENU_ITEMS: MenuItem[] = [
  { label: '대시보드', path: '/', icon: dashboardDisable, activeIcon: dashboardActive },
  { label: '출결 관리', path: '/attendance', icon: attendanceDisable, activeIcon: attendanceActive, children: [] },
  { label: '식사 신청 및 체크명단', path: '/meals', icon: mealDisable, activeIcon: mealActive },
  { label: '휴대폰 미소지 관리', path: '/phones', icon: phoneDisable, activeIcon: phoneActive },
  { label: '좌석 이탈 관리', path: '/seat-leaves', icon: seatleaveDisable, activeIcon: seatleaveActive },
  { label: '좌석 관리', path: '/seats', icon: seatDisable, activeIcon: seatActive, children: [] },
  { label: '순공 관리', path: '/study-time', icon: studyDisable, activeIcon: studyActive, children: [] },
  { label: '공지 관리', path: '/notices', icon: noticeDisable, activeIcon: noticeActive, children: [] },
  { label: '설정', path: '/settings', icon: settingDisable, activeIcon: settingActive, children: [] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button className={styles.toggleButton} type="button" onClick={onToggle} title={collapsed ? '사이드바 열기' : '사이드바 닫기'}>
        {collapsed ? <LuChevronRight /> : <LuChevronLeft />}
      </button>

      <nav className={styles.nav}>
        {MENU_ITEMS.map((item) => {
          const active = isActive(item.path);
          const iconSrc = active ? item.activeIcon : item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus.has(item.path);

          if (hasChildren) {
            return (
              <div key={item.path} className={styles.menuGroup}>
                <button
                  className={`${styles.menuItem} ${active ? styles.active : ''}`}
                  onClick={() => toggleMenu(item.path)}
                  type="button"
                  title={collapsed ? item.label : undefined}
                >
                  <img src={iconSrc} alt="" className={styles.menuIcon} />
                  {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
                </button>
                {isOpen && !collapsed && (
                  <div className={styles.subMenu}>
                    {item.children!.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive: a }) =>
                          `${styles.subMenuItem} ${a ? styles.active : ''}`
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
              end={item.path === '/'}
              className={() =>
                `${styles.menuItem} ${active ? styles.active : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <img src={iconSrc} alt="" className={styles.menuIcon} />
              {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
