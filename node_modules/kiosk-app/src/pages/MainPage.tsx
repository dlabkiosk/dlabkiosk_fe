import { useCallback, useState } from 'react';
import Header from '../components/Header';
import NoticeSection from '../components/NoticeSection';
import RankingSection from '../components/RankingSection';
import QuickMenu from '../components/QuickMenu';
import AdBanner from '../components/AdBanner';
import AttendanceModal from '../components/AttendanceModal';
import CardScanModal from '../components/CardScanModal';
import type { ScanActionParams } from '../components/CardScanModal';
import StudentInfoModal from '../components/StudentInfoModal';
import RemoteApplyModal from '../components/RemoteApplyModal';
import ReasonSelectModal from '../components/ReasonSelectModal';
import TimeSelectModal from '../components/TimeSelectModal';
import DateSelectModal from '../components/DateSelectModal';
import ApprovalWaitingModal from '../components/ApprovalWaitingModal';
import SeatLeaveReasonModal from '../components/SeatLeaveReasonModal';
import SeatLeaveInputModal from '../components/SeatLeaveInputModal';
import WeeklyMealModal from '../components/WeeklyMealModal';
import PhoneSubmissionModal from '../components/PhoneSubmissionModal';
import KioskAdminPanel from '../components/KioskAdminPanel';
import { checkIn, checkOut } from '../api/attendanceApi';
import type { KioskSession } from '../api/kioskAuthApi';
import type { Student } from '../data/mockStudents';
import { useCardScanner } from '../hooks/useCardScanner';
import type { CardScanResult } from '../hooks/useCardScanner';
import { useQrScanner } from '../hooks/useQrScanner';
import type { QrScanResult } from '../hooks/useQrScanner';
import styles from './MainPage.module.css';

/** 외출/조퇴/결석 멀티스텝 흐름 */
type RemoteFlowStep = 'reason' | 'time' | 'date' | 'scan' | 'waiting';

interface RemoteFlow {
  action: string;
  label: string;
  step: RemoteFlowStep;
  reason?: string;
  time?: string;
  date?: string;
  studentName?: string;
}

const NEEDS_MULTI_STEP = ['go-out', 'early-leave', 'absence'];

interface MainPageProps {
  session: KioskSession;
  onLogout: () => void;
}

export default function MainPage({ session, onLogout }: MainPageProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showRemoteApply, setShowRemoteApply] = useState(false);
  const [showSeatLeaveReason, setShowSeatLeaveReason] = useState(false);
  const [seatLeaveInput, setSeatLeaveInput] = useState<{ mode: 'start' | 'end'; reasonId?: number; reasonLabel?: string } | null>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showPhoneSubmission, setShowPhoneSubmission] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ actionId: string; label: string; secureClose?: boolean } | null>(null);
  const [scanResult, setScanResult] = useState<CardScanResult | null>(null);
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [studentInfoTarget, setStudentInfoTarget] = useState<Student | null>(null);
  const [remoteFlow, setRemoteFlow] = useState<RemoteFlow | null>(null);

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

  const handleMenuClick = (menuId: string) => {
    if (menuId === 'attendance') {
      setShowAttendance(true);
    } else if (menuId === 'remote-apply') {
      setShowRemoteApply(true);
    } else if (menuId === 'meal-plan') {
      setShowMealPlan(true);
    } else if (menuId === 'student-info') {
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId: 'student-info', label: '학적 조회' });
    }
  };

  const handleStudentFound = useCallback((student: Student) => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
    setStudentInfoTarget(student);
  }, []);

  const handleAttendanceSelect = (actionId: string, label: string) => {
    setShowAttendance(false);
    if (actionId === 'leave-seat') {
      setShowSeatLeaveReason(true);
      return;
    }
    if (actionId === 'return') {
      setSeatLeaveInput({ mode: 'end' });
      return;
    }
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId, label });
  };

  // 좌석 이탈 사유 선택 → 좌석번호 입력
  const handleSeatLeaveReasonSelect = (reasonId: number, reasonLabel: string) => {
    setShowSeatLeaveReason(false);
    setSeatLeaveInput({ mode: 'start', reasonId, reasonLabel });
  };

  const handleScanClose = () => {
    setScanTarget(null);
    setScanResult(null);
    setQrResult(null);
  };

  // 등원/하원 액션
  const handleCheckInAction = useCallback(async (params: ScanActionParams) => {
    const result = await checkIn(params);
    return { name: result.studentName, message: result.messages?.[0] };
  }, []);

  const handleCheckOutAction = useCallback(async (params: ScanActionParams) => {
    const result = await checkOut(params);
    return { name: result.studentName, message: result.messages?.[0] };
  }, []);

  const getScanAction = () => {
    if (!scanTarget) return undefined;
    if (scanTarget.actionId === 'check-in') return handleCheckInAction;
    if (scanTarget.actionId === 'check-out') return handleCheckOutAction;
    return undefined;
  };

  const handleStartMealTagging = (label: string) => {
    setShowAdmin(false);
    setScanResult(null);
    setQrResult(null);
    setScanTarget({ actionId: 'meal-tagging', label, secureClose: true });
  };

  // 비대면 신청 항목 선택
  const handleRemoteSelect = (actionId: string, label: string) => {
    setShowRemoteApply(false);
    if (actionId === 'no-phone') {
      setShowPhoneSubmission(true);
      return;
    }
    if (NEEDS_MULTI_STEP.includes(actionId)) {
      setRemoteFlow({ action: actionId, label, step: 'reason' });
    } else {
      // 좌석 변경 등 → 바로 카드 스캔
      setScanResult(null);
      setQrResult(null);
      setScanTarget({ actionId, label });
    }
  };

  // 사유 선택 → 시간 or 날짜 선택
  const handleReasonSelect = (_reasonId: string, _reasonLabel: string) => {
    if (!remoteFlow) return;
    const nextStep: RemoteFlowStep = remoteFlow.action === 'absence' ? 'date' : 'time';
    setRemoteFlow({ ...remoteFlow, reason: _reasonLabel, step: nextStep });
  };

  // 시간 선택 완료 → 카드 스캔
  const handleTimeSubmit = (time: string) => {
    if (!remoteFlow) return;
    setRemoteFlow({ ...remoteFlow, time, step: 'scan' });
    setScanResult(null);
    setQrResult(null);
  };

  // 날짜 선택 완료 → 카드 스캔
  const handleDateSubmit = (date: string) => {
    if (!remoteFlow) return;
    setRemoteFlow({ ...remoteFlow, date, step: 'scan' });
    setScanResult(null);
    setQrResult(null);
  };

  // 비대면 신청 카드 인증 → 승인 대기
  const handleRemoteStudentFound = useCallback((student: Student) => {
    setRemoteFlow((prev) => prev ? { ...prev, step: 'waiting', studentName: student.name } : null);
  }, []);

  // 전체 흐름 닫기
  const handleRemoteFlowClose = () => {
    setRemoteFlow(null);
    setScanResult(null);
    setQrResult(null);
  };

  // 뒤로 가기
  const handleRemoteFlowBack = () => {
    if (!remoteFlow) return;
    if (remoteFlow.step === 'reason') {
      setRemoteFlow(null);
      setShowRemoteApply(true);
    } else if (remoteFlow.step === 'time' || remoteFlow.step === 'date') {
      setRemoteFlow({ ...remoteFlow, step: 'reason', reason: undefined });
    } else if (remoteFlow.step === 'scan') {
      const prevStep: RemoteFlowStep = remoteFlow.action === 'absence' ? 'date' : 'time';
      setRemoteFlow({ ...remoteFlow, step: prevStep, time: undefined, date: undefined });
    }
  };

  // 비대면 신청 제목 (사유 선택 모달용)
  const getReasonTitle = () => {
    if (!remoteFlow) return '';
    if (remoteFlow.action === 'absence') return '결석';
    return '외출/조퇴';
  };

  // 비대면 신청 카드스캔 제목
  const getRemoteScanTitle = () => {
    if (!remoteFlow) return '';
    return remoteFlow.label;
  };

  return (
    <div className={styles.page}>
      <Header onAdminAccess={() => setShowAdmin(true)} />

      <div className={styles.infoSection}>
        <NoticeSection />
        <RankingSection storeName={session.storeName} />
      </div>

      <QuickMenu onMenuClick={handleMenuClick} />

      <AdBanner />

      {showAttendance && (
        <AttendanceModal
          onClose={() => setShowAttendance(false)}
          onSelect={handleAttendanceSelect}
        />
      )}

      {showSeatLeaveReason && (
        <SeatLeaveReasonModal
          onClose={() => setShowSeatLeaveReason(false)}
          onBack={() => {
            setShowSeatLeaveReason(false);
            setShowAttendance(true);
          }}
          onSelect={handleSeatLeaveReasonSelect}
        />
      )}

      {seatLeaveInput && (
        <SeatLeaveInputModal
          mode={seatLeaveInput.mode}
          reasonId={seatLeaveInput.reasonId}
          reasonLabel={seatLeaveInput.reasonLabel}
          onClose={() => setSeatLeaveInput(null)}
        />
      )}

      {showMealPlan && (
        <WeeklyMealModal onClose={() => setShowMealPlan(false)} />
      )}

      {showPhoneSubmission && (
        <PhoneSubmissionModal onClose={() => setShowPhoneSubmission(false)} />
      )}

      {showRemoteApply && (
        <RemoteApplyModal
          onClose={() => setShowRemoteApply(false)}
          onSelect={handleRemoteSelect}
        />
      )}

      {/* 비대면 신청 멀티스텝 */}
      {remoteFlow?.step === 'reason' && (
        <ReasonSelectModal
          title={getReasonTitle()}
          onClose={handleRemoteFlowClose}
          onBack={handleRemoteFlowBack}
          onSelect={handleReasonSelect}
        />
      )}

      {remoteFlow?.step === 'time' && (
        <TimeSelectModal
          title={remoteFlow.label}
          onClose={handleRemoteFlowClose}
          onBack={handleRemoteFlowBack}
          onSubmit={handleTimeSubmit}
        />
      )}

      {remoteFlow?.step === 'date' && (
        <DateSelectModal
          title={remoteFlow.label}
          onClose={handleRemoteFlowClose}
          onBack={handleRemoteFlowBack}
          onSubmit={handleDateSubmit}
        />
      )}

      {remoteFlow?.step === 'scan' && (
        <CardScanModal
          title={getRemoteScanTitle()}
          scanResult={scanResult}
          qrResult={qrResult}
          onClose={handleRemoteFlowClose}
          onStudentFound={handleRemoteStudentFound}
        />
      )}

      {remoteFlow?.step === 'waiting' && remoteFlow.studentName && (
        <ApprovalWaitingModal
          studentName={remoteFlow.studentName}
          onClose={handleRemoteFlowClose}
        />
      )}

      {/* 일반 카드스캔 (출결/학적조회/식사태깅 등) */}
      {scanTarget && (
        <CardScanModal
          title={scanTarget.label}
          scanResult={scanResult}
          qrResult={qrResult}
          secureClose={scanTarget.secureClose}
          onClose={handleScanClose}
          onStudentFound={scanTarget.actionId === 'student-info' ? handleStudentFound : undefined}
          onAction={getScanAction()}
        />
      )}

      {studentInfoTarget && (
        <StudentInfoModal
          student={studentInfoTarget}
          onClose={() => setStudentInfoTarget(null)}
        />
      )}

      {showAdmin && (
        <KioskAdminPanel
          connected={connected}
          error={error}
          session={session}
          onConnect={connect}
          onClose={() => setShowAdmin(false)}
          onStartMealTagging={handleStartMealTagging}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
