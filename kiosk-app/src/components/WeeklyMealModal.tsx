import { useEffect, useState, useCallback } from 'react';
import { getMealMenuWeek, type MealMenuDay } from '../api/mealMenuApi';
import styles from './WeeklyMealModal.module.css';

/* ── 날짜 유틸 ── */

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_LABELS = ['월', '화', '수', '목', '금'] as const;

/* ── 타입 ── */

interface DayMeal {
  lunch: string;
  dinner: string;
  closed: boolean;
}

type WeekMeals = Record<number, DayMeal>;

function emptyWeek(): WeekMeals {
  return Object.fromEntries(
    Array.from({ length: 5 }, (_, i) => [i, { lunch: '', dinner: '', closed: false }]),
  );
}

function apiToWeekMeals(days: MealMenuDay[], monday: Date): WeekMeals {
  const result = emptyWeek();
  for (const item of days) {
    const itemDate = new Date(item.menuDate + 'T00:00:00');
    for (let i = 0; i < 5; i++) {
      if (isSameDay(addDays(monday, i), itemDate)) {
        result[i] = { lunch: item.lunch, dinner: item.dinner, closed: item.closed };
        break;
      }
    }
  }
  return result;
}

/* ── Props ── */

interface WeeklyMealModalProps {
  storeId?: number;
  onClose: () => void;
}

export default function WeeklyMealModal({ storeId, onClose }: WeeklyMealModalProps) {
  const today = new Date();
  const thisMonday = getMonday(today);

  // 0 = 이번주, 1 = 다음주
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = addDays(thisMonday, weekOffset * 7);
  const friday = addDays(monday, 4);

  const [meals, setMeals] = useState<WeekMeals>(emptyWeek);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async (mon: Date) => {
    setLoading(true);
    try {
      const res = await getMealMenuWeek(toISODate(mon), storeId);
      setMeals(apiToWeekMeals(res.days, mon));
    } catch (err) {
      console.error('[식단표 조회 실패]', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchMeals(monday);
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        {/* 주간 범위 뱃지 */}
        <div className={styles.weekRange}>
          <button
            type="button"
            className={styles.weekArrow}
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
            aria-label="이전 주"
          >
            &#x25C0;
          </button>
          <span className={styles.weekBadge}>
            {formatDate(monday)} ~ {formatDate(friday)}
          </span>
          <button
            type="button"
            className={styles.weekArrow}
            onClick={() => setWeekOffset(1)}
            disabled={weekOffset === 1}
            aria-label="다음 주"
          >
            &#x25B6;
          </button>
        </div>

        {/* 타이틀 */}
        <h2 className={styles.title}>주간 식단표</h2>

        {/* 테이블: 가로 배열 (요일 = 컬럼) */}
        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.loadingText}>불러오는 중...</p>
          ) : (
            <table className={styles.mealTable}>
              <thead>
                <tr>
                  <th className={styles.labelCol}></th>
                  {DAY_LABELS.map((label, idx) => {
                    const dayDate = addDays(monday, idx);
                    const isToday = isSameDay(dayDate, today);
                    return (
                      <th key={idx} className={isToday ? styles.todayCol : undefined}>
                        <span className={styles.dayDate}>
                          {formatDate(dayDate)} ({label})
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* 중식 */}
                <tr>
                  <td className={styles.mealLabel}>중식</td>
                  {DAY_LABELS.map((_, idx) => {
                    const day = meals[idx];
                    const dayDate = addDays(monday, idx);
                    const isToday = isSameDay(dayDate, today);
                    return (
                      <td key={idx} className={isToday ? styles.todayCell : undefined}>
                        {day?.closed ? (
                          <span className={styles.closedText}>휴무</span>
                        ) : day?.lunch ? (
                          <div className={styles.menuContent}>{day.lunch}</div>
                        ) : (
                          <span className={styles.emptyMenu}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {/* 석식 */}
                <tr>
                  <td className={styles.mealLabel}>석식</td>
                  {DAY_LABELS.map((_, idx) => {
                    const day = meals[idx];
                    const dayDate = addDays(monday, idx);
                    const isToday = isSameDay(dayDate, today);
                    return (
                      <td key={idx} className={isToday ? styles.todayCell : undefined}>
                        {day?.closed ? (
                          <span className={styles.closedText}>휴무</span>
                        ) : day?.dinner ? (
                          <div className={styles.menuContent}>{day.dinner}</div>
                        ) : (
                          <span className={styles.emptyMenu}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
