import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';
import {
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import studyIcon from '../assets/study_active.png';
import downloadIcon from '../assets/download.png';
import styles from './StudyTimeManagement.module.css';
import f from '../styles/filter.module.css';
import dp from '../components/FilterDatePicker.module.css';

registerLocale('ko', ko);
import { getStudyTimes } from '../api/studyTimeApi';
import type { StudentStudyTime } from '../api/studyTimeApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import FilterSelect from '../components/FilterSelect';

/* ── 날짜 유틸 ── */

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateDot(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function formatDateShort(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}/${d}(${dayLabels[date.getDay()]})`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ── 타입 ── */

interface StudentStudyRow {
  id: string;
  studentNumber: string;
  name: string;
  seat: string;
  total: string;
  storeId?: number;
  storeName?: string;
  dailyTimes: Record<string, string>;
}

/* ── 정렬 ── */

type SortField = 'name' | 'studentNumber' | 'seat' | 'total';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareStudyRows(a: StudentStudyRow, b: StudentStudyRow, field: SortField, dir: SortDir): number {
  const va = a[field] ?? '';
  const vb = b[field] ?? '';
  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toRows(data: StudentStudyTime[], monday: Date): StudentStudyRow[] {
  return data.map((s, idx) => {
    const dailyTimes: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const key = formatDateShort(d);
      const dateKey = formatDateKey(d);
      const found = s.dailyStudyTimes.find((dt) => dt.date === dateKey);
      dailyTimes[key] = found ? found.studyTime : '-';
    }
    return {
      id: `${s.studentNumber}-${idx}`,
      studentNumber: s.studentNumber,
      name: s.studentName,
      seat: s.seatLabel || '-',
      total: s.totalStudyTime,
      storeId: s.storeId,
      storeName: s.storeName,
      dailyTimes,
    };
  });
}

/* ── Page ── */

export default function StudyTimeManagement() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedMonday, setSelectedMonday] = useState(() => getMonday(today));
  const weekPickerRef = useRef<DatePicker>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // 필터
  const [filterNumber, setFilterNumber] = useState('');
  const [filterName, setFilterName] = useState('');

  // 정렬
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  // API 데이터
  const [rows, setRows] = useState<StudentStudyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<number | undefined>(undefined);

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');

  // 페이지네이션
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const prevPageRef = useRef(0);

  useEffect(() => {
    if (page !== prevPageRef.current) {
      prevPageRef.current = page;
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  const startDate = selectedMonday;
  const endDate = addDays(startDate, 6);

  // 7일 날짜 헤더 (월요일부터)
  const dayHeaders: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dayHeaders.push(addDays(startDate, i));
  }

  // 사용자 정보 로드
  useEffect(() => {
    getMe().then((me) => {
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        setStoreId(undefined);
        getStores().then((list) => setStores(list.filter((s) => s.active)));
      } else {
        setStoreId(me.storeId);
      }
    }).catch(() => {});
  }, []);

  /* storeFilter → 실제 API에 보낼 storeId 계산 */
  const effectiveStoreId = useMemo(() => {
    if (!isAdmin) return storeId;
    if (storeFilter === '전체') return undefined;
    const found = stores.find((s) => s.storeName === storeFilter);
    return found?.id;
  }, [isAdmin, storeId, storeFilter, stores]);

  // API 호출
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const commonParams = {
        startDate: formatDateKey(startDate),
        endDate: formatDateKey(endDate),
        studentName: filterName || undefined,
        studentNumber: filterNumber || undefined,
      };

      if (isAdmin && effectiveStoreId == null && stores.length > 0) {
        // ADMIN 전체: 각 지점별로 조회 후 합침
        const results = await Promise.all(
          stores.map(async (s) => {
            const list = await getStudyTimes({ storeId: s.id, ...commonParams });
            return list.map((r) => ({ ...r, storeId: s.id, storeName: s.storeName }));
          }),
        );
        setRows(toRows(results.flat(), startDate));
      } else {
        const data = await getStudyTimes({ storeId: effectiveStoreId, ...commonParams });
        const selectedStore = stores.find((s) => s.id === effectiveStoreId);
        setRows(toRows(
          selectedStore 
            ? data.map((r) => ({ ...r, storeId: selectedStore.id, storeName: selectedStore.storeName }))
            : data, 
          startDate
        ));
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, stores, effectiveStoreId, startDate, endDate, filterName, filterNumber]);

  // 주간 변경 시 자동 조회
  useEffect(() => {
    if (isAdmin && stores.length === 0) return;
    if (!isAdmin && storeId == null) return;
    setPage(0);
    fetchData();
  }, [selectedMonday, effectiveStoreId, stores]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filterNumber && !(row.studentNumber ?? '').includes(filterNumber)) return false;
      if (filterName && !(row.name ?? '').includes(filterName)) return false;
      return true;
    });
  }, [rows, filterNumber, filterName]);

  const sortedData = useMemo(() => {
    if (!sort.field) return filtered;
    return [...filtered].sort((a, b) => compareStudyRows(a, b, sort.field!, sort.dir));
  }, [filtered, sort]);

  const handleReset = () => {
    window.location.reload();
  };

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const pagedData = sortedData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const current = page + 1;
    let start = Math.max(1, current - 4);
    let end = Math.min(totalPages, start + 9);
    if (end - start < 9) start = Math.max(1, end - 9);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const handleWeekChange = (date: Date | null) => {
    if (date) setSelectedMonday(getMonday(date));
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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <img src={studyIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>순공 관리</h2>
        </div>
      </div>

      {/* 필터 */}
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
            <label className={f.filterLabel}>학생명</label>
            <input
              className={f.filterInput}
              placeholder="학생명"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          <div className={f.filterGroup}>
            <label className={f.filterLabel}>학번</label>
            <input
              className={f.filterInput}
              placeholder="학번"
              value={filterNumber}
              onChange={(e) => setFilterNumber(e.target.value)}
            />
          </div>
          <div className={f.filterGroup}>
            <label className={f.filterLabel}>기간</label>
            <div className={styles.datePickerWrap} onClick={() => weekPickerRef.current?.setOpen(true)}>
              <DatePicker
                ref={weekPickerRef}
                locale="ko"
                selected={selectedMonday}
                onChange={handleWeekChange}
                showWeekPicker
                showWeekNumbers={false}
                calendarStartDay={1}
                dateFormat="yyyy-MM-dd"
                className={dp.input}
                calendarClassName={`${dp.calendar} ${styles.weekCalendar}`}
                dayClassName={() => dp.day}
                popperClassName={dp.popper}
                showPopperArrow={false}
                customInput={
                  <button type="button" className={styles.datePickerButton}>
                    {formatDateKey(startDate)} ~ {formatDateKey(endDate)}
                    <svg className={styles.calendarIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                }
              />
            </div>
          </div>

          <div className={f.filterActions}>
            <button type="button" className={f.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={f.resetButton} onClick={handleReset}>새로고침</button>
          </div>
        </div>
      </div>

      <div className={styles.contentCard} ref={tableRef}>
        <div className={styles.tableActions}>
          <button type="button" className={f.excelButton}>엑셀 다운로드 <img src={downloadIcon} alt="" className={styles.downloadIcon} /></button>
        </div>

        {/* 테이블 */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input type="checkbox" />
                </th>
                {isAdmin && <th>지점</th>}
                <th className={styles.sortableCol} onClick={() => handleSort('name')}>
                  이름 <SortIcon field="name" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('studentNumber')}>
                  학번 <SortIcon field="studentNumber" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('seat')}>
                  좌석 <SortIcon field="seat" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('total')}>
                  합계 <SortIcon field="total" />
                </th>
                {dayHeaders.map((d) => (
                  <th key={d.toISOString()}>{formatDateShort(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={isAdmin ? 6 + dayHeaders.length : 5 + dayHeaders.length}>로딩 중...</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={isAdmin ? 6 + dayHeaders.length : 5 + dayHeaders.length}>공부 시간 내역이 없습니다.</td>
                </tr>
              ) : (
                pagedData.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.checkboxCol}>
                      <input type="checkbox" />
                    </td>
                    {isAdmin && <td>{row.storeName || '-'}</td>}
                    <td>{row.name}</td>
                    <td>{row.studentNumber}</td>
                    <td>{row.seat}</td>
                    <td>{row.total}</td>
                    {dayHeaders.map((d) => {
                      const key = formatDateShort(d);
                      const val = row.dailyTimes[key];
                      return (
                        <td key={key} className={!val || val === '-' ? styles.emptyCell : undefined}>
                          {val || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sortedData.length > PAGE_SIZE && (
          <div className={f.pagination}>
            <button
              type="button"
              className={f.pageBtn}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              &lt;
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`${f.pageBtn} ${page + 1 === p ? f.pageBtnActive : ''}`}
                onClick={() => setPage(p - 1)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={f.pageBtn}
              disabled={page + 1 >= totalPages}
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
