import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitPhoneSubmission } from '../api/phoneSubmissionApi';
import type { SubmissionType } from '../api/phoneSubmissionApi';
import styles from './PhoneSubmissionModal.module.css';

const SUCCESS_DISPLAY_MS = 2000;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekdayLabel(d: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[d.getDay()];
}

/** 오늘 포함 앞으로 14일(평일만) */
function getUpcomingWeekdays(): Date[] {
  const result: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (result.length < 14) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      result.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/** dateStr이 start~end 범위 안에 있는지 (문자열 비교로 충분) */
function isInRange(dateStr: string, start: string | null, end: string | null): boolean {
  if (!start) return false;
  if (!end) return dateStr === start;
  const lo = start <= end ? start : end;
  const hi = start <= end ? end : start;
  return dateStr >= lo && dateStr <= hi;
}

interface PhoneSubmissionModalProps {
  /** 학생 식별자 (rfidUid / 좌석번호 / 전번 뒷자리) */
  identifier: string;
  studentName: string;
  onClose: () => void;
}

export default function PhoneSubmissionModal({ identifier, studentName, onClose }: PhoneSubmissionModalProps) {
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const [startDate, setStartDate] = useState<string | null>(todayStr);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [noPhone, setNoPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekdays = useMemo(() => getUpcomingWeekdays(), []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleDateClick = useCallback((dateStr: string) => {
    if (noPhone) return;
    if (!startDate || (startDate && endDate)) {
      // 첫 클릭 또는 이미 범위 완성 → 시작일 재설정
      setStartDate(dateStr);
      setEndDate(null);
    } else {
      // 시작일만 있는 상태 → 종료일 설정
      if (dateStr === startDate) {
        // 같은 날 다시 클릭 → 단일 날짜
        setEndDate(null);
      } else {
        setEndDate(dateStr);
      }
    }
  }, [noPhone, startDate, endDate]);

  // 정렬된 시작/끝
  const sortedStart = startDate && endDate
    ? (startDate <= endDate ? startDate : endDate)
    : startDate;
  const sortedEnd = startDate && endDate
    ? (startDate <= endDate ? endDate : startDate)
    : null;

  const rangeLabel = sortedStart
    ? sortedEnd
      ? `${sortedStart} ~ ${sortedEnd}`
      : sortedStart
    : '';

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

        <div className={styles.optionSection}>
          <p className={styles.guide}>{studentName} 학생</p>

          {/* 기간 선택 */}
          <div className={styles.dateSection}>
            <p className={styles.optionLabel}>
              {!startDate || endDate !== null
                ? '시작일을 선택하세요'
                : '종료일을 선택하세요'}
            </p>
            {rangeLabel && !noPhone && (
              <p className={styles.rangeLabel}>{rangeLabel}</p>
            )}
            <div className={styles.dateGrid}>
              {weekdays.map((d) => {
                const dateStr = formatDate(d);
                const inRange = isInRange(dateStr, startDate, endDate);
                const isStart = dateStr === startDate;
                const isEnd = dateStr === endDate;
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={[
                      styles.dateButton,
                      inRange && !noPhone ? styles.dateInRange : '',
                      (isStart || isEnd) && !noPhone ? styles.dateEndpoint : '',
                      noPhone ? styles.dateDisabled : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleDateClick(dateStr)}
                  >
                    <span className={styles.dateDay}>{d.getMonth() + 1}/{d.getDate()}</span>
                    <span className={styles.dateDayLabel}>
                      {isToday ? '오늘' : getWeekdayLabel(d)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 휴대폰 없음 옵션 */}
          <button
            type="button"
            className={`${styles.noPhoneButton} ${noPhone ? styles.noPhoneSelected : ''}`}
            onClick={() => setNoPhone(!noPhone)}
          >
            📵 휴대폰 없음 (계속 유지)
          </button>

          {errorMessage && (
            <p className={styles.errorMessage}>{errorMessage}</p>
          )}

          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting || (!noPhone && !startDate)}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
