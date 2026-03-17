import { useState, useMemo, useRef, useEffect } from 'react';
import {
  LuClock,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import styles from './StudyTimeManagement.module.css';

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

function timeToMinutes(time: string): number {
  if (!time || time === '-') return 0;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  if (mins <= 0) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  id: number;
  studentNumber: string;
  className: string;
  name: string;
  seat: string;
  dailyTimes: Record<string, string>;
}

/* ── 정렬 ── */

type SortField = 'name' | 'studentNumber' | 'className' | 'seat';
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

/* ── 목 데이터 ── */

function generateMockData(monday: Date): StudentStudyRow[] {
  const mockRows = [
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '21:30' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '21:00' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '16:30' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '' },
    { name: '김코드', num: '6020', cls: '1반', seat: '김코드', baseTime: '' },
  ];

  return mockRows.map((row, idx) => {
    const dailyTimes: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      dailyTimes[formatDateShort(d)] = row.baseTime || '-';
    }
    return {
      id: idx + 1,
      studentNumber: row.num,
      className: row.cls,
      name: row.name,
      seat: row.seat,
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

  // 필터
  const [filterNumber, setFilterNumber] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterName, setFilterName] = useState('');

  // 정렬
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

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

  const mockData = generateMockData(startDate);

  const filtered = useMemo(() => {
    return mockData.filter((row) => {
      if (filterNumber && !row.studentNumber.includes(filterNumber)) return false;
      if (filterClass && !row.className.includes(filterClass)) return false;
      if (filterName && !row.name.includes(filterName)) return false;
      return true;
    });
  }, [mockData, filterNumber, filterClass, filterName]);

  const sortedData = useMemo(() => {
    if (!sort.field) return filtered;
    return [...filtered].sort((a, b) => compareStudyRows(a, b, sort.field!, sort.dir));
  }, [filtered, sort]);

  const handleReset = () => {
    setFilterNumber('');
    setFilterClass('');
    setFilterName('');
    setSort({ field: null, dir: 'asc' });
  };

  const calcTotal = (dailyTimes: Record<string, string>): string => {
    let totalMins = 0;
    for (const val of Object.values(dailyTimes)) {
      totalMins += timeToMinutes(val);
    }
    return minutesToTime(totalMins);
  };

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
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>반</label>
            <input
              className={styles.filterInputShort}
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
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
            <button type="button" className={styles.searchButton}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.excelButton}>EXCEL</button>
          </div>
        </div>
      </div>

      <div className={styles.contentCard}>

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
                <th className={styles.sortableCol} onClick={() => handleSort('className')}>
                  반 <SortIcon field="className" />
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
              {sortedData.length === 0 ? (
                <tr className={styles.emptyRow}>
                  <td colSpan={6 + dayHeaders.length}>데이터가 없습니다.</td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.checkboxCol}>
                      <input type="checkbox" />
                    </td>
                    <td>{row.name}</td>
                    <td>{row.studentNumber}</td>
                    <td>{row.className}</td>
                    <td>{row.seat}</td>
                    <td>{calcTotal(row.dailyTimes)}</td>
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
      </div>
    </div>
  );
}
