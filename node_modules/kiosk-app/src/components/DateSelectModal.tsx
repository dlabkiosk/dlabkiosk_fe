import { useState } from 'react';
import styles from './DateSelectModal.module.css';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= lastDate; d++) {
    days.push(d);
  }
  return days;
}

function isDatePast(year: number, month: number, day: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(year, month, day);
  return target < today;
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

interface DateSelectModalProps {
  title: string;
  onClose: () => void;
  onBack: () => void;
  onSubmit: (date: string) => void;
}

export default function DateSelectModal({ title, onClose, onBack, onSubmit }: DateSelectModalProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = getCalendarDays(viewYear, viewMonth);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    if (isDatePast(viewYear, viewMonth, day)) return;
    setSelectedDay(day);
  };

  const handleSubmit = () => {
    if (selectedDay === null) return;
    onSubmit(formatDate(viewYear, viewMonth, selectedDay));
  };

  const isToday = (day: number) => {
    return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>신청 날짜를 선택해주세요</p>

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
          {DAY_LABELS.map((label) => (
            <span key={label} className={styles.dayLabel}>{label}</span>
          ))}
          {days.map((day, idx) => {
            if (day === null) {
              return <span key={`empty-${idx}`} className={styles.emptyCell} />;
            }
            const past = isDatePast(viewYear, viewMonth, day);
            const active = selectedDay === day;
            const today = isToday(day);
            return (
              <button
                key={day}
                type="button"
                className={`${styles.dayCell} ${active ? styles.dayCellActive : ''} ${past ? styles.dayCellPast : ''} ${today && !active ? styles.dayCellToday : ''}`}
                onClick={() => handleDayClick(day)}
                disabled={past}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onBack}>
            취소
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={selectedDay === null}
          >
            신청하기
          </button>
        </div>
      </div>
    </div>
  );
}
