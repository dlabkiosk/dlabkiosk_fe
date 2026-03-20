import { useEffect, useState } from 'react';
import { getStudyRankings } from '../api/rankingApi';
import type { DsaRankingItem } from '../api/rankingApi';
import ranking1stIcon from '../assets/ranking_1st.png';
import ranking2ndIcon from '../assets/ranking_2nd.png';
import ranking3rdIcon from '../assets/ranking_3rd.png';
import styles from './RankingSection.module.css';

interface RankingSectionProps {
  storeName: string;
}

const RANK_ICONS = [ranking1stIcon, ranking2ndIcon, ranking3rdIcon];

export default function RankingSection({ storeName }: RankingSectionProps) {
  const [rankingList, setRankingList] = useState<DsaRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudyRankings()
      .then((res) => {
        setRankingList(res.rankingList?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // storeName에서 간결한 지점명 추출 (예: "대성학원 강남점" → "강남점")
  const shortName = storeName.split(' ').pop() ?? storeName;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>순공 랭킹({shortName})</h2>
        <button type="button" className={styles.moreButton} aria-label="순공 랭킹 더보기">
          +
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>로딩 중...</p>
      ) : (
        <ul className={styles.rankList}>
          {rankingList.length > 0 ? (
            rankingList.slice(0, 3).map((entry, idx) => (
              <li key={idx} className={styles.rankItem}>
                <img src={RANK_ICONS[idx]} alt={`${idx + 1}위`} className={styles.rankIcon} />
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
      )}
    </section>
  );
}
