import { useEffect, useState } from 'react';
import { getSeatLeaveReasons } from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import styles from './SeatLeaveReasonModal.module.css';

const REASON_ICONS: Record<string, string> = {
  '화장실': '🚻',
  '상담': '💬',
  '질의응답': '❓',
  '자습': '📖',
  '강의실': '🏫',
  '기타': '📋',
};

function getIcon(name: string): string {
  return REASON_ICONS[name] ?? '📋';
}

interface SeatLeaveReasonModalProps {
  onClose: () => void;
  onBack: () => void;
  onSelect: (reasonId: number, reasonLabel: string) => void;
}

export default function SeatLeaveReasonModal({ onClose, onBack, onSelect }: SeatLeaveReasonModalProps) {
  const [reasons, setReasons] = useState<SeatLeaveReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSeatLeaveReasons()
      .then((data) => setReasons(data))
      .catch(() => setReasons([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>좌석 이탈 사유</h2>
        <p className={styles.subtitle}>사유를 선택해주세요</p>

        {loading ? (
          <p className={styles.subtitle}>불러오는 중...</p>
        ) : reasons.length === 0 ? (
          <p className={styles.subtitle}>등록된 이탈 사유가 없습니다.</p>
        ) : (
          <div className={styles.grid}>
            {reasons.map((reason) => (
              <button
                key={reason.id}
                type="button"
                className={styles.reasonButton}
                onClick={() => onSelect(reason.id, reason.reasonName)}
              >
                <span className={styles.reasonIcon}>{getIcon(reason.reasonName)}</span>
                <span className={styles.reasonLabel}>{reason.reasonName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
