import { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import { useSecretTap } from '../hooks/useSecretTap';
import { getExamSchedules } from '../api/examScheduleApi';
import type { ExamSchedule } from '../api/examScheduleApi';
import styles from './Header.module.css';

interface DdayItem {
  label: string;
  dday: string;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

function calcDday(examDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(examDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
}

export default function Header({ storeName, onAdminAccess }: HeaderProps) {
  const [ddays, setDdays] = useState<DdayItem[]>([]);
  const [now, setNow] = useState(() => new Date());

  const handleLogoTap = useSecretTap(() => {
    onAdminAccess?.();
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getExamSchedules()
      .then((list: ExamSchedule[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = list.filter((e) => {
          const d = new Date(e.examDate);
          d.setHours(0, 0, 0, 0);
          return d.getTime() >= today.getTime();
        });

        setDdays(
          upcoming.map((e) => ({
            label: e.examName,
            dday: calcDday(e.examDate),
          })),
        );
      })
      .catch(() => {
        setDdays([]);
      });
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.datetime}>
        <span>{formatDate(now)}</span>
        <span>{formatTime(now)}</span>
      </div>
      <div className={styles.mainRow}>
        <div className={styles.logoSection}>
          <img
            src={logoImg}
            alt="D'Lab"
            className={styles.logo}
            onClick={handleLogoTap}
          />
          {storeName && <span className={styles.storeName}>{storeName.replace(/^D'?LAB\s*/i, '')}</span>}
        </div>
        <div className={styles.ddayList}>
          {ddays.map((item, idx) => (
            <span
              key={item.label}
              className={`${styles.ddayTag} ${idx === ddays.length - 1 ? styles.ddayTagPrimary : ''}`}
            >
              {item.label} <span className={idx === ddays.length - 1 ? styles.ddayValuePrimary : styles.ddayValue}>{item.dday}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
