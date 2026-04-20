import styles from './ExitConfirmModal.module.css';

interface ExitConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ExitConfirmModal({ onCancel, onConfirm }: ExitConfirmModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>키오스크를 종료할까요?</h2>
        <p className={styles.subtitle}>종료하면 다시 실행해야 합니다.</p>

        <div className={styles.buttonGroup}>
          <button type="button" className={styles.outlineButton} onClick={onCancel}>
            취소
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
