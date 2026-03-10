import styles from './QuickMenu.module.css';

interface QuickMenuItem {
  id: string;
  label: string;
  icon: string;
  size: 'large' | 'small';
}

const MENU_ITEMS: QuickMenuItem[] = [
  { id: 'student-info', label: '학적 조회', icon: '🔍', size: 'large' },
  { id: 'attendance', label: '출결 관리', icon: '📋', size: 'large' },
  { id: 'remote-apply', label: '비대면 신청', icon: '📡', size: 'small' },
  { id: 'meal-plan', label: '주간 식단표', icon: '🍽️', size: 'small' },
  { id: 'seat-map', label: '좌석 배치도', icon: '🗺️', size: 'small' },
];

interface QuickMenuProps {
  onMenuClick: (menuId: string) => void;
}

export default function QuickMenu({ onMenuClick }: QuickMenuProps) {
  const largeItems = MENU_ITEMS.filter((item) => item.size === 'large');
  const smallItems = MENU_ITEMS.filter((item) => item.size === 'small');

  return (
    <nav className={styles.container}>
      <div className={styles.largeRow}>
        {largeItems.map((item) => (
          <button key={item.id} type="button" className={styles.largeButton} onClick={() => onMenuClick(item.id)}>
            <span className={styles.largeIcon}>{item.icon}</span>
            <span className={styles.largeLabel}>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.smallRow}>
        {smallItems.map((item) => (
          <button key={item.id} type="button" className={styles.smallButton} onClick={() => onMenuClick(item.id)}>
            <span className={styles.smallIcon}>{item.icon}</span>
            <span className={styles.smallLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
