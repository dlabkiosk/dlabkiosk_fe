import { useState } from 'react';
import type { Student } from '../data/mockStudents';
import MealCalendarModal from './MealCalendarModal';
import styles from './StudentInfoModal.module.css';

interface StudentInfoModalProps {
  student: Student;
  onClose: () => void;
}

/** 비대면 신청 구분에 따른 뱃지 스타일 */
function getSubmissionTypeBadge(type: string) {
  switch (type) {
    case '외출': return styles.typeBadgeOuting;
    case '지각': return styles.typeBadgeLate;
    case '조퇴': return styles.typeBadgeEarly;
    case '결석': return styles.typeBadgeAbsence;
    default: return styles.typeBadgeOuting;
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

export default function StudentInfoModal({ student, onClose }: StudentInfoModalProps) {
  const [showMealCalendar, setShowMealCalendar] = useState(false);

  const meals = student.mealApplications ?? [];
  const receipts = student.receipts ?? [];
  const attendance = student.attendanceSummary;
  const phoneSubmissions = student.phoneSubmissions ?? [];
  const points = student.points ?? [];

  if (showMealCalendar) {
    return (
      <MealCalendarModal
        student={student}
        onClose={onClose}
        onBack={() => setShowMealCalendar(false)}
      />
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <button type="button" className={styles.backButton} onClick={onClose} aria-label="닫기">
            ←
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
          {/* 급식 신청 내역 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                급식 신청 내역 <span className={styles.sectionSub}>(당월 급식 신청 여부)</span>
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
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>요일</th>
                  <th>식사 구분</th>
                </tr>
              </thead>
              <tbody>
                {meals.length > 0 ? meals.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.day}</td>
                    <td>{row.mealType}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className={styles.emptyRow}>내역이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* 수납 내역 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>수납내역</h3>
              <button type="button" className={styles.expandButton} aria-label="수납 상세 보기">+</button>
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
                {receipts.length > 0 ? receipts.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.receiptName}</td>
                    <td>{row.suppliedAmount}</td>
                    <td>{row.receivedAmount}</td>
                    <td>{row.unpaidAmount}</td>
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
              <button type="button" className={styles.expandButton} aria-label="출결 상세 보기">+</button>
            </div>
            {attendance ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>결석</th>
                    <th>조퇴</th>
                    <th>외출</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {attendance.absenceCount > 0 ? (
                        <span className={`${styles.typeBadge} ${styles.typeBadgeAbsence}`}>{attendance.absenceCount}회</span>
                      ) : '0회'}
                    </td>
                    <td>
                      {attendance.earlyLeaveCount > 0 ? (
                        <span className={`${styles.typeBadge} ${styles.typeBadgeEarly}`}>{attendance.earlyLeaveCount}회</span>
                      ) : '0회'}
                    </td>
                    <td>
                      {attendance.outingCount > 0 ? (
                        <span className={`${styles.typeBadge} ${styles.typeBadgeOuting}`}>{attendance.outingCount}회</span>
                      ) : '0회'}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className={styles.emptyText}>내역이 없습니다</p>
            )}
          </section>

          {/* 상벌점 정보 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                상·벌점 정보 <span className={styles.sectionSub}>(당월 누적 정보)</span>
              </h3>
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
                {points.length > 0 ? points.map((row, i) => (
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

          {/* 비대면 신청 현황 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>비대면 신청 현황</h3>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>신청시간</th>
                  <th>구분</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {phoneSubmissions.length > 0 ? phoneSubmissions.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatTime(row.submittedAt)}</td>
                    <td>
                      <span className={`${styles.typeBadge} ${getSubmissionTypeBadge(row.submissionType)}`}>
                        {row.submissionType}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadge(row.memo)}`}>
                        {getStatusLabel(row.memo) || '-'}
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
        </div>
      </div>
    </div>
  );
}
