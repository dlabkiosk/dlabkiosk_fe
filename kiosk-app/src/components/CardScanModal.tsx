import { useCallback, useEffect, useRef, useState } from 'react';
import cardAndQrImg from '../assets/card_and_qr.jpg';
import { searchStudent, getStudentBySeat, getStudentByPhone } from '../api/studentApi';
import { getStudentMessages } from '../api/studentMessageApi';
import type { StudentMessage } from '../api/studentMessageApi';
import type { MealInfo } from '../api/tagApi';
import type { Student } from '../data/mockStudents';
import type { CardScanResult } from '../hooks/useCardScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import styles from './CardScanModal.module.css';

const SECURE_CLOSE_TAPS = 5;
const SECURE_CLOSE_TIMEOUT_MS = 3000;
const SEAT_LABEL_MAX_LENGTH = 10;
const PHONE_DIGITS_LENGTH = 4;
const SUCCESS_DISPLAY_MS = 2000;
const SUCCESS_WITH_MSG_DISPLAY_MS = 3000;
const PENDING_ACTION_DISPLAY_MS = 10000;
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
  identifier?: string;
  inputMethod?: string;
  pendingActions?: PendingActionItem[];
  mealInfo?: MealInfo | null;
  /** 태그 응답에 포함된 메시지 목록 */
  messages?: string[];
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
  onStudentFound?: (student: Student, inputMethod: string) => void;
  onAction?: (params: ScanActionParams) => Promise<ScanActionResult>;
  /** 외출/조퇴 pendingAction 확인 */
  onConfirmAction?: (params: { identifier: string; inputMethod: string; action: string }) => Promise<ScanActionResult>;
  /** 급식 태그 확인 */
  onMealConfirm?: (params: { identifier: string; inputMethod: string }) => Promise<ScanActionResult>;
}

export default function CardScanModal({ title, scanResult, qrResult, secureClose = false, keypadOnly = false, defaultKeypadMode, onClose, onStudentFound, onAction, onConfirmAction, onMealConfirm }: CardScanModalProps) {
  const [closeTapCount, setCloseTapCount] = useState(0);
  const closeTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keypadMode, setKeypadMode] = useState<KeypadMode | null>(defaultKeypadMode ?? null);
  const [inputValue, setInputValue] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; action: string } | null>(null);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [activePendingActions, setActivePendingActions] = useState<PendingActionItem[]>([]);
  const [activeMealInfo, setActiveMealInfo] = useState<MealInfo | null>(null);
  const [confirmIdentifier, setConfirmIdentifier] = useState('');
  const [confirmInputMethod, setConfirmInputMethod] = useState('');
  const [confirming, setConfirming] = useState(false);
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

  const showSuccess = useCallback((result: ScanActionResult) => {
    setSearching(false);
    setConfirming(false);
    setSuccessInfo({ name: result.name, action: result.message || '출결 처리 되었습니다.' });

    const pending = result.pendingActions ?? [];
    const meal = result.mealInfo ?? null;
    setActivePendingActions(pending);
    setActiveMealInfo(meal);
    setConfirmIdentifier(result.identifier || '');
    setConfirmInputMethod(result.inputMethod || '');

    // 태그 응답 메시지를 studentMessages로 통합 표시
    const tagMsgs = (result.messages ?? [])
      .filter((m) => m && m.trim().length > 0)
      .map((m, i) => ({ id: -(i + 1), content: m } as StudentMessage));
    setStudentMessages(tagMsgs);

    const hasPendingInteraction = pending.length > 0 || (meal && !meal.alreadyTagged && meal.applied);
    const hasMessages = tagMsgs.length > 0;
    const baseMs = hasPendingInteraction
      ? PENDING_ACTION_DISPLAY_MS
      : hasMessages
        ? SUCCESS_WITH_MSG_DISPLAY_MS
        : SUCCESS_DISPLAY_MS;
    startSuccessTimer(baseMs);

    // 서버 메시지 추가 조회 — 태그 메시지와 중복 제거 후 이어붙임
    if (result.studentId) {
      const tagContents = new Set((result.messages ?? []).map((m) => m.trim()));
      getStudentMessages(result.studentId)
        .then((msgs) => {
          const deduped = msgs.filter((m) => !tagContents.has(m.content.trim()));
          if (deduped.length > 0) {
            setStudentMessages((prev) => [...prev, ...deduped]);
            if (!hasPendingInteraction) {
              startSuccessTimer(SUCCESS_WITH_MSG_DISPLAY_MS);
            }
          }
        })
        .catch(() => { /* 메시지 조회 실패는 무시 */ });
    }
  }, [startSuccessTimer]);

  const handleStudentFound = useCallback((student: Student, inputMethod: string) => {
    setSearching(false);
    if (onStudentFound) {
      onStudentFound(student, inputMethod);
      return;
    }
    showSuccess({ name: student.name, studentId: student.id });
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
        .then((result) => showSuccess(result))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      searchStudent({ identifier })
        .then((data) => handleStudentFound(toStudent(data, identifier), 'RFID'))
        .catch(() => { setSearching(false); showError(); });
    }
  }, [onAction, handleStudentFound, showSuccess, showError]);

  // 좌석번호로 조회
  const handleSeatLabel = useCallback((seatLabel: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ seatLabel })
        .then((result) => showSuccess(result))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      getStudentBySeat(seatLabel)
        .then((data) => handleStudentFound(toStudent(data, seatLabel), 'SEAT_LABEL'))
        .catch(() => { setSearching(false); showError('해당 좌석에 배정된 학생이 없습니다.'); });
    }
  }, [onAction, handleStudentFound, showSuccess, showError]);

  // 전번 뒷자리로 조회
  const handlePhoneLast4 = useCallback((phoneLast4: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ phoneLast4 })
        .then((result) => showSuccess(result))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      getStudentByPhone(phoneLast4)
        .then((data) => handleStudentFound(toStudent(data, phoneLast4), 'PHONE_LAST4'))
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

  // 외출/조퇴 확인 버튼 클릭
  const handlePendingActionClick = useCallback((action: string) => {
    if (!onConfirmAction || !confirmIdentifier) return;
    setConfirming(true);
    if (successTimer.current) clearTimeout(successTimer.current);
    onConfirmAction({ identifier: confirmIdentifier, inputMethod: confirmInputMethod, action })
      .then((result) => {
        setActivePendingActions([]);
        showSuccess(result);
      })
      .catch((err) => {
        setConfirming(false);
        showError(err?.message);
      });
  }, [onConfirmAction, confirmIdentifier, confirmInputMethod, showSuccess, showError]);

  // 급식 확인 버튼 클릭
  const handleMealConfirmClick = useCallback(() => {
    if (!onMealConfirm || !confirmIdentifier) return;
    setConfirming(true);
    if (successTimer.current) clearTimeout(successTimer.current);
    onMealConfirm({ identifier: confirmIdentifier, inputMethod: confirmInputMethod })
      .then((result) => {
        setActiveMealInfo(null);
        showSuccess(result);
      })
      .catch((err) => {
        setConfirming(false);
        showError(err?.message);
      });
  }, [onMealConfirm, confirmIdentifier, confirmInputMethod, showSuccess, showError]);

  // pendingActions 무시 (닫기)
  const handleDismissPending = useCallback(() => {
    setActivePendingActions([]);
    setActiveMealInfo(null);
    startSuccessTimer(SUCCESS_DISPLAY_MS);
  }, [startSuccessTimer]);

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

  const isInputValid = keypadMode === 'phoneLast4'
    ? inputValue.length === PHONE_DIGITS_LENGTH
    : inputValue.length > 0;

  const handleKeypadSubmit = useCallback(() => {
    if (keypadMode === 'phoneLast4' && inputValue.length !== PHONE_DIGITS_LENGTH) {
      showError('휴대폰 뒷자리 4자리를 입력해주세요.');
      return;
    }
    if (inputValue.length === 0) return;
    if (keypadMode === 'seatLabel') {
      handleSeatLabel(inputValue);
    } else {
      handlePhoneLast4(inputValue);
    }
  }, [inputValue, keypadMode, handleSeatLabel, handlePhoneLast4, showError]);

  const handleBackToScan = useCallback(() => {
    setKeypadMode(null);
    setInputValue('');
  }, []);

  const openKeypad = (mode: KeypadMode) => {
    setKeypadMode(mode);
    setInputValue('');
    setErrorMessage(null);
  };

  // 성공 화면
  if (successInfo) {
    const hasPendingInteraction = activePendingActions.length > 0 || (activeMealInfo && !activeMealInfo.alreadyTagged && activeMealInfo.applied);

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

            {/* 급식 정보 */}
            {activeMealInfo && (
              <div className={styles.mealInfoSection}>
                <span className={styles.mealInfoLabel}>{activeMealInfo.mealLabel}</span>
                <p className={styles.mealInfoMessage}>{activeMealInfo.message}</p>
                {activeMealInfo.applied && !activeMealInfo.alreadyTagged && onMealConfirm && (
                  <button
                    type="button"
                    className={styles.pendingConfirmButton}
                    onClick={handleMealConfirmClick}
                    disabled={confirming}
                  >
                    {confirming ? '처리 중...' : '급식 확인'}
                  </button>
                )}
              </div>
            )}

            {/* 외출/조퇴 확인 */}
            {activePendingActions.length > 0 && onConfirmAction && (
              <div className={styles.pendingSection}>
                {activePendingActions.map((pa) => (
                  <button
                    key={pa.regCd}
                    type="button"
                    className={styles.pendingConfirmButton}
                    onClick={() => handlePendingActionClick(pa.action)}
                    disabled={confirming}
                  >
                    {confirming ? '처리 중...' : pa.message}
                  </button>
                ))}
              </div>
            )}

            {/* pendingActions/mealInfo가 있으면 무시 버튼 표시 */}
            {hasPendingInteraction && (
              <button
                type="button"
                className={styles.pendingDismissButton}
                onClick={handleDismissPending}
                disabled={confirming}
              >
                닫기
              </button>
            )}

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
              disabled={!isInputValid || searching}
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
