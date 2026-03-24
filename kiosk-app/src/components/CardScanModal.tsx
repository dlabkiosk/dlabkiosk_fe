import { useCallback, useEffect, useRef, useState } from 'react';
import cardAndQrImg from '../assets/card_and_qr.jpg';
import { searchStudent, getStudentBySeat, getStudentByPhone } from '../api/studentApi';
import { getStudentMessages } from '../api/studentMessageApi';
import type { StudentMessage } from '../api/studentMessageApi';
import type { Student } from '../data/mockStudents';
import type { CardScanResult } from '../hooks/useCardScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import styles from './CardScanModal.module.css';

const SECURE_CLOSE_TAPS = 5;
const SECURE_CLOSE_TIMEOUT_MS = 3000;
const SEAT_LABEL_MAX_LENGTH = 10;
const PHONE_DIGITS_LENGTH = 4;
const SUCCESS_DISPLAY_MS = 2000;
const SUCCESS_WITH_MSG_DISPLAY_MS = 5000;
const ERROR_DISPLAY_MS = 2000;
const SEAT_KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'] as const;
const PHONE_KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'] as const;

type KeypadMode = 'seatLabel' | 'phoneLast4';

export interface ScanActionParams {
  identifier?: string;
  seatLabel?: string;
  phoneLast4?: string;
}

export interface PendingActionItem {
  action: string;
  message: string;
  regCd: string;
}

export interface ScanActionResult {
  name: string;
  studentId?: number;
  message?: string;
  pendingActions?: PendingActionItem[];
  identifier?: string;
}

interface CardScanModalProps {
  title: string;
  scanResult: CardScanResult | null;
  qrResult: QrScanResult | null;
  secureClose?: boolean;
  /** true이면 카드/QR 스캔 화면 없이 좌석번호/전번 선택지로 바로 진입 */
  keypadOnly?: boolean;
  /** keypadOnly 시 초기 키패드 모드 지정 */
  defaultKeypadMode?: KeypadMode;
  onClose: () => void;
  onStudentFound?: (student: Student) => void;
  onAction?: (params: ScanActionParams) => Promise<ScanActionResult>;
  onPendingConfirm?: (identifier: string, action: string) => Promise<ScanActionResult>;
}

export default function CardScanModal({ title, scanResult, qrResult, secureClose = false, keypadOnly = false, defaultKeypadMode, onClose, onStudentFound, onAction, onPendingConfirm }: CardScanModalProps) {
  const [closeTapCount, setCloseTapCount] = useState(0);
  const closeTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keypadMode, setKeypadMode] = useState<KeypadMode | null>(defaultKeypadMode ?? null);
  const [inputValue, setInputValue] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; action: string } | null>(null);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingActionItem[]>([]);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedCardRef = useRef<string | null>(null);
  const processedQrRef = useRef<string | null>(null);

  const showError = useCallback((msg = '없는 학생입니다.') => {
    setErrorMessage(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => {
      setErrorMessage(null);
    }, ERROR_DISPLAY_MS);
  }, []);

  const startSuccessTimer = useCallback((ms: number) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setSuccessInfo(null);
      setStudentMessages([]);
      onClose();
    }, ms);
  }, [onClose]);

  const showSuccess = useCallback((name: string, message?: string, studentId?: number, resultPendingActions?: PendingActionItem[], identifier?: string) => {
    setSearching(false);
    setSuccessInfo({ name, action: message || '출결 처리 되었습니다.' });
    setStudentMessages([]);

    // pendingActions가 있으면 자동 닫기 안 함 (사용자 확인 필요)
    if (resultPendingActions && resultPendingActions.length > 0 && identifier) {
      setPendingActions(resultPendingActions);
      setPendingIdentifier(identifier);
      // 타이머 없음 — 사용자가 확인하거나 닫아야 함
    } else {
      setPendingActions([]);
      setPendingIdentifier(null);
      startSuccessTimer(SUCCESS_DISPLAY_MS);
    }

    // 학생 메시지 조회 — 메시지가 있으면 타이머를 연장
    if (studentId) {
      getStudentMessages(studentId)
        .then((msgs) => {
          if (msgs.length > 0) {
            setStudentMessages(msgs);
            if (!resultPendingActions || resultPendingActions.length === 0) {
              startSuccessTimer(SUCCESS_WITH_MSG_DISPLAY_MS);
            }
          }
        })
        .catch(() => { /* 메시지 조회 실패는 무시 */ });
    }
  }, [startSuccessTimer]);

  const handleStudentFound = useCallback((student: Student) => {
    setSearching(false);
    if (onStudentFound) {
      onStudentFound(student);
      return;
    }
    showSuccess(student.name, undefined, student.id);
  }, [onStudentFound, showSuccess]);

  const toStudent = (data: { id: number; name: string; studentNumber: string; assignedSeatLabel: string }, identifier: string): Student => ({
    id: data.id,
    name: data.name,
    studentNumber: data.studentNumber,
    assignedSeatLabel: data.assignedSeatLabel,
    identifier,
  });

  // 카드/QR 인식 → identifier로 조회
  const handleIdentifier = useCallback((identifier: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ identifier })
        .then((result) => showSuccess(result.name, result.message, result.studentId, result.pendingActions, result.identifier ?? identifier))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      searchStudent({ identifier })
        .then((data) => handleStudentFound(toStudent(data, identifier)))
        .catch(() => { setSearching(false); showError(); });
    }
  }, [onAction, handleStudentFound, showSuccess, showError]);

  // 좌석번호로 조회
  const handleSeatLabel = useCallback((seatLabel: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ seatLabel })
        .then((result) => showSuccess(result.name, result.message, result.studentId, result.pendingActions, result.identifier))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      getStudentBySeat(seatLabel)
        .then((data) => handleStudentFound(toStudent(data, seatLabel)))
        .catch(() => { setSearching(false); showError('해당 좌석에 배정된 학생이 없습니다.'); });
    }
  }, [onAction, handleStudentFound, showSuccess, showError]);

  // 전번 뒷자리로 조회
  const handlePhoneLast4 = useCallback((phoneLast4: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ phoneLast4 })
        .then((result) => showSuccess(result.name, result.message, result.studentId, result.pendingActions, result.identifier))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      getStudentByPhone(phoneLast4)
        .then((data) => handleStudentFound(toStudent(data, phoneLast4)))
        .catch(() => { setSearching(false); showError('일치하는 학생이 없습니다.'); });
    }
  }, [onAction, handleStudentFound, showSuccess, showError]);

  // 카드 인식
  useEffect(() => {
    if (!scanResult || scanResult.rawValue === processedCardRef.current) return;
    processedCardRef.current = scanResult.rawValue;
    handleIdentifier(scanResult.rawValue);
  }, [scanResult, handleIdentifier]);

  // QR 인식
  useEffect(() => {
    if (!qrResult || qrResult.rawValue === processedQrRef.current) return;
    processedQrRef.current = qrResult.rawValue;
    handleIdentifier(qrResult.rawValue);
  }, [qrResult, handleIdentifier]);

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

  const maxLength = keypadMode === 'seatLabel' ? SEAT_LABEL_MAX_LENGTH : PHONE_DIGITS_LENGTH;
  const keypadKeys = keypadMode === 'seatLabel' ? SEAT_KEYPAD : PHONE_KEYPAD;

  const handleKeypadPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '') return;
    setInputValue((prev) => {
      if (prev.length >= maxLength) return prev;
      return prev + key;
    });
  }, [maxLength]);

  const handleKeypadSubmit = useCallback(() => {
    if (inputValue.length === 0) return;
    if (keypadMode === 'seatLabel') {
      handleSeatLabel(inputValue);
    } else {
      handlePhoneLast4(inputValue);
    }
  }, [inputValue, keypadMode, handleSeatLabel, handlePhoneLast4]);

  const handleBackToScan = useCallback(() => {
    setKeypadMode(null);
    setInputValue('');
  }, []);

  // pendingAction 확인 처리
  const handlePendingConfirm = useCallback((action: string) => {
    if (!pendingIdentifier || !onPendingConfirm || confirmingAction) return;
    setConfirmingAction(true);
    onPendingConfirm(pendingIdentifier, action)
      .then((result) => {
        setPendingActions([]);
        setPendingIdentifier(null);
        setConfirmingAction(false);
        setSuccessInfo({ name: result.name, action: result.message || '출결 처리 되었습니다.' });
        startSuccessTimer(SUCCESS_DISPLAY_MS);
      })
      .catch((err) => {
        setConfirmingAction(false);
        showError(err?.message);
        // 에러 후 자동 닫기
        setPendingActions([]);
        startSuccessTimer(ERROR_DISPLAY_MS);
      });
  }, [pendingIdentifier, onPendingConfirm, confirmingAction, startSuccessTimer, showError]);

  const handleDismissPending = useCallback(() => {
    setPendingActions([]);
    setPendingIdentifier(null);
    startSuccessTimer(SUCCESS_DISPLAY_MS);
  }, [startSuccessTimer]);

  const openKeypad = (mode: KeypadMode) => {
    setKeypadMode(mode);
    setInputValue('');
    setErrorMessage(null);
  };

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
              {successInfo.action}
            </p>
            {studentMessages.length > 0 && (
              <div className={styles.studentMessages}>
                <span className={styles.studentMessagesLabel}>전달된 메시지</span>
                {studentMessages.map((msg) => (
                  <div key={msg.id} className={styles.studentMessageBubble}>
                    <p className={styles.studentMessageText}>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
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

        {!keypadMode ? (
          <>
            <p className={styles.guide}>
              {searching ? '학생 조회 중...' : '카드 태그 및 QR을 스캔해주세요'}
            </p>

            <img src={cardAndQrImg} alt="카드 태그 및 QR 스캔" className={styles.cardImage} />

            {errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <div className={styles.fallbackButtons}>
              <button
                type="button"
                className={styles.seatButton}
                onClick={() => openKeypad('seatLabel')}
              >
                좌석 번호로 인증
              </button>
              <button
                type="button"
                className={styles.phoneButton}
                onClick={() => openKeypad('phoneLast4')}
              >
                휴대폰 뒷자리로 인증
              </button>
            </div>
          </>
        ) : (
          <div className={styles.keypadSection}>
            <div className={styles.studentIdDisplay}>
              <span className={inputValue ? styles.studentIdValue : styles.studentIdPlaceholder}>
                {inputValue || (keypadMode === 'seatLabel' ? '좌석 번호' : '휴대폰 뒷자리')}
              </span>
            </div>

            {errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <div className={styles.keypadGrid}>
              {keypadKeys.map((key, idx) => (
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
              onClick={handleKeypadSubmit}
              disabled={inputValue.length === 0 || searching}
            >
              {searching ? '조회 중...' : '입력 완료'}
            </button>

            {!keypadOnly && (
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackToScan}
              >
                카드/QR 인증으로 돌아가기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
