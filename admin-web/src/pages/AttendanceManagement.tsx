import { useState, useMemo } from 'react';
import {
  LuCalendarCheck,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import styles from './AttendanceManagement.module.css';

/* ── 출결 상태 ── */

const ATTENDANCE_STATUS = {
  PRESENT: '등원',
  OUTING: '외출',
  EARLY_LEAVE: '조퇴',
  LEFT: '하원',
  SEAT_LEAVE: '좌석이탈',
} as const;

type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS] | '-';

/* ── Mock Data ── */

interface AttendanceStudentRow {
  name: string;
  studentId: string;
  seat: string;
  status: AttendanceStatus;
  phoneSubmitted: boolean;
}

const MOCK_DATA: AttendanceStudentRow[] = Array.from({ length: 12 }, (_, i) => ({
  name: '홍길동',
  studentId: '20260302',
  seat: 'A10',
  status: (i < 3 ? '등원' : '-') as AttendanceStatus,
  phoneSubmitted: i < 5,
}));

const STATUS_OPTIONS: ('전체' | AttendanceStatus)[] = ['전체', '등원', '외출', '조퇴', '하원', '좌석이탈'];
const PHONE_OPTIONS = ['전체', 'O', 'X'];

/* ── 정렬 ── */

type SortField = 'name' | 'studentId' | 'seat' | 'status' | 'phoneSubmitted';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: AttendanceStudentRow, b: AttendanceStudentRow, field: SortField, dir: SortDir): number {
  let va: string;
  let vb: string;

  if (field === 'phoneSubmitted') {
    va = a.phoneSubmitted ? 'O' : 'X';
    vb = b.phoneSubmitted ? 'O' : 'X';
  } else {
    va = a[field] ?? '';
    vb = b[field] ?? '';
  }

  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

const ITEMS_PER_PAGE = 12;

/* ── Page ── */

export default function AttendanceManagement() {
  /* Filters */
  const [searchStudentId, setSearchStudentId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterPhone, setFilterPhone] = useState('전체');

  const [appliedFilters, setAppliedFilters] = useState({
    studentId: '',
    name: '',
    status: '전체',
    phone: '전체',
  });

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* Selection */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    return MOCK_DATA.filter((row) => {
      if (appliedFilters.studentId && !row.studentId.includes(appliedFilters.studentId)) return false;
      if (appliedFilters.name && !row.name.includes(appliedFilters.name)) return false;
      if (appliedFilters.status !== '전체' && row.status !== appliedFilters.status) return false;
      if (appliedFilters.phone !== '전체') {
        const match = appliedFilters.phone === 'O' ? row.phoneSubmitted : !row.phoneSubmitted;
        if (!match) return false;
      }
      return true;
    });
  }, [appliedFilters]);

  const sortedData = useMemo(() => {
    if (!sort.field) return filteredData;
    return [...filteredData].sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
  }, [filteredData, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
  const pagedData = sortedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearch = () => {
    setAppliedFilters({
      studentId: searchStudentId.trim(),
      name: searchName.trim(),
      status: filterStatus,
      phone: filterPhone,
    });
    setPage(1);
  };

  const handleReset = () => {
    setSearchStudentId('');
    setSearchName('');
    setFilterStatus('전체');
    setFilterPhone('전체');
    setAppliedFilters({ studentId: '', name: '', status: '전체', phone: '전체' });
    setSort({ field: null, dir: 'asc' });
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const allChecked = pagedData.length > 0 && pagedData.every((_, i) => selectedIds.has((page - 1) * ITEMS_PER_PAGE + i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      const ids = new Set(pagedData.map((_, i) => (page - 1) * ITEMS_PER_PAGE + i));
      setSelectedIds(ids);
    }
  };

  const toggleOne = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <LuArrowUpDown className={styles.sortIcon} />;
    return sort.dir === 'asc'
      ? <LuArrowUp className={styles.sortIconActive} />
      : <LuArrowDown className={styles.sortIconActive} />;
  };

  const getStatusClass = (status: AttendanceStatus) => {
    switch (status) {
      case '등원': return styles.statusPresent;
      case '외출': return styles.statusOuting;
      case '조퇴': return styles.statusEarlyLeave;
      case '하원': return styles.statusLeft;
      case '좌석이탈': return styles.statusSeatLeave;
      default: return '';
    }
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuCalendarCheck className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>출결 관리</h2>
        </div>
      </div>

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="att-name">학생명</label>
            <input
              id="att-name"
              className={styles.filterInput}
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="att-sid">학번</label>
            <input
              id="att-sid"
              className={styles.filterInput}
              type="text"
              value={searchStudentId}
              onChange={(e) => setSearchStudentId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>구분</label>
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt === '전체' ? '외출/등원/하원' : opt}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>휴대폰 미소지 여부</label>
            <select
              className={styles.filterSelect}
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
            >
              {PHONE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt === '전체' ? 'O/X' : opt}</option>
              ))}
            </select>
          </div>

          <button className={styles.searchButton} type="button" onClick={handleSearch}>
            검색
          </button>

          <button className={styles.resetButton} type="button" onClick={handleReset}>
            새로고침
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.contentCard}>
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('name')}>
                이름 <SortIcon field="name" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('studentId')}>
                학번 <SortIcon field="studentId" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('seat')}>
                좌석 <SortIcon field="seat" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('status')}>
                출결현황 <SortIcon field="status" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('phoneSubmitted')}>
                휴대폰 미소지 <SortIcon field="phoneSubmitted" />
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={6}>검색 결과가 없습니다.</td>
              </tr>
            ) : (
              pagedData.map((row, idx) => {
                const globalIdx = (page - 1) * ITEMS_PER_PAGE + idx;
                return (
                  <tr key={globalIdx}>
                    <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(globalIdx)}
                        onChange={() => toggleOne(globalIdx)}
                      />
                    </td>
                    <td>{row.name}</td>
                    <td>{row.studentId}</td>
                    <td>{row.seat}</td>
                    <td>
                      {row.status !== '-' ? (
                        <span className={`${styles.statusBadge} ${getStatusClass(row.status)}`}>
                          {row.status}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{row.phoneSubmitted ? 'O' : 'X'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
