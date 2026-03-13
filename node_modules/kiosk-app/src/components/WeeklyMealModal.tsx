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

/* ── 목 데이터 (API 연결 전) ── */

function getMockWeekMeals(): WeekMeals {
  return {
    0: {
      lunch: '카츠김치나베\n새콤달달볶음소스\n메추리알조림\n석박지\n동그랑땡',
      dinner: '카타쿠리나베볶음\n삼겹김치비빔밥\n옥·배장조림\n석박지',
      isHoliday: false,
    },
    1: {
      lunch: '킹스시타볶음밥\n갈비찜볶음\n팽이버섯국\n오이무침',
      dinner: '베이컨고르곤졸라\n잡채밥/비빔소스\n닭가슴살\n미역무침',
      isHoliday: false,
    },
    2: {
      lunch: '사태찌개볶음밥\n탕수육\n고추잡채\n머위나물',
      dinner: '사태살나베볶음\n야채비빔밥\n고등어구이\n배추김치',
      isHoliday: false,
    },
    3: {
      lunch: '순대국\n야채김치볶음밥\n춘권/스프링롤\n깻잎무침',
      dinner: '된장나베볶음\n햄김치비빔밥\n달걀후라이\n배추김치',
      isHoliday: false,
    },
    4: {
      lunch: '마제소바\n해물누룽지탕\n교자만두볶음\n오이소박이',
      dinner: '김치나베볶음\n참치마요비빔밥\n돈까스/샐러드',
      isHoliday: false,
    },
    5: { lunch: '', dinner: '', isHoliday: true },
    6: { lunch: '', dinner: '', isHoliday: true },
  };
}

/* ── Props ── */

interface WeeklyMealModalProps {
  onClose: () => void;
}

export default function WeeklyMealModal({ onClose }: WeeklyMealModalProps) {
  const today = new Date();
  const monday = getMonday(today);
  const sunday = addDays(monday, 6);
  const meals = getMockWeekMeals();

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
                    {day?.isHoliday ? (
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
        </div>
      </div>
    </div>
  );
}
