import { useState } from 'react';
import styles from './RankingSection.module.css';

type RankingTab = 'branch' | 'local';

interface RankingEntry {
  rank: number;
  name: string;
}

const MOCK_BRANCH_RANKING: RankingEntry[] = [
  { rank: 1, name: '김OO' },
  { rank: 2, name: '김OO' },
  { rank: 3, name: '김OO' },
  { rank: 4, name: '이OO' },
  { rank: 5, name: '송OO' },
  { rank: 6, name: '신OO' },
];

const MOCK_LOCAL_RANKING: RankingEntry[] = [
  { rank: 1, name: '박OO' },
  { rank: 2, name: '김OO' },
  { rank: 3, name: '김OO' },
  { rank: 4, name: '수OO' },
  { rank: 5, name: '최OO' },
  { rank: 6, name: '서OO' },
];

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

function getRankDisplay(rank: number): string {
  if (rank <= 3) return RANK_MEDALS[rank - 1];
  return String(rank);
}

export default function RankingSection() {
  const [activeTab, setActiveTab] = useState<RankingTab>('branch');

  const branchData = MOCK_BRANCH_RANKING;
  const localData = MOCK_LOCAL_RANKING;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>순공 랭킹</h2>
        <button type="button" className={styles.moreButton} aria-label="순공 랭킹 더보기">
          +
        </button>
      </div>

      <div className={styles.tabRow}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'branch' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('branch')}
        >
          지점 전체랭킹
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'local' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('local')}
        >
          목동 랭킹
        </button>
      </div>

      <div className={styles.columns}>
        <ul className={styles.rankList}>
          {branchData.map((entry) => (
            <li key={entry.rank} className={styles.rankItem}>
              <span className={styles.rankBadge}>{getRankDisplay(entry.rank)}</span>
              <span className={styles.rankName}>{entry.name}</span>
            </li>
          ))}
        </ul>
        <ul className={styles.rankList}>
          {localData.map((entry) => (
            <li key={entry.rank} className={styles.rankItem}>
              <span className={styles.rankBadge}>{getRankDisplay(entry.rank)}</span>
              <span className={styles.rankName}>{entry.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
