import { useState } from 'react';
import { LuChevronUp } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

const COLS = 8;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface MealTabProps {
  studentName: string;
  studentId: string;
}

export default function MealTab({ studentName, studentId }: MealTabProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [sectionOpen, setSectionOpen] = useState(true);

  const year = now.getFullYear();
  const totalDays = getDaysInMonth(year, selectedMonth);

  /* meal state: { day -> { lunch: bool, dinner: bool } } */
  const [meals, setMeals] = useState<Record<number, { lunch: boolean; dinner: boolean }>>(() => {
    const init: Record<number, { lunch: boolean; dinner: boolean }> = {};
    for (let d = 1; d <= 31; d++) {
      init[d] = { lunch: false, dinner: false };
    }
    /* mock: 1일 점심 체크 */
    init[1] = { lunch: true, dinner: false };
    return init;
  });

  const toggleMeal = (day: number, type: 'lunch' | 'dinner') => {
    setMeals((prev) => ({
      ...prev,
      [day]: { ...prev[day], [type]: !prev[day]?.[type] },
    }));
  };

  const toggleAllLunch = () => {
    const allChecked = Array.from({ length: totalDays }, (_, i) => i + 1).every((d) => meals[d]?.lunch);
    setMeals((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= totalDays; d++) {
        next[d] = { ...next[d], lunch: !allChecked };
      }
      return next;
    });
  };

  const toggleAllDinner = () => {
    const allChecked = Array.from({ length: totalDays }, (_, i) => i + 1).every((d) => meals[d]?.dinner);
    setMeals((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= totalDays; d++) {
        next[d] = { ...next[d], dinner: !allChecked };
      }
      return next;
    });
  };

  const toggleAllBoth = () => {
    const allChecked = Array.from({ length: totalDays }, (_, i) => i + 1).every(
      (d) => meals[d]?.lunch && meals[d]?.dinner,
    );
    setMeals((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= totalDays; d++) {
        next[d] = { lunch: !allChecked, dinner: !allChecked };
      }
      return next;
    });
  };

  /* Build rows of 8 columns */
  const dayCells: (number | null)[] = [];
  for (let d = 1; d <= totalDays; d++) {
    dayCells.push(d);
  }
  /* Fill remaining cells in last row */
  const remainder = dayCells.length % COLS;
  const emptySlots = remainder === 0 ? 0 : COLS - remainder - 1; /* -1 for bulk cell */
  for (let i = 0; i < emptySlots; i++) {
    dayCells.push(null);
  }

  const rows: (number | null | 'bulk')[][] = [];
  for (let i = 0; i < dayCells.length; i += COLS) {
    rows.push(dayCells.slice(i, i + COLS));
  }
  /* Add bulk select cell to last row */
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    if (lastRow.length < COLS) {
      lastRow.push('bulk');
    } else {
      rows.push([null, null, null, null, null, null, null, 'bulk']);
    }
  }

  const allLunchChecked = Array.from({ length: totalDays }, (_, i) => i + 1).every((d) => meals[d]?.lunch);
  const allDinnerChecked = Array.from({ length: totalDays }, (_, i) => i + 1).every((d) => meals[d]?.dinner);
  const allBothChecked = allLunchChecked && allDinnerChecked;

  return (
    <>
      {/* Section Header */}
      <div className={styles.sectionHeader} onClick={() => setSectionOpen((v) => !v)}>
        <div className={styles.sectionTitleGroup}>
          <span className={styles.sectionTitle}>급식신청</span>
          <span className={styles.sectionSubtitle}>급식신청 기간관리</span>
        </div>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.mealContent}>
          {/* Top actions */}
          <div className={styles.mealTopBar}>
            <div />
            <div className={styles.mealActions}>
              <button className={styles.mealSecondaryBtn} type="button">급식신청 신청관리 돌아가기</button>
              <button className={styles.mealPrimaryBtn} type="button">저장</button>
            </div>
          </div>

          {/* Student info + month select */}
          <div className={styles.mealInfoRow}>
            <span className={styles.mealInfoLabel}>학생정보</span>
            <span className={styles.mealInfoValue}>
              {year} 독학재수 인문 8반 {studentName} ({studentId})
            </span>
          </div>
          <div className={styles.mealInfoRow}>
            <span className={styles.mealInfoLabel}>월 선택</span>
            <select
              className={styles.mealMonthSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* Calendar section */}
          <div className={styles.mealCalendarSection}>
            <h4 className={styles.mealCalendarTitle}>급식 신청일 설정</h4>
            <p className={styles.mealCalendarNotice}>
              * 급식 신청하는 경우, 해당하는 일자에 점심 또는 저녁에 체크해주세요.
            </p>

            <div className={styles.mealGrid}>
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.mealRow}>
                  {row.map((cell, colIdx) => {
                    if (cell === 'bulk') {
                      return (
                        <div key={colIdx} className={styles.mealCell}>
                          <span className={styles.mealDayLabel}>전체</span>
                          <div className={styles.mealCheckGroup}>
                            <label className={styles.mealCheckLabel}>
                              <input
                                type="checkbox"
                                checked={allBothChecked}
                                onChange={toggleAllBoth}
                              />
                            </label>
                            <label className={styles.mealCheckLabel}>
                              점심
                              <input
                                type="checkbox"
                                checked={allLunchChecked}
                                onChange={toggleAllLunch}
                              />
                            </label>
                            <label className={styles.mealCheckLabel}>
                              저녁
                              <input
                                type="checkbox"
                                checked={allDinnerChecked}
                                onChange={toggleAllDinner}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    }
                    if (cell === null) {
                      return <div key={colIdx} className={styles.mealCellEmpty} />;
                    }
                    const day = cell;
                    return (
                      <div key={colIdx} className={styles.mealCell}>
                        <span className={styles.mealDayLabel}>{day}일</span>
                        <div className={styles.mealCheckGroup}>
                          <label className={styles.mealCheckLabel}>
                            <input
                              type="checkbox"
                              checked={meals[day]?.lunch ?? false}
                              onChange={() => toggleMeal(day, 'lunch')}
                            />
                            점심
                          </label>
                          <label className={styles.mealCheckLabel}>
                            <input
                              type="checkbox"
                              checked={meals[day]?.dinner ?? false}
                              onChange={() => toggleMeal(day, 'dinner')}
                            />
                            저녁
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
