import { useEffect, useState } from 'react';
import { getSeatLeaveReasons } from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import styles from './SeatLeaveReasonModal.module.css';

interface SeatLeaveReasonModalProps {
  onClose: () => void;
  onSelect: (reasonId: number, reasonLabel: string) => void;
}

export default function SeatLeaveReasonModal({ onClose, onSelect }: SeatLeaveReasonModalProps) {
  const [reasons, setReasons] = useState<SeatLeaveReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeatLeaveReasons()
      .then((list) => setReasons(list.filter((r) => r.active).sort((a, b) => a.displayOrder - b.displayOrder)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>좌석 이탈</h2>
        <p className={styles.subtitle}>사유를 선택해주세요</p>

        {loading ? (
          <p className={styles.subtitle}>불러오는 중...</p>
        ) : reasons.length === 0 ? (
          <p className={styles.subtitle}>등록된 사유가 없습니다.</p>
        ) : (
          <div className={styles.grid}>
            {reasons.map((reason) => (
              <button
                key={reason.id}
                type="button"
                className={styles.reasonButton}
                onClick={() => onSelect(reason.id, reason.reasonName)}
              >
                {reason.iconUrl && (
                  <img src={reason.iconUrl} alt={reason.reasonName} className={styles.reasonIcon} />
                )}
                <span className={styles.reasonLabel}>{reason.reasonName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
