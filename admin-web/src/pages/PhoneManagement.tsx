import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuSmartphone,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import {
  getPhoneSubmissions,
  deletePhoneSubmission,
  exportPhoneSubmissions,
} from '../api/phoneSubmissionApi';
import type { PhoneSubmission, PageResponse } from '../api/phoneSubmissionApi';
import styles from './PhoneManagement.module.css';

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'className' | 'seatLabel' | 'submissionType' | 'submittedAt' | 'startDate' | 'memo';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: PhoneSubmission, b: PhoneSubmission, field: SortField, dir: SortDir): number {
  let va: string;
  let vb: string;

  switch (field) {
    case 'studentName': va = a.studentName; vb = b.studentName; break;
    case 'studentNumber': va = a.studentNumber; vb = b.studentNumber; break;
    case 'className': va = a.className; vb = b.className; break;
    case 'seatLabel': va = a.seatLabel; vb = b.seatLabel; break;
    case 'submissionType': va = a.submissionType; vb = b.submissionType; break;
    case 'submittedAt': va = a.submittedAt; vb = b.submittedAt; break;
    case 'startDate': va = a.startDate; vb = b.startDate; break;
    case 'memo': va = a.memo ?? ''; vb = b.memo ?? ''; break;
  }

  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

/* ── CSV 다운로드 ── */

function downloadCsv(rows: PhoneSubmission[], dateLabel: string) {
  const header = '이름,학번,좌석번호,신청유형,신청일,신청기간';
  const lines = rows.map((r) => {
    const typeLabel = r.submissionType === 'PERMANENT' ? '퇴원까지' : '일일';
    const period = r.submissionType === 'PERMANENT'
      ? `${r.startDate} ~ 퇴원까지`
      : (r.endDate ? `${r.startDate} ~ ${r.endDate}` : r.startDate);
    const date = r.submittedAt.slice(0, 10);
    return `${r.studentName},${r.studentNumber},${r.seatLabel},${typeLabel},${date},${period}`;
  });

  const bom = '\uFEFF';
  const csv = bom + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `휴대폰미소지_${dateLabel}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ITEMS_PER_PAGE = 12;

/* ── Page ── */

export default function PhoneManagement() {
  const today = new Date().toISOString().slice(0, 10);

  /* 필터 */
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchDate, setSearchDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState({ name: '', number: '', className: '', date: today });

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* 페이지 */
  const [page, setPage] = useState(1);

  /* 선택 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* API 데이터 */
  const [data, setData] = useState<PhoneSubmission[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ── 데이터 조회 ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result: PageResponse<PhoneSubmission> = await getPhoneSubmissions({
        startDate: appliedFilters.date || undefined,
        endDate: appliedFilters.date || undefined,
        studentName: appliedFilters.name || undefined,
        studentNumber: appliedFilters.number || undefined,
        page: page - 1,
        size: ITEMS_PER_PAGE,
      });
      setData(result.content);
      setTotalElements(result.totalElements);
    } catch (err) {
      console.error('휴대폰 미소지 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 필터 ── */
  const handleSearch = () => {
    setAppliedFilters({ name: searchName, number: searchNumber, className: searchClass, date: searchDate });
    setPage(1);
  };

  const handleReset = () => {
    setSearchName('');
    setSearchNumber('');
    setSearchClass('');
    setSearchDate(today);
    setAppliedFilters({ name: '', number: '', className: '', date: today });
    setSort({ field: null, dir: 'asc' });
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  /* ── 삭제 ── */
  const handleDelete = async (id: number) => {
    if (!window.confirm('해당 미소지 신청을 삭제하시겠습니까?')) return;
    try {
      await deletePhoneSubmission(id);
      await fetchData();
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deletePhoneSubmission(id)));
      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      console.error('일괄 삭제 실패:', err);
      alert('일부 항목 삭제에 실패했습니다.');
      await fetchData();
    }
  };

  /* ── EXCEL ── */
  const handleExcel = () => {
    if (sortedData.length > 0) {
      downloadCsv(sortedData, appliedFilters.date || today);
    } else {
      exportPhoneSubmissions({
        startDate: appliedFilters.date || undefined,
        endDate: appliedFilters.date || undefined,
      }).catch(() => alert('엑셀 다운로드에 실패했습니다.'));
    }
  };

  /* ── 클라이언트 정렬 (서버 페이징된 현재 페이지 내) ── */
  const sortedData = useMemo(() => {
    if (!sort.field) return data;
    return [...data].sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(totalElements / ITEMS_PER_PAGE));

  const allSelected = sortedData.length > 0 && sortedData.every((r) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedData.map((r) => r.id)));
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <LuArrowUpDown className={styles.sortIcon} />;
    return sort.dir === 'asc'
      ? <LuArrowUp className={styles.sortIconActive} />
      : <LuArrowDown className={styles.sortIconActive} />;
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuSmartphone className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>휴대폰 미소지 관리</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-name">학생명</label>
            <input
              id="phone-name"
              className={styles.filterInput}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-number">학번</label>
            <input
              id="phone-number"
              className={styles.filterInput}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-class">반</label>
            <input
              id="phone-class"
              className={styles.filterInput}
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-date">날짜</label>
            <input
              id="phone-date"
              type="date"
              className={styles.filterDateInput}
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.excelButton} onClick={handleExcel}>EXCEL</button>
          </div>
        </div>
      </div>

      {/* 일괄 삭제 */}
      {selectedIds.size > 0 && (
        <div>
          <button type="button" className={styles.deleteButton} onClick={handleBulkDelete}>
            선택 삭제 ({selectedIds.size}건)
          </button>
        </div>
      )}

      {/* 테이블 */}
      <div className={styles.contentCard}>
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('studentName')}>
                이름 <SortIcon field="studentName" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('studentNumber')}>
                학번 <SortIcon field="studentNumber" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('className')}>
                반 <SortIcon field="className" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('seatLabel')}>
                좌석 <SortIcon field="seatLabel" />
              </th>
              {/* <th className={styles.sortableCol} onClick={() => handleSort('submissionType')}>
                신청유형 <SortIcon field="submissionType" />
              </th> */}
              <th className={styles.sortableCol} onClick={() => handleSort('submittedAt')}>
                신청일 <SortIcon field="submittedAt" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('startDate')}>
                신청기간 <SortIcon field="startDate" />
              </th>
              <th>메모</th>
              <th className={styles.actionCol} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={10}>불러오는 중...</td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={10}>데이터가 없습니다.</td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                    />
                  </td>
                  <td>{row.studentName}</td>
                  <td>{row.studentNumber}</td>
                  <td>{row.className}</td>
                  <td>{row.seatLabel}</td>
                  <td>
                    {row.submissionType === 'PERMANENT' ? (
                      <span className={styles.permanentBadge}>퇴원까지</span>
                    ) : (
                      '일일'
                    )}
                  </td>
                  <td>{row.submittedAt.slice(0, 10)}</td>
                  <td>
                    {row.submissionType === 'PERMANENT' ? (
                      <>{row.startDate} ~ <span className={styles.permanentBadge}>퇴원까지</span></>
                    ) : (
                      row.endDate ? `${row.startDate} ~ ${row.endDate}` : row.startDate
                    )}
                  </td>
                  <td>{row.memo || '-'}</td>
                  <td className={styles.actionCol}>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(row.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 페이지네이션 */}
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            &lt;
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
