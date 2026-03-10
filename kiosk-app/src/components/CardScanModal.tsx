import cardImg from '../assets/card.png';
import type { CardScanResult } from '../hooks/useCardScanner';
import styles from './CardScanModal.module.css';

interface CardScanModalProps {
  title: string;
  scanResult: CardScanResult | null;
  onClose: () => void;
}

export default function CardScanModal({ title, scanResult, onClose }: CardScanModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>{title}</h2>

        <img src={cardImg} alt="카드 태그" className={styles.cardImage} />

        <p className={styles.guide}>카드를 태그해주세요</p>

        {scanResult && (
          <div className={styles.resultArea}>
            <p className={styles.resultValue}>{scanResult.rawValue}</p>
            <p className={styles.resultTime}>
              {scanResult.receivedAt.toLocaleTimeString('ko-KR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
