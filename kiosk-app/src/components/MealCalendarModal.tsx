import type { Student } from '../data/mockStudents';
import type { MealApplication } from '../api/studentApi';
import styles from './MealCalendarModal.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** mealType → lunch/dinner boolean */
function parseMealType(mealType: string): { lunch: boolean; dinner: boolean } {
  const t = mealType;
  if (t === '중식/석식' || t === '점심/저녁') return { lunch: true, dinner: true };
  if (t === '중식' || t === '점심' || t === 'LUNCH') return { lunch: true, dinner: false };
  if (t === '석식' || t === '저녁' || t === 'DINNER') return { lunch: false, dinner: true };
  return { lunch: false, dinner: false };
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= lastDate; d++) {
    days.push(d);
  }
  return days;
}

interface MealCalendarModalProps {
  student: Student;
  onClose: () => void;
  onBack: () => void;
}

export default function MealCalendarModal({ student, onClose, onBack }: MealCalendarModalProps) {
  const now = new Date();
  const viewYear = now.getFullYear();
  const viewMonth = now.getMonth();

  const days = getCalendarDays(viewYear, viewMonth);
  const meals = student.mealApplications ?? [];

  const getMeal = (day: number): { lunch: boolean; dinner: boolean } | undefined => {
    const found = meals.find((m: MealApplication) => Number(m.day) === day);
    if (!found) return undefined;
    return parseMealType(found.mealType);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderTop}>
            <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로가기">
              ←
            </button>
            <button type="button" className={styles.detailCloseButton} onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
          <div className={styles.detailTitle}>급식 신청 내역</div>
        </div>

        {/* 스크롤 영역 */}
        <div className={styles.scrollArea}>
          {/* 범례 */}
          <div className={styles.titleArea}>
            <div className={styles.legend}>
              <div className={styles.legendChip}>
                <div className={`${styles.legendDot} ${styles.legendLunch}`} />
                중식
              </div>
              <div className={styles.legendChip}>
                <div className={`${styles.legendDot} ${styles.legendDinner}`} />
                석식
              </div>
            </div>
          </div>

          {/* 캘린더 카드 */}
          <div className={styles.calendarCard}>
            <div className={styles.monthLabel}>{viewYear}년 {viewMonth + 1}월</div>

            <div className={styles.calendarGrid}>
              {DAY_LABELS.map((label, idx) => (
                <span key={label} className={`${styles.dayLabel} ${idx === 0 ? styles.daySunday : ''} ${idx === 6 ? styles.daySaturday : ''}`}>
                  {label}
                </span>
              ))}
              {days.map((day, idx) => {
                if (day === null) {
                  return <span key={`empty-${idx}`} className={styles.emptyCell} />;
                }
                const meal = getMeal(day);
                const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
                return (
                  <div key={day} className={styles.dayCell}>
                    <span className={`${styles.dayNumber} ${dayOfWeek === 0 ? styles.daySunday : ''} ${dayOfWeek === 6 ? styles.daySaturday : ''}`}>
                      {day}
                    </span>
                    <div className={styles.mealDots}>
                      {meal?.lunch && <span className={`${styles.mealDot} ${styles.mealDotLunch}`} />}
                      {meal?.dinner && <span className={`${styles.mealDot} ${styles.mealDotDinner}`} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
