import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import attendanceIcon from '../assets/attendance_active.png';
import downloadIcon from '../assets/download.png';
import { getAttendances } from '../api/attendanceApi';
import type { AttendanceRecord } from '../api/attendanceApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import styles from './AttendanceManagement.module.css';
import f from '../styles/filter.module.css';
import FilterSelect from '../components/FilterSelect';

/* ── 출결 상태 ── */

const STATUS_OPTIONS = ['전체', '등원', '외출', '조퇴', '하원', '좌석이탈'];
const PHONE_OPTIONS = ['전체', 'O', 'X'];

const ITEMS_PER_PAGE = 15;

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'seatLabel' | 'attendanceStatus' | 'phoneSubmitted';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: AttendanceRecord, b: AttendanceRecord, field: SortField, dir: SortDir): number {
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

/* ── CSV 다운로드 ── */

function downloadCsv(rows: AttendanceRecord[]) {
  const header = '이름,학번,좌석,출결현황,휴대폰 미소지';
  const lines = rows.map((r) => {
    const phone = r.phoneSubmitted ? 'O' : 'X';
    return `${r.studentName},${r.studentNumber},${r.seatLabel ?? ''},${r.attendanceStatus ?? ''},${phone}`;
  });

  const bom = '\uFEFF';
  const csv = bom + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date().toISOString().slice(0, 10);
  link.download = `출결관리_${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── Page ── */

export default function AttendanceManagement() {
  /* Filters */
  const [searchName, setSearchName] = useState('');
  const [searchStudentNumber, setSearchStudentNumber] = useState('');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterPhone, setFilterPhone] = useState('전체');

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* Selection */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');

  /* API 데이터 */
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        setStoreId(undefined);
        getStores().then((list) => setStores(list.filter((s) => s.active)));
      } else {
        setStoreId(me.storeId);
      }
      setReady(true);
    }).catch(() => {});
  }, []);

  /* storeFilter → 실제 API에 보낼 storeId 계산 */
  const effectiveStoreId = useMemo(() => {
    if (!isAdmin) return storeId;
    if (storeFilter === '전체') return undefined;
    const found = stores.find((s) => s.storeName === storeFilter);
    return found?.id;
  }, [isAdmin, storeId, storeFilter, stores]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const commonParams = {
        studentName: searchName || undefined,
        studentNumber: searchStudentNumber || undefined,
        attendanceStatus: filterStatus !== '전체' ? filterStatus : undefined,
        phoneSubmitted: filterPhone === '전체' ? undefined : filterPhone === 'O',
      };

      if (isAdmin && effectiveStoreId == null && stores.length > 0) {
        // ADMIN 전체: 각 지점별로 조회 후 합침
        const results = await Promise.all(
          stores.map(async (s) => {
            const list = await getAttendances({ storeId: s.id, ...commonParams });
            return list.map((r) => ({ ...r, storeName: s.storeName }));
          }),
        );
        setRows(results.flat());
      } else {
        const data = await getAttendances({ storeId: effectiveStoreId, ...commonParams });
        // 단일 지점 선택 시 지점명 주입
        const selectedStore = stores.find((s) => s.id === effectiveStoreId);
        setRows(selectedStore ? data.map((r) => ({ ...r, storeName: selectedStore.storeName })) : data);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, stores, effectiveStoreId, searchName, searchStudentNumber, filterStatus, filterPhone]);

  // 초기 로드 + 지점 필터 변경 시 자동 fetch
  useEffect(() => {
    if (!ready) return;
    if (isAdmin && stores.length === 0) return;
    if (!isAdmin && storeId == null) return;
    setPage(1);
    fetchData();
  }, [ready, stores, effectiveStoreId]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setSearchName('');
    setSearchStudentNumber('');
    setFilterStatus('전체');
    setFilterPhone('전체');
    if (isAdmin) setStoreFilter('전체');
    setSort({ field: null, dir: 'asc' });
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  /* 클라이언트 필터 + 정렬 */
  const filteredData = useMemo(() => {
    let data = [...rows];

    if (searchName) {
      data = data.filter((r) => (r.studentName ?? '').includes(searchName));
    }
    if (searchStudentNumber) {
      data = data.filter((r) => (r.studentNumber ?? '').includes(searchStudentNumber));
    }
    if (filterStatus !== '전체') {
      data = data.filter((r) => r.attendanceStatus === filterStatus);
    }
    if (filterPhone !== '전체') {
      const wantPhone = filterPhone === 'O';
      data = data.filter((r) => r.phoneSubmitted === wantPhone);
    }

    if (sort.field) {
      data.sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
    }

    return data;
  }, [rows, searchName, searchStudentNumber, filterStatus, filterPhone, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const pagedData = filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* 선택 */
  const allChecked = pagedData.length > 0 && pagedData.every((r) => selectedIds.has(r.studentId));
  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedData.map((r) => r.studentId)));
    }
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case '등원': return styles.statusPresent;
      case '외출': return styles.statusOuting;
      case '조퇴': return styles.statusEarlyLeave;
      case '하원': return styles.statusLeft;
      case '좌석이탈': return styles.statusSeatLeave;
      default: return '';
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    let start = Math.max(1, page - 4);
    let end = Math.min(totalPages, start + 9);
    if (end - start < 9) start = Math.max(1, end - 9);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={attendanceIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>출결 관리</h2>
        </div>
      </div>

      {/* Filter Row */}
      <div className={f.filterCard}>
        <div className={f.filterRow}>
          {isAdmin && (
            <div className={f.filterGroup}>
              <label className={f.filterLabel}>지점</label>
              <FilterSelect
                value={storeFilter}
                options={['전체', ...stores.map((s) => s.storeName)]}
                placeholder="전체"
                onChange={setStoreFilter}
              />
            </div>
          )}
          <div className={f.filterGroup}>
            <label className={f.filterLabel} htmlFor="att-name">학생명</label>
            <input
              id="att-name"
              className={f.filterInput}
              type="text"
              placeholder="학생명"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={f.filterGroup}>
            <label className={f.filterLabel} htmlFor="att-sid">학번</label>
            <input
              id="att-sid"
              className={f.filterInput}
              type="text"
              placeholder="학번"
              value={searchStudentNumber}
              onChange={(e) => setSearchStudentNumber(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={f.filterGroup}>
            <label className={f.filterLabel}>출결 현황</label>
            <FilterSelect
              value={filterStatus}
              options={STATUS_OPTIONS}
              placeholder="전체"
              onChange={setFilterStatus}
            />
          </div>

          <div className={f.filterGroup}>
            <label className={f.filterLabel}>휴대폰 미소지 여부</label>
            <FilterSelect
              value={filterPhone}
              options={PHONE_OPTIONS}
              placeholder="전체"
              onChange={setFilterPhone}
            />
          </div>

          <div className={f.filterActions}>
            <button className={f.searchButton} type="button" onClick={handleSearch}>
              검색
            </button>
            <button className={f.resetButton} type="button" onClick={handleReset}>
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.contentCard}>
        <div className={styles.tableActions}>
          <button type="button" className={f.excelButton} onClick={() => downloadCsv(filteredData)}>엑셀다운로드 <img src={downloadIcon} alt="" className={styles.downloadIcon} /></button>
        </div>
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              {isAdmin && <th>지점</th>}
              <th className={styles.sortableCol} onClick={() => handleSort('studentName')}>
                이름 <SortIcon field="studentName" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('studentNumber')}>
                학번 <SortIcon field="studentNumber" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('seatLabel')}>
                좌석 <SortIcon field="seatLabel" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('attendanceStatus')}>
                출결현황 <SortIcon field="attendanceStatus" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('phoneSubmitted')}>
                휴대폰 미소지 <SortIcon field="phoneSubmitted" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 7 : 6}>로딩 중...</td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 7 : 6}>데이터가 없습니다.</td>
              </tr>
            ) : (
              pagedData.map((row) => (
                <tr key={row.studentId}>
                  <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.studentId)}
                      onChange={() => toggleOne(row.studentId)}
                    />
                  </td>
                  {isAdmin && <td>{row.storeName ?? '-'}</td>}
                  <td>{row.studentName}</td>
                  <td>{row.studentNumber}</td>
                  <td>{row.seatLabel}</td>
                  <td>
                    {row.attendanceStatus ? (
                      <span className={`${styles.statusBadge} ${getStatusClass(row.attendanceStatus)}`}>
                        {row.attendanceStatus}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{row.phoneSubmitted ? 'O' : 'X'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className={f.pagination}>
          <button
            type="button"
            className={f.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            &lt;
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              className={`${f.pageBtn} ${page === p ? f.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={f.pageBtn}
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
