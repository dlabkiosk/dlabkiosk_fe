import styles from './RemoteApplyModal.module.css';

interface RemoteAction {
  id: string;
  label: string;
  icon: string;
}

const REMOTE_ACTIONS: RemoteAction[] = [
  { id: 'no-phone', label: '휴대폰 미소지', icon: '📵' },
  { id: 'seat-change', label: '좌석 변경', icon: '💺' },
];

interface RemoteApplyModalProps {
  onClose: () => void;
  onSelect: (actionId: string, label: string) => void;
}

export default function RemoteApplyModal({ onClose, onSelect }: RemoteApplyModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2 className={styles.title}>비대면 신청</h2>
        <p className={styles.subtitle}>신청할 항목을 선택해주세요</p>
        <div className={styles.grid}>
          {REMOTE_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className={styles.actionButton}
              onClick={() => onSelect(action.id, action.label)}
            >
              <span className={styles.actionIcon}>{action.icon}</span>
              <span className={styles.actionLabel}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
