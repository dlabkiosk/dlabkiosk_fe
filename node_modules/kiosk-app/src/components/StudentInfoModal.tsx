import { useState } from 'react';
import type { Student } from '../data/mockStudents';
import MealCalendarModal from './MealCalendarModal';
import styles from './StudentInfoModal.module.css';

/** 급식 신청 내역 */
interface MealRecord {
  date: string;
  lunch: '○' | '✕';
  dinner: '○' | '✕';
}

/** 수납 내역 */
interface PaymentRecord {
  date: string;
  description: string;
  amount: string;
  category: string;
}

/** 출결 특이 사항 */
interface AttendanceNote {
  date: string;
  type: string;
  time: string;
  reason: string;
}

/** 비대면 신청 사항 */
interface RemoteApplyRecord {
  date: string;
  type: string;
  timeOrDate: string;
  status: string;
}

/** 상벌점 정보 */
interface MeritRecord {
  date: string;
  type: string;
  item: string;
  point: string;
}

// 목 데이터
const MOCK_MEALS: MealRecord[] = [
  { date: '2026-03-04', lunch: '○', dinner: '✕' },
];

const MOCK_PAYMENTS: PaymentRecord[] = [
  { date: '2026-03-07', description: '2026 교습비', amount: '350,000원', category: '교습비' },
  { date: '2026-03-04', description: '3월 독서실 이용료', amount: '120,000원', category: '독서실비' },
  { date: '2026-03-03', description: '3월 급식비', amount: '90,000원', category: '급식비' },
];

const MOCK_ATTENDANCE_NOTES: AttendanceNote[] = [
  { date: '2026-03-07', type: '지각', time: '09:12', reason: '교통 지연' },
  { date: '2026-03-05', type: '외출', time: '14:20', reason: '병원' },
  { date: '2026-03-04', type: '조퇴', time: '18:30', reason: '개인 사정' },
];

const MOCK_REMOTE_APPLIES: RemoteApplyRecord[] = [
  { date: '2026-03-07', type: '외출', timeOrDate: '14:00', status: '승인' },
  { date: '2026-03-05', type: '조퇴', timeOrDate: '16:00', status: '승인' },
  { date: '2026-03-04', type: '결석', timeOrDate: '03/06', status: '대기' },
];

const MOCK_MERITS: MeritRecord[] = [
  { date: '2026-03-07', type: '벌점', item: '지각', point: '-1'},
  { date: '2026-03-05', type: '상점', item: '주말 등원', point: '+1'},
];

interface StudentInfoModalProps {
  student: Student;
  onClose: () => void;
}

export default function StudentInfoModal({ student, onClose }: StudentInfoModalProps) {
  const [showMealCalendar, setShowMealCalendar] = useState(false);

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
          <span className={styles.headerTitle}>D'Lab</span>
        </div>

        {/* 학생 정보 카드 */}
        <div className={styles.studentCard}>
          <div className={styles.avatar}>
            <span className={styles.avatarIcon}>👤</span>
          </div>
          <div className={styles.studentInfo}>
            <p className={styles.studentName}>{student.name}</p>
            <p className={styles.studentMeta}>{student.className} 학번: {student.studentId}</p>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className={styles.scrollArea}>
          {/* 급식 신청 내역 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                급식 신청 내역 <span className={styles.sectionSub}>(당일 급식 신청 여부)</span>
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
                  <th>일자</th>
                  <th>점심 급식</th>
                  <th>저녁 급식</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MEALS.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.lunch}</td>
                    <td>{row.dinner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 수납 내역 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>수납 내역 <span className={styles.sectionSub}>(당일 납부 내역)</span></h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>내역</th>
                  <th>금액</th>
                  <th>구분</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYMENTS.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.description}</td>
                    <td>{row.amount}</td>
                    <td>{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 출결 특이 사항 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>출결 특이 사항</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>구분</th>
                  <th>시간</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ATTENDANCE_NOTES.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.type}</td>
                    <td>{row.time}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 비대면 신청 사항 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>비대면 신청 사항 <span className={styles.sectionSub}>(문의는 데스크로 오세요.)</span></h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>구분</th>
                  <th>시간/날짜</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_REMOTE_APPLIES.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.type}</td>
                    <td>{row.timeOrDate}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 상벌점 정보 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>상벌점 정보</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>일자</th>
                  <th>구분</th>
                  <th>항목</th>
                  <th>점수</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MERITS.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.type}</td>
                    <td>{row.item}</td>
                    <td>{row.point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
