import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getMealMenuWeek,
  saveMealMenu,
  deleteMealMenu,
  type MealMenuDay,
} from '../api/mealScheduleApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import FilterSelect from './FilterSelect';
import useConfirm from '../hooks/useConfirm';
import editIcon from '../assets/edit.png';
import trashIcon from '../assets/trash.png';
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
        result[i] = { id: item.id, lunch: item.lunch, dinner: item.dinner, closed: item.closed };
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
  onDelete: () => void;
}

function WeekMealCard({ title, monday, meals, onRegister, onEdit, onDelete }: WeekMealCardProps) {
  const today = new Date();
  const sunday = addDays(monday, 6);
  const weekRange = `${formatDate(monday)}~${formatDate(sunday)}`;
  const isEmpty = Object.values(meals).every((d) => !d.lunch && !d.dinner);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div className={styles.mealCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {!isEmpty && (
          <div className={styles.cardActions} ref={menuRef}>
            <button type="button" className={styles.kebabBtn} onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                <circle cx="2" cy="2" r="2" />
                <circle cx="2" cy="8" r="2" />
                <circle cx="2" cy="14" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.dropdownMenu}>
                <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onEdit(); }}>
                  <img src={editIcon} alt="" className={styles.dropdownIcon} />
                  수정
                </button>
                <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onDelete(); }}>
                  <img src={trashIcon} alt="" className={styles.dropdownIcon} />
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.weekNav}>
        <span className={styles.weekRange}>{weekRange}</span>
      </div>

      {isEmpty ? (
        <button type="button" className={styles.registerButton} onClick={onRegister}>
          식단표 등록
        </button>
      ) : (
        <table className={styles.mealTable}>
          <thead>
            <tr>
              <th></th>
              <th>중식</th>
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
                    {isToday && <><span className={styles.todayBadge}>TODAY</span><br /></>}
                    <span className={isWeekend ? styles.weekendDay : undefined}>{dateStr}</span>
                  </td>
                  {day?.closed ? (
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
      )}
    </div>
  );
}

/* ── 등록/수정 모달 ── */

interface MealModalProps {
  title: string;
  monday: Date;
  initialMeals: WeekMeals;
  storeId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function MealScheduleModal({ title, monday, initialMeals, storeId, onClose, onSaved }: MealModalProps) {
  const [editMeals, setEditMeals] = useState<WeekMeals>(() => {
    const copy: WeekMeals = {};
    for (let i = 0; i < 7; i++) {
      const m = initialMeals[i];
      copy[i] = { id: m?.id, lunch: m?.lunch ?? '', dinner: m?.dinner ?? '', closed: m?.closed ?? i >= 5 };
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

  const toggleClosed = (dayIdx: number) => {
    setEditMeals((prev) => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], closed: !prev[dayIdx].closed },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weekStartDate = toISODate(monday);
      const days = Array.from({ length: 7 }, (_, i) => ({
        menuDate: toISODate(addDays(monday, i)),
        lunch: editMeals[i].lunch,
        dinner: editMeals[i].dinner,
        closed: editMeals[i].closed,
      }));

      await saveMealMenu({ weekStartDate, days }, storeId);
      onSaved();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
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
                <th>중식</th>
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
                    {day.closed ? (
                      <td colSpan={2} className={styles.holidayCell}>휴무</td>
                    ) : (
                      <>
                        <td>
                          <textarea
                            className={styles.editTextarea}
                            value={day.lunch}
                            placeholder="중식 메뉴 입력"
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
                        checked={day.closed}
                        onChange={() => toggleClosed(idx)}
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
  const { alert, confirm, ConfirmDialog } = useConfirm();
  const today = new Date();
  const thisMonday = getMonday(today);
  const nextMonday = addDays(thisMonday, 7);

  const [thisWeekMeals, setThisWeekMeals] = useState<WeekMeals>(emptyWeek);
  const [nextWeekMeals, setNextWeekMeals] = useState<WeekMeals>(emptyWeek);
  const [myStoreId, setMyStoreId] = useState<number | undefined>(undefined);

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(1);

  // 모달 상태: null이면 닫힘
  const [modal, setModal] = useState<{ week: 'this' | 'next' } | null>(null);

  useEffect(() => {
    getMe().then((me) => {
      setMyStoreId(me.storeId);
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => {
          const activeStores = list.filter((s) => s.active);
          setStores(activeStores);
          if (activeStores.length > 0) {
            setSelectedStoreId(activeStores[0].id);
          }
        });
      }
    }).catch(() => {});
  }, []);

  const currentStoreId = isAdmin ? selectedStoreId : myStoreId;

  const fetchWeek = useCallback(async (monday: Date, setFn: React.Dispatch<React.SetStateAction<WeekMeals>>) => {
    try {
      const res = await getMealMenuWeek(toISODate(monday), currentStoreId);
      setFn(apiToWeekMeals(res.days, monday));
    } catch {
      // API 미구현 시 빈 상태 유지
    }
  }, [currentStoreId]);

  useEffect(() => {
    fetchWeek(thisMonday, setThisWeekMeals);
    fetchWeek(nextMonday, setNextWeekMeals);
  }, [fetchWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (monday: Date) => {
    if (!(await confirm('해당 주 식단을 삭제하시겠습니까?'))) return;
    try {
      await deleteMealMenu(toISODate(monday), currentStoreId);
      fetchWeek(thisMonday, setThisWeekMeals);
      fetchWeek(nextMonday, setNextWeekMeals);
    } catch (err) {
      void alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
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
    const isEmpty = Object.values(getModalMeals()).every((d) => !d.lunch && !d.dinner);
    return isEmpty ? `${weekLabel} 식단표 등록` : `${weekLabel} 식단표 수정`;
  };

  return (
    <div className={styles.container}>
      {isAdmin && (
        <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end' }}>
          <FilterSelect
            value={selectedStoreId && stores.length > 0 ? stores.find((s) => s.id === selectedStoreId)?.storeName || '' : ''}
            options={stores.map((s) => s.storeName)}
            defaultValue={stores.length > 0 ? stores.find((s) => s.id === selectedStoreId)?.storeName : undefined}
            onChange={(v: string) => {
              const store = stores.find((s) => s.storeName === v);
              setSelectedStoreId(store?.id);
            }}
          />
        </div>
      )}
      <div className={styles.gridRow}>
        <WeekMealCard
          title="이번주 식단표"
          monday={thisMonday}
          meals={thisWeekMeals}
          onRegister={() => setModal({ week: 'this' })}
          onEdit={() => setModal({ week: 'this' })}
          onDelete={() => handleDelete(thisMonday)}
        />
        <WeekMealCard
          title="다음주 식단표"
          monday={nextMonday}
          meals={nextWeekMeals}
          onRegister={() => setModal({ week: 'next' })}
          onEdit={() => setModal({ week: 'next' })}
          onDelete={() => handleDelete(nextMonday)}
        />
      </div>

      {modal && (
        <MealScheduleModal
          title={getModalTitle()}
          monday={getModalMonday()}
          initialMeals={getModalMeals()}
          storeId={currentStoreId}
          onClose={() => setModal(null)}
          onSaved={handleModalSaved}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}
