import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import NoticeSection from '../components/NoticeSection';
import RankingSection from '../components/RankingSection';
import QuickMenu from '../components/QuickMenu';
import AdBanner from '../components/AdBanner';
import CardScanModal from '../components/CardScanModal';
import type { ScanActionParams } from '../components/CardScanModal';
import StudentInfoModal from '../components/StudentInfoModal';
import RemoteApplyModal from '../components/RemoteApplyModal';

import SeatLeaveReasonModal from '../components/SeatLeaveReasonModal';
import WeeklyMealModal from '../components/WeeklyMealModal';
import PhoneSubmissionModal from '../components/PhoneSubmissionModal';
import SeatChangeModal from '../components/SeatChangeModal';
import SeatMapModal from '../components/SeatMapModal';
import KioskAdminPanel from '../components/KioskAdminPanel';
import { tag, tagConfirm, tagMealConfirm, resolveActionLabel } from '../api/tagApi';
import cautionIcon from '../assets/caution.png';
import { startSeatLeave, endSeatLeave } from '../api/seatLeaveApi';
import type { KioskSession } from '../api/kioskAuthApi';
import type { Student } from '../data/mockStudents';
import { useCardScanner } from '../hooks/useCardScanner';
import type { CardScanResult } from '../hooks/useCardScanner';
import { useQrScanner } from '../hooks/useQrScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import AccessibilityBar from '../components/AccessibilityBar';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  VOICE_MENU_NO_CARD,
  VOICE_MENU_SEAT_LEAVE,
  VOICE_MENU_REMOTE_APPLY,
  VOICE_MENU_STUDENT_INFO,
  VOICE_MENU_MEAL_PLAN,
  VOICE_MENU_SEAT_MAP,
  VOICE_BACK_TO_MAIN,
  VOICE_SEAT_LEAVE_REASON_SELECTED,
  VOICE_REMOTE_NO_PHONE,
  VOICE_REMOTE_SEAT_CHANGE,
} from '../constants/voiceGuide';
import styles from './MainPage.module.css';

interface MainPageProps {
  session: KioskSession;
  onLogout: () => void;
}

export default function MainPage({ session, onLogout }: MainPageProps) {
  const { speak } = useAccessibility();
  const [showAdmin, setShowAdmin] = useState(false);

  const [showRemoteApply, setShowRemoteApply] = useState(false);
  const [showSeatLeaveReason, setShowSeatLeaveReason] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [phoneSubmissionStudent, setPhoneSubmissionStudent] = useState<{ identifier: string; name: string; inputMethod: string } | null>(null);
  const [seatChangeStudent, setSeatChangeStudent] = useState<{ student: Student; inputMethod: string } | null>(null);
  const [scanTarget, setScanTarget] = useState<{ actionId: string; label: string; secureClose?: boolean; keypadOnly?: boolean; reasonId?: number; defaultKeypadMode?: 'phone' } | null>(null);
  const [scanResult, setScanResult] = useState<CardScanResult | null>(null);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [studentInfoTarget, setStudentInfoTarget] = useState<Student | null>(null);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const errorModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScan = useCallback((result: CardScanResult) => {
    setScanResult(result);
  }, []);

  const handleQrScan = useCallback((result: QrScanResult) => {
    setQrResult(result);
  }, []);

  const { connected, error, connect } = useCardScanner(handleScan);
  useQrScanner(handleQrScan);

  // 모달이 하나라도 열려 있는지 확인 (auto-tag 판별용)
  const isAnyModalOpen = !!(scanTarget || showAdmin || showRemoteApply || showSeatLeaveReason || showMealPlan || showSeatMap || phoneSubmissionStudent || seatChangeStudent || studentInfoTarget);
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;

  // 에러 모달 표시 (4초 자동 닫힘) — CardScanModal 열지 않고 에러만 표시
  const showErrorModal = useCallback((msg: string) => {
    setScanTarget(null);
    setErrorModalMessage(msg);
    if (errorModalTimer.current) clearTimeout(errorModalTimer.current);
    errorModalTimer.current = setTimeout(() => {
      setErrorModalMessage(null);
      errorModalTimer.current = null;
    }, 4000);
  }, []);

  // 메인화면에서 카드/QR 인식 시 자동으로 출결 태그 처리
  const lastAutoTagCardTime = useRef<number>(0);
  const lastAutoTagQrTime = useRef<number>(0);

  useEffect(() => {
    if (scanResult && scanResult.receivedAt.getTime() !== lastAutoTagCardTime.current && !isAnyModalOpenRef.current) {
      lastAutoTagCardTime.current = scanResult.receivedAt.getTime();
      setScanTarget({ actionId: 'tag', label: '출결' });
    }
  }, [scanResult]);

  useEffect(() => {
    if (qrResult && qrResult.receivedAt.getTime() !== lastAutoTagQrTime.current && !isAnyModalOpenRef.current) {
      lastAutoTagQrTime.current = qrResult.receivedAt.getTime();
      setScanTarget({ actionId: 'tag', label: '출결' });
    }
  }, [qrResult]);

  const handleMenuClick = (menuId: string) => {
    if (menuId === 'seat-leave') {
      setShowSeatLeaveReason(true);
      speak(VOICE_MENU_SEAT_LEAVE);
    } else if (menuId === 'no-card') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'tag', label: '전화번호로 인증', keypadOnly: true, defaultKeypadMode: 'phone' });
      speak(VOICE_MENU_NO_CARD);
    } else if (menuId === 'remote-apply') {
      setShowRemoteApply(true);
      speak(VOICE_MENU_REMOTE_APPLY);
    } else if (menuId === 'meal-plan') {
      setShowMealPlan(true);
      speak(VOICE_MENU_MEAL_PLAN);
    } else if (menuId === 'student-info') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'student-info', label: '학적 조회' });
      speak(VOICE_MENU_STUDENT_INFO);
    } else if (menuId === 'seat-map') {
      setShowSeatMap(true);
      speak(VOICE_MENU_SEAT_MAP);
    }
  };

  // 학적 조회: 학생 식별 후 StudentInfoModal 열기
  const handleStudentFound = useCallback((student: Student) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setStudentInfoTarget(student);
  }, []);

  // 휴대폰 미소지: 학생 식별 후 날짜/옵션 모달 열기
  const handlePhoneStudentFound = useCallback((student: Student, inputMethod: string) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setPhoneSubmissionStudent({ identifier: student.identifier ?? String(student.id), name: student.name, inputMethod });
  }, []);

  // 좌석 변경: 학생 식별 후 좌석 선택 모달 열기
  const handleSeatChangeStudentFound = useCallback((student: Student, inputMethod: string) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setSeatChangeStudent({ student, inputMethod });
  }, []);

  // 좌석 이탈 사유 선택 → CardScanModal로 학생 식별
  const handleSeatLeaveReasonSelect = (reasonId: number, reasonLabel: string) => {
    setShowSeatLeaveReason(false);
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId: 'leave-seat', label: `좌석 이탈 (${reasonLabel})`, reasonId });
    speak(VOICE_SEAT_LEAVE_REASON_SELECTED(reasonLabel));
  };

  const handleScanClose = () => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    speak(VOICE_BACK_TO_MAIN);
  };

  // 통합 식별자 추출 (좌석이탈 등 identifier 하나만 받는 API용)
  const resolveIdentifier = useCallback(async (params: ScanActionParams): Promise<string> => {
    if (params.identifier) return params.identifier;
    if (params.phone8) return params.phone8;
    throw new Error('학생을 식별할 수 없습니다.');
  }, []);

  /** ScanActionParams로부터 입력 방식 판별 — 백엔드 inputMethod 값 기준 */
  const resolveInputMethod = useCallback((params: ScanActionParams): string => {
    if (params.phone8) return 'PHONE';
    // 카드/QR 모두 백엔드에서는 RFID로 취급
    return 'RFID';
  }, []);

  const handleTagAction = useCallback(async (params: ScanActionParams) => {
    const inputMethod = resolveInputMethod(params);
    // 좌석이탈 복귀 등 identifier 하나만 받는 API용
    const fallbackIdentifier = params.identifier || params.phone8;
    if (!fallbackIdentifier) throw new Error('학생을 식별할 수 없습니다.');

    // 좌석 이탈 중이면 먼저 복귀 처리
    try {
      const leaveResult = await endSeatLeave(fallbackIdentifier, inputMethod);
      return {
        name: leaveResult.studentName,
        studentId: leaveResult.studentId,
        message: '좌석 복귀가 완료되었습니다.',
      };
    } catch {
      // 이탈 중이 아니면 무시 → 기존 태그 로직
    }

    // identifier는 필수 — 입력 방식에 따라 값을 채우고 inputMethod로 구별
    const result = await tag({
      identifier: fallbackIdentifier,
      inputMethod,
    });

    // action이 null이면 백엔드가 처리를 거부한 것
    if (!result.action) {
      const hasPending = result.pendingActions && result.pendingActions.length > 0;
      const hasMeal = result.mealInfo && result.mealInfo.applied && !result.mealInfo.alreadyTagged;

      // pendingActions 또는 급식 미확인이 있으면 선택 화면으로
      if (hasPending || hasMeal) {
        return {
          name: result.studentName,
          studentId: result.studentId,
          message: result.messages?.[0] || '선택해주세요.',
          identifier: fallbackIdentifier,
          inputMethod,
          pendingActions: result.pendingActions,
          mealInfo: result.mealInfo,
          messages: result.messages,
        };
      }
      // 식사시간 + 식사신청 안 함 + 출결 신청 없음 → 두 메시지 카드로 표시
      if (result.mealInfo && !result.mealInfo.applied) {
        const mealMsg = result.mealInfo.message || '식사 신청내역 없음';
        throw new Error(`${mealMsg}\n---\n출결 신청내역 없음`);
      }
      // 그 외 에러 — messages 우선, 최후 기본값
      const msg = result.mealInfo?.message || result.messages?.[0] || '처리할 수 없습니다.';
      throw new Error(msg);
    }

    return {
      name: result.studentName,
      studentId: result.studentId,
      message: `${resolveActionLabel(result)} 처리 되었습니다.`,
      identifier: fallbackIdentifier,
      inputMethod,
      pendingActions: result.pendingActions,
      mealInfo: result.mealInfo,
      messages: result.messages,
    };
  }, [resolveInputMethod]);

  // 외출/조퇴 pendingAction 확인
  const handleConfirmAction = useCallback(async (params: { identifier: string; inputMethod: string; action: string }) => {
    const result = await tagConfirm(params);
    return {
      name: result.studentName,
      studentId: result.studentId,
      message: `${resolveActionLabel(result)} 처리 되었습니다.`,
      identifier: params.identifier,
      inputMethod: params.inputMethod,
      pendingActions: result.pendingActions,
      mealInfo: result.mealInfo,
      messages: result.messages,
    };
  }, []);

  // 급식 태그 확인
  const handleMealConfirm = useCallback(async (params: { identifier: string; inputMethod: string }) => {
    const result = await tagMealConfirm(params);
    return {
      name: result.studentName,
      studentId: result.studentId,
      message: result.mealInfo?.message || '급식 확인이 완료되었습니다.',
      identifier: params.identifier,
      inputMethod: params.inputMethod,
      pendingActions: result.pendingActions,
      mealInfo: result.mealInfo,
      messages: result.messages,
    };
  }, []);

  // 좌석 이탈 액션 — identifier로 학생 식별
  const handleSeatLeaveAction = useCallback(async (params: ScanActionParams) => {
    if (!scanTarget?.reasonId) throw new Error('이탈 사유를 선택해주세요.');
    const identifier = await resolveIdentifier(params);
    const inputMethod = resolveInputMethod(params);
    try {
      const result = await startSeatLeave(identifier, scanTarget.reasonId, inputMethod);
      return {
        name: result.studentName,
        studentId: result.studentId,
        message: '좌석 이탈 신청이 완료되었습니다.\n 꼭 복귀처리를 해주세요.',
      };
    } catch (err) {
      throw err;
    }
  }, [scanTarget?.reasonId, resolveIdentifier]);

  const getScanAction = () => {
    if (!scanTarget) return undefined;
    if (scanTarget.actionId === 'tag') return handleTagAction;
    if (scanTarget.actionId === 'leave-seat') return handleSeatLeaveAction;
    return undefined;
  };

  const getOnStudentFound = () => {
    if (!scanTarget) return undefined;
    if (scanTarget.actionId === 'student-info') return handleStudentFound;
    if (scanTarget.actionId === 'no-phone') return handlePhoneStudentFound;
    if (scanTarget.actionId === 'seat-change') return handleSeatChangeStudentFound;
    return undefined;
  };

  // 비대면 신청 항목 선택
  const handleRemoteSelect = (actionId: string, label: string) => {
    setShowRemoteApply(false);
    if (actionId === 'no-phone') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'no-phone', label: '휴대폰 미소지' });
      speak(VOICE_REMOTE_NO_PHONE);
      return;
    }
    if (actionId === 'seat-change') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'seat-change', label: '좌석 변경' });
      speak(VOICE_REMOTE_SEAT_CHANGE);
      return;
    }
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId, label });
  };

  return (
    <div className={styles.page}>
      <div className={styles.topSection}>
        <Header storeName={session.storeName} onAdminAccess={() => setShowAdmin(true)} />

        <div className={styles.infoSection}>
          <NoticeSection />
          <RankingSection storeName={session.storeName} />
        </div>
      </div>

      <QuickMenu onMenuClick={handleMenuClick} />

      <AdBanner />

      <AccessibilityBar />

      {/* 카드 미소지 → 휴대폰 뒤 8자리 키패드로 바로 진입 */}

      {showSeatLeaveReason && (
        <SeatLeaveReasonModal
          onClose={() => { setShowSeatLeaveReason(false); speak(VOICE_BACK_TO_MAIN); }}
          onSelect={handleSeatLeaveReasonSelect}
        />
      )}

      {showMealPlan && (
        <WeeklyMealModal storeId={session.storeId} onClose={() => { setShowMealPlan(false); speak(VOICE_BACK_TO_MAIN); }} />
      )}

      {showRemoteApply && (
        <RemoteApplyModal
          onClose={() => { setShowRemoteApply(false); speak(VOICE_BACK_TO_MAIN); }}
          onSelect={handleRemoteSelect}
        />
      )}

      {/* 공통 카드스캔 모달 (카드/QR/좌석번호/전번뒷자리) */}
      {scanTarget && (
        <CardScanModal
          title={scanTarget.label}
          scanResult={scanResult}
          qrResult={qrResult}
          secureClose={scanTarget.secureClose}
          keypadOnly={scanTarget.keypadOnly}
          defaultKeypadMode={scanTarget.defaultKeypadMode}
          onClose={handleScanClose}
          onStudentFound={getOnStudentFound()}
          onAction={getScanAction()}
          onConfirmAction={scanTarget.actionId === 'tag' ? handleConfirmAction : undefined}
          onMealConfirm={scanTarget.actionId === 'tag' ? handleMealConfirm : undefined}
          onError={scanTarget.actionId === 'tag' ? showErrorModal : undefined}
        />
      )}

      {/* 휴대폰 미소지 - 학생 식별 후 날짜/옵션 선택 */}
      {phoneSubmissionStudent && (
        <PhoneSubmissionModal
          identifier={phoneSubmissionStudent.identifier}
          inputMethod={phoneSubmissionStudent.inputMethod}
          studentName={phoneSubmissionStudent.name}
          onClose={() => { setPhoneSubmissionStudent(null); speak(VOICE_BACK_TO_MAIN); }}
        />
      )}

      {/* 좌석 변경 - 학생 식별 후 좌석 선택 */}
      {seatChangeStudent && (
        <SeatChangeModal
          student={seatChangeStudent.student}
          inputMethod={seatChangeStudent.inputMethod}
          onClose={() => { setSeatChangeStudent(null); speak(VOICE_BACK_TO_MAIN); }}
        />
      )}

      {studentInfoTarget && (
        <StudentInfoModal
          student={studentInfoTarget}
          onClose={() => { setStudentInfoTarget(null); speak(VOICE_BACK_TO_MAIN); }}
        />
      )}

      {showSeatMap && (
        <SeatMapModal onClose={() => { setShowSeatMap(false); speak(VOICE_BACK_TO_MAIN); }} />
      )}

      {showAdmin && (
        <KioskAdminPanel
          connected={connected}
          error={error}
          session={session}
          onConnect={connect}
          onClose={() => setShowAdmin(false)}
          onLogout={onLogout}
        />
      )}

      {/* 에러 모달 */}
      {errorModalMessage && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorModal}>
            <img src={cautionIcon} alt="경고" className={styles.errorIcon} />
            {errorModalMessage.split('\n---\n').map((section, i) => (
              <div key={i} className={styles.errorCard}>
                <p className={styles.errorCardText}>{section.replace(/\.\s*/g, '\n')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
