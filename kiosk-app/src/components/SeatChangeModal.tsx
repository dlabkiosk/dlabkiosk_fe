import { useCallback, useEffect, useRef, useState } from 'react';
import { getAvailableSeats, submitSeatChangeRequest } from '../api/seatChangeApi';
import type { AvailableSeat } from '../api/seatChangeApi';
import type { Student } from '../data/mockStudents';
import styles from './SeatChangeModal.module.css';

const SUCCESS_DISPLAY_MS = 2000;
const PRIORITY_LABELS = ['1순위', '2순위', '3순위'] as const;

interface SeatChangeModalProps {
  student: Student;
  onClose: () => void;
}

export default function SeatChangeModal({ student, onClose }: SeatChangeModalProps) {
  const [seats, setSeats] = useState<AvailableSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<(number | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getAvailableSeats()
      .then((data) => setSeats(data))
      .catch(() => setErrorMessage('좌석 목록을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleSeatToggle = useCallback((seatId: number) => {
    setSelectedSeats((prev) => {
      // 이미 선택된 좌석이면 제거
      const idx = prev.indexOf(seatId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = null;
        return next;
      }
      // 빈 슬롯에 추가
      const emptyIdx = prev.indexOf(null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = seatId;
      return next;
    });
    setErrorMessage(null);
  }, []);

  const removeSelection = useCallback((index: number) => {
    setSelectedSeats((prev) => {
      const next = [...prev];
      next[index] = null;
      // 앞으로 당기기: [A, null, B] → [A, B, null]
      const compacted = next.filter((s) => s !== null);
      while (compacted.length < 3) compacted.push(null);
      return compacted;
    });
  }, []);

  const getSeatLabel = (seatId: number | null) => {
    if (seatId === null) return null;
    return seats.find((s) => s.seatId === seatId)?.seatLabel ?? '';
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (selectedSeats[0] === null) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitSeatChangeRequest({
        identifier: student.identifier ?? student.studentNumber,
        desiredSeatId1: selectedSeats[0],
        desiredSeatId2: selectedSeats[1] ?? undefined,
        desiredSeatId3: selectedSeats[2] ?? undefined,
      });
      setSuccess(true);
      successTimer.current = setTimeout(() => {
        onClose();
      }, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '좌석 변경 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [student.studentNumber, selectedSeats, submitting, onClose]);

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.successSection}>
            <span className={styles.successIcon}>&#x2713;</span>
            <p className={styles.successMessage}>
              {student.name} 학생<br />
              좌석 변경 신청 완료
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isSelected = (seatId: number) => selectedSeats.includes(seatId);
  const isCurrentSeat = (seatLabel: string) => seatLabel === student.assignedSeatLabel;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <h2 className={styles.title}>좌석 변경</h2>
        <p className={styles.guide}>
          {student.name} 학생 (현재: {student.assignedSeatLabel})
        </p>

        {/* 선택된 순위 표시 */}
        <div className={styles.prioritySection}>
          {PRIORITY_LABELS.map((label, idx) => {
            const seatLabel = getSeatLabel(selectedSeats[idx]);
            return (
              <div key={label} className={`${styles.prioritySlot} ${seatLabel ? styles.priorityFilled : ''}`}>
                <span className={styles.priorityLabel}>{label}{idx === 0 ? ' (필수)' : ''}</span>
                {seatLabel ? (
                  <button
                    type="button"
                    className={styles.priorityValue}
                    onClick={() => removeSelection(idx)}
                  >
                    {seatLabel} ✕
                  </button>
                ) : (
                  <span className={styles.priorityEmpty}>좌석 선택</span>
                )}
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}

        {/* 좌석 그리드 */}
        {loading ? (
          <p className={styles.loadingText}>좌석 목록 불러오는 중...</p>
        ) : (
          <div className={styles.seatGrid}>
            {seats.map((seat) => {
              const current = isCurrentSeat(seat.seatLabel);
              const selected = isSelected(seat.seatId);
              const disabled = current || (!seat.available && !selected);
              return (
                <button
                  key={seat.seatId}
                  type="button"
                  className={`${styles.seatButton} ${selected ? styles.seatSelected : ''} ${current ? styles.seatCurrent : ''} ${disabled && !current ? styles.seatUnavailable : ''}`}
                  onClick={() => !disabled && handleSeatToggle(seat.seatId)}
                  disabled={disabled}
                >
                  {seat.seatLabel}
                  {current && <span className={styles.currentBadge}>현재</span>}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={submitting || selectedSeats[0] === null}
        >
          {submitting ? '신청 중...' : '신청하기'}
        </button>
      </div>
    </div>
  );
}
