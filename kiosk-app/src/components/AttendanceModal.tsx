import { useAccessibility } from '../contexts/AccessibilityContext';
import { useA11yKeyboard } from '../hooks/useA11yKeyboard';
import { VOICE_A11Y_CANCEL } from '../constants/voiceGuide';
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
  const { speak } = useAccessibility();

  // 배리어프리 키패드 매핑 — 1/2/3 = 액션 선택, × (CANCEL) = 닫기
  useA11yKeyboard({
    speak,
    mapping: {
      '1': () => onSelect(ATTENDANCE_ACTIONS[0].id),
      '2': () => onSelect(ATTENDANCE_ACTIONS[1].id),
      '3': () => onSelect(ATTENDANCE_ACTIONS[2].id),
      CANCEL: onClose,
    },
    echoLabels: {
      '1': `1번, ${ATTENDANCE_ACTIONS[0].label}`,
      '2': `2번, ${ATTENDANCE_ACTIONS[1].label}`,
      '3': `3번, ${ATTENDANCE_ACTIONS[2].label}`,
      CANCEL: VOICE_A11Y_CANCEL,
    },
  });

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
