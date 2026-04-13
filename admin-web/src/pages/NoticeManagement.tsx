import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuArrowUpDown, LuArrowUp, LuArrowDown, LuSettings } from 'react-icons/lu';
import noticeIcon from '../assets/notice_active.png';
import { getNotices, deleteNotice } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import useConfirm from '../hooks/useConfirm';
import NoticeSettingsModal from '../components/NoticeSettingsModal';
import { getSubjects } from '../utils/noticeSubjects';
import styles from './NoticeManagement.module.css';
import f from '../styles/filter.module.css';
import FilterSelect from '../components/FilterSelect';

const ITEMS_PER_PAGE = 10;

export default function NoticeManagement() {
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('전체 보기');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [subjectOptions, setSubjectOptions] = useState(() => ['전체 보기', ...getSubjects()]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');

  useEffect(() => {
    getMe().then((me) => {
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => setStores(list));
      }
    });
  }, []);

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

  /* 정렬 */
  type SortField = 'title' | 'createdAt';
  type SortDir = 'asc' | 'desc';
  const [sort, setSort] = useState<{ field: SortField | null; dir: SortDir }>({ field: null, dir: 'asc' });

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { field, dir: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <LuArrowUpDown className={styles.sortIcon} />;
    return sort.dir === 'asc'
      ? <LuArrowUp className={styles.sortIconActive} />
      : <LuArrowDown className={styles.sortIconActive} />;
  };

  const filteredNotices = useMemo(() => {
    const filtered = notices.filter((n) => {
      if (isAdmin && storeFilter !== '전체') {
        if (n.storeName !== storeFilter) return false;
      }
      if (category !== '전체 보기') {
        const prefix = `[${category}]`;
        if (!n.title.startsWith(prefix)) return false;
      }
      if (searchText.trim()) {
        if (!n.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      // 고정 공지 항상 상단
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // 컬럼 정렬
      if (sort.field) {
        const va = a[sort.field] ?? '';
        const vb = b[sort.field] ?? '';
        const cmp = va.localeCompare(vb);
        return sort.dir === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
  }, [notices, isAdmin, storeFilter, category, searchText, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / ITEMS_PER_PAGE));
  const pageNotices = filteredNotices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const allSelected = filteredNotices.length > 0 && filteredNotices.every((n) => selectedIds.has(n.id));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotices.map((n) => n.id)));
    }
  };
  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    setAppliedSearch(searchText);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (iso: string) => iso.slice(0, 10);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await confirm(`선택한 ${selectedIds.size}건의 공지를 삭제하시겠습니까?`))) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteNotice(id)));
      setSelectedIds(new Set());
      await fetchNotices();
    } catch {
      await alert('일부 공지 삭제에 실패했습니다.');
      await fetchNotices();
    }
  };

  return (
    <div className={styles.page}>
      {showSettings && (
        <NoticeSettingsModal
          onClose={() => setShowSettings(false)}
          onSave={() => { setSubjectOptions(['전체 보기', ...getSubjects()]); setCategory('전체 보기'); }}
        />
      )}
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={noticeIcon} alt="" className={styles.pageTitleIcon} />
          <h1 className={styles.pageTitle}>공지 관리</h1>
        </div>
      </div>

      {/* Filter */}
      <div className={f.filterCard}>
        <div className={f.filterRow}>
          {/* ADMIN 전용: 지점 필터 */}
          {isAdmin && (
            <div className={f.filterGroup}>
              <span className={f.filterLabel}>지점</span>
              <FilterSelect
                value={storeFilter}
                options={['전체', ...stores.map((s) => s.storeName)]}
                placeholder="전체"
                onChange={(v) => { setStoreFilter(v); setCurrentPage(1); }}
              />
            </div>
          )}

          <div className={f.filterGroup}>
            <span className={f.filterLabel}>구분</span>
            <FilterSelect
              value={category}
              options={subjectOptions}
              placeholder="전체 보기"
              onChange={setCategory}
            />
          </div>

          <div className={f.filterGroup}>
            <span className={f.filterLabel}>공지명</span>
            <input
              type="text"
              className={f.filterInput}
              style={{ width: 280 }}
              placeholder="제목으로 검색하세요."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={f.filterActions}>
            <button type="button" className={f.searchButton} onClick={handleSearch}>검색</button>
            <button
              type="button"
              className={styles.settingsButton}
              onClick={() => setShowSettings(true)}
            >
              <LuSettings />
              <span>공지 설정</span>
            </button>
            <button
              type="button"
              className={styles.newButton}
              onClick={() => navigate('/notices/new')}
            >
              <LuPlus />
              <span>새 공지 작성</span>
            </button>
            <button type="button" className={f.resetButton} onClick={() => window.location.reload()}>새로고침</button>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className={styles.contentCard}>
        <div className={styles.tableActions}>
          <button type="button" className={f.bulkActionButton} onClick={handleBulkDelete} disabled={selectedIds.size === 0}>
            선택 삭제{selectedIds.size > 0 ? ` (${selectedIds.size}건)` : ''}
          </button>
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
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                </th>
                <th>No</th>
                <th className={styles.sortableCol} style={{ textAlign: 'center' }} onClick={() => handleSort('title')}>
                  제목 <SortIcon field="title" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('createdAt')}>
                  날짜 <SortIcon field="createdAt" />
                </th>
                <th>등록 지점</th>
              </tr>
            </thead>
            <tbody>
              {pageNotices.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={5}>등록된 공지사항이 없습니다.</td>
                </tr>
              ) : (
                pageNotices.map((notice, idx) => (
                  <tr key={notice.id} className={notice.pinned ? styles.pinnedRow : ''}>
                    <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(notice.id)} onChange={() => handleSelectRow(notice.id)} />
                    </td>
                    <td>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td
                      className={styles.titleCell}
                      onClick={() => navigate(`/notices/${notice.id}`)}
                    >
                      {notice.pinned && <span className={styles.pinIcon}>📌</span>}
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
          <div className={f.pagination}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`${f.pageBtn} ${page === currentPage ? f.pageBtnActive : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
