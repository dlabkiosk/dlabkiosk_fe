import { useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/* ── 타입 ── */

interface DayMeal {
  lunch: string;
  dinner: string;
  isHoliday: boolean;
}

type WeekMeals = Record<number, DayMeal>;

/* ── 목 데이터 ── */

function createMockWeek(mondayDate: Date): WeekMeals {
  const today = new Date();
  const monday = getMonday(today);
  const isThisWeek = isSameDay(mondayDate, monday);

  if (!isThisWeek) {
    return Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [i, { lunch: '', dinner: '', isHoliday: i >= 5 }]),
    );
  }

  return {
    0: { lunch: '카츠김치나베\n새콤달달볶음소스\n메추리알조림/뱅어포\n석박지\n동그랑땡/매콤무', dinner: '카타쿠리나베볶음\n삼겹김치비빔밥/무나물\n옥·배장조림\n석박지/매실주스', isHoliday: false },
    1: { lunch: '킹스시타볶음밥\n갈비찜볶음\n팽이버섯국\n오이무침\n명엽채무침', dinner: '원조베이컨고르곤졸라\n잡채밥/비빔소스\n닭가슴살\n미역무침/샐러드', isHoliday: false },
    2: { lunch: '사태찌개볶음밥\n탕수육\n고추잡채\n머위나물\n배추김치', dinner: '사태살나베볶음\n야채비빔밥/잡곡\n고등어구이\n배추김치/샐러드', isHoliday: false },
    3: { lunch: '순대국\n야채김치볶음밥\n춘권/스프링롤\n깻잎무침\n배추김치', dinner: '된장나베볶음\n햄김치비빔밥/잡곡\n달걀후라이\n배추김치/매실주스', isHoliday: false },
    4: { lunch: '마제소바\n해물누룽지탕\n교자만두볶음\n오이소박이\n배추김치', dinner: '김치나베볶음\n참치마요비빔밥\n돈까스/샐러드\n미역줄기무침', isHoliday: false },
    5: { lunch: '', dinner: '', isHoliday: true },
    6: { lunch: '', dinner: '', isHoliday: true },
  };
}

/* ── 주간 식단표 카드 ── */

interface WeekMealCardProps {
  title: string;
  monday: Date;
  meals: WeekMeals;
  showRegister?: boolean;
  editing: boolean;
  editMeals: WeekMeals;
  onEditChange: (dayIdx: number, field: 'lunch' | 'dinner', value: string) => void;
}

function WeekMealCard({ title, monday, meals, showRegister, editing, editMeals, onEditChange }: WeekMealCardProps) {
  const today = new Date();
  const sunday = addDays(monday, 6);
  const weekRange = `${formatDate(monday)}~${formatDate(sunday)}`;
  const data = editing ? editMeals : meals;
  const isEmpty = Object.values(meals).every((d) => !d.lunch && !d.dinner);

  return (
    <div className={styles.mealCard}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.weekNav}>
        <span className={styles.weekRange}>{weekRange}</span>
      </div>

      {isEmpty && !editing && showRegister ? (
        <button type="button" className={styles.registerButton}>
          다음주 식단표 등록
        </button>
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
              const day = data[idx];
              const dateStr = `${dayDate.getMonth() + 1}/${dayDate.getDate()}(${label})`;

              return (
                <tr key={idx}>
                  <td className={styles.dayCell}>
                    {isToday && <span className={styles.todayBadge}>TODAY</span>}
                    <br />
                    <span className={isWeekend ? styles.weekendDay : undefined}>{dateStr}</span>
                  </td>
                  {day?.isHoliday && !editing ? (
                    <td colSpan={2} className={styles.holidayCell}>휴무</td>
                  ) : editing ? (
                    <>
                      <td>
                        <textarea
                          className={styles.editTextarea}
                          value={day?.lunch ?? ''}
                          onChange={(e) => onEditChange(idx, 'lunch', e.target.value)}
                        />
                      </td>
                      <td>
                        <textarea
                          className={styles.editTextarea}
                          value={day?.dinner ?? ''}
                          onChange={(e) => onEditChange(idx, 'dinner', e.target.value)}
                        />
                      </td>
                    </>
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

      <div className={styles.cardFooter}>
        <button type="button" className={styles.cardEditButton}>수정</button>
      </div>
    </div>
  );
}

/* ── 식단표 관리 탭 ── */

export default function MealScheduleSettings() {
  const today = new Date();
  const thisMonday = getMonday(today);
  const nextMonday = addDays(thisMonday, 7);

  const [thisWeekMeals] = useState<WeekMeals>(() => createMockWeek(thisMonday));
  const [nextWeekMeals] = useState<WeekMeals>(() => createMockWeek(nextMonday));

  const [editThisMeals, setEditThisMeals] = useState<WeekMeals>({ ...thisWeekMeals });
  const [editNextMeals, setEditNextMeals] = useState<WeekMeals>({ ...nextWeekMeals });

  const handleEditChange = (
    setFn: React.Dispatch<React.SetStateAction<WeekMeals>>,
  ) => (dayIdx: number, field: 'lunch' | 'dinner', value: string) => {
    setFn((prev) => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [field]: value },
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerButtons}>
        <button type="button" className={styles.editButton}>수정</button>
        <button type="button" className={styles.syncButton}>동기화</button>
      </div>

      <div className={styles.gridRow}>
        <WeekMealCard
          title="이번주 식단표"
          monday={thisMonday}
          meals={thisWeekMeals}
          editing={false}
          editMeals={editThisMeals}
          onEditChange={handleEditChange(setEditThisMeals)}
        />
        <WeekMealCard
          title="다음주 식단표"
          monday={nextMonday}
          meals={nextWeekMeals}
          showRegister
          editing={false}
          editMeals={editNextMeals}
          onEditChange={handleEditChange(setEditNextMeals)}
        />
      </div>
    </div>
  );
}
