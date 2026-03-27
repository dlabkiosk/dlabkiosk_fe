import { useCallback, useEffect, useState } from 'react';
import { getStudyRankings, getAllStoreRankings } from '../api/rankingApi';
import type { DsaRankingItem, AllStoreRankingItem } from '../api/rankingApi';
import ranking1stIcon from '../assets/ranking_1st.png';
import ranking2ndIcon from '../assets/ranking_2nd.png';
import ranking3rdIcon from '../assets/ranking_3rd.png';
import styles from './RankingSection.module.css';

interface RankingSectionProps {
  storeName: string;
}

type Tab = 'store' | 'all';

const RANK_ICONS = [ranking1stIcon, ranking2ndIcon, ranking3rdIcon];
const DEFAULT_COUNT = 5;
const MODAL_COUNT = 10;

export default function RankingSection({ storeName }: RankingSectionProps) {
  const [tab, setTab] = useState<Tab>('store');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<Tab>('store');

  // 지점 랭킹
  const [storeList, setStoreList] = useState<DsaRankingItem[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);

  // 전지점 랭킹
  const [allList, setAllList] = useState<AllStoreRankingItem[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    getStudyRankings()
      .then((res) => setStoreList(res.rankingList?.data ?? []))
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, []);

  const loadAllRankings = useCallback(() => {
    if (allLoaded) return;
    setAllLoading(true);
    getAllStoreRankings()
      .then((res) => {
        setAllList(res.rankings ?? []);
        setAllLoaded(true);
      })
      .catch(() => {})
      .finally(() => setAllLoading(false));
  }, [allLoaded]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'all') loadAllRankings();
  };

  const handleModalTabChange = (t: Tab) => {
    setModalTab(t);
    if (t === 'all') loadAllRankings();
  };

  const openModal = () => {
    setModalTab(tab);
    setShowModal(true);
  };

  const shortName = storeName.split(' ').pop() ?? storeName;
  const loading = tab === 'store' ? storeLoading : allLoading;
  const modalLoading = modalTab === 'store' ? storeLoading : allLoading;

  const renderStoreList = (list: DsaRankingItem[], count: number) => (
    <ul className={styles.rankList}>
      {list.length > 0 ? (
        list.slice(0, count).map((entry, idx) => (
          <li key={idx} className={styles.rankItem}>
            {idx < 3 ? (
              <img src={RANK_ICONS[idx]} alt={`${idx + 1}위`} className={styles.rankIcon} />
            ) : (
              <span className={styles.rankNumber}>{idx + 1}</span>
            )}
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
  );

  const renderAllList = (list: AllStoreRankingItem[], count: number) => (
    <ul className={styles.rankList}>
      {list.length > 0 ? (
        list.slice(0, count).map((entry) => (
          <li key={entry.rank} className={styles.rankItem}>
            {entry.rank <= 3 ? (
              <img src={RANK_ICONS[entry.rank - 1]} alt={`${entry.rank}위`} className={styles.rankIcon} />
            ) : (
              <span className={styles.rankNumber}>{entry.rank}</span>
            )}
            <span className={styles.rankName}>
              {entry.studentName}
              <span className={styles.rankStore}>{entry.storeName.replace(/^DLAB\s*/i, '')}</span>
            </span>
            <span className={styles.rankTime}>{entry.studyTime}</span>
          </li>
        ))
      ) : (
        <li className={styles.rankItem}>
          <span className={styles.rankName}>데이터 없음</span>
        </li>
      )}
    </ul>
  );

  return (
    <>
      <section className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>순공 랭킹</h2>
          <button
            type="button"
            className={styles.moreButton}
            aria-label="순공 랭킹 더보기"
            onClick={openModal}
          >
            +
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'store' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('store')}
          >
            {shortName}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('all')}
          >
            전지점
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>로딩 중...</p>
        ) : tab === 'store' ? (
          renderStoreList(storeList, DEFAULT_COUNT)
        ) : (
          renderAllList(allList, DEFAULT_COUNT)
        )}
      </section>

      {/* 모달 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>순공 랭킹 TOP 10</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${modalTab === 'store' ? styles.tabActive : ''}`}
                onClick={() => handleModalTabChange('store')}
              >
                {shortName}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${modalTab === 'all' ? styles.tabActive : ''}`}
                onClick={() => handleModalTabChange('all')}
              >
                전지점
              </button>
            </div>

            <div className={styles.modalBody}>
              {modalLoading ? (
                <p className={styles.loading}>로딩 중...</p>
              ) : modalTab === 'store' ? (
                renderStoreList(storeList, MODAL_COUNT)
              ) : (
                renderAllList(allList, MODAL_COUNT)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
