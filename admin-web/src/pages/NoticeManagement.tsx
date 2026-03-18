import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuMegaphone, LuSearch, LuPlus } from 'react-icons/lu';
import { getNotices } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import styles from './NoticeManagement.module.css';

const CATEGORY_OPTIONS = ['전체공지', '일반공지', '긴급공지'];
const ITEMS_PER_PAGE = 10;

export default function NoticeManagement() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('전체공지');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotices();
      setNotices(data);
    } catch {
      setError('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const filteredNotices = notices.filter((n) => {
    if (appliedSearch.trim()) {
      if (!n.title.toLowerCase().includes(appliedSearch.toLowerCase())) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / ITEMS_PER_PAGE));
  const pageNotices = filteredNotices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSearch = () => {
    setAppliedSearch(searchText);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (iso: string) => iso.slice(0, 10);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuMegaphone className={styles.pageTitleIcon} />
          <h1 className={styles.pageTitle}>공지 관리</h1>
        </div>
      </div>

      {/* Content Card */}
      <div className={styles.contentCard}>
        {/* Filter Row */}
        <div className={styles.filterRow}>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => navigate('/notices/new')}
          >
            <LuPlus />
            <span>새 공지 작성</span>
          </button>

          <select
            className={styles.categorySelect}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="검색어를 입력해주세요"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
            >
              <LuSearch />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingMessage}>불러오는 중...</div>
        ) : error ? (
          <div className={styles.errorMessage}>{error}</div>
        ) : (
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input type="checkbox" />
                </th>
                <th>No</th>
                <th className={styles.titleCell}>제목</th>
                <th>날짜</th>
                <th>관리자</th>
              </tr>
            </thead>
            <tbody>
              {pageNotices.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={5}>등록된 공지사항이 없습니다.</td>
                </tr>
              ) : (
                pageNotices.map((notice, idx) => (
                  <tr key={notice.id}>
                    <td className={styles.checkboxCol}>
                      <input type="checkbox" />
                    </td>
                    <td>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td
                      className={styles.titleCell}
                      onClick={() => navigate(`/notices/${notice.id}`)}
                    >
                      {notice.title}
                    </td>
                    <td>{formatDate(notice.createdAt)}</td>
                    <td>{notice.storeName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`${styles.pageButton} ${page === currentPage ? styles.pageButtonActive : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
