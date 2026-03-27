import { useEffect, useState } from 'react';
import { LuPin } from 'react-icons/lu';
import { getNotices } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import styles from './NoticeSection.module.css';

const DEFAULT_COUNT = 3;
const PAGE_SIZE = 10;

export default function NoticeSection() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNotices();
        if (!cancelled) setNotices(data);
      } catch {
        // 조회 실패 시 빈 목록 유지
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowList(false);
  };

  const handleBackToList = () => {
    setSelectedNotice(null);
    setShowList(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>공지사항</h2>
        <button
          type="button"
          className={styles.moreButton}
          aria-label="공지사항 더보기"
          onClick={() => { setPage(0); setShowList(true); }}
        >
          +
        </button>
      </div>
      <ul className={styles.list}>
        {loading ? (
          <li className={styles.item}>불러오는 중...</li>
        ) : notices.length === 0 ? (
          <li className={styles.item}>등록된 공지가 없습니다.</li>
        ) : (
          notices.slice(0, DEFAULT_COUNT).map((notice) => (
            <li key={notice.id} className={styles.item}>
              {notice.pinned && <LuPin className={styles.pinIcon} />}
              {notice.title}
            </li>
          ))
        )}
      </ul>

      {/* 공지사항 리스트 모달 */}
      {showList && (
        <div className={styles.modalOverlay} onClick={() => setShowList(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>공지사항</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowList(false)}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              {notices.length === 0 ? (
                <p className={styles.emptyText}>등록된 공지가 없습니다.</p>
              ) : (
                <ul className={styles.modalList}>
                  {notices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((notice) => (
                    <li key={notice.id} className={styles.modalListItem}>
                      <button
                        type="button"
                        className={styles.modalItem}
                        onClick={() => handleNoticeClick(notice)}
                      >
                        <span className={styles.modalItemTitle}>
                          {notice.pinned && <LuPin className={styles.pinIcon} />}
                          {notice.title}
                        </span>
                        <span className={styles.modalItemDate}>{formatDate(notice.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {notices.length > PAGE_SIZE && (
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
                    {page + 1} / {Math.ceil(notices.length / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={(page + 1) * PAGE_SIZE >= notices.length}
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

      {/* 공지사항 상세 모달 */}
      {selectedNotice && (
        <div className={styles.modalOverlay} onClick={() => setSelectedNotice(null)}>
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
                onClick={() => setSelectedNotice(null)}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailHeader}>
                <h4 className={styles.detailTitle}>
                  {selectedNotice.pinned && <LuPin className={styles.pinIcon} />}
                  {selectedNotice.title}
                </h4>
                <span className={styles.detailDate}>{formatDate(selectedNotice.createdAt)}</span>
              </div>
              <div className={styles.detailContent}>
                {selectedNotice.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
