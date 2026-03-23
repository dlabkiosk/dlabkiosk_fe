import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitSeatChangeRequest } from '../api/seatChangeApi';
import { getSeatAreas, getSeats } from '../api/seatApi';
import type { SeatArea, SeatInfo } from '../api/seatApi';
import type { Student } from '../data/mockStudents';
import styles from './SeatChangeModal.module.css';

const SUCCESS_DISPLAY_MS = 2000;
const PRIORITY_LABELS = ['1순위', '2순위', '3순위'] as const;
const CELL_W = 48;
const CELL_H = 36;

interface SeatChangeModalProps {
  student: Student;
  onClose: () => void;
}

export default function SeatChangeModal({ student, onClose }: SeatChangeModalProps) {
  const [areas, setAreas] = useState<SeatArea[]>([]);
  const [selectedAreaCd, setSelectedAreaCd] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<(string | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 구역 목록 로드
  useEffect(() => {
    getSeatAreas()
      .then((list) => {
        setAreas(list);
        if (list.length > 0) setSelectedAreaCd(list[0].areaCd);
      })
      .catch(() => setErrorMessage('구역 정보를 불러올 수 없습니다.'));
  }, []);

  // 구역 선택 시 좌석 로드
  useEffect(() => {
    if (!selectedAreaCd) return;
    setLoading(true);
    setErrorMessage(null);
    getSeats(selectedAreaCd)
      .then(setSeats)
      .catch(() => setErrorMessage('좌석 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [selectedAreaCd]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const activeSeats = useMemo(() => seats.filter((s) => s.seatGn === 'Y'), [seats]);

  const canvasSize = useMemo(() => {
    if (activeSeats.length === 0) return { width: 300, height: 200 };
    const maxX = Math.max(...activeSeats.map((s) => s.xPos));
    const maxY = Math.max(...activeSeats.map((s) => s.yPos));
    return {
      width: Math.max(300, maxX * CELL_W + CELL_W + 16),
      height: Math.max(200, maxY * CELL_H + CELL_H + 16),
    };
  }, [activeSeats]);

  const isOccupied = (seat: SeatInfo) => seat.state !== 'B' && seat.state !== 'N';
  const isCurrentSeat = (seatNm: string) => seatNm === student.assignedSeatLabel;

  const handleSeatToggle = useCallback((seatCd: string) => {
    setSelectedSeats((prev) => {
      const idx = prev.indexOf(seatCd);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = null;
        return next;
      }
      const emptyIdx = prev.indexOf(null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = seatCd;
      return next;
    });
    setErrorMessage(null);
  }, []);

  const removeSelection = useCallback((index: number) => {
    setSelectedSeats((prev) => {
      const next = [...prev];
      next[index] = null;
      const compacted: (string | null)[] = next.filter((s) => s !== null);
      while (compacted.length < 3) compacted.push(null);
      return compacted;
    });
  }, []);

  const getSeatLabel = (seatCd: string | null) => {
    if (seatCd === null) return null;
    return seats.find((s) => s.seatCd === seatCd)?.seatNm ?? seatCd;
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || selectedSeats[0] === null) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitSeatChangeRequest({
        identifier: student.identifier ?? student.studentNumber,
        seatLabel: getSeatLabel(selectedSeats[0]) ?? undefined,
        desiredSeatId1: Number(selectedSeats[0]),
        desiredSeatId2: selectedSeats[1] ? Number(selectedSeats[1]) : undefined,
        desiredSeatId3: selectedSeats[2] ? Number(selectedSeats[2]) : undefined,
      });
      setSuccess(true);
      successTimer.current = setTimeout(onClose, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '좌석 변경 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [student, selectedSeats, seats, submitting, onClose]);

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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>좌석 변경</h2>
          <p className={styles.guide}>
            {student.name} (현재: {student.assignedSeatLabel})
          </p>

          {/* 순위 선택 표시 */}
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

          {/* 구역 탭 */}
          {areas.length > 1 && (
            <div className={styles.areaTabs}>
              {areas.map((a) => (
                <button
                  key={a.areaCd}
                  type="button"
                  className={`${styles.areaTab} ${selectedAreaCd === a.areaCd ? styles.areaTabActive : ''}`}
                  onClick={() => setSelectedAreaCd(a.areaCd)}
                >
                  {a.areaNm}
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}

        {/* 좌석 배치도 */}
        <div className={styles.canvasWrap}>
          {loading ? (
            <p className={styles.loadingText}>좌석 배치도 불러오는 중...</p>
          ) : activeSeats.length === 0 ? (
            <p className={styles.loadingText}>등록된 좌석이 없습니다.</p>
          ) : (
            <div
              className={styles.canvas}
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {activeSeats.map((seat) => {
                const current = isCurrentSeat(seat.seatNm);
                const selected = selectedSeats.includes(seat.seatCd);
                const occupied = isOccupied(seat) && !current;
                const selectionIdx = selectedSeats.indexOf(seat.seatCd);

                let cellClass = styles.seatCell;
                if (current) cellClass += ` ${styles.seatCurrent}`;
                else if (selected) cellClass += ` ${styles.seatSelected}`;
                else if (occupied) cellClass += ` ${styles.seatOccupied}`;
                else cellClass += ` ${styles.seatEmpty}`;

                return (
                  <button
                    key={seat.seatCd}
                    type="button"
                    className={cellClass}
                    style={{
                      position: 'absolute',
                      left: seat.xPos * CELL_W,
                      top: seat.yPos * CELL_H,
                    }}
                    onClick={() => !current && handleSeatToggle(seat.seatCd)}
                    disabled={current}
                  >
                    <span className={styles.seatLabel}>{seat.seatNm}</span>
                    {current && <span className={styles.statusBadge}>현재</span>}
                    {selected && selectionIdx !== -1 && (
                      <span className={styles.selectionBadge}>{selectionIdx + 1}순위</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.footer}>
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
    </div>
  );
}
