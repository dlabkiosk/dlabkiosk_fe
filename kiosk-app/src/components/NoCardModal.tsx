import styles from './NoCardModal.module.css';

interface NoCardModalProps {
  onClose: () => void;
  onSelect: (method: 'seatLabel' | 'phoneLast4') => void;
}

export default function NoCardModal({ onClose, onSelect }: NoCardModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>카드 미소지</h2>
        <p className={styles.subtitle}>인증 방법을 선택해주세요</p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.outlineButton}
            onClick={() => onSelect('seatLabel')}
          >
            좌석 번호로 인증
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => onSelect('phoneLast4')}
          >
            휴대폰 뒷자리로 인증
          </button>
        </div>
      </div>
    </div>
  );
}
