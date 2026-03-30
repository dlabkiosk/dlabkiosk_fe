import { useState, useMemo, useEffect, useCallback } from 'react';
import { LuUtensils, LuArrowUpDown, LuArrowUp, LuArrowDown } from 'react-icons/lu';
import { getMeals } from '../api/mealApi';
import type { MealRecord } from '../api/mealApi';
import { getMe } from '../api/authApi';
import styles from './MealManagement.module.css';

const ITEMS_PER_PAGE = 15;

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'seatLabel' | 'lunchApplied' | 'lunchCheckedTime' | 'dinnerApplied' | 'dinnerCheckedTime';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareMealRecord(a: MealRecord, b: MealRecord, field: SortField, dir: SortDir): number {
  let va: string | number | boolean | null;
  let vb: string | number | boolean | null;

  switch (field) {
    case 'studentName': va = a.studentName; vb = b.studentName; break;
    case 'studentNumber': va = a.studentNumber; vb = b.studentNumber; break;
    case 'seatLabel': va = a.seatLabel; vb = b.seatLabel; break;
    case 'lunchApplied': va = a.lunchApplied; vb = b.lunchApplied; break;
    case 'lunchCheckedTime': va = a.lunchCheckedTime; vb = b.lunchCheckedTime; break;
    case 'dinnerApplied': va = a.dinnerApplied; vb = b.dinnerApplied; break;
    case 'dinnerCheckedTime': va = a.dinnerCheckedTime; vb = b.dinnerCheckedTime; break;
  }

  // null을 맨 뒤로
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;

  let cmp = 0;
  if (typeof va === 'boolean' && typeof vb === 'boolean') {
    cmp = (va === vb) ? 0 : va ? -1 : 1;
  } else if (typeof va === 'string' && typeof vb === 'string') {
    cmp = va.localeCompare(vb);
  }

  return dir === 'desc' ? -cmp : cmp;
}

/* ── 엑셀 다운로드 ── */

function downloadCsv(rows: MealRecord[], dateStr: string) {
  const header = '이름,번호,좌석,점심신청,점심체크,저녁신청,저녁체크';
  const lines = rows.map((r) => {
    const lunch = r.lunchApplied ? 'O' : '미신청';
    const lunchCheck = r.lunchChecked ? `O ${r.lunchCheckedTime ?? ''}` : '';
    const dinner = r.dinnerApplied ? 'O' : '미신청';
    const dinnerCheck = r.dinnerChecked ? `O ${r.dinnerCheckedTime ?? ''}` : '';
    return `${r.studentName},${r.studentNumber},${r.seatLabel},${lunch},${lunchCheck},${dinner},${dinnerCheck}`;
  });

  const bom = '\uFEFF';
  const csv = bom + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `급식명단_${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── 인쇄 ── */

function printTable() {
  window.print();
}

/* ── Page ── */

export default function MealManagement() {
  const today = new Date().toISOString().slice(0, 10);

  /* 필터 */
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchDate, setSearchDate] = useState(today);

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* 페이지 */
  const [page, setPage] = useState(1);

  /* API 데이터 */
  const [rows, setRows] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<number | undefined>(undefined);

  /* 선택 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getMe().then((me) => setStoreId(me.storeId)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMeals({
        storeId,
        startDate: searchDate,
        endDate: searchDate,
        studentName: searchName || undefined,
        studentNumber: searchNumber || undefined,
      });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, searchDate, searchName, searchNumber]);

  // 초기 로드 + 날짜 변경 시 자동 조회
  useEffect(() => {
    if (storeId != null) fetchData();
  }, [storeId, searchDate]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setSearchName('');
    setSearchNumber('');
    setSearchDate(today);
    setSort({ field: null, dir: 'asc' });
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: 'asc' };
    });
  };

  const filteredData = useMemo(() => {
    let data = [...rows];

    if (searchName) {
      data = data.filter((r) => r.studentName.includes(searchName));
    }
    if (searchNumber) {
      data = data.filter((r) => r.studentNumber.includes(searchNumber));
    }

    if (sort.field) {
      data.sort((a, b) => compareMealRecord(a, b, sort.field!, sort.dir));
    }

    return data;
  }, [rows, searchName, searchNumber, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const pageData = filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const allSelected = pageData.length > 0 && pageData.every((r) => selectedIds.has(r.studentId));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageData.map((r) => r.studentId)));
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
    let start = Math.max(1, page - 4);
    let end = Math.min(totalPages, start + 9);
    if (end - start < 9) start = Math.max(1, end - 9);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuUtensils className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>급식 신청 및 체크명단</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>학생명</span>
            <input
              className={styles.filterInput}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>학번</span>
            <input
              className={styles.filterInput}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>날짜</span>
            <input
              type="date"
              className={styles.filterDateInput}
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.excelButton} onClick={() => downloadCsv(filteredData, searchDate)}>EXCEL</button>
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
              <th className={styles.sortableCol} onClick={() => handleSort('lunchApplied')}>
                점심신청 <SortIcon field="lunchApplied" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('lunchCheckedTime')}>
                점심체크 <SortIcon field="lunchCheckedTime" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('dinnerApplied')}>
                저녁신청 <SortIcon field="dinnerApplied" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('dinnerCheckedTime')}>
                저녁체크 <SortIcon field="dinnerCheckedTime" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={8}>로딩 중...</td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={8}>데이터가 없습니다.</td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={`${row.studentId}-${row.date}`}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.studentId)}
                      onChange={() => handleSelectRow(row.studentId)}
                    />
                  </td>
                  <td>{row.studentName}</td>
                  <td>{row.studentNumber}</td>
                  <td>{row.seatLabel}</td>
                  <td>{row.lunchApplied ? 'O' : <span className={styles.notRequested}>미신청</span>}</td>
                  <td>
                    {row.lunchChecked ? (
                      <>
                        <span className={styles.tagMark}>O</span>
                        {row.lunchCheckedTime && <span className={styles.tagTime}>{row.lunchCheckedTime}</span>}
                      </>
                    ) : '-'}
                  </td>
                  <td>{row.dinnerApplied ? 'O' : <span className={styles.notRequested}>미신청</span>}</td>
                  <td>
                    {row.dinnerChecked ? (
                      <>
                        <span className={styles.tagMark}>O</span>
                        {row.dinnerCheckedTime && <span className={styles.tagTime}>{row.dinnerCheckedTime}</span>}
                      </>
                    ) : '-'}
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
