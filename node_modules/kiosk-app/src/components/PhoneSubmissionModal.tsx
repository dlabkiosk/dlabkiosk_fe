import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMyPhoneSubmissions, submitPhoneSubmission } from '../api/phoneSubmissionApi';
import type { SubmissionType, ActiveSubmissionPeriod } from '../api/phoneSubmissionApi';
import styles from './PhoneSubmissionModal.module.css';

const SUCCESS_DISPLAY_MS = 2000;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 해당 월의 캘린더 셀 배열 생성 (앞뒤 빈칸 포함) */
function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = [];

  // 첫째 주 앞 빈칸
  for (let i = 0; i < firstDay.getDay(); i++) {
    cells.push(null);
  }
  // 날짜 채우기
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

/** dateStr이 start~end 범위 안에 있는지 */
function isInRange(dateStr: string, start: string | null, end: string | null): boolean {
  if (!start) return false;
  if (!end) return dateStr === start;
  const lo = start <= end ? start : end;
  const hi = start <= end ? end : start;
  return dateStr >= lo && dateStr <= hi;
}

/** 기존 신청 내역으로부터 이미 신청된 날짜 Set 생성 */
function buildSubmittedDateSet(submissions: ActiveSubmissionPeriod[]): Set<string> {
  const set = new Set<string>();
  for (const s of submissions) {
    if (s.submissionType === 'NO_PHONE') continue;
    const start = s.startDate;
    const end = s.endDate || s.startDate;
    const d = new Date(start);
    const endD = new Date(end);
    while (d <= endD) {
      set.add(formatDate(d));
      d.setDate(d.getDate() + 1);
    }
  }
  return set;
}

interface PhoneSubmissionModalProps {
  identifier: string;
  studentName: string;
  onClose: () => void;
}

export default function PhoneSubmissionModal({ identifier, studentName, onClose }: PhoneSubmissionModalProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = useMemo(() => formatDate(today), [today]);

  // 캘린더 현재 표시 월
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [noPhone, setNoPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 기존 신청 내역
  const [existingSubmissions, setExistingSubmissions] = useState<ActiveSubmissionPeriod[]>([]);
  const [hasNoPhone, setHasNoPhone] = useState(false);

  useEffect(() => {
    getMyPhoneSubmissions(identifier)
      .then((list) => {
        setExistingSubmissions(list);
        setHasNoPhone(list.some((s) => s.submissionType === 'NO_PHONE'));
      })
      .catch(() => {});
  }, [identifier]);

  const submittedDates = useMemo(
    () => buildSubmittedDateSet(existingSubmissions),
    [existingSubmissions],
  );

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const calendarCells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // 이전 월 이동 가능 여부 (현재 월 이전으로는 못 감)
  const canGoPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const handleDateClick = useCallback((dateStr: string) => {
    if (noPhone) return;
    if (submittedDates.has(dateStr)) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate(null);
    } else {
      if (dateStr === startDate) {
        setEndDate(null);
      } else {
        setEndDate(dateStr);
      }
    }
  }, [noPhone, startDate, endDate, submittedDates]);

  // 정렬된 시작/끝
  const sortedStart = startDate && endDate
    ? (startDate <= endDate ? startDate : endDate)
    : startDate;
  const sortedEnd = startDate && endDate
    ? (startDate <= endDate ? endDate : startDate)
    : null;

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!noPhone && !startDate) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const submissionType: SubmissionType = noPhone
        ? 'NO_PHONE'
        : (sortedEnd && sortedEnd !== sortedStart ? 'PERIOD' : 'DAILY');
      await submitPhoneSubmission({
        identifier,
        submissionType,
        startDate: noPhone ? undefined : (sortedStart ?? undefined),
        endDate: noPhone ? undefined : (sortedEnd ?? sortedStart ?? undefined),
      });
      setSuccess(true);
      successTimer.current = setTimeout(() => {
        onClose();
      }, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [identifier, sortedStart, sortedEnd, noPhone, submitting, onClose]);

  // 성공 화면
  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.successSection}>
            <span className={styles.successIcon}>&#x2713;</span>
            <p className={styles.successMessage}>
              {studentName} 학생<br />
              휴대폰 미소지 신청 완료
              {noPhone && <><br /><span className={styles.noPhoneTag}>휴대폰 없음 (계속 유지)</span></>}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <h2 className={styles.title}>휴대폰 미소지</h2>
        <p className={styles.subtitle}>신청 날짜를 선택하세요</p>

        {hasNoPhone ? (
          <div className={styles.noPhoneNotice}>
            <span className={styles.noPhoneNoticeIcon}>📵</span>
            <p className={styles.noPhoneNoticeText}>
              이미 휴대폰 없음을 신청했습니다.<br />
              변경하려면 데스크로 문의하세요.
            </p>
          </div>
        ) : (
          <>
            {/* 월 네비게이션 */}
            <div className={styles.calendarNav}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={goToPrevMonth}
                disabled={!canGoPrev}
              >
                &#x2039;
              </button>
              <span className={styles.navTitle}>
                {viewYear}년 {viewMonth + 1}월
              </span>
              <button
                type="button"
                className={styles.navBtn}
                onClick={goToNextMonth}
              >
                &#x203A;
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className={styles.calendarGrid}>
              {DAY_LABELS.map((label) => (
                <div key={label} className={styles.dayHeader}>{label}</div>
              ))}

              {/* 날짜 셀 */}
              {calendarCells.map((cellDate, idx) => {
                if (!cellDate) {
                  return <div key={`empty-${idx}`} className={styles.dayCell} />;
                }
                const dateStr = formatDate(cellDate);
                const isPast = dateStr < todayStr;
                const isSubmitted = submittedDates.has(dateStr);
                const disabled = isPast || isSubmitted || noPhone;
                const inRange = isInRange(dateStr, startDate, endDate);
                const isEndpoint = dateStr === startDate || dateStr === endDate;
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={disabled}
                    className={[
                      styles.dayCell,
                      styles.dayCellActive,
                      isToday ? styles.dayCellToday : '',
                      inRange && !disabled ? styles.dayCellInRange : '',
                      isEndpoint && !disabled ? styles.dayCellEndpoint : '',
                      isSubmitted ? styles.dayCellSubmitted : '',
                      isPast ? styles.dayCellPast : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleDateClick(dateStr)}
                  >
                    {cellDate.getDate()}
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            {/* 하단 버튼 */}
            <div className={styles.bottomActions}>
              <button
                type="button"
                className={`${styles.noPhoneBtn} ${noPhone ? styles.noPhoneBtnSelected : ''}`}
                onClick={() => setNoPhone(!noPhone)}
              >
                📵 휴대폰 없음
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={submitting || (!noPhone && !startDate)}
              >
                {submitting ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
