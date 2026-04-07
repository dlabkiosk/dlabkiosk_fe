import { useCallback, useEffect, useRef, useState } from 'react';
import cardAndQrImg from '../assets/card_and_qr.jpg';
import blackCardAndQrImg from '../assets/black_card_and_qr.png';
import { searchStudent, getStudentByPhone8 } from '../api/studentApi';
import { getStudentMessages } from '../api/studentMessageApi';
import type { StudentMessage } from '../api/studentMessageApi';
import { ACTION_LABEL_MAP } from '../api/tagApi';
import type { MealInfo } from '../api/tagApi';
import type { Student } from '../data/mockStudents';
import type { CardScanResult } from '../hooks/useCardScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  VOICE_KEYPAD_PHONE,
  VOICE_KEYPAD_AUTH_FAIL,
  VOICE_SCAN_AUTH_FAIL,
  VOICE_KEYPAD_NUMBER,
} from '../constants/voiceGuide';
import checkIcon from '../assets/check.png';
import styles from './CardScanModal.module.css';

const SECURE_CLOSE_TAPS = 5;
const SECURE_CLOSE_TIMEOUT_MS = 3000;
const PHONE_8_DIGITS_LENGTH = 8;
const SUCCESS_DISPLAY_MS = 2000;
const SUCCESS_WITH_MSG_DISPLAY_MS = 3000;
const ERROR_DISPLAY_MS = 4000;
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'] as const;

type KeypadMode = 'phone';

export interface ScanActionParams {
  identifier?: string;
  phone8?: string;
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
  /** 에러 발생 시 외부 에러 모달로 위임 (제공 시 내부 에러 표시 대신 호출) */
  onError?: (message: string, options?: { studentName?: string }) => void;
}

export default function CardScanModal({ title, scanResult, qrResult, secureClose = false, keypadOnly = false, defaultKeypadMode, onClose, onStudentFound, onAction, onConfirmAction, onMealConfirm, onError }: CardScanModalProps) {
  const { speak, timeoutMultiplier, highContrast } = useAccessibility();
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
    // 에러 후 동일 카드/QR 재태깅 허용
    processedCardRef.current = null;
    processedQrRef.current = null;

    // onError가 제공되면 외부 에러 모달로 위임
    if (onError) {
      setSearching(false);
      onError(msg);
      return;
    }

    setErrorMessage(msg);
    // TTS: 키패드 모드에 따라 다른 실패 음성
    speak(keypadMode ? VOICE_KEYPAD_AUTH_FAIL : VOICE_SCAN_AUTH_FAIL);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => {
      setErrorMessage(null);
    }, ERROR_DISPLAY_MS * timeoutMultiplier);
  }, [speak, keypadMode, timeoutMultiplier]);

  const startSuccessTimer = useCallback((ms: number) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setSuccessInfo(null);
      setStudentMessages([]);
      onClose();
    }, ms * timeoutMultiplier);
  }, [onClose, timeoutMultiplier]);

  const showSuccess = useCallback((result: ScanActionResult) => {
    setSearching(false);
    setConfirming(false);
    const actionText = result.message || '출결 처리 되었습니다.';
    setSuccessInfo({ name: result.name, action: actionText });
    // TTS: 성공 메시지 읽기
    speak(`${result.name} 학생, ${actionText}`);

    const pending = result.pendingActions ?? [];
    const meal = result.mealInfo ?? null;
    setConfirmIdentifier(result.identifier || '');
    setConfirmInputMethod(result.inputMethod || '');

    // 태그 응답 메시지를 studentMessages로 통합 표시
    const tagMsgs = (result.messages ?? [])
      .filter((m) => m && m.trim().length > 0)
      .map((m, i) => ({ id: -(i + 1), content: m } as StudentMessage));
    setStudentMessages(tagMsgs);

    const hasMessages = tagMsgs.length > 0;

    // ── pending 1개 + mealInfo 없음 → 자동 처리 ──
    if (pending.length === 1 && !meal && onConfirmAction && result.identifier) {
      setActivePendingActions([]);
      setActiveMealInfo(null);
      onConfirmAction({ identifier: result.identifier, inputMethod: result.inputMethod || 'RFID', action: pending[0].action })
        .then((confirmResult) => {
          setActivePendingActions([]);
          showSuccess(confirmResult);
        })
        .catch((err) => {
          showError(err?.message);
        });
      return;
    }

    // ── pending 0 + 급식 신청됨 + 미태그 → 자동 급식 태그 ──
    if (pending.length === 0 && meal && meal.applied && !meal.alreadyTagged && onMealConfirm && result.identifier) {
      setActivePendingActions([]);
      setActiveMealInfo(null);
      onMealConfirm({ identifier: result.identifier, inputMethod: result.inputMethod || 'RFID' })
        .then(() => {
          setSuccessInfo({ name: result.name, action: '급식 태깅 완료' });
          startSuccessTimer(SUCCESS_WITH_MSG_DISPLAY_MS);
        })
        .catch(() => {
          startSuccessTimer(SUCCESS_DISPLAY_MS);
        });
      return;
    }

    // ── 식사시간 + pending 0 + 미신청 → mealInfo 카드 + 사전신청내역 없음 안내 ──
    if (pending.length === 0 && meal && !meal.applied) {
      setActivePendingActions([]);
      setActiveMealInfo(meal);
      setSuccessInfo({ name: result.name, action: '' });
      const noApplyMsg = '사전 신청 내역이 없습니다.';
      const hasNoApplyMsg = tagMsgs.some((m) => m.content.includes('사전신청'));
      if (!hasNoApplyMsg) {
        setStudentMessages((prev) => [...prev, { id: -999, content: noApplyMsg } as StudentMessage]);
      }
      startSuccessTimer(SUCCESS_WITH_MSG_DISPLAY_MS);
      return;
    }

    // ── 식사시간 + 이미 태그됨 ──
    if (meal && meal.alreadyTagged) {
      setActiveMealInfo(meal);
      if (pending.length === 0) {
        // 이미 태그 + pending 없음 + 사전신청 없음 → 에러 모달로 위임
        if (onError) {
          setSearching(false);
          const mealCard = `${meal.mealLabel}\n${meal.message}`;
          const backendMsg = (result.messages ?? []).find((m) => m && m.trim().length > 0);
          const fullMsg = backendMsg ? `${mealCard}\n---\n${backendMsg}` : mealCard;
          onError(fullMsg, { studentName: result.name });
          return;
        }
        // fallback (외부 onError 없을 때) — 기존 동작 유지
        setActivePendingActions([]);
        setSuccessInfo({ name: result.name, action: '' });
        const noApplyMsg = '사전 신청 내역이 없습니다.';
        const hasNoApplyMsg = tagMsgs.some((m) => m.content.includes('사전신청'));
        if (!hasNoApplyMsg) {
          setStudentMessages((prev) => [...prev, { id: -999, content: noApplyMsg } as StudentMessage]);
        }
        startSuccessTimer(SUCCESS_WITH_MSG_DISPLAY_MS);
        return;
      }
      // 이미 태그 + pending 있음 → 식사 안내 + 선택 모달
      setActivePendingActions(pending);
      return;
    }

    // ── 나머지 ──
    // pending 2개+: 항상 선택 모달
    // pending 1개 + mealInfo 있음 (식사시간): 식사 안내 + 선택 모달
    // pending 0 + meal 없거나: 성공 표시 후 자동 닫힘
    setActivePendingActions(pending);
    setActiveMealInfo(meal);

    const hasPendingInteraction = pending.length > 0;

    if (!hasPendingInteraction) {
      const baseMs = hasMessages ? SUCCESS_WITH_MSG_DISPLAY_MS : SUCCESS_DISPLAY_MS;
      startSuccessTimer(baseMs);
    }

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

  const toStudent = (data: import('../api/studentApi').StudentSearchResult, identifier: string): Student => ({
    id: data.id,
    name: data.name,
    studentNumber: data.studentNumber,
    assignedSeatLabel: data.assignedSeatLabel,
    identifier,
    phoneSubmissions: data.phoneSubmissions,
    seatChangeRequests: data.seatChangeRequests,
    seatLeaves: data.seatLeaves,
    mealApplications: data.mealApplications,
    receipts: data.receipts,
    attendanceSummary: data.attendanceSummary,
    points: data.points,
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

  // 전화번호 뒤 8자리로 조회
  const handlePhone8 = useCallback((phone8: string) => {
    setSearching(true);
    if (onAction) {
      onAction({ phone8 })
        .then((result) => showSuccess(result))
        .catch((err) => { setSearching(false); showError(err?.message); });
    } else {
      getStudentByPhone8(phone8)
        .then((data) => handleStudentFound(toStudent(data, phone8), 'PHONE'))
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


  // pendingActions 무시 — 아무 처리 없이 모달 닫기
  const handleDismissPending = useCallback(() => {
    setActivePendingActions([]);
    setActiveMealInfo(null);
    setSuccessInfo(null);
    setStudentMessages([]);
    if (successTimer.current) clearTimeout(successTimer.current);
    onClose();
  }, [onClose]);

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

  const maxLength = PHONE_8_DIGITS_LENGTH;

  const handleKeypadPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setInputValue('');
      return;
    }
    if (key === '') return;
    // TTS: 숫자 읽기 (cancel 없이 큐잉하여 자연스럽게 이어 읽기)
    speak(VOICE_KEYPAD_NUMBER(key), false);
    setInputValue((prev) => {
      if (prev.length >= maxLength) return prev;
      return prev + key;
    });
  }, [maxLength, speak]);

  const isInputValid = inputValue.length === PHONE_8_DIGITS_LENGTH;

  const handleKeypadSubmit = useCallback(() => {
    if (inputValue.length !== PHONE_8_DIGITS_LENGTH) {
      showError('전화번호 뒤 8자리를 입력해주세요.');
      return;
    }
    handlePhone8(inputValue);
  }, [inputValue, handlePhone8, showError]);

  const handleBackToScan = useCallback(() => {
    setKeypadMode(null);
    setInputValue('');
  }, []);

  const openKeypad = (mode: KeypadMode) => {
    setKeypadMode(mode);
    setInputValue('');
    setErrorMessage(null);
    speak(VOICE_KEYPAD_PHONE);
  };

  // 성공 화면
  if (successInfo) {
    const hasPendingInteraction = activePendingActions.length > 0;

    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          {hasPendingInteraction && (
            <button type="button" className={styles.closeButton} onClick={handleDismissPending} aria-label="닫기">
              &#x2715;
            </button>
          )}
          <div className={styles.successSection}>
            <img src={checkIcon} alt="성공" className={styles.successIcon} />
            <p className={styles.successMessage}>
              {successInfo.name} 학생
              {!hasPendingInteraction && successInfo.action && (
                <>
                  <br />
                  {successInfo.action}
                </>
              )}
            </p>

            {/* 급식 정보 — applied 급식은 자동 태그 처리되므로 안내만 표시 */}
            {activeMealInfo && (
              <div className={styles.mealInfoSection}>
                <span className={styles.mealInfoLabel}>{activeMealInfo.mealLabel}</span>
                <p className={styles.mealInfoMessage}>{activeMealInfo.message}</p>
              </div>
            )}

            {/* 외출/조퇴 확인 */}
            {activePendingActions.length > 0 && onConfirmAction && (
              <>
                <p className={styles.pendingGuide}>항목을 선택해주세요.</p>
                <div className={styles.pendingRow}>
                  {activePendingActions.map((pa) => (
                    <button
                      key={pa.regCd}
                      type="button"
                      className={styles.pendingConfirmButton}
                      onClick={() => handlePendingActionClick(pa.action)}
                      disabled={confirming}
                    >
                      {confirming ? '처리 중...' : (ACTION_LABEL_MAP[pa.action] || pa.message)}
                    </button>
                  ))}
                </div>
              </>
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

            <img src={highContrast ? blackCardAndQrImg : cardAndQrImg} alt="카드 태그 및 QR 스캔" className={styles.cardImage} />

            {errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            <div className={styles.fallbackButtons}>
              <button
                type="button"
                className={styles.phoneButton}
                onClick={() => openKeypad('phone')}
              >
                전화번호로 인증
              </button>
            </div>
          </>
        ) : (
          <div className={styles.keypadSection}>
            <div className={styles.studentIdDisplay}>
              <span className={inputValue ? styles.studentIdValue : styles.studentIdPlaceholder}>
                {inputValue || '전화번호 뒤 8자리'}
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
                  className={`${styles.keypadKey} ${key === 'backspace' ? styles.keypadBackspace : ''} ${key === 'clear' ? styles.keypadClear : ''}`}
                  onClick={() => handleKeypadPress(key)}
                  aria-label={key === 'backspace' ? '지우기' : key === 'clear' ? '전체 삭제' : key}
                >
                  {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
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
