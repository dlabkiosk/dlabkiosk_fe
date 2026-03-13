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

interface HeaderProps {
  onAdminAccess?: () => void;
}

export default function Header({ onAdminAccess }: HeaderProps) {
  const [ddays, setDdays] = useState<DdayItem[]>([]);

  const handleLogoTap = useSecretTap(() => {
    onAdminAccess?.();
  });

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
      <img
        src={logoImg}
        alt="D'Lab"
        className={styles.logo}
        onClick={handleLogoTap}
      />
      <div className={styles.ddayList}>
        {ddays.map((item) => (
          <span key={item.label} className={styles.ddayTag}>
            {item.label} {item.dday}
          </span>
        ))}
      </div>
    </header>
  );
}
