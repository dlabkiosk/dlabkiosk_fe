import logoImg from '../assets/logo.png';
import { useSecretTap } from '../hooks/useSecretTap';
import styles from './Header.module.css';

interface DdayItem {
  label: string;
  dday: string;
}

const MOCK_DDAYS: DdayItem[] = [
  { label: '수능', dday: 'D-100' },
  { label: '모의고사', dday: 'D-50' },
];

interface HeaderProps {
  onAdminAccess?: () => void;
}

export default function Header({ onAdminAccess }: HeaderProps) {
  const handleLogoTap = useSecretTap(() => {
    onAdminAccess?.();
  });

  return (
    <header className={styles.header}>
      <img
        src={logoImg}
        alt="D'Lab"
        className={styles.logo}
        onClick={handleLogoTap}
      />
      <div className={styles.ddayList}>
        {MOCK_DDAYS.map((item) => (
          <span key={item.label} className={styles.ddayTag}>
            {item.label} {item.dday}
          </span>
        ))}
      </div>
    </header>
  );
}
