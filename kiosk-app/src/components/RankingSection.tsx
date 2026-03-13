import { useEffect, useState } from 'react';
import { getStudyRankings } from '../api/rankingApi';
import type { DsaRankingItem } from '../api/rankingApi';
import styles from './RankingSection.module.css';

interface RankingSectionProps {
  storeName: string;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

function getRankDisplay(rank: number): string {
  if (rank <= 3) return RANK_MEDALS[rank - 1];
  return String(rank);
}

export default function RankingSection({ storeName }: RankingSectionProps) {
  const [rankingList, setRankingList] = useState<DsaRankingItem[]>([]);
  const [firstPlace, setFirstPlace] = useState<DsaRankingItem | null>(null);
  const [avgStudyTime, setAvgStudyTime] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudyRankings()
      .then((res) => {
        setRankingList(res.rankingList?.data ?? []);
        setFirstPlace(res.firstPlace?.data?.[0] ?? null);
        setAvgStudyTime(res.averageStudyTime?.study_tm ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // storeName에서 간결한 지점명 추출 (예: "대성학원 강남점" → "강남점")
  const shortName = storeName.split(' ').pop() ?? storeName;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>순공 랭킹</h2>
        <button type="button" className={styles.moreButton} aria-label="순공 랭킹 더보기">
          +
        </button>
      </div>

      <div className={styles.subtitle}>{shortName} 저번 주 순공시간 랭킹</div>

      {loading ? (
        <p className={styles.loading}>로딩 중...</p>
      ) : (
        <>
          {(firstPlace || avgStudyTime) && (
            <div className={styles.summaryRow}>
              {firstPlace && (
                <span className={styles.summaryItem}>
                  🏆 1위 {firstPlace.std_nm ?? '–'}
                </span>
              )}
              {avgStudyTime && (
                <span className={styles.summaryItem}>
                  평균 {avgStudyTime}
                </span>
              )}
            </div>
          )}

          <ul className={styles.rankList}>
            {rankingList.length > 0 ? (
              rankingList.slice(0, 6).map((entry, idx) => (
                <li key={idx} className={styles.rankItem}>
                  <span className={styles.rankBadge}>{getRankDisplay(idx + 1)}</span>
                  <span className={styles.rankName}>{entry.std_nm ?? '–'}</span>
                  <span className={styles.rankTime}>{entry.att_tm ?? ''}</span>
                </li>
              ))
            ) : (
              <li className={styles.rankItem}>
                <span className={styles.rankName}>데이터 없음</span>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
