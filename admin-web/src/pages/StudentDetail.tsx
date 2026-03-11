import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuUsers, LuArrowLeft } from 'react-icons/lu';
import styles from './StudentDetail.module.css';
import PaymentTab from './student-detail/PaymentTab';
import MealTab from './student-detail/MealTab';
import AttendanceTab from './student-detail/AttendanceTab';

/* ── Mock Data ── */

interface StudentInfo {
  name: string;
  studentId: string;
}

const MOCK_STUDENT_MAP: Record<string, StudentInfo> = {
  '250101': { name: '김예진', studentId: '250101' },
  '250202': { name: '이진규', studentId: '250202' },
  '111111': { name: '김경진', studentId: '111111' },
};

/* ── Tabs ── */

const TABS = [
  '수납현황',
  '급식 신청내역',
  '출결사항',
  '신청사항',
  '순공시간',
  '상/벌점',
  '학생 정보',
] as const;

type TabKey = (typeof TABS)[number];

function PlaceholderTab({ label }: { label: string }) {
  return <div className={styles.emptyContent}>{label} 탭 준비 중입니다.</div>;
}

/* ── Page ── */

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('수납현황');

  const student = studentId ? MOCK_STUDENT_MAP[studentId] : null;
  const displayName = student?.name ?? '알 수 없는 학생';
  const displayId = student?.studentId ?? studentId ?? '';

  const renderTabContent = () => {
    switch (activeTab) {
      case '수납현황':
        return <PaymentTab />;
      case '급식 신청내역':
        return <MealTab studentName={displayName} studentId={displayId} />;
      case '출결사항':
        return <AttendanceTab />;
      case '신청사항':
        return <PlaceholderTab label="신청사항" />;
      case '순공시간':
        return <PlaceholderTab label="순공시간" />;
      case '상/벌점':
        return <PlaceholderTab label="상/벌점" />;
      case '학생 정보':
        return <PlaceholderTab label="학생 정보" />;
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button
          className={styles.backButton}
          type="button"
          onClick={() => navigate('/students')}
        >
          <LuArrowLeft />
        </button>
        <LuUsers className={styles.pageHeaderIcon} />
        <h2 className={styles.pageTitle}>
          {displayName} 학생
        </h2>
        <span className={styles.studentId}>({displayId})</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.contentCard}>
        {renderTabContent()}
      </div>
    </div>
  );
}
