import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import blackLogoImg from '../assets/black_logo.png';
import { useSecretTap } from '../hooks/useSecretTap';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { getExamSchedules } from '../api/examScheduleApi';
import type { ExamSchedule } from '../api/examScheduleApi';
import ExitConfirmModal from './ExitConfirmModal';
import { requestKioskExit } from '../utils/kioskExit';
import styles from './Header.module.css';

interface DdayItem {
  label: string;
  examDate: string;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

function calcDday(examDate: string, today: Date): string {
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const target = new Date(examDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-Day';
  return `D+${Math.abs(diff)}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const day = DAY_NAMES[date.getDay()];
  return `${y}.${m}.${d} (${day})`;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${min}:${sec}`;
}

interface HeaderProps {
  storeName?: string;
  onAdminAccess?: () => void;
  cardReaderConnected?: boolean;
}

export default function Header({ storeName, onAdminAccess, cardReaderConnected }: HeaderProps) {
  const { highContrast } = useAccessibility();
  const [ddays, setDdays] = useState<DdayItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const handleLogoTap = useSecretTap(() => {
    onAdminAccess?.();
  });

  const handleTimeTap = useSecretTap(() => {
    setExitConfirmOpen(true);
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const FETCH_INTERVAL_MS = 30 * 1000; // 30초마다 시험일정 갱신
    let cancelled = false;

    const fetchSchedules = () => {
      getExamSchedules()
        .then((list: ExamSchedule[]) => {
          if (cancelled) return;
          setDdays(
            list.map((e) => ({
              label: e.examName,
              examDate: e.examDate,
            })),
          );
        })
        .catch(() => {
          // 조회 실패 시 기존 목록 유지
        });
    };

    fetchSchedules();
    const interval = setInterval(fetchSchedules, FETCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
    <header className={styles.header}>
      <div className={styles.logoSection}>
        <img
          src={highContrast ? blackLogoImg : logoImg}
          alt="D'Lab"
          className={styles.logo}
          onClick={handleLogoTap}
        />
        {storeName && <span className={styles.storeName}>{storeName.replace(/^D'?LAB\s*/i, '')}</span>}
        <span
          className={`${styles.cardReaderStatus} ${cardReaderConnected ? styles.cardReaderStatusOn : styles.cardReaderStatusOff}`}
          aria-label={cardReaderConnected ? '카드리더기 연결' : '카드리더기 미연결'}
        >
          <span className={styles.cardReaderDot} />
          {cardReaderConnected ? '연결' : '미연결'}
        </span>
      </div>
      <div className={styles.rightSection}>
        <div className={styles.datetime} onClick={handleTimeTap}>
          <span>{formatDate(now)}</span>
          <span>{formatTime(now)}</span>
        </div>
        <div className={styles.ddayList}>
          {ddays.map((item, idx) => (
            <span
              key={item.label}
              className={`${styles.ddayTag} ${idx === ddays.length - 1 ? styles.ddayTagPrimary : ''}`}
            >
              <span className={styles.ddayLabel}>{item.label}</span>
              <span className={idx === ddays.length - 1 ? styles.ddayValuePrimary : styles.ddayValue}>{calcDday(item.examDate, now)}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
    {exitConfirmOpen && (
      <ExitConfirmModal
        onCancel={() => setExitConfirmOpen(false)}
        onConfirm={() => {
          setExitConfirmOpen(false);
          void requestKioskExit();
        }}
      />
    )}
    </>
  );
}
