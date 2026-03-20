import noCardIcon from '../assets/no_card.png';
import seatLeaveIcon from '../assets/seatleave.png';
import nonFacetofaceIcon from '../assets/non_facetoface.png';
import searchStudentIcon from '../assets/search_student.png';
import mealPlanIcon from '../assets/meal_plan.png';
import seatmapIcon from '../assets/seatmap.png';
import styles from './QuickMenu.module.css';

interface QuickMenuItem {
  id: string;
  label: string;
  icon: string;
}

const MENU_ITEMS: QuickMenuItem[] = [
  { id: 'no-card', label: '카드 미소지', icon: noCardIcon },
  { id: 'seat-leave', label: '좌석이탈', icon: seatLeaveIcon },
  { id: 'remote-apply', label: '비대면 신청', icon: nonFacetofaceIcon },
  { id: 'student-info', label: '학적 조회', icon: searchStudentIcon },
  { id: 'meal-plan', label: '식단표', icon: mealPlanIcon },
  { id: 'seat-map', label: '좌석 배치도', icon: seatmapIcon },
];

interface QuickMenuProps {
  onMenuClick: (menuId: string) => void;
}

export default function QuickMenu({ onMenuClick }: QuickMenuProps) {
  return (
    <nav className={styles.container}>
      <div className={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <button key={item.id} type="button" className={styles.menuButton} onClick={() => onMenuClick(item.id)}>
            <span className={styles.iconWrap}>
              <img src={item.icon} alt={item.label} className={styles.iconImg} />
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
