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
import NoCardModal from '../components/NoCardModal';
import SeatLeaveReasonModal from '../components/SeatLeaveReasonModal';
import WeeklyMealModal from '../components/WeeklyMealModal';
import PhoneSubmissionModal from '../components/PhoneSubmissionModal';
import SeatChangeModal from '../components/SeatChangeModal';
import SeatMapModal from '../components/SeatMapModal';
import KioskAdminPanel from '../components/KioskAdminPanel';
import { tag, tagConfirm, resolveActionLabel } from '../api/tagApi';
import { startSeatLeave, endSeatLeave } from '../api/seatLeaveApi';
import { sendEventLog } from '../api/eventLogApi';
import type { InputMethod } from '../api/eventLogApi';
import type { KioskSession } from '../api/kioskAuthApi';
import type { Student } from '../data/mockStudents';
import { useCardScanner } from '../hooks/useCardScanner';
import type { CardScanResult } from '../hooks/useCardScanner';
import { useQrScanner } from '../hooks/useQrScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import styles from './MainPage.module.css';

interface MainPageProps {
  session: KioskSession;
  onLogout: () => void;
}

export default function MainPage({ session, onLogout }: MainPageProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNoCard, setShowNoCard] = useState(false);
  const [showRemoteApply, setShowRemoteApply] = useState(false);
  const [showSeatLeaveReason, setShowSeatLeaveReason] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showSeatMap, setShowSeatMap] = useState(false);
  const [phoneSubmissionStudent, setPhoneSubmissionStudent] = useState<{ identifier: string; name: string } | null>(null);
  const [seatChangeStudent, setSeatChangeStudent] = useState<Student | null>(null);
  const [scanTarget, setScanTarget] = useState<{ actionId: string; label: string; secureClose?: boolean; keypadOnly?: boolean; reasonId?: number; defaultKeypadMode?: 'seatLabel' | 'phoneLast4' } | null>(null);
  const [scanResult, setScanResult] = useState<CardScanResult | null>(null);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [studentInfoTarget, setStudentInfoTarget] = useState<Student | null>(null);

  const handleScan = useCallback((result: CardScanResult) => {
    console.log('[MainPage] 카드 인식:', result.rawValue);
    setScanResult(result);
  }, []);

  const handleQrScan = useCallback((result: QrScanResult) => {
    console.log('[MainPage] QR 인식:', result.rawValue);
    setQrResult(result);
  }, []);

  const { connected, error, connect } = useCardScanner(handleScan);
  useQrScanner(handleQrScan);

  // 모달이 하나라도 열려 있는지 확인 (auto-tag 판별용)
  const isAnyModalOpen = !!(scanTarget || showAdmin || showNoCard || showRemoteApply || showSeatLeaveReason || showMealPlan || showSeatMap || phoneSubmissionStudent || seatChangeStudent || studentInfoTarget);
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  isAnyModalOpenRef.current = isAnyModalOpen;

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
    } else if (menuId === 'no-card') {
      setShowNoCard(true);
    } else if (menuId === 'remote-apply') {
      setShowRemoteApply(true);
    } else if (menuId === 'meal-plan') {
      setShowMealPlan(true);
    } else if (menuId === 'student-info') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'student-info', label: '학적 조회' });
    } else if (menuId === 'seat-map') {
      setShowSeatMap(true);
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
  const handlePhoneStudentFound = useCallback((student: Student) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setPhoneSubmissionStudent({ identifier: student.identifier ?? String(student.id), name: student.name });
  }, []);

  // 좌석 변경: 학생 식별 후 좌석 선택 모달 열기
  const handleSeatChangeStudentFound = useCallback((student: Student) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setSeatChangeStudent(student);
  }, []);

  // 좌석 이탈 사유 선택 → CardScanModal로 학생 식별
  const handleSeatLeaveReasonSelect = (reasonId: number, reasonLabel: string) => {
    setShowSeatLeaveReason(false);
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId: 'leave-seat', label: `좌석 이탈 (${reasonLabel})`, reasonId });
  };

  const handleScanClose = () => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
  };

  // 통합 태그 액션 — /search API가 identifier 하나로 카드/QR/좌석번호/폰뒷자리 전부 처리
  const resolveIdentifier = useCallback(async (params: ScanActionParams): Promise<string> => {
    if (params.identifier) return params.identifier;
    if (params.seatLabel) return params.seatLabel;
    if (params.phoneLast4) return params.phoneLast4;
    throw new Error('학생을 식별할 수 없습니다.');
  }, []);

  /** ScanActionParams로부터 입력 방식 판별 */
  const resolveInputMethod = useCallback((params: ScanActionParams): InputMethod => {
    if (params.seatLabel) return 'SEAT_LABEL';
    if (params.phoneLast4) return 'PHONE_LAST4';
    // identifier인 경우: 마지막 스캔 시점 기준으로 카드/QR 판별
    if (qrResult && scanResult) {
      return qrResult.receivedAt > scanResult.receivedAt ? 'QR' : 'CARD';
    }
    if (qrResult) return 'QR';
    return 'CARD';
  }, [scanResult, qrResult]);

  const handleTagAction = useCallback(async (params: ScanActionParams) => {
    const identifier = await resolveIdentifier(params);
    const inputMethod = resolveInputMethod(params);
    console.log('[handleTagAction] params:', params, '→ identifier:', JSON.stringify(identifier));

    // 좌석 이탈 중이면 먼저 복귀 처리
    try {
      const leaveResult = await endSeatLeave(identifier);
      sendEventLog({ eventType: 'SEAT_LEAVE_END', inputMethod, identifier, success: true, resultAction: 'SEAT_LEAVE_END', studentName: leaveResult.studentName });
      return {
        name: leaveResult.studentName,
        message: '좌석 복귀가 완료되었습니다.',
      };
    } catch {
      // 이탈 중이 아니면 무시 → 기존 태그 로직
    }

    try {
      const result = await tag({ identifier });
      sendEventLog({ eventType: 'TAG', inputMethod, identifier, success: true, resultAction: result.action, studentName: result.studentName });
      return {
        name: result.studentName,
        studentId: result.studentId,
        message: result.messages?.[0] || `${resolveActionLabel(result)} 처리 되었습니다.`,
        pendingActions: result.pendingActions,
        identifier,
      };
    } catch (err) {
      sendEventLog({ eventType: 'TAG', inputMethod, identifier, success: false, errorMessage: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }, [resolveIdentifier, resolveInputMethod]);

  const handleTagConfirm = useCallback(async (identifier: string, action: string) => {
    try {
      const result = await tagConfirm({ identifier, action });
      sendEventLog({ eventType: 'TAG_CONFIRM', inputMethod: 'CARD', identifier, success: true, resultAction: result.action, studentName: result.studentName });
      return {
        name: result.studentName,
        studentId: result.studentId,
        message: result.messages?.[0] || `${resolveActionLabel(result)} 처리 되었습니다.`,
      };
    } catch (err) {
      sendEventLog({ eventType: 'TAG_CONFIRM', inputMethod: 'CARD', identifier, success: false, errorMessage: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }, []);

  // 좌석 이탈 액션 — identifier로 학생 식별
  const handleSeatLeaveAction = useCallback(async (params: ScanActionParams) => {
    if (!scanTarget?.reasonId) throw new Error('이탈 사유를 선택해주세요.');
    const identifier = await resolveIdentifier(params);
    const inputMethod = resolveInputMethod(params);
    try {
      const result = await startSeatLeave(identifier, scanTarget.reasonId);
      sendEventLog({ eventType: 'SEAT_LEAVE_START', inputMethod, identifier, success: true, resultAction: 'SEAT_LEAVE_START', studentName: result.studentName });
      return {
        name: result.studentName,
        message: '좌석 이탈 신청이 완료되었습니다\n꼭 복귀처리를 해주세요!!',
      };
    } catch (err) {
      sendEventLog({ eventType: 'SEAT_LEAVE_START', inputMethod, identifier, success: false, errorMessage: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }, [scanTarget?.reasonId, resolveIdentifier, resolveInputMethod]);

  const getScanAction = () => {
    if (!scanTarget) return undefined;
    if (scanTarget.actionId === 'tag') return handleTagAction;
    if (scanTarget.actionId === 'leave-seat') return handleSeatLeaveAction;
    return undefined;
  };

  const getPendingConfirm = () => {
    if (!scanTarget) return undefined;
    if (scanTarget.actionId === 'tag') return handleTagConfirm;
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
      // 휴대폰 미소지 → 먼저 CardScanModal로 학생 식별
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'no-phone', label: '휴대폰 미소지' });
      return;
    }
    if (actionId === 'seat-change') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'seat-change', label: '좌석 변경' });
      return;
    }
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId, label });
  };

  return (
    <div className={styles.page}>
      <div className={styles.topSection}>
        <Header onAdminAccess={() => setShowAdmin(true)} />

        <div className={styles.infoSection}>
          <NoticeSection />
          <RankingSection storeName={session.storeName} />
        </div>
      </div>

      <QuickMenu onMenuClick={handleMenuClick} />

      <AdBanner />

      {showNoCard && (
        <NoCardModal
          onClose={() => setShowNoCard(false)}
          onSelect={(method) => {
            setShowNoCard(false);
            setScanResult(null);
            setQrResult(null);
            const label = method === 'seatLabel' ? '좌석 번호로 인증' : '휴대폰 뒷자리로 인증';
            setScanTarget({ actionId: 'tag', label, keypadOnly: true, defaultKeypadMode: method });
          }}
        />
      )}

      {showSeatLeaveReason && (
        <SeatLeaveReasonModal
          onClose={() => setShowSeatLeaveReason(false)}
          onSelect={handleSeatLeaveReasonSelect}
        />
      )}

      {showMealPlan && (
        <WeeklyMealModal onClose={() => setShowMealPlan(false)} />
      )}

      {showRemoteApply && (
        <RemoteApplyModal
          onClose={() => setShowRemoteApply(false)}
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
          onPendingConfirm={getPendingConfirm()}
        />
      )}

      {/* 휴대폰 미소지 - 학생 식별 후 날짜/옵션 선택 */}
      {phoneSubmissionStudent && (
        <PhoneSubmissionModal
          identifier={phoneSubmissionStudent.identifier}
          studentName={phoneSubmissionStudent.name}
          onClose={() => setPhoneSubmissionStudent(null)}
        />
      )}

      {/* 좌석 변경 - 학생 식별 후 좌석 선택 */}
      {seatChangeStudent && (
        <SeatChangeModal
          student={seatChangeStudent}
          onClose={() => setSeatChangeStudent(null)}
        />
      )}

      {studentInfoTarget && (
        <StudentInfoModal
          student={studentInfoTarget}
          onClose={() => setStudentInfoTarget(null)}
        />
      )}

      {showSeatMap && (
        <SeatMapModal onClose={() => setShowSeatMap(false)} />
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
    </div>
  );
}
