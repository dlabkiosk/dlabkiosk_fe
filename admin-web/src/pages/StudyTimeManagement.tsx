import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  LuClock,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import styles from './StudyTimeManagement.module.css';
import { getStudyTimes } from '../api/studyTimeApi';
import type { StudentStudyTime } from '../api/studyTimeApi';
import { getMe } from '../api/authApi';

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


/* ── 캘린더 그리드 생성 ── */

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const startDay = firstDay.getDay(); // 0=일 ~ 6=토
  // 월요일 시작으로 변환: 0(일)→6, 1(월)→0, ..., 6(토)→5
  const offset = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/* ── 타입 ── */

interface StudentStudyRow {
  id: string;
  studentNumber: string;
  name: string;
  seat: string;
  total: string;
  dailyTimes: Record<string, string>;
}

/* ── 정렬 ── */

type SortField = 'name' | 'studentNumber' | 'seat';
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
      dailyTimes,
    };
  });
}

/* ── Page ── */

export default function StudyTimeManagement() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedMonday, setSelectedMonday] = useState(() => getMonday(today));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [hoverMonday, setHoverMonday] = useState<Date | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
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

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calendarOpen]);

  const startDate = selectedMonday;
  const endDate = addDays(startDate, 6);

  // 7일 날짜 헤더 (최신이 왼쪽)
  const dayHeaders: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    dayHeaders.push(addDays(startDate, i));
  }

  // 사용자 정보 로드
  useEffect(() => {
    getMe().then((me) => setStoreId(me.storeId)).catch(() => {});
  }, []);

  // API 호출
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudyTimes({
        storeId,
        startDate: formatDateKey(startDate),
        endDate: formatDateKey(endDate),
        studentName: filterName || undefined,
        studentNumber: filterNumber || undefined,
      });
      setRows(toRows(data, startDate));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, startDate, endDate, filterName, filterNumber]);

  // 주간 변경 시 자동 조회
  useEffect(() => {
    if (storeId != null) fetchData();
  }, [selectedMonday, storeId]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filterNumber && !row.studentNumber.includes(filterNumber)) return false;
      if (filterName && !row.name.includes(filterName)) return false;
      return true;
    });
  }, [rows, filterNumber, filterName]);

  const sortedData = useMemo(() => {
    if (!sort.field) return filtered;
    return [...filtered].sort((a, b) => compareStudyRows(a, b, sort.field!, sort.dir));
  }, [filtered, sort]);

  const handleReset = () => {
    setFilterNumber('');
    setFilterName('');
    setSort({ field: null, dir: 'asc' });
    setPage(0);
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

  const handleDateClick = (date: Date) => {
    const mon = getMonday(date);
    setSelectedMonday(mon);
    setCalendarOpen(false);
  };

  const handlePrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const handleNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const toggleCalendar = () => {
    if (!calendarOpen) {
      setCalYear(selectedMonday.getFullYear());
      setCalMonth(selectedMonday.getMonth() + 1);
    }
    setCalendarOpen(!calendarOpen);
  };

  const calendarGrid = getCalendarGrid(calYear, calMonth);
  const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  // 날짜가 선택된 주 범위 안에 있는지
  const isInSelectedWeek = (date: Date): boolean => {
    return date >= selectedMonday && date <= endDate;
  };

  // hover 중인 주 범위 안에 있는지
  const isInHoverWeek = (date: Date): boolean => {
    if (!hoverMonday) return false;
    const hoverEnd = addDays(hoverMonday, 6);
    return date >= hoverMonday && date <= hoverEnd;
  };

  // 날짜가 주 범위의 시작인지 끝인지
  const getWeekPosition = (date: Date, monday: Date): 'start' | 'end' | 'mid' | null => {
    const sun = addDays(monday, 6);
    if (date < monday || date > sun) return null;
    if (isSameDay(date, monday)) return 'start';
    if (isSameDay(date, sun)) return 'end';
    return 'mid';
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
          <LuClock className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>순공 관리</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>학생명</label>
            <input
              className={styles.filterInput}
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>학번</label>
            <input
              className={styles.filterInput}
              value={filterNumber}
              onChange={(e) => setFilterNumber(e.target.value)}
            />
          </div>
          <div className={styles.datePickerWrap} ref={calRef}>
            <button type="button" className={styles.datePickerButton} onClick={toggleCalendar}>
              {formatDateDot(startDate)} ~ {formatDateDot(endDate)}
              <span className={styles.calendarIcon}>&#x25BC;</span>
            </button>
            {calendarOpen && (
              <div className={styles.calendarDropdown}>
                <div className={styles.calendarHeader}>
                  <button type="button" className={styles.calNavBtn} onClick={handlePrevMonth}>&lt;</button>
                  <span className={styles.calMonthLabel}>{calYear}년 {String(calMonth).padStart(2, '0')}월</span>
                  <button type="button" className={styles.calNavBtn} onClick={handleNextMonth}>&gt;</button>
                </div>
                <table className={styles.calendarTable}>
                  <thead>
                    <tr>
                      {DAY_LABELS.map((d) => (
                        <th key={d}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarGrid.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((date, di) => {
                          if (!date) return <td key={di} />;

                          const selected = isInSelectedWeek(date);
                          const hovered = !selected && isInHoverWeek(date);
                          const pos = selected
                            ? getWeekPosition(date, selectedMonday)
                            : hovered && hoverMonday
                              ? getWeekPosition(date, hoverMonday)
                              : null;
                          const isToday = isSameDay(date, today);

                          const classNames = [styles.calDay];
                          if (isToday) classNames.push(styles.calDayToday);
                          if (selected) classNames.push(styles.calDaySelected);
                          if (hovered) classNames.push(styles.calDayHover);
                          if (pos === 'start') classNames.push(styles.calDayStart);
                          if (pos === 'end') classNames.push(styles.calDayEnd);
                          if (pos === 'today') classNames.push(styles.calDayToday);

                          return (
                            <td
                              key={di}
                              className={classNames.join(' ')}
                              onClick={() => handleDateClick(date)}
                              onMouseEnter={() => setHoverMonday(getMonday(date))}
                              onMouseLeave={() => setHoverMonday(null)}
                            >
                              {date.getDate()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.excelButton}>EXCEL</button>
          </div>
        </div>
      </div>

      <div className={styles.contentCard} ref={tableRef}>

        {/* 테이블 */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input type="checkbox" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('name')}>
                  이름 <SortIcon field="name" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('studentNumber')}>
                  학번 <SortIcon field="studentNumber" />
                </th>
                <th className={styles.sortableCol} onClick={() => handleSort('seat')}>
                  좌석 <SortIcon field="seat" />
                </th>
                <th>합계</th>
                {dayHeaders.map((d) => (
                  <th key={d.toISOString()}>{formatDateShort(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={5 + dayHeaders.length}>로딩 중...</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={5 + dayHeaders.length}>데이터가 없습니다.</td>
                </tr>
              ) : (
                pagedData.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.checkboxCol}>
                      <input type="checkbox" />
                    </td>
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
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              &lt;
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pageBtn} ${page + 1 === p ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p - 1)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageBtn}
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
