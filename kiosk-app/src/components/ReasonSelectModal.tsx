import styles from './ReasonSelectModal.module.css';

interface Reason {
  id: string;
  label: string;
  icon: string;
}

const REASONS: Reason[] = [
  { id: 'hospital', label: '병원', icon: '🏥' },
  { id: 'personal', label: '개인 일정', icon: '📅' },
  { id: 'exam', label: '시험 응시', icon: '📝' },
  { id: 'interview', label: '면접', icon: '🗣️' },
  { id: 'counseling', label: '상담', icon: '💬' },
  { id: 'etc', label: '기타', icon: '📋' },
];

interface ReasonSelectModalProps {
  title: string;
  onClose: () => void;
  onBack: () => void;
  onSelect: (reasonId: string, reasonLabel: string) => void;
}

export default function ReasonSelectModal({ title, onClose, onBack, onSelect }: ReasonSelectModalProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>신청 사유를 선택해주세요</p>

        <div className={styles.grid}>
          {REASONS.map((reason) => (
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
