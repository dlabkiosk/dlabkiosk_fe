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

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/* ── 타입 ── */

interface DayMeal {
  lunch: string;
  dinner: string;
  closed: boolean;
}

type WeekMeals = Record<number, DayMeal>;

function emptyWeek(): WeekMeals {
  return Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, { lunch: '', dinner: '', closed: i >= 5 }]),
  );
}

function apiToWeekMeals(days: MealMenuDay[], monday: Date): WeekMeals {
  const result = emptyWeek();
  for (const item of days) {
    const itemDate = new Date(item.menuDate + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
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
  const monday = getMonday(today);
  const sunday = addDays(monday, 6);

  const [meals, setMeals] = useState<WeekMeals>(emptyWeek);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    try {
      const res = await getMealMenuWeek(toISODate(monday), storeId);
      setMeals(apiToWeekMeals(res.days, monday));
    } catch (err) {
      console.error('[식단표 조회 실패]', err);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h2 className={styles.title}>주간 식단표</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 주간 범위 */}
        <div className={styles.weekRange}>
          {formatDate(monday)} ~ {formatDate(sunday)}
        </div>

        {/* 테이블 */}
        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.loadingText}>불러오는 중...</p>
          ) : (
            <table className={styles.mealTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>점심</th>
                  <th>석식</th>
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((label, idx) => {
                  const dayDate = addDays(monday, idx);
                  const isToday = isSameDay(dayDate, today);
                  const isWeekend = idx >= 5;
                  const day = meals[idx];
                  const dateStr = `${dayDate.getMonth() + 1}/${dayDate.getDate()}(${label})`;

                  return (
                    <tr key={idx} className={isToday ? styles.todayRow : undefined}>
                      <td className={styles.dayCell}>
                        {isToday && <span className={styles.todayBadge}>TODAY</span>}
                        <span className={isWeekend ? styles.weekendDay : undefined}>{dateStr}</span>
                      </td>
                      {day?.closed ? (
                        <td colSpan={2} className={styles.holidayCell}>
                          휴무
                        </td>
                      ) : (
                        <>
                          <td>
                            {day?.lunch ? (
                              <div className={styles.menuContent}>{day.lunch}</div>
                            ) : (
                              <span className={styles.emptyMenu}>-</span>
                            )}
                          </td>
                          <td>
                            {day?.dinner ? (
                              <div className={styles.menuContent}>{day.dinner}</div>
                            ) : (
                              <span className={styles.emptyMenu}>-</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
