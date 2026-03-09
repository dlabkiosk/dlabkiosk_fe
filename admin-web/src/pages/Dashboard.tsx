import { LuChartBar, LuCalendarCheck, LuDoorOpen, LuTrophy, LuUtensils, LuMegaphone, LuClock, LuPlus } from 'react-icons/lu';
import styles from './Dashboard.module.css';

/* ── Mock Data ── */
const DAILY_STATS = [
  { label: '등록 학생', value: '120명' },
  { label: '금일 등원', value: '30명' },
  { label: '자습 이용', value: '24명' },
  { label: '식사 신청', value: '18명' },
];

const ATTENDANCE_STATS = [
  { label: '출석', value: '30명' },
  { label: '조퇴', value: '2명' },
  { label: '결석', value: '3명' },
  { label: '외출', value: '1명' },
  { label: '지각', value: '6명' },
];

const SEAT_LEAVE_STATS = [
  { label: '현재 이탈', value: '3명' },
  { label: '복귀 대기', value: '1명' },
];

const RANKING_DATA = [
  { rank: '1등', name: '홍길동', time: '88시간 53분' },
  { rank: '2등', name: '홍길동', time: '70시간 50분' },
  { rank: '3등', name: '홍길동', time: '68시간 53분' },
];

const MEAL_TAG_DATA = [
  { name: '홍길동', status: '식사 완료', time: '12:10' },
  { name: '홍길동', status: '식사 완료', time: '12:07' },
  { name: '홍길동', status: '식사 완료', time: '12:05' },
];

const NOTICE_DATA = [
  { id: 21, title: '[안내] 03/15 학원 모의고사 일정이 안내', date: '2026-03-08' },
  { id: 20, title: '[공지] 03/12 학원 휴원 일정이 안내', date: '2026-03-07' },
  { id: 19, title: '[안내] 3월 식사 신청 기간이 시작', date: '2026-03-06' },
  { id: 18, title: '[공지] 출결 관리 기준이 일부 변경', date: '2026-03-05' },
];

const APPROVAL_DATA = [
  { id: 21, type: '결석', content: '03/12 결석 사유 제출', requester: '홍길동', date: '2026-03-08' },
  { id: 20, type: '결석', content: '03/12 결석 사유 제출', requester: '홍길동', date: '2026-03-08' },
  { id: 19, type: '결석', content: '03/12 결석 사유 제출', requester: '홍길동', date: '2026-03-08' },
  { id: 18, type: '결석', content: '03/12 결석 사유 제출', requester: '홍길동', date: '2026-03-08' },
];

/* ── Components ── */

interface CardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function DashboardCard({ title, icon, children }: CardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardIcon}>{icon}</span>
          <h3 className={styles.cardTitle}>{title}</h3>
        </div>
        <button className={styles.moreButton} type="button">
          <LuPlus className={styles.moreIcon} />
          <span>더보기</span>
        </button>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
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
  return (
    <div className={styles.dashboard}>
      {/* Row 1 */}
      <div className={styles.row3}>
        <DashboardCard title="일일 운영 현황" icon={<LuChartBar />}>
          {DAILY_STATS.map((stat) => (
            <StatRow key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </DashboardCard>

        <DashboardCard title="출결 현황 요약" icon={<LuCalendarCheck />}>
          {ATTENDANCE_STATS.map((stat) => (
            <StatRow key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </DashboardCard>

        <DashboardCard title="좌석 이탈 현황" icon={<LuDoorOpen />}>
          {SEAT_LEAVE_STATS.map((stat) => (
            <StatRow key={stat.label} label={stat.label} value={stat.value} />
          ))}
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
              {RANKING_DATA.map((row) => (
                <tr key={row.rank}>
                  <td>{row.rank}</td>
                  <td>{row.name}</td>
                  <td>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>

        <DashboardCard title="식사 태그 현황" icon={<LuUtensils />}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>식사 상태</th>
                <th>태그 시간</th>
              </tr>
            </thead>
            <tbody>
              {MEAL_TAG_DATA.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.name}</td>
                  <td>{row.status}</td>
                  <td>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      </div>

      {/* Row 3 */}
      <div className={styles.row2}>
        <DashboardCard title="공지사항" icon={<LuMegaphone />}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th>
                <th>공지명</th>
                <th>공지일</th>
              </tr>
            </thead>
            <tbody>
              {NOTICE_DATA.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.title}</td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>

        <DashboardCard title="승인 대기 건수" icon={<LuClock />}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th>
                <th>요청 유형</th>
                <th>요청 내용</th>
                <th>요청자</th>
                <th>요청일</th>
              </tr>
            </thead>
            <tbody>
              {APPROVAL_DATA.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.type}</td>
                  <td>{row.content}</td>
                  <td>{row.requester}</td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      </div>
    </div>
  );
}
