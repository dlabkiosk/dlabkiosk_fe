import styles from './SeatLeaveReasonModal.module.css';

interface SeatLeaveReason {
  id: string;
  label: string;
  icon: string;
}

const SEAT_LEAVE_REASONS: SeatLeaveReason[] = [
  { id: 'restroom', label: '화장실', icon: '🚻' },
  { id: 'counseling', label: '상담', icon: '💬' },
  { id: 'qna', label: '질의응답', icon: '❓' },
  { id: 'self-study', label: '자습', icon: '📖' },
  { id: 'classroom', label: '강의실', icon: '🏫' },
  { id: 'etc', label: '기타', icon: '📋' },
];

interface SeatLeaveReasonModalProps {
  onClose: () => void;
  onBack: () => void;
  onSelect: (reasonId: string, reasonLabel: string) => void;
}

export default function SeatLeaveReasonModal({ onClose, onBack, onSelect }: SeatLeaveReasonModalProps) {
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
        <p className={styles.subtitle}>신청 사유를 선택 후 카드를 태그해주세요</p>

        <div className={styles.grid}>
          {SEAT_LEAVE_REASONS.map((reason) => (
            <button
              key={reason.id}
              type="button"
              className={styles.reasonButton}
              onClick={() => onSelect(reason.id, reason.label)}
            >
              <span className={styles.reasonIcon}>{reason.icon}</span>
              <span className={styles.reasonLabel}>{reason.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
