import styles from './AttendanceModal.module.css';

interface AttendanceAction {
  id: string;
  label: string;
  icon: string;
}

const ATTENDANCE_ACTIONS: AttendanceAction[] = [
  { id: 'tag', label: '출결 태그', icon: '📋' },
  { id: 'leave-seat', label: '좌석 이탈', icon: 'ℹ️' },
  { id: 'return', label: '좌석 복귀', icon: '🔄' },
];

interface AttendanceModalProps {
  onClose: () => void;
  onSelect: (actionId: string) => void;
}

export default function AttendanceModal({ onClose, onSelect }: AttendanceModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <h2 className={styles.title}>출결 관리</h2>
        <p className={styles.subtitle}>원하는 항목을 선택해주세요</p>
        <div className={styles.grid}>
          {ATTENDANCE_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className={styles.actionButton}
              onClick={() => onSelect(action.id)}
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
