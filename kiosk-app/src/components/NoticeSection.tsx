import { useEffect, useState } from 'react';
import { LuPin } from 'react-icons/lu';
import { getNotices } from '../api/noticeApi';
import type { Notice, SubjectNotice } from '../api/noticeApi';
import { useAccessibility } from '../contexts/AccessibilityContext';
import {
  VOICE_NOTICE_OPEN,
  VOICE_NOTICE_DETAIL,
  VOICE_NOTICE_FULL_GENERAL,
  VOICE_NOTICE_FULL_SUBJECT,
  VOICE_BACK_TO_MAIN,
} from '../constants/voiceGuide';
import plusButtonIcon from '../assets/plus-button.png';
import styles from './NoticeSection.module.css';

const DEFAULT_COUNT = 3;
const MODAL_MAX = 5;
const PAGE_SIZE = 10;

export default function NoticeSection() {
  const { speak } = useAccessibility();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [subjectNotices, setSubjectNotices] = useState<SubjectNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<(Notice | SubjectNotice) | null>(null);
  const [selectedIsSubject, setSelectedIsSubject] = useState(false);

  /* 전체보기 (페이지네이션 포함) */
  const [fullViewType, setFullViewType] = useState<'general' | 'subject' | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pinned' | 'normal'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const allNotices = await getNotices();
        if (!cancelled) {
          // 분류 규칙:
          //  1) 제목이 [전체] 으로 시작하면 → 전체 공지 (제목 본문에 [안내] 등 다른 대괄호가 있어도 무관)
          //  2) 그 외 [xxx] 으로 시작하면 → 과목 공지 (xxx = 과목명)
          //  3) 어떤 [xxx] 접두사도 없으면 → 전체 공지
          const generalOnly: Notice[] = [];
          const parsedSubject: SubjectNotice[] = [];
          for (const n of allNotices) {
            if (/^\[전체\]\s*/.test(n.title)) {
              generalOnly.push(n);
              continue;
            }
            const m = n.title.match(/^\[([^\]]+)\]\s*/);
            if (m) {
              parsedSubject.push({
                id: n.id,
                storeId: n.storeId,
                subjectName: m[1],
                title: n.title,
                content: n.content,
                active: n.active,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
              });
            } else {
              generalOnly.push(n);
            }
          }
          setNotices(generalOnly);
          setSubjectNotices(parsedSubject);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredNotices = notices.filter((n) => {
    if (filter === 'pinned') return n.pinned;
    if (filter === 'normal') return !n.pinned;
    return true;
  });

  const FILTER_LABELS: Record<'all' | 'pinned' | 'normal', string> = {
    all: '전체',
    pinned: '고정 공지',
    normal: '일반 공지',
  };

  const handleFilterChange = (value: 'all' | 'pinned' | 'normal') => {
    setFilter(value);
    setFilterOpen(false);
    setPage(0);
  };

  const handleNoticeClick = (notice: Notice | SubjectNotice, isSubject: boolean) => {
    setSelectedNotice(notice);
    setSelectedIsSubject(isSubject);
    setShowList(false);
    setFullViewType(null);
    speak(VOICE_NOTICE_DETAIL(notice.title));
  };

  const handleBackToList = () => {
    setSelectedNotice(null);
    if (fullViewType) {
      /* 전체보기 상태였으면 전체보기로 복귀 */
      speak(fullViewType === 'general' ? VOICE_NOTICE_FULL_GENERAL : VOICE_NOTICE_FULL_SUBJECT);
    } else {
      setShowList(true);
      speak(VOICE_NOTICE_OPEN);
    }
  };

  const handleBackToMain = () => {
    setFullViewType(null);
    setShowList(true);
    speak(VOICE_NOTICE_OPEN);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const openModal = () => {
    setShowList(true);
    setFullViewType(null);
    setPage(0);
    setFilter('all');
    setFilterOpen(false);
    speak(VOICE_NOTICE_OPEN);
  };

  const openFullView = (type: 'general' | 'subject') => {
    setFullViewType(type);
    setShowList(false);
    setPage(0);
    setFilter('all');
    setFilterOpen(false);
    speak(type === 'general' ? VOICE_NOTICE_FULL_GENERAL : VOICE_NOTICE_FULL_SUBJECT);
  };

  /* 메인 화면용: 고정공지 우선 + 나머지는 전체/과목 통합 최신순 */
  const mainList = (() => {
    const pinned = notices.filter((n) => n.pinned);
    const nonPinned: (Notice | SubjectNotice)[] = [
      ...notices.filter((n) => !n.pinned),
      ...subjectNotices,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...nonPinned];
  })();

  /* 전체보기 목록 */
  const fullList = fullViewType === 'general' ? filteredNotices : subjectNotices;
  const pagedFullList = fullList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ── 공지 아이템 렌더 헬퍼 ── */
  const renderNoticeItem = (notice: Notice | SubjectNotice, isSubject: boolean) => (
    <li key={notice.id} className={styles.modalListItem}>
      <button
        type="button"
        className={styles.modalItem}
        onClick={() => handleNoticeClick(notice, isSubject)}
      >
        <span className={styles.modalItemTitle}>
          {!isSubject && (notice as Notice).pinned && <LuPin className={styles.pinIcon} />}
          {notice.title}
        </span>
        <span className={styles.modalItemDate}>{formatDate(notice.createdAt)}</span>
      </button>
    </li>
  );

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>공지사항</h2>
        <img
          src={plusButtonIcon}
          alt="공지사항 더보기"
          className={styles.moreIcon}
          onClick={openModal}
          role="button"
          tabIndex={0}
        />
      </div>
      <ul className={styles.list}>
        {loading ? (
          <li className={styles.item}>불러오는 중...</li>
        ) : mainList.length === 0 ? (
          <li className={styles.item}>등록된 공지가 없습니다.</li>
        ) : (
          mainList.slice(0, DEFAULT_COUNT).map((notice) => (
            <li key={notice.id} className={styles.item}>
              {'pinned' in notice && notice.pinned && <LuPin className={styles.pinIcon} />}
              {notice.title}
            </li>
          ))
        )}
      </ul>

      {/* ── 메인 모달: 두 섹션 동시 표시 ── */}
      {showList && (
        <div className={styles.modalOverlay} onClick={() => { setShowList(false); speak(VOICE_BACK_TO_MAIN); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>공지사항</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setShowList(false); speak(VOICE_BACK_TO_MAIN); }}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* 전체 공지사항 섹션 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>전체 공지사항</h4>
                  {notices.length > MODAL_MAX && (
                    <button type="button" className={styles.sectionMore} onClick={() => openFullView('general')}>
                      더보기 &#x203A;
                    </button>
                  )}
                </div>
                {notices.length === 0 ? (
                  <p className={styles.emptyText}>등록된 공지가 없습니다.</p>
                ) : (
                  <ul className={styles.modalList}>
                    {notices.slice(0, MODAL_MAX).map((n) => renderNoticeItem(n, false))}
                  </ul>
                )}
              </div>

              {/* 과목 공지사항 섹션 */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h4 className={styles.sectionTitle}>과목 공지사항</h4>
                  {subjectNotices.length > MODAL_MAX && (
                    <button type="button" className={styles.sectionMore} onClick={() => openFullView('subject')}>
                      더보기 &#x203A;
                    </button>
                  )}
                </div>
                {subjectNotices.length === 0 ? (
                  <p className={styles.emptyText}>등록된 과목 공지가 없습니다.</p>
                ) : (
                  <ul className={styles.modalList}>
                    {subjectNotices.slice(0, MODAL_MAX).map((n) => renderNoticeItem(n, true))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 전체보기 모달 (페이지네이션) ── */}
      {fullViewType && !selectedNotice && (
        <div className={styles.modalOverlay} onClick={() => { setFullViewType(null); speak(VOICE_BACK_TO_MAIN); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackToMain}
                aria-label="돌아가기"
              >
                &#x2039;
              </button>
              <h3 className={styles.modalTitle}>
                {fullViewType === 'general' ? '전체 공지사항' : '과목 공지사항'}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setFullViewType(null); speak(VOICE_BACK_TO_MAIN); }}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              {fullViewType === 'general' && (
                <div className={styles.filterRow}>
                  <div className={styles.filterWrapper}>
                    <button
                      type="button"
                      className={styles.filterButton}
                      onClick={() => setFilterOpen((v) => !v)}
                    >
                      {FILTER_LABELS[filter]}
                      <span className={`${styles.filterArrow} ${filterOpen ? styles.filterArrowOpen : ''}`}>
                        &#x25BC;
                      </span>
                    </button>
                    {filterOpen && (
                      <div className={styles.filterDropdown}>
                        {(['all', 'pinned', 'normal'] as const).map((key) => (
                          <button
                            key={key}
                            type="button"
                            className={`${styles.filterOption} ${filter === key ? styles.filterOptionActive : ''}`}
                            onClick={() => handleFilterChange(key)}
                          >
                            {FILTER_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {fullList.length === 0 ? (
                <p className={styles.emptyText}>해당하는 공지가 없습니다.</p>
              ) : (
                <ul className={styles.modalList}>
                  {pagedFullList.map((n) => renderNoticeItem(n, fullViewType === 'subject'))}
                </ul>
              )}
              {fullList.length > PAGE_SIZE && (
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
                    {page + 1} / {Math.ceil(fullList.length / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    className={styles.pageButton}
                    disabled={(page + 1) * PAGE_SIZE >= fullList.length}
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
        <div className={styles.modalOverlay} onClick={() => { setSelectedNotice(null); speak(VOICE_BACK_TO_MAIN); }}>
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
              <h3 className={styles.modalTitle}>
                {selectedIsSubject ? '과목 공지사항' : '공지사항'}
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setSelectedNotice(null); speak(VOICE_BACK_TO_MAIN); }}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailHeader}>
                <h4 className={styles.detailTitle}>
                  {!selectedIsSubject && (selectedNotice as Notice).pinned && <LuPin className={styles.pinIcon} />}
                  {selectedNotice.title}
                </h4>
                <span className={styles.detailDate}>{formatDate(selectedNotice.createdAt)}</span>
              </div>
              <div className={styles.detailContent}>
                {selectedNotice.content}
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
        </div>
      )}
    </section>
  );
}
