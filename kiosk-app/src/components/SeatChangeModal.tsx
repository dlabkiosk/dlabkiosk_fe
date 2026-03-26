import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSeatAreas, getSeats } from '../api/seatApi';
import type { SeatArea, SeatInfo } from '../api/seatApi';
import { submitSeatChangeRequest, getAvailableSeats, getMySeatChangeRequest, cancelSeatChangeRequest } from '../api/seatChangeApi';
import type { AvailableSeat, MySeatChangeRequest } from '../api/seatChangeApi';
import type { Student } from '../data/mockStudents';
import styles from './SeatChangeModal.module.css';

const SUCCESS_DISPLAY_MS = 2000;
const PRIORITY_LABELS = ['1순위', '2순위', '3순위'] as const;
const CELL_W = 25;
const CELL_H = 18;

interface SeatSelection {
  seatId: number;
  seatLabel: string;
}

type Selections = [SeatSelection | null, SeatSelection | null, SeatSelection | null];

const EMPTY_SELECTIONS: Selections = [null, null, null];

interface SeatChangeModalProps {
  student: Student;
  inputMethod?: string;
  onClose: () => void;
}

export default function SeatChangeModal({ student, inputMethod, onClose }: SeatChangeModalProps) {
  const [areas, setAreas] = useState<SeatArea[]>([]);
  const [selectedAreaCd, setSelectedAreaCd] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailableSeat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  // 선택 좌석 (seatId + seatLabel 한 쌍으로 관리)
  const [selections, setSelections] = useState<Selections>(EMPTY_SELECTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 기존 신청 내역
  const [existingRequest, setExistingRequest] = useState<MySeatChangeRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // 초기 로드
  useEffect(() => {
    const identifier = student.identifier ?? student.studentNumber;
    Promise.all([
      getMySeatChangeRequest(identifier, inputMethod),
      getSeatAreas(),
      getAvailableSeats(),
    ])
      .then(([myRequest, areaList, available]) => {
        setExistingRequest(myRequest);
        setAreas(areaList);
        if (areaList.length > 0) setSelectedAreaCd(areaList[0].areaCd);
        const map = new Map<string, AvailableSeat>();
        for (const seat of available) map.set(seat.seatLabel, seat);
        setAvailabilityMap(map);
      })
      .catch(() => setErrorMessage('좌석 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [student, inputMethod]);

  // 구역 선택 시 좌석 로드
  useEffect(() => {
    if (!selectedAreaCd) return;
    setSeatsLoading(true);
    getSeats(selectedAreaCd)
      .then(setSeats)
      .catch(() => setErrorMessage('좌석 정보를 불러올 수 없습니다.'))
      .finally(() => setSeatsLoading(false));
  }, [selectedAreaCd]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const activeSeats = useMemo(
    () => seats.filter((s) => s.seatGn === 'Y'),
    [seats],
  );

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

  /** 선택된 seatId 목록 (빠른 조회용) */
  const selectedSeatIds = useMemo(
    () => selections.map((s) => s?.seatId ?? null),
    [selections],
  );

  /** compact: null을 뒤로 밀어서 순위를 앞으로 당김 */
  const compact = (arr: Selections): Selections => {
    const filled = arr.filter((s): s is SeatSelection => s !== null);
    return [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null];
  };

  const handleSeatToggle = useCallback((seatId: number, seatLabel: string) => {
    setSelections((prev) => {
      const idx = prev.findIndex((s) => s?.seatId === seatId);
      if (idx !== -1) {
        // 해제 → compact
        const next: Selections = [...prev];
        next[idx] = null;
        return compact(next);
      }
      // 추가
      const emptyIdx = prev.indexOf(null);
      if (emptyIdx === -1) return prev;
      const next: Selections = [...prev];
      next[emptyIdx] = { seatId, seatLabel };
      return next;
    });
    setErrorMessage(null);
  }, []);

  const removeSelection = useCallback((index: number) => {
    setSelections((prev) => {
      const next: Selections = [...prev];
      next[index] = null;
      return compact(next);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || !selections[0]) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitSeatChangeRequest({
        identifier: student.identifier ?? student.studentNumber,
        inputMethod,
        desiredSeatId1: selections[0].seatId,
        desiredSeatId2: selections[1]?.seatId,
        desiredSeatId3: selections[2]?.seatId,
      });
      setSuccess(true);
      successTimer.current = setTimeout(onClose, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '좌석 변경 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [student, selections, inputMethod, submitting, onClose]);

  // 기존 신청 취소
  const handleCancel = useCallback(async () => {
    if (!existingRequest || cancelling) return;
    setCancelling(true);
    setErrorMessage(null);
    try {
      await cancelSeatChangeRequest(existingRequest.id, {
        identifier: student.identifier ?? student.studentNumber,
        inputMethod,
      });
      setCancelSuccess(true);
      successTimer.current = setTimeout(onClose, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '신청 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  }, [existingRequest, cancelling, student, inputMethod]);

  // 성공 화면
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

  // 기존 PENDING 신청이 있는 경우
  if (existingRequest && existingRequest.status === 'PENDING') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            &#x2715;
          </button>

          {!cancelSuccess && (
            <div className={styles.header}>
              <h2 className={styles.title}>좌석 변경 신청 내역</h2>
              <p className={styles.guide}>
                {existingRequest.studentName} (현재: {existingRequest.currentSeatLabel})
              </p>
            </div>
          )}

          <div className={styles.existingBody}>
            {cancelSuccess ? (
              <div className={styles.successSection}>
                <span className={styles.successIcon}>&#x2713;</span>
                <p className={styles.successMessage}>신청이 취소되었습니다</p>
              </div>
            ) : (
              <>
                <div className={styles.existingInfo}>
                  <div className={styles.existingRow}>
                    <span className={styles.existingLabel}>1순위</span>
                    <span className={styles.existingValue}>{existingRequest.desiredSeat1Label}</span>
                  </div>
                  {existingRequest.desiredSeat2Label && (
                    <div className={styles.existingRow}>
                      <span className={styles.existingLabel}>2순위</span>
                      <span className={styles.existingValue}>{existingRequest.desiredSeat2Label}</span>
                    </div>
                  )}
                  {existingRequest.desiredSeat3Label && (
                    <div className={styles.existingRow}>
                      <span className={styles.existingLabel}>3순위</span>
                      <span className={styles.existingValue}>{existingRequest.desiredSeat3Label}</span>
                    </div>
                  )}
                  <div className={styles.existingRow}>
                    <span className={styles.existingLabel}>상태</span>
                    <span className={styles.existingStatusBadge}>대기중</span>
                  </div>
                  <div className={styles.existingRow}>
                    <span className={styles.existingLabel}>신청일시</span>
                    <span className={styles.existingValue}>
                      {new Date(existingRequest.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <p className={styles.errorMessage}>{errorMessage}</p>
                )}

                <div className={styles.existingFooter}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? '취소 중...' : '신청 취소'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isLoading = loading || seatsLoading;

  // 신규 신청 화면
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

          <div className={styles.prioritySection}>
            {PRIORITY_LABELS.map((label, idx) => {
              const sel = selections[idx];
              return (
                <div key={label} className={`${styles.prioritySlot} ${sel ? styles.priorityFilled : ''}`}>
                  <span className={styles.priorityLabel}>{label}{idx === 0 ? ' (필수)' : ''}</span>
                  {sel ? (
                    <button
                      type="button"
                      className={styles.priorityValue}
                      onClick={() => removeSelection(idx)}
                    >
                      {sel.seatLabel} ✕
                    </button>
                  ) : (
                    <span className={styles.priorityEmpty}>좌석 선택</span>
                  )}
                </div>
              );
            })}
          </div>

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

        <div className={styles.canvasWrap}>
          {isLoading ? (
            <p className={styles.loadingText}>좌석 배치도 불러오는 중...</p>
          ) : activeSeats.length === 0 ? (
            <p className={styles.loadingText}>등록된 좌석이 없습니다.</p>
          ) : (
            <div
              className={styles.canvas}
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {activeSeats.map((seat: SeatInfo) => {
                const current = isCurrentSeat(seat.seatNm);
                const availability = availabilityMap.get(seat.seatNm);
                const seatId = availability?.seatId;
                const selected = seatId != null && selectedSeatIds.includes(seatId);
                const selectionIdx = seatId != null ? selectedSeatIds.indexOf(seatId) : -1;
                const occupied = isOccupied(seat);

                let cellClass = styles.seatCell;
                if (current) cellClass += ` ${styles.seatCurrent}`;
                else if (selected) cellClass += ` ${styles.seatSelected}`;
                else if (occupied) cellClass += ` ${styles.seatOccupied}`;
                else cellClass += ` ${styles.seatEmpty}`;

                const canSelect = !current && seatId != null && availability?.available;

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
                    onClick={() => canSelect && handleSeatToggle(seatId, seat.seatNm)}
                    disabled={!canSelect && !selected}
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
            disabled={submitting || !selections[0]}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
