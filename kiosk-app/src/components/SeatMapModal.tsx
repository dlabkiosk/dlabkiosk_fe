import { useEffect, useMemo, useState } from 'react';
import { getSeatAreas, getSeats } from '../api/seatApi';
import type { SeatArea, SeatInfo } from '../api/seatApi';
import styles from './SeatMapModal.module.css';

interface SeatMapModalProps {
  onClose: () => void;
}

export default function SeatMapModal({ onClose }: SeatMapModalProps) {
  const [areas, setAreas] = useState<SeatArea[]>([]);
  const [selectedAreaCd, setSelectedAreaCd] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── 구역 목록 로드 ── */
  useEffect(() => {
    getSeatAreas()
      .then((list) => {
        setAreas(list);
        if (list.length > 0) setSelectedAreaCd(list[0].areaCd);
      })
      .catch((err) => {
        console.error('구역 조회 실패:', err);
        setErrorMsg('구역 정보를 불러올 수 없습니다.');
        setLoading(false);
      });
  }, []);

  /* ── 구역 선택 시 좌석 로드 ── */
  useEffect(() => {
    if (!selectedAreaCd) return;
    setLoading(true);
    setErrorMsg(null);
    getSeats(selectedAreaCd)
      .then(setSeats)
      .catch((err) => {
        console.error('좌석 조회 실패:', err);
        setErrorMsg(err instanceof Error ? err.message : '좌석 정보를 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [selectedAreaCd]);

  /** 사용 좌석만 표시 (통로·미사용 제외) */
  const activeSeats = useMemo(() => seats.filter((s) => s.seatGn === 'Y'), [seats]);

  const CELL_W = 56;
  const CELL_H = 38;

  const canvasSize = useMemo(() => {
    if (activeSeats.length === 0) return { width: 400, height: 300 };
    const maxX = Math.max(...activeSeats.map((s) => s.xPos));
    const maxY = Math.max(...activeSeats.map((s) => s.yPos));
    return {
      width: Math.max(400, maxX * CELL_W + CELL_W + 16),
      height: Math.max(300, maxY * CELL_H + CELL_H + 16),
    };
  }, [activeSeats]);

  /** 좌석 점유 여부: 공석(B)·미출석(N)이면 비어있음 */
  const isOccupied = (seat: SeatInfo) => seat.state !== 'B' && seat.state !== 'N';

  const occupiedCount = activeSeats.filter(isOccupied).length;
  const emptyCount = activeSeats.length - occupiedCount;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>좌석 배치도</h2>
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
          <div className={styles.summary}>
            <span className={styles.summaryItem}>
              <span className={`${styles.dot} ${styles.dotStudying}`} />
              사용중 {occupiedCount}
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
                const occupied = isOccupied(seat);
                return (
                  <div
                    key={seat.seatCd}
                    className={`${styles.seatCell} ${occupied ? styles.seatOccupied : styles.seatEmpty}`}
                    style={{
                      position: 'absolute',
                      left: seat.xPos * CELL_W,
                      top: seat.yPos * CELL_H,
                    }}
                  >
                    <span className={styles.seatLabel}>{seat.seatNm}</span>
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
