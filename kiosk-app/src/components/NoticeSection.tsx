import { useEffect, useMemo, useState } from 'react';
import { LuPin, LuCirclePlus } from 'react-icons/lu';
import { getNotices } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import { getNoticeCategories } from '../api/noticeCategoryApi';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  VOICE_NOTICE_OPEN,
  VOICE_NOTICE_DETAIL,
  VOICE_BACK_TO_MAIN,
} from '../constants/voiceGuide';
import styles from './NoticeSection.module.css';

const DEFAULT_COUNT = 3;
const PAGE_SIZE = 10;

export default function NoticeSection() {
  const { speak } = useAccessibility();
  const [allNotices, setAllNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  /* 필터 & 페이지네이션 */
  const [filterCategory, setFilterCategory] = useState<string>('전체 보기');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getNotices()
      .then((data) => { if (!cancelled) setAllNotices(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    getNoticeCategories()
      .then((list) => { if (!cancelled) setCategoryOptions(list.map((c) => c.name)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* 필터 적용된 목록 */
  const filteredNotices = useMemo(() => {
    if (filterCategory === '전체 보기') return allNotices;
    return allNotices.filter((n) => n.categoryName === filterCategory);
  }, [allNotices, filterCategory]);

  const pagedNotices = filteredNotices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));

  /* 메인 화면용: 고정 우선 + 최신순, 상위 3개 */
  const mainList = useMemo(() => {
    const pinned = allNotices.filter((n) => n.pinned);
    const nonPinned = allNotices.filter((n) => !n.pinned);
    return [...pinned, ...nonPinned];
  }, [allNotices]);

  const handleFilterChange = (cat: string) => {
    setFilterCategory(cat);
    setFilterOpen(false);
    setPage(0);
  };

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowList(false);
    speak(VOICE_NOTICE_DETAIL(notice.title));
  };

  const handleBackToList = () => {
    setSelectedNotice(null);
    setShowList(true);
    speak(VOICE_NOTICE_OPEN);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  /** 제목 표시: categoryName이 있으면 [카테고리] 제목 형태 */
  const displayTitle = (notice: Notice) =>
    notice.categoryName ? `[${notice.categoryName}] ${notice.title}` : notice.title;

  const openModal = () => {
    setShowList(true);
    setSelectedNotice(null);
    setPage(0);
    setFilterCategory('전체 보기');
    setFilterOpen(false);
    speak(VOICE_NOTICE_OPEN);
  };

  const closeAll = () => {
    setShowList(false);
    setSelectedNotice(null);
    speak(VOICE_BACK_TO_MAIN);
  };

  /* ── 공지 아이템 렌더 헬퍼 ── */
  const renderNoticeItem = (notice: Notice) => (
    <li key={notice.id} className={styles.modalListItem}>
      <button
        type="button"
        className={styles.modalItem}
        onClick={() => handleNoticeClick(notice)}
      >
        <span className={styles.modalItemTitle}>
          {notice.pinned && <LuPin className={styles.pinIcon} />}
          {displayTitle(notice)}
        </span>
        <span className={styles.modalItemDate}>{formatDate(notice.createdAt)}</span>
      </button>
    </li>
  );

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>공지사항</h2>
        <LuCirclePlus
          className={styles.moreIcon}
          onClick={openModal}
          role="button"
          tabIndex={0}
          aria-label="공지사항 더보기"
        />
      </div>
      <ul className={styles.list}>
        {loading ? (
          <li className={styles.item}>불러오는 중...</li>
        ) : mainList.length === 0 ? (
          <li className={styles.item}>등록된 공지가 없습니다.</li>
        ) : (
          mainList.slice(0, DEFAULT_COUNT).map((notice) => (
            <li
              key={notice.id}
              className={styles.item}
              onClick={() => handleNoticeClick(notice)}
              role="button"
              tabIndex={0}
            >
              {notice.pinned && <LuPin className={styles.pinIcon} />}
              {displayTitle(notice)}
            </li>
          ))
        )}
      </ul>

      {/* ── 공지사항 목록 모달 ── */}
      {showList && (
        <div className={styles.modalOverlay} onClick={closeAll}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>공지사항</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeAll}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* 필터 드롭다운 */}
              <div className={styles.filterRow}>
                <div className={styles.filterWrapper}>
                  <button
                    type="button"
                    className={styles.filterButton}
                    onClick={() => setFilterOpen((v) => !v)}
                  >
                    {filterCategory}
                    <span className={`${styles.filterArrow} ${filterOpen ? styles.filterArrowOpen : ''}`}>
                      &#x25BC;
                    </span>
                  </button>
                  {filterOpen && (
                    <div className={styles.filterDropdown}>
                      <button
                        type="button"
                        className={`${styles.filterOption} ${filterCategory === '전체 보기' ? styles.filterOptionActive : ''}`}
                        onClick={() => handleFilterChange('전체 보기')}
                      >
                        전체 보기
                      </button>
                      {categoryOptions.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.filterOption} ${filterCategory === p ? styles.filterOptionActive : ''}`}
                          onClick={() => handleFilterChange(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {filteredNotices.length === 0 ? (
                <p className={styles.emptyText}>등록된 공지가 없습니다.</p>
              ) : (
                <ul className={styles.modalList}>
                  {pagedNotices.map((n) => renderNoticeItem(n))}
                </ul>
              )}

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    &#x2039;
                  </button>
                  <span className={styles.pageInfo}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    &#x203A;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 공지사항 상세 모달 ── */}
      {selectedNotice && (
        <div className={styles.modalOverlay} onClick={closeAll}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackToList}
                aria-label="목록으로"
              >
                &#x2039;
              </button>
              <h3 className={styles.modalTitle}>공지사항</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeAll}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody} style={{ flex: 1, overflowY: 'auto' }}>
              <div className={styles.detailHeader}>
                <h4 className={styles.detailTitle}>
                  {selectedNotice.pinned && <LuPin className={styles.pinIcon} />}
                  {displayTitle(selectedNotice)}
                </h4>
                <span className={styles.detailDate}>{formatDate(selectedNotice.createdAt)}</span>
              </div>
              <div className={styles.detailContent}>
                {selectedNotice.content}
              </div>
            </div>
            <div className={styles.detailFooter}>
              <button
                type="button"
                className={styles.backToListButton}
                onClick={handleBackToList}
              >
                목록으로
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
