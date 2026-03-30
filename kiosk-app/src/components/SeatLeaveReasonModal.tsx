import { useEffect, useState } from 'react';
import { getSeatLeaveReasons } from '../api/seatLeaveApi';
import type { SeatLeaveReason } from '../api/seatLeaveApi';
import toiletIcon from '../assets/seatleave_toilet.png';
import consultIcon from '../assets/seatleave_consult.png';
import questionIcon from '../assets/seatleave_question.png';
import publicIcon from '../assets/seatleave_public.png';
import lectureIcon from '../assets/seatleave_lectureroom.png';
import seatleaveIcon from '../assets/seatleave.png';
import styles from './SeatLeaveReasonModal.module.css';

const REASON_ICON_MAP: Record<string, string> = {
  화장실: toiletIcon,
  상담: consultIcon,
  질문: questionIcon,
  공용공간: publicIcon,
  강의실: lectureIcon,
};

function getReasonIcon(reasonName: string): string | null {
  if (reasonName.includes('기타')) return null;
  for (const [keyword, icon] of Object.entries(REASON_ICON_MAP)) {
    if (reasonName.includes(keyword)) return icon;
  }
  return seatleaveIcon;
}

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
      .catch((err) => console.error('이탈 사유 조회 실패:', err))
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
                {getReasonIcon(reason.reasonName) && (
                  <img src={getReasonIcon(reason.reasonName)!} alt={reason.reasonName} className={styles.reasonIcon} />
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
