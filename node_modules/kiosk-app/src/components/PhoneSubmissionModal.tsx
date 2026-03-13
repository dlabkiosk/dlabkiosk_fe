import { useCallback, useEffect, useRef, useState } from 'react';
import { submitPhoneSubmission } from '../api/phoneSubmissionApi';
import type { PhoneSubmissionResult } from '../api/phoneSubmissionApi';
import styles from './PhoneSubmissionModal.module.css';

const SEAT_LABEL_MAX_LENGTH = 10;
const SUCCESS_DISPLAY_MS = 2000;

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', 'A', '-', '0', 'backspace'] as const;

interface PhoneSubmissionModalProps {
  onClose: () => void;
}

export default function PhoneSubmissionModal({ onClose }: PhoneSubmissionModalProps) {
  const [seatLabel, setSeatLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PhoneSubmissionResult | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleKeypadPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setSeatLabel((prev) => prev.slice(0, -1));
      return;
    }
    setSeatLabel((prev) => {
      if (prev.length >= SEAT_LABEL_MAX_LENGTH) return prev;
      return prev + key;
    });
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (seatLabel.length === 0 || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitPhoneSubmission(seatLabel);
      setSuccessResult(result);
      successTimer.current = setTimeout(() => {
        onClose();
      }, SUCCESS_DISPLAY_MS);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [seatLabel, submitting, onClose]);

  // 성공 화면
  if (successResult) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.successSection}>
            <span className={styles.successIcon}>&#x2713;</span>
            <p className={styles.successMessage}>
              {successResult.studentName} 학생<br />
              휴대폰 미소지 신청 완료
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
          &#x2715;
        </button>

        <h2 className={styles.title}>휴대폰 미소지</h2>

        <div className={styles.keypadSection}>
          <p className={styles.guide}>좌석번호를 입력해주세요</p>

          <div className={styles.seatDisplay}>
            <span className={seatLabel ? styles.seatValue : styles.seatPlaceholder}>
              {seatLabel || '예: A-1'}
            </span>
          </div>

          {errorMessage && (
            <p className={styles.errorMessage}>{errorMessage}</p>
          )}

          <div className={styles.keypadGrid}>
            {KEYPAD_KEYS.map((key, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.keypadKey} ${key === 'backspace' ? styles.keypadBackspace : ''}`}
                onClick={() => handleKeypadPress(key)}
                aria-label={key === 'backspace' ? '지우기' : key}
              >
                {key === 'backspace' ? '⌫' : key}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={seatLabel.length === 0 || submitting}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
