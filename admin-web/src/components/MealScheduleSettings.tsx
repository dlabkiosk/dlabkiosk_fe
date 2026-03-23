import { useEffect, useState, useCallback } from 'react';
import {
  getMealScheduleWeek,
  saveMealSchedule,
  updateMealSchedule,
  syncMealScheduleToKiosk,
  type MealScheduleItem,
} from '../api/mealScheduleApi';
import styles from './MealScheduleSettings.module.css';

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
  id?: number;
  lunch: string;
  dinner: string;
  isHoliday: boolean;
}

type WeekMeals = Record<number, DayMeal>;

function emptyWeek(): WeekMeals {
  return Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, { lunch: '', dinner: '', isHoliday: i >= 5 }]),
  );
}

function apiToWeekMeals(meals: MealScheduleItem[], monday: Date): WeekMeals {
  const result = emptyWeek();
  for (const item of meals) {
    const itemDate = new Date(item.date + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      if (isSameDay(addDays(monday, i), itemDate)) {
        result[i] = { id: item.id, lunch: item.lunch, dinner: item.dinner, isHoliday: item.isHoliday };
        break;
      }
    }
  }
  return result;
}

/* ── 주간 식단표 카드 ── */

interface WeekMealCardProps {
  title: string;
  monday: Date;
  meals: WeekMeals;
  onRegister: () => void;
  onEdit: () => void;
}

function WeekMealCard({ title, monday, meals, onRegister, onEdit }: WeekMealCardProps) {
  const today = new Date();
  const sunday = addDays(monday, 6);
  const weekRange = `${formatDate(monday)}~${formatDate(sunday)}`;
  const isEmpty = Object.values(meals).every((d) => !d.lunch && !d.dinner);

  return (
    <div className={styles.mealCard}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.weekNav}>
        <span className={styles.weekRange}>{weekRange}</span>
      </div>

      {isEmpty ? (
        <button type="button" className={styles.registerButton} onClick={onRegister}>
          식단표 등록
        </button>
      ) : (
        <>
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
                  <tr key={idx}>
                    <td className={styles.dayCell}>
                      {isToday && <span className={styles.todayBadge}>TODAY</span>}
                      <br />
                      <span className={isWeekend ? styles.weekendDay : undefined}>{dateStr}</span>
                    </td>
                    {day?.isHoliday ? (
                      <td colSpan={2} className={styles.holidayCell}>휴무</td>
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

          <div className={styles.cardFooter}>
            <button type="button" className={styles.cardEditButton} onClick={onEdit}>수정</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 등록/수정 모달 ── */

interface MealModalProps {
  title: string;
  monday: Date;
  initialMeals: WeekMeals;
  isEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function MealScheduleModal({ title, monday, initialMeals, isEdit, onClose, onSaved }: MealModalProps) {
  const [editMeals, setEditMeals] = useState<WeekMeals>(() => {
    const copy: WeekMeals = {};
    for (let i = 0; i < 7; i++) {
      const m = initialMeals[i];
      copy[i] = { id: m?.id, lunch: m?.lunch ?? '', dinner: m?.dinner ?? '', isHoliday: m?.isHoliday ?? i >= 5 };
    }
    return copy;
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (dayIdx: number, field: 'lunch' | 'dinner', value: string) => {
    setEditMeals((prev) => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [field]: value },
    }));
  };

  const toggleHoliday = (dayIdx: number) => {
    setEditMeals((prev) => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], isHoliday: !prev[dayIdx].isHoliday },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weekStart = toISODate(monday);
      const meals = Array.from({ length: 7 }, (_, i) => ({
        date: toISODate(addDays(monday, i)),
        lunch: editMeals[i].lunch,
        dinner: editMeals[i].dinner,
        isHoliday: editMeals[i].isHoliday,
      }));

      if (isEdit) {
        await updateMealSchedule({ weekStart, meals });
      } else {
        await saveMealSchedule({ weekStart, meals });
      }
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalWeekRange}>
          {formatDate(monday)} ~ {formatDate(addDays(monday, 6))}
        </div>

        <div className={styles.modalBody}>
          <table className={styles.mealTable}>
            <thead>
              <tr>
                <th>날짜</th>
                <th>점심</th>
                <th>석식</th>
                <th>휴무</th>
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, idx) => {
                const dayDate = addDays(monday, idx);
                const dateStr = `${dayDate.getMonth() + 1}/${dayDate.getDate()}(${label})`;
                const day = editMeals[idx];
                const isWeekend = idx >= 5;

                return (
                  <tr key={idx}>
                    <td className={styles.dayCell}>
                      <span className={isWeekend ? styles.weekendDay : undefined}>{dateStr}</span>
                    </td>
                    {day.isHoliday ? (
                      <td colSpan={2} className={styles.holidayCell}>휴무</td>
                    ) : (
                      <>
                        <td>
                          <textarea
                            className={styles.editTextarea}
                            value={day.lunch}
                            placeholder="점심 메뉴 입력"
                            onChange={(e) => handleChange(idx, 'lunch', e.target.value)}
                          />
                        </td>
                        <td>
                          <textarea
                            className={styles.editTextarea}
                            value={day.dinner}
                            placeholder="석식 메뉴 입력"
                            onChange={(e) => handleChange(idx, 'dinner', e.target.value)}
                          />
                        </td>
                      </>
                    )}
                    <td className={styles.holidayToggle}>
                      <input
                        type="checkbox"
                        checked={day.isHoliday}
                        onChange={() => toggleHoliday(idx)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>취소</button>
          <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 식단표 관리 탭 ── */

export default function MealScheduleSettings() {
  const today = new Date();
  const thisMonday = getMonday(today);
  const nextMonday = addDays(thisMonday, 7);

  const [thisWeekMeals, setThisWeekMeals] = useState<WeekMeals>(emptyWeek);
  const [nextWeekMeals, setNextWeekMeals] = useState<WeekMeals>(emptyWeek);
  const [syncing, setSyncing] = useState(false);

  // 모달 상태: null이면 닫힘
  const [modal, setModal] = useState<{ week: 'this' | 'next'; isEdit: boolean } | null>(null);

  const fetchWeek = useCallback(async (monday: Date, setFn: React.Dispatch<React.SetStateAction<WeekMeals>>) => {
    try {
      const res = await getMealScheduleWeek(toISODate(monday));
      setFn(apiToWeekMeals(res.meals, monday));
    } catch {
      // API 미구현 시 빈 상태 유지
    }
  }, []);

  useEffect(() => {
    fetchWeek(thisMonday, setThisWeekMeals);
    fetchWeek(nextMonday, setNextWeekMeals);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    if (!confirm('식단표를 키오스크에 동기화하시겠습니까?')) return;
    setSyncing(true);
    try {
      await syncMealScheduleToKiosk(toISODate(thisMonday));
      await syncMealScheduleToKiosk(toISODate(nextMonday));
      alert('동기화가 완료되었습니다.');
    } catch (err) {
      alert(err instanceof Error ? err.message : '동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  const handleModalSaved = () => {
    setModal(null);
    fetchWeek(thisMonday, setThisWeekMeals);
    fetchWeek(nextMonday, setNextWeekMeals);
  };

  const getModalMonday = () => (modal?.week === 'next' ? nextMonday : thisMonday);
  const getModalMeals = () => (modal?.week === 'next' ? nextWeekMeals : thisWeekMeals);
  const getModalTitle = () => {
    if (!modal) return '';
    const weekLabel = modal.week === 'this' ? '이번주' : '다음주';
    return modal.isEdit ? `${weekLabel} 식단표 수정` : `${weekLabel} 식단표 등록`;
  };

  const thisWeekEmpty = Object.values(thisWeekMeals).every((d) => !d.lunch && !d.dinner);
  const nextWeekEmpty = Object.values(nextWeekMeals).every((d) => !d.lunch && !d.dinner);

  return (
    <div className={styles.container}>
      <div className={styles.headerButtons}>
        <button type="button" className={styles.syncButton} onClick={handleSync} disabled={syncing}>
          {syncing ? '동기화 중...' : '동기화'}
        </button>
      </div>

      <div className={styles.gridRow}>
        <WeekMealCard
          title="이번주 식단표"
          monday={thisMonday}
          meals={thisWeekMeals}
          onRegister={() => setModal({ week: 'this', isEdit: false })}
          onEdit={() => setModal({ week: 'this', isEdit: true })}
        />
        <WeekMealCard
          title="다음주 식단표"
          monday={nextMonday}
          meals={nextWeekMeals}
          onRegister={() => setModal({ week: 'next', isEdit: false })}
          onEdit={() => setModal({ week: 'next', isEdit: true })}
        />
      </div>

      {modal && (
        <MealScheduleModal
          title={getModalTitle()}
          monday={getModalMonday()}
          initialMeals={getModalMeals()}
          isEdit={modal.isEdit}
          onClose={() => setModal(null)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
