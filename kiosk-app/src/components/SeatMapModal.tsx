import { useEffect, useMemo, useState } from 'react';
import { getSeats } from '../api/seatApi';
import type { SeatInfo } from '../api/seatApi';
import styles from './SeatMapModal.module.css';

interface SeatMapModalProps {
  onClose: () => void;
}

/** 좌석에 표시할 상태 라벨 (개인정보 없이) */
type SeatStatus = '학습중' | '외출' | '좌석이탈' | null;

const STATUS_STYLE: Record<string, string> = {
  '학습중': styles.statusStudying,
  '외출': styles.statusOuting,
  '좌석이탈': styles.statusSeatLeave,
};

export default function SeatMapModal({ onClose }: SeatMapModalProps) {
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getSeats()
      .then(setSeats)
      .catch((err) => {
        console.error('좌석 조회 실패:', err);
        setErrorMsg(err instanceof Error ? err.message : '좌석 정보를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSeats = useMemo(() => seats.filter((s) => s.seatLabel), [seats]);

  // 어드민 좌석 그리드 80×60 → 키오스크 64×48 (0.8배)
  const SCALE = 0.8;
  const CELL_W = 64;
  const CELL_H = 48;

  const canvasSize = useMemo(() => {
    if (activeSeats.length === 0) return { width: 400, height: 300 };
    const maxX = Math.max(...activeSeats.map((s) => s.xPos));
    const maxY = Math.max(...activeSeats.map((s) => s.yPos));
    return {
      width: Math.max(400, maxX * SCALE + CELL_W + 16),
      height: Math.max(300, maxY * SCALE + CELL_H + 16),
    };
  }, [activeSeats]);

  /** 좌석 상태 결정 (개인정보 제외, 점유 + 상태만) */
  const getSeatStatus = (seat: SeatInfo): { occupied: boolean; status: SeatStatus } => {
    const occupied = !!seat.studentId;
    if (!occupied) return { occupied: false, status: null };

    if (seat.away) return { occupied: true, status: '좌석이탈' };
    if (seat.outing) return { occupied: true, status: '외출' };
    return { occupied: true, status: '학습중' };
  };

  const occupiedCount = activeSeats.filter((s) => !!s.studentId).length;
  const emptyCount = activeSeats.length - occupiedCount;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>좌석 배치도</h2>
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={`${styles.dot} ${styles.dotStudying}`} />
              학습중 {occupiedCount}
            </span>
            <span className={styles.summaryItem}>
              <span className={`${styles.dot} ${styles.dotEmpty}`} />
              빈좌석 {emptyCount}
            </span>
          </div>
        </div>

        <div className={styles.canvasWrap}>
          {loading ? (
            <p className={styles.loadingText}>좌석 배치도를 불러오는 중...</p>
          ) : errorMsg ? (
            <p className={styles.loadingText}>{errorMsg}</p>
          ) : activeSeats.length === 0 ? (
            <p className={styles.loadingText}>등록된 좌석이 없습니다.</p>
          ) : (
            <div
              className={styles.canvas}
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {activeSeats.map((seat) => {
                const { occupied, status } = getSeatStatus(seat);
                const statusClass = status ? (STATUS_STYLE[status] ?? '') : '';
                return (
                  <div
                    key={seat.seatId}
                    className={`${styles.seatCell} ${occupied ? styles.seatOccupied : styles.seatEmpty}`}
                    style={{
                      position: 'absolute',
                      left: seat.xPos * SCALE,
                      top: seat.yPos * SCALE,
                    }}
                  >
                    <span className={styles.seatLabel}>{seat.seatLabel}</span>
                    {status && (
                      <span className={`${styles.statusBadge} ${statusClass}`}>
                        {status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
