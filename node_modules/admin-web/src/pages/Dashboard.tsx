import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuChartBar, LuCalendarCheck, LuDoorOpen, LuTrophy, LuUtensils, LuMegaphone, LuClock, LuPlus } from 'react-icons/lu';
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

/* ── 식사 타입 한글 변환 ── */
function mealTypeLabel(type: string): string {
  switch (type) {
    case 'BREAKFAST': return '조식';
    case 'LUNCH': return '중식';
    case 'DINNER': return '석식';
    default: return type;
  }
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
  const ranking = data?.studyRanking;
  const meals = data?.mealTags ?? [];
  const notices = data?.notices ?? [];
  const approvals = data?.pendingApprovals ?? [];

  const placeholder = loading ? '...' : '–';

  return (
    <div className={styles.dashboard}>
      {/* Row 1 */}
      <div className={styles.row3}>
        <DashboardCard title="일일 운영 현황" icon={<LuChartBar />}>
          <StatRow label="등록 학생" value={daily ? `${daily.registeredStudents}명` : placeholder} />
          <StatRow label="금일 등원" value={daily ? `${daily.todayAttendance}명` : placeholder} />
          <StatRow label="식사 신청" value={daily ? `${daily.mealRequests}명` : placeholder} />
        </DashboardCard>

        <DashboardCard title="출결 현황 요약" icon={<LuCalendarCheck />}>
          <StatRow label="출석" value={att ? `${att.present}명` : placeholder} />
          <StatRow label="조퇴" value={att ? `${att.earlyLeave}명` : placeholder} />
          <StatRow label="결석" value={att ? `${att.absent}명` : placeholder} />
          <StatRow label="외출" value={att ? `${att.outing}명` : placeholder} />
          <StatRow label="지각" value={att ? `${att.late}명` : placeholder} />
        </DashboardCard>

        <DashboardCard title="좌석 이탈 현황" icon={<LuDoorOpen />}>
          <StatRow label="금일 이탈 횟수" value={seat ? `${seat.totalLeave}회` : placeholder} />
          <StatRow label="복귀 대기" value={seat ? `${seat.waitingReturn}명` : placeholder} />
        </DashboardCard>
      </div>

      {/* Row 2 */}
      <div className={styles.row2}>
        <DashboardCard title="순공 랭킹 요약" icon={<LuTrophy />}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th>이름</th>
                <th>순공 시간</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>로딩 중...</td></tr>
              ) : ranking?.data && ranking.data.length > 0 ? (
                ranking.data.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}등</td>
                    <td>{row.std_nm ?? '–'}</td>
                    <td>{row.att_tm ?? '–'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>

        <DashboardCard title="식사 태그 현황" icon={<LuUtensils />}>
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
              ) : meals.length > 0 ? (
                meals.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.name}</td>
                    <td>{mealTypeLabel(row.mealType)}</td>
                    <td>{row.taggedAt ? row.taggedAt.slice(11, 16) : '–'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>
      </div>

      {/* Row 3 */}
      <div className={styles.row2}>
        <DashboardCard title="공지사항" icon={<LuMegaphone />} onMore={() => navigate('/notices')}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th>
                <th>공지명</th>
                <th>공지일</th>
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
                    <td>{row.title}</td>
                    <td>{row.createdAt.slice(0, 10)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3}>등록된 공지사항이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </DashboardCard>
      </div>
    </div>
  );
}
