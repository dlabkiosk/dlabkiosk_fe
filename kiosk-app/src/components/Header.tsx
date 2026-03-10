import logoImg from '../assets/logo.png';
import styles from './Header.module.css';

interface DdayItem {
  label: string;
  dday: string;
}

const MOCK_DDAYS: DdayItem[] = [
  { label: '수능', dday: 'D-100' },
  { label: '모의고사', dday: 'D-50' },
];

export default function Header() {
  return (
    <header className={styles.header}>
      <img src={logoImg} alt="D'Lab" className={styles.logo} />
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
