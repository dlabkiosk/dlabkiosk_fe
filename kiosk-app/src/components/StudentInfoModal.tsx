import { useState } from 'react';
import type { Student } from '../data/mockStudents';
import type { SeatChangeRequest, PhoneSubmission, SeatLeave, Receipt, PointRecord } from '../api/studentApi';
import MealCalendarModal from './MealCalendarModal';
import styles from './StudentInfoModal.module.css';

interface StudentInfoModalProps {
  student: Student;
  onClose: () => void;
}

/** 휴대폰 미소지 신청 종류 라벨 */
function getPhoneSubmissionTypeLabel(type: string) {
  switch (type) {
    case 'DAILY': return '당일';
    case 'PERIOD': return '기간';
    case 'NO_PHONE': return '휴대폰 없음';
    default: return type;
  }
}

/** 상태에 따른 뱃지 스타일 */
function getStatusBadge(status: string) {
  if (status === 'APPROVED' || status === '승인') return styles.statusApproved;
  if (status === 'PENDING' || status === '대기') return styles.statusPending;
  if (status === 'REJECTED' || status === '거절') return styles.statusRejected;
  return styles.statusPending;
}

/** 상태 라벨 */
function getStatusLabel(status: string) {
  if (status === 'APPROVED') return '승인';
  if (status === 'PENDING') return '대기';
  if (status === 'REJECTED') return '거절';
  return status;
}

/** 시간 포맷 (ISO → HH:mm) */
function formatTime(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 날짜 포맷 (yyyy-mm-dd → yyyy-mm-dd 유지 또는 ISO → yyyy-mm-dd) */
function formatDate(date: string) {
  if (!date) return '-';
  return date.slice(0, 10);
}

/** 금액 포맷 (1000단위 콤마) */
function formatMoney(value: string) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('ko-KR');
}

/** 이탈 시간 계산 (분 단위) */
function formatDuration(startIso: string, endIso: string | null) {
  if (!startIso) return '-';
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return '-';
  if (!endIso) return '이탈중';
  const end = new Date(endIso);
  if (isNaN(end.getTime())) return '-';
  const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}분`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}


type DetailView = 'seatChange' | 'phoneSubmission' | 'seatLeave' | 'receipt' | 'point';

const DETAIL_PAGE_SIZE = 10;

export default function StudentInfoModal({ student, onClose }: StudentInfoModalProps) {
  const [showMealCalendar, setShowMealCalendar] = useState(false);
  const [detailView, setDetailView] = useState<DetailView | null>(null);
  const [detailPage, setDetailPage] = useState(1);

  const todayDate = new Date().getDate();
  const todayMeals = (student.mealApplications ?? []).filter((m) => Number(m.day) === todayDate);
  const receipts = student.receipts ?? [];
  const attendance = student.attendanceSummary;
  const allSeatChangeRequests = student.seatChangeRequests ?? [];
  const allPhoneSubmissions = student.phoneSubmissions ?? [];
  const allSeatLeaves = student.seatLeaves ?? [];
  const points = student.points ?? [];

  const openDetail = (view: DetailView) => {
    setDetailView(view);
    setDetailPage(1);
  };

  const closeDetail = () => {
    setDetailView(null);
    setDetailPage(1);
  };

  if (showMealCalendar) {
    return (
      <MealCalendarModal
        student={student}
        onClose={onClose}
        onBack={() => setShowMealCalendar(false)}
      />
    );
  }

  /* ── 상세보기 모달 ── */
  if (detailView) {
    let title = '';
    let totalItems = 0;
    let tableContent: React.ReactNode = null;

    if (detailView === 'seatChange') {
      title = '좌석변경 신청 내역';
      totalItems = allSeatChangeRequests.length;
      const paged = allSeatChangeRequests.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);
      tableContent = (
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>신청일</th>
              <th>현재좌석</th>
              <th>희망좌석</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((row: SeatChangeRequest, i: number) => (
              <tr key={row.id}>
                <td>{(detailPage - 1) * DETAIL_PAGE_SIZE + i + 1}</td>
                <td>{formatDate(row.createdAt)}</td>
                <td>{row.currentSeatLabel}</td>
                <td>{[row.desiredSeat1Label, row.desiredSeat2Label, row.desiredSeat3Label].filter(Boolean).join(' / ')}</td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusBadge(row.status)}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    } else if (detailView === 'phoneSubmission') {
      title = '휴대폰 미소지 신청 내역';
      totalItems = allPhoneSubmissions.length;
      const paged = allPhoneSubmissions.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);
      tableContent = (
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>신청일</th>
              <th>종류</th>
              <th>기간</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((row: PhoneSubmission, i: number) => (
              <tr key={row.id}>
                <td>{(detailPage - 1) * DETAIL_PAGE_SIZE + i + 1}</td>
                <td>{formatDate(row.submittedAt)}</td>
                <td>{getPhoneSubmissionTypeLabel(row.submissionType)}</td>
                <td>{formatDate(row.startDate)} ~ {formatDate(row.endDate)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    } else if (detailView === 'receipt') {
      title = '수납내역';
      totalItems = receipts.length;
      const paged = receipts.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);
      tableContent = (
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>항목</th>
              <th>공급가</th>
              <th>수납액</th>
              <th>미수금</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((row: Receipt, i: number) => (
              <tr key={i}>
                <td>{(detailPage - 1) * DETAIL_PAGE_SIZE + i + 1}</td>
                <td>{row.receiptName}</td>
                <td>{formatMoney(row.suppliedAmount)}</td>
                <td>{formatMoney(row.receivedAmount)}</td>
                <td>{formatMoney(row.unpaidAmount)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    } else if (detailView === 'seatLeave') {
      title = '좌석이탈 내역';
      totalItems = allSeatLeaves.length;
      const paged = allSeatLeaves.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);
      tableContent = (
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>이탈날짜</th>
              <th>이탈 시작 시간</th>
              <th>이탈 시간</th>
              <th>이탈 사유</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((row: SeatLeave, i: number) => (
              <tr key={row.id}>
                <td>{(detailPage - 1) * DETAIL_PAGE_SIZE + i + 1}</td>
                <td>{formatDate(row.startedAt)}</td>
                <td>{formatTime(row.startedAt)}</td>
                <td>{formatDuration(row.startedAt, row.endedAt)}</td>
                <td>{row.reasonName}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    } else if (detailView === 'point') {
      title = '상·벌점 정보';
      totalItems = points.length;
      const paged = points.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);
      tableContent = (
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>일자</th>
              <th>사유</th>
              <th>점수</th>
            </tr>
          </thead>
          <tbody>
            {paged.length > 0 ? paged.map((row: PointRecord, i: number) => (
              <tr key={i}>
                <td>{(detailPage - 1) * DETAIL_PAGE_SIZE + i + 1}</td>
                <td>{formatDate(row.pointDate)}</td>
                <td>{row.reason}</td>
                <td>
                  <span className={row.point >= 0 ? styles.pointPositive : styles.pointNegative}>
                    {row.point > 0 ? `+${row.point}` : row.point}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>내역이 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / DETAIL_PAGE_SIZE));

    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.detailHeader}>
            <div className={styles.detailHeaderTop}>
              <button type="button" className={styles.backButton} onClick={closeDetail} aria-label="뒤로가기">
                ←
              </button>
              <button type="button" className={styles.detailCloseButton} onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>
            <h2 className={styles.detailTitle}>{title}</h2>
          </div>

          <div className={styles.scrollArea}>
            {tableContent}

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={detailPage <= 1}
                  onClick={() => setDetailPage((p) => p - 1)}
                >
                  ‹ 이전
                </button>
                <span className={styles.pageInfo}>{detailPage} / {totalPages}</span>
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={detailPage >= totalPages}
                  onClick={() => setDetailPage((p) => p + 1)}
                >
                  다음 ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── 메인 학적조회 ── */
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 — 우측 상단 X */}
        <div className={styles.header}>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 학생 정보 카드 */}
        <div className={styles.studentCard}>
          <div className={styles.avatar}>
            <span className={styles.avatarIcon}>👤</span>
          </div>
          <div className={styles.studentInfo}>
            <p className={styles.studentName}>{student.name}</p>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>좌석 {student.assignedSeatLabel}</span>
              <span className={styles.badge}>학번 {student.studentNumber}</span>
            </div>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className={styles.scrollArea}>
          {/* 급식 신청 내역 — 오늘만 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                급식 신청 내역 <span className={styles.sectionSub}>(오늘의 급식 신청)</span>
              </h3>
              <button
                type="button"
                className={styles.expandButton}
                onClick={() => setShowMealCalendar(true)}
                aria-label="급식 캘린더 보기"
              >
                +
              </button>
            </div>
            {(() => {
              const now = new Date();
              const todayLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;
              const hasLunch = todayMeals.some((m) => ['중식', '점심', '중식/석식', '점심/저녁', 'LUNCH'].includes(m.mealType));
              const hasDinner = todayMeals.some((m) => ['석식', '저녁', '중식/석식', '점심/저녁', 'DINNER'].includes(m.mealType));
              return (
                <table className={`${styles.table} ${styles.mealTable}`}>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>중식</th>
                      <th>석식</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{todayLabel}</td>
                      <td><span className={hasLunch ? styles.markO : styles.markX}>{hasLunch ? '○' : '✕'}</span></td>
                      <td><span className={hasDinner ? styles.markO : styles.markX}>{hasDinner ? '○' : '✕'}</span></td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </section>

          {/* 수납 내역 — 최신 3개 + 상세보기 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>수납내역</h3>
              <button type="button" className={styles.expandButton} onClick={() => openDetail('receipt')} aria-label="수납 상세 보기">+</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>항목</th>
                  <th>공급가</th>
                  <th>수납액</th>
                  <th>미수금</th>
                </tr>
              </thead>
              <tbody>
                {receipts.length > 0 ? receipts.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.receiptName}</td>
                    <td>{formatMoney(row.suppliedAmount)}</td>
                    <td>{formatMoney(row.receivedAmount)}</td>
                    <td>{formatMoney(row.unpaidAmount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* 출결 사항 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>출결사항</h3>
            </div>
            {attendance ? (
              <table className={`${styles.table} ${styles.attendanceTable}`}>
                <thead>
                  <tr>
                    <th>결석</th>
                    <th>지각</th>
                    <th>조퇴</th>
                    <th>외출</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className={`${styles.typeBadge} ${attendance.absenceCount > 0 ? styles.typeBadgeAbsence : styles.typeBadgeDefault}`}>
                        {attendance.absenceCount}회
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${attendance.lateCount > 0 ? styles.typeBadgeLate : styles.typeBadgeDefault}`}>
                        {attendance.lateCount}회
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${attendance.earlyLeaveCount > 0 ? styles.typeBadgeEarly : styles.typeBadgeDefault}`}>
                        {attendance.earlyLeaveCount}회
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${attendance.outingCount > 0 ? styles.typeBadgeOuting : styles.typeBadgeDefault}`}>
                        {attendance.outingCount}회
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className={styles.emptyText}>내역이 없습니다</p>
            )}
          </section>

          {/* 좌석변경신청 — 최신 3개 + 상세보기 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>좌석변경 신청</h3>
              <button type="button" className={styles.expandButton} onClick={() => openDetail('seatChange')} aria-label="좌석변경 상세 보기">+</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>신청일</th>
                  <th>현재좌석</th>
                  <th>희망좌석</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {allSeatChangeRequests.length > 0 ? allSeatChangeRequests.slice(0, 3).map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.currentSeatLabel}</td>
                    <td>{[row.desiredSeat1Label, row.desiredSeat2Label, row.desiredSeat3Label].filter(Boolean).join(' / ')}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadge(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* 휴대폰 미소지 신청 — 최신 3개 + 상세보기 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>휴대폰 미소지 신청</h3>
              <button type="button" className={styles.expandButton} onClick={() => openDetail('phoneSubmission')} aria-label="휴대폰 미소지 상세 보기">+</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>신청일</th>
                  <th>종류</th>
                  <th>기간</th>
                </tr>
              </thead>
              <tbody>
                {allPhoneSubmissions.length > 0 ? allPhoneSubmissions.slice(0, 3).map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{formatDate(row.submittedAt)}</td>
                    <td>{getPhoneSubmissionTypeLabel(row.submissionType)}</td>
                    <td>{formatDate(row.startDate)} ~ {formatDate(row.endDate)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* 좌석이탈 — 최신 3개 + 상세보기 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>좌석이탈</h3>
              <button type="button" className={styles.expandButton} onClick={() => openDetail('seatLeave')} aria-label="좌석이탈 상세 보기">+</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>이탈날짜</th>
                  <th>이탈 시작 시간</th>
                  <th>이탈 시간</th>
                  <th>이탈 사유</th>
                </tr>
              </thead>
              <tbody>
                {allSeatLeaves.length > 0 ? allSeatLeaves.slice(0, 3).map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{formatDate(row.startedAt)}</td>
                    <td>{formatTime(row.startedAt)}</td>
                    <td>{formatDuration(row.startedAt, row.endedAt)}</td>
                    <td>{row.reasonName}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* 상벌점 정보 — 최신 3개 + 상세보기 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                상·벌점 정보 <span className={styles.sectionSub}>(당월 누적 정보)</span>
              </h3>
              <button type="button" className={styles.expandButton} onClick={() => openDetail('point')} aria-label="상벌점 상세 보기">+</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>사유</th>
                  <th>점수</th>
                </tr>
              </thead>
              <tbody>
                {points.length > 0 ? points.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{formatDate(row.pointDate)}</td>
                    <td>{row.reason}</td>
                    <td>
                      <span className={row.point >= 0 ? styles.pointPositive : styles.pointNegative}>
                        {row.point > 0 ? `+${row.point}` : row.point}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
