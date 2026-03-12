import { useState } from 'react';
import type { Student } from '../data/mockStudents';
import styles from './MealCalendarModal.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 일별 급식 신청 데이터 */
interface DayMeal {
  day: number;
  lunch: boolean;
  dinner: boolean;
}

// 목 데이터: 2026년 3월 급식 신청 현황
const MOCK_MEAL_MAP: Record<string, DayMeal[]> = {
  '2026-3': [
    { day: 1, lunch: true, dinner: false },
    { day: 2, lunch: true, dinner: true },
    { day: 3, lunch: true, dinner: true },
    { day: 4, lunch: true, dinner: false },
    { day: 5, lunch: true, dinner: true },
    { day: 6, lunch: false, dinner: true },
    { day: 7, lunch: true, dinner: true },
    { day: 8, lunch: true, dinner: true },
    { day: 9, lunch: true, dinner: false },
    { day: 10, lunch: true, dinner: true },
    { day: 11, lunch: true, dinner: true },
    { day: 13, lunch: true, dinner: true },
    { day: 14, lunch: false, dinner: true },
    { day: 16, lunch: true, dinner: false },
    { day: 17, lunch: true, dinner: true },
    { day: 19, lunch: true, dinner: true },
    { day: 20, lunch: true, dinner: true },
    { day: 21, lunch: false, dinner: true },
    { day: 23, lunch: true, dinner: true },
    { day: 24, lunch: true, dinner: true },
    { day: 27, lunch: true, dinner: true },
    { day: 28, lunch: true, dinner: false },
  ],
};

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
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const days = getCalendarDays(viewYear, viewMonth);
  const mealKey = `${viewYear}-${viewMonth + 1}`;
  const mealDays = MOCK_MEAL_MAP[mealKey] ?? [];

  const getMeal = (day: number): DayMeal | undefined => {
    return mealDays.find((m) => m.day === day);
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로">
            ←
          </button>
          <span className={styles.headerTitle}>D'Lab</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        {/* 학생 배지 */}
        <div className={styles.studentBadge}>
          <span>👤</span>
          <span>{student.name}</span>
        </div>

        {/* 스크롤 영역 */}
        <div className={styles.scrollArea}>
          {/* 제목 + 범례 */}
          <div className={styles.titleArea}>
            <h2 className={styles.title}>급식 신청 내역</h2>
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendLine} ${styles.legendLunch}`} />
                점심
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendLine} ${styles.legendDinner}`} />
                저녁
              </span>
            </div>
          </div>

          {/* 캘린더 카드 */}
          <div className={styles.calendarCard}>
            <div className={styles.monthNav}>
              <button type="button" className={styles.navButton} onClick={goToPrevMonth}>
                &lt;
              </button>
              <span className={styles.monthLabel}>{viewYear}년 {viewMonth + 1}월</span>
              <button type="button" className={styles.navButton} onClick={goToNextMonth}>
                &gt;
              </button>
            </div>

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
                    <div className={styles.mealBars}>
                      {meal?.lunch && <span className={`${styles.mealBar} ${styles.mealBarLunch}`} />}
                      {meal?.dinner && <span className={`${styles.mealBar} ${styles.mealBarDinner}`} />}
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
