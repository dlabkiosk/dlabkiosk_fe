import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuDoorOpen,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import {
  getSeatLeaves,
  forceReturnSeatLeave,
} from '../api/seatLeaveApi';
import type { SeatLeaveRecord } from '../api/seatLeaveApi';
import { getStudents } from '../api/studentApi';
import useConfirm from '../hooks/useConfirm';
import styles from './SeatLeaveManagement.module.css';

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'seatLabel' | 'startedAt' | 'elapsed' | 'reasonName';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: SeatLeaveRecord, b: SeatLeaveRecord, field: SortField, dir: SortDir): number {
  if (field === 'elapsed') {
    const ea = getElapsedMinutes(a.startedAt, a.endedAt);
    const eb = getElapsedMinutes(b.startedAt, b.endedAt);
    const cmp = ea - eb;
    return dir === 'desc' ? -cmp : cmp;
  }
  const va = (a[field] ?? '') as string;
  const vb = (b[field] ?? '') as string;
  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

/* ── 시간 유틸 ── */

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return iso.slice(11, 16);
}

function getElapsedMinutes(start: string, end: string | null): number {
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.round((endMs - new Date(start).getTime()) / 60000);
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

const ITEMS_PER_PAGE = 20;

/* ── Page ── */

export default function SeatLeaveManagement() {
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const today = new Date().toISOString().slice(0, 10);

  /* 필터 */
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchStartDate, setSearchStartDate] = useState(today);
  const [searchEndDate, setSearchEndDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState({ name: '', number: '', start: today, end: today });

  /* 선택 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* 페이지 */
  const [page, setPage] = useState(1);

  /* API 데이터 */
  const [data, setData] = useState<SeatLeaveRecord[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);

  /* 실시간 경과 갱신 */
  const [, setTick] = useState(0);

  useEffect(() => {
    const hasAway = data.some((r) => !r.endedAt);
    if (!hasAway) return;
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, [data]);

  /* ── 데이터 조회 ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [result, students] = await Promise.all([
        getSeatLeaves({
          startDate: appliedFilters.start || undefined,
          endDate: appliedFilters.end || undefined,
          page: page - 1,
          size: ITEMS_PER_PAGE,
        }),
        getStudents(),
      ]);

      // studentId → studentNumber / className 매핑
      const studentById = new Map<number, { studentNumber: string }>();
      students.forEach((s) => {
        studentById.set(s.id, { studentNumber: s.studentNumber });
      });

      const enriched = result.content.map((row) => {
        const stu = studentById.get(row.studentId);
        return {
          ...row,
          studentNumber: row.studentNumber || stu?.studentNumber,
        };
      });

      setData(enriched);
      setTotalElements(result.totalElements);
    } catch (err) {
      console.error('좌석 이탈 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 필터 ── */
  const handleSearch = () => {
    setAppliedFilters({ name: searchName, number: searchNumber, start: searchStartDate, end: searchEndDate });
    setPage(1);
  };

  const handleReset = () => {
    setSearchName('');
    setSearchNumber('');
    setSearchStartDate(today);
    setSearchEndDate(today);
    setAppliedFilters({ name: '', number: '', start: today, end: today });
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

  /* ── 강제 복귀 ── */
  const handleForceReturn = async (record: SeatLeaveRecord) => {
    if (!await confirm(`${record.studentName} (${record.seatLabel}) 학생을 강제 복귀 처리하시겠습니까?`)) return;
    try {
      await forceReturnSeatLeave(record.id);
      await fetchData();
    } catch (err) {
      console.error('강제 복귀 실패:', err);
      await alert('강제 복귀에 실패했습니다.');
    }
  };

  /* ── 클라이언트 필터 + 정렬 ── */
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (appliedFilters.name && !row.studentName.includes(appliedFilters.name)) return false;
      if (appliedFilters.number && !(row.studentNumber ?? '').includes(appliedFilters.number)) return false;
      return true;
    });
  }, [data, appliedFilters]);

  const sortedData = useMemo(() => {
    if (!sort.field) return filteredData;
    return [...filteredData].sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
  }, [filteredData, sort]);

  /* ── EXCEL (현재 검색 결과만 CSV) ── */
  const handleExcel = () => {
    if (sortedData.length === 0) {
      void alert('다운로드할 데이터가 없습니다.');
      return;
    }
    const header = ['이름', '학번', '좌석', '이탈신청시간', '상태', '경과', '사유'];
    const csvRows = sortedData.map((row) => {
      const elapsed = getElapsedMinutes(row.startedAt, row.endedAt);
      return [
        row.studentName,
        row.studentNumber ?? '',
        row.seatLabel,
        row.startedAt ? row.startedAt.replace('T', ' ').slice(0, 16) : '',
        row.endedAt ? '복귀' : '이탈중',
        formatElapsed(elapsed),
        row.reasonName,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const bom = '\uFEFF';
    const csv = bom + [header.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `좌석이탈_${appliedFilters.start || 'all'}_${appliedFilters.end || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <LuDoorOpen className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>좌석 이탈 관리</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sl-name">학생명</label>
            <input
              id="sl-name"
              className={styles.filterInput}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sl-number">학번</label>
            <input
              id="sl-number"
              className={styles.filterInput}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sl-start">시작일</label>
            <input
              id="sl-start"
              type="date"
              className={styles.filterDateInput}
              value={searchStartDate}
              onChange={(e) => setSearchStartDate(e.target.value)}
            />
          </div>
          <span className={styles.dateSeparator}>~</span>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sl-end">종료일</label>
            <input
              id="sl-end"
              type="date"
              className={styles.filterDateInput}
              value={searchEndDate}
              onChange={(e) => setSearchEndDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.refreshButton} onClick={fetchData}>새로고침</button>
            <button type="button" className={styles.excelButton} onClick={handleExcel}>EXCEL</button>
          </div>
        </div>
      </div>

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
              <th className={styles.sortableCol} onClick={() => handleSort('seatLabel')}>
                좌석 <SortIcon field="seatLabel" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('startedAt')}>
                이탈신청시간 <SortIcon field="startedAt" />
              </th>
              <th>상태</th>
              <th className={styles.sortableCol} onClick={() => handleSort('elapsed')}>
                경과 <SortIcon field="elapsed" />
              </th>
              <th>사유</th>
              <th className={styles.actionCol} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={9}>불러오는 중...</td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={9}>데이터가 없습니다.</td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const isAway = !row.endedAt;
                const elapsed = getElapsedMinutes(row.startedAt, row.endedAt);
                return (
                  <tr key={row.id}>
                    <td className={styles.checkboxCol}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                    <td>{row.studentName}</td>
                    <td>{row.studentNumber ?? '-'}</td>
                    <td>{row.seatLabel}</td>
                    <td>{formatTime(row.startedAt)}</td>
                    <td>
                      {isAway ? (
                        <span className={styles.awayBadge}>이탈중</span>
                      ) : (
                        <span className={styles.returnedBadge}>복귀</span>
                      )}
                    </td>
                    <td>{formatElapsed(elapsed)}</td>
                    <td>{row.reasonName}</td>
                    <td className={styles.actionCol}>
                      {isAway && (
                        <button
                          type="button"
                          className={styles.returnButton}
                          onClick={() => handleForceReturn(row)}
                        >
                          강제 복귀
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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
      {ConfirmDialog}
    </div>
  );
}
