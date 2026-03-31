import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus } from 'react-icons/lu';
import dashboardIcon from '../assets/dashboard_active.png';
import todayIcon from '../assets/dashboard_today.png';
import attendanceIcon from '../assets/attendance_active.png';
import seatleaveIcon from '../assets/seatleave_active.png';
import mealIcon from '../assets/meal_active.png';
import seatchangeIcon from '../assets/dashboard_seatchange.png';
import noticeIcon from '../assets/notice_active.png';
import { getDashboardAll } from '../api/dashboardApi';
import type { DashboardData } from '../api/dashboardApi';
import styles from './Dashboard.module.css';

/* ── Components ── */

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onMore?: () => void;
}

function DashboardCard({ title, icon, children, onMore }: CardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardIcon}>{icon}</span>
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        {onMore && (
          <button className={styles.moreButton} type="button" onClick={onMore}>
            <LuPlus className={styles.moreIcon} />
            <span>더보기</span>
          </button>
        )}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

/* ── Page ── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardAll()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const daily = data?.dailyOperation;
  const att = data?.attendanceSummary;
  const seat = data?.seatLeaveSummary;
  const mealSummary = data?.mealTagSummary;
  const mealRecords = data?.mealTagRecords ?? [];
  const seatChanges = data?.seatChangeRequests ?? [];
  const notices = data?.notices ?? [];

  const placeholder = loading ? '...' : '–';

  return (
    <div className={styles.dashboard}>
      {/* <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={dashboardIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>대시보드</h2>
        </div>
      </div> */}
      {/* Row 1 */}
      <div className={styles.row2}>
        <DashboardCard title="일일 운영 현황" icon={<img src={todayIcon} alt="" className={styles.cardIconImg} />}>
          <StatRow label="등록 학생" value={daily ? `${daily.registeredStudents}명` : placeholder} />
          <StatRow label="금일 등원" value={daily ? `${daily.todayAttendance}명` : placeholder} />
          <StatRow label="식사 신청" value={daily ? `${daily.mealRequests}명` : placeholder} />
        </DashboardCard>

        <DashboardCard title="출결 현황 요약" icon={<img src={attendanceIcon} alt="" className={styles.cardIconImg} />} onMore={() => navigate('/attendance')}>
          <StatRow label="출석" value={att ? `${att.present}명` : placeholder} />
          <StatRow label="조퇴" value={att ? `${att.earlyLeave}명` : placeholder} />
          <StatRow label="결석" value={att ? `${att.absent}명` : placeholder} />
          <StatRow label="외출" value={att ? `${att.outing}명` : placeholder} />
          <StatRow label="지각" value={att ? `${att.late}명` : placeholder} />
        </DashboardCard>
      </div>

      {/* Row 2 */}
      <div className={styles.row2}>
        <DashboardCard title="좌석 이탈 현황" icon={<img src={seatleaveIcon} alt="" className={styles.cardIconImg} />} onMore={() => navigate('/seat-leaves')}>
          <StatRow label="금일 이탈 횟수" value={seat ? `${seat.totalLeave}회` : placeholder} />
          <StatRow label="복귀 대기" value={seat ? `${seat.waitingReturn}명` : placeholder} />
        </DashboardCard>

        <DashboardCard title="식사 태그 현황" icon={<img src={mealIcon} alt="" className={styles.cardIconImg} />} onMore={() => navigate('/meals')}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>식사 구분</th>
                <th>태그 시간</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>로딩 중...</td></tr>
              ) : mealRecords.length > 0 ? (
                mealRecords.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.studentName}</td>
                    <td>{row.mealType}</td>
                    <td>{row.taggedAt}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className={styles.emptyCell}>식사 태그 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>
      </div>

      {/* Row 3 */}
      <div className={styles.row2}>
        <DashboardCard title="좌석 변경 신청현황" icon={<img src={seatchangeIcon} alt="" className={styles.cardIconImg} />} onMore={() => navigate('/seats?view=waiting')}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>현재 → 희망</th>
                <th>신청일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>로딩 중...</td></tr>
              ) : seatChanges.length > 0 ? (
                seatChanges.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>{row.studentName}</td>
                    <td>
                      {row.currentSeatLabel} → {row.desiredSeat1Label}
                      {row.desiredSeat2Label && `, ${row.desiredSeat2Label}`}
                      {row.desiredSeat3Label && `, ${row.desiredSeat3Label}`}
                    </td>
                    <td>{row.requestedAt.slice(0, 10)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className={styles.emptyCell}>신청 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>

        <DashboardCard title="공지사항" icon={<img src={noticeIcon} alt="" className={styles.cardIconImg} />} onMore={() => navigate('/notices')}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>번호</th>
                <th style={{ width: '60%' }} className={styles.textLeft}>공지명</th>
                <th style={{ width: '30%' }}>공지일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>로딩 중...</td></tr>
              ) : notices.length > 0 ? (
                notices.slice(0, 5).map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/notices/${row.id}`)}
                  >
                    <td>{idx + 1}</td>
                    <td className={`${styles.truncateCell} ${styles.textLeft}`}>{row.title}</td>
                    <td>{row.createdAt.slice(0, 10)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className={styles.emptyCell}>등록된 공지사항이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>
      </div>
    </div>
  );
}
