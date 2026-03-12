import { useCallback, useEffect, useRef, useState } from 'react';
import cardImg from '../assets/card.png';
import { MOCK_STUDENTS } from '../data/mockStudents';
import type { Student } from '../data/mockStudents';
import type { CardScanResult } from '../hooks/useCardScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import styles from './CardScanModal.module.css';

const SECURE_CLOSE_TAPS = 5;
const SECURE_CLOSE_TIMEOUT_MS = 3000;
const STUDENT_ID_MAX_LENGTH = 6;
const SUCCESS_DISPLAY_MS = 2000;
const ERROR_DISPLAY_MS = 2000;
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'] as const;

function findStudentByCard(cardNumber: string): Student | undefined {
  return MOCK_STUDENTS.find((s) => s.cardNumber === cardNumber);
}

function findStudentByQr(qrCode: string): Student | undefined {
  return MOCK_STUDENTS.find((s) => s.qrCode === qrCode);
}

function findStudentById(studentId: string): Student | undefined {
  return MOCK_STUDENTS.find((s) => s.studentId === studentId);
}

interface CardScanModalProps {
  title: string;
  scanResult: CardScanResult | null;
  qrResult: QrScanResult | null;
  secureClose?: boolean;
  onClose: () => void;
  onStudentIdSubmit?: (studentId: string) => void;
  onStudentFound?: (student: Student) => void;
}

export default function CardScanModal({ title, scanResult, qrResult, secureClose = false, onClose, onStudentIdSubmit, onStudentFound }: CardScanModalProps) {
  const [closeTapCount, setCloseTapCount] = useState(0);
  const closeTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; action: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedCardRef = useRef<string | null>(null);
  const processedQrRef = useRef<string | null>(null);

  const showError = useCallback(() => {
    setErrorMessage('없는 학생입니다.');
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => {
      setErrorMessage(null);
    }, ERROR_DISPLAY_MS);
  }, []);

  const handleStudentFound = useCallback((student: Student) => {
    if (onStudentFound) {
      onStudentFound(student);
      return;
    }
    setSuccessInfo({ name: student.name, action: title });
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setSuccessInfo(null);
      onClose();
    }, SUCCESS_DISPLAY_MS);
  }, [title, onClose, onStudentFound]);

  // 카드 인식 시 학생 조회
  useEffect(() => {
    if (!scanResult || scanResult.rawValue === processedCardRef.current) return;
    processedCardRef.current = scanResult.rawValue;
    const student = findStudentByCard(scanResult.rawValue);
    if (student) {
      handleStudentFound(student);
    } else {
      showError();
    }
  }, [scanResult, handleStudentFound, showError]);

  // QR 인식 시 학생 조회
  useEffect(() => {
    if (!qrResult || qrResult.rawValue === processedQrRef.current) return;
    processedQrRef.current = qrResult.rawValue;
    const student = findStudentByQr(qrResult.rawValue);
    if (student) {
      handleStudentFound(student);
    } else {
      showError();
    }
  }, [qrResult, handleStudentFound, showError]);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    if (!secureClose) {
      onClose();
      return;
    }

    const next = closeTapCount + 1;
    if (next >= SECURE_CLOSE_TAPS) {
      if (closeTapTimer.current) clearTimeout(closeTapTimer.current);
      setCloseTapCount(0);
      onClose();
      return;
    }

    setCloseTapCount(next);
    if (closeTapTimer.current) clearTimeout(closeTapTimer.current);
    closeTapTimer.current = setTimeout(() => {
      setCloseTapCount(0);
    }, SECURE_CLOSE_TIMEOUT_MS);
  }, [secureClose, closeTapCount, onClose]);

  const handleKeypadPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setStudentId((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '') return;
    setStudentId((prev) => {
      if (prev.length >= STUDENT_ID_MAX_LENGTH) return prev;
      return prev + key;
    });
  }, []);

  const handleStudentIdSubmit = useCallback(() => {
    if (studentId.length === 0) return;
    const student = findStudentById(studentId);
    if (student) {
      handleStudentFound(student);
    } else {
      showError();
    }
    onStudentIdSubmit?.(studentId);
  }, [studentId, handleStudentFound, showError, onStudentIdSubmit]);

  const handleBackToScan = useCallback(() => {
    setShowKeypad(false);
    setStudentId('');
  }, []);

  // 성공 화면
  if (successInfo) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.successSection}>
            <span className={styles.successIcon}>✓</span>
            <p className={styles.successMessage}>
              {successInfo.name} 학생
              <br />
              {successInfo.action} 처리 되었습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={secureClose ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="닫기">
          ✕
        </button>

        <h2 className={styles.title}>{title}</h2>

        {!showKeypad ? (
          <>
            <img src={cardImg} alt="카드 태그" className={styles.cardImage} />

            <p className={styles.guide}>카드를 태그하거나 QR코드를 찍어주세요</p>

            {errorMessage && !showKeypad && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <button
              type="button"
              className={styles.studentIdButton}
              onClick={() => setShowKeypad(true)}
            >
              학번으로 인증하기
            </button>
          </>
        ) : (
          <div className={styles.keypadSection}>
            <div className={styles.studentIdDisplay}>
              <span className={studentId ? styles.studentIdValue : styles.studentIdPlaceholder}>
                {studentId || '학번을 입력하세요'}
              </span>

            </div>

            {errorMessage && showKeypad && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <div className={styles.keypadGrid}>
              {KEYPAD_KEYS.map((key, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.keypadKey} ${key === 'backspace' ? styles.keypadBackspace : ''} ${key === '' ? styles.keypadEmpty : ''}`}
                  onClick={() => handleKeypadPress(key)}
                  disabled={key === ''}
                  aria-label={key === 'backspace' ? '지우기' : key}
                >
                  {key === 'backspace' ? '⌫' : key}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.submitButton}
              onClick={handleStudentIdSubmit}
              disabled={studentId.length === 0}
            >
              입력 완료
            </button>

            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackToScan}
            >
              카드/QR 인증으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
