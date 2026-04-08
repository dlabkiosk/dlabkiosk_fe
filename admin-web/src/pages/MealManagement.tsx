import { useState, useMemo, useEffect, useCallback } from 'react';
import { LuArrowUpDown, LuArrowUp, LuArrowDown } from 'react-icons/lu';
import mealIcon from '../assets/meal_active.png';
import downloadIcon from '../assets/download.png';
import { getMeals } from '../api/mealApi';
import type { MealRecord } from '../api/mealApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import FilterDatePicker from '../components/FilterDatePicker';
import FilterSelect from '../components/FilterSelect';
import styles from './MealManagement.module.css';
import f from '../styles/filter.module.css';

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
  const header = '이름,번호,좌석,중식신청,중식체크,석식신청,석식체크';
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

/** 시간 문자열에서 밀리초 제거 — "12:30:45.123" → "12:30:45" */
function trimMillis(time: string): string {
  return time.replace(/\.\d+$/, '');
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

  /* ADMIN 역할 & 지점 필터 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('전체');

  /* API 데이터 */
  const [rows, setRows] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);

  /* 선택 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
        startDate: searchDate,
        endDate: searchDate,
        studentName: searchName || undefined,
        studentNumber: searchNumber || undefined,
      };

      if (isAdmin && effectiveStoreId == null && stores.length > 0) {
        // ADMIN 전체: 각 지점별로 조회 후 합침
        const results = await Promise.all(
          stores.map(async (s) => {
            const list = await getMeals({ storeId: s.id, ...commonParams });
            return list.map((r) => ({ ...r, storeName: s.storeName }));
          }),
        );
        setRows(results.flat());
      } else {
        const data = await getMeals({ storeId: effectiveStoreId, ...commonParams });
        const selectedStore = stores.find((s) => s.id === effectiveStoreId);
        setRows(selectedStore ? data.map((r) => ({ ...r, storeName: selectedStore.storeName })) : data);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, stores, effectiveStoreId, searchDate, searchName, searchNumber]);

  // 초기 로드 + 지점/날짜 변경 시 자동 조회
  useEffect(() => {
    if (!ready) return;
    if (isAdmin && stores.length === 0) return;
    if (!isAdmin && storeId == null) return;
    setPage(1);
    fetchData();
  }, [ready, stores, effectiveStoreId, searchDate]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    window.location.reload();
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
      data = data.filter((r) => (r.studentName ?? '').includes(searchName));
    }
    if (searchNumber) {
      data = data.filter((r) => (r.studentNumber ?? '').includes(searchNumber));
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
          <img src={mealIcon} alt="" className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>급식 신청 및 체크명단</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={f.filterCard}>
        <div className={f.filterRow}>
          {isAdmin && (
            <div className={f.filterGroup}>
              <span className={f.filterLabel}>지점</span>
              <FilterSelect
                value={storeFilter}
                options={['전체', ...stores.map((s) => s.storeName)]}
                placeholder="전체"
                onChange={setStoreFilter}
              />
            </div>
          )}
          <div className={f.filterGroup}>
            <span className={f.filterLabel}>학생명</span>
            <input
              className={f.filterInput}
              placeholder="학생명"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className={f.filterGroup}>
            <span className={f.filterLabel}>학번</span>
            <input
              className={f.filterInput}
              placeholder="학번"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className={f.filterGroup}>
            <span className={f.filterLabel}>날짜</span>
            <FilterDatePicker value={searchDate} onChange={setSearchDate} />
          </div>

          <div className={f.filterActions}>
            <button type="button" className={f.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={f.resetButton} onClick={handleReset}>새로고침</button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className={styles.contentCard}>
        <div className={styles.tableActions}>
          <button type="button" className={f.excelButton} onClick={() => downloadCsv(filteredData, searchDate)}>엑셀 다운로드 <img src={downloadIcon} alt="" className={styles.downloadIcon} /></button>
        </div>
        <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
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
              <th className={styles.sortableCol} onClick={() => handleSort('lunchApplied')}>
                중식 신청 <SortIcon field="lunchApplied" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('lunchCheckedTime')}>
                중식 체크 <SortIcon field="lunchCheckedTime" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('dinnerApplied')}>
                석식 신청 <SortIcon field="dinnerApplied" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('dinnerCheckedTime')}>
                석식 체크 <SortIcon field="dinnerCheckedTime" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 9 : 8}>로딩 중...</td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 9 : 8}>내역이 없습니다.</td>
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
                  {isAdmin && <td>{row.storeName ?? '-'}</td>}
                  <td>{row.studentName}</td>
                  <td>{row.studentNumber}</td>
                  <td>{row.seatLabel}</td>
                  <td>{row.lunchApplied ? 'O' : <span className={styles.notRequested}>미신청</span>}</td>
                  <td>
                    {row.lunchChecked ? (
                      <span className={styles.checkedBadge}>{row.lunchCheckedTime ? trimMillis(row.lunchCheckedTime) : 'O'}</span>
                    ) : row.lunchApplied ? (
                      <span className={styles.uncheckedBadge}>미체크</span>
                    ) : '-'}
                  </td>
                  <td>{row.dinnerApplied ? 'O' : <span className={styles.notRequested}>미신청</span>}</td>
                  <td>
                    {row.dinnerChecked ? (
                      <span className={styles.checkedBadge}>{row.dinnerCheckedTime ? trimMillis(row.dinnerCheckedTime) : 'O'}</span>
                    ) : row.dinnerApplied ? (
                      <span className={styles.uncheckedBadge}>미체크</span>
                    ) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 페이지네이션 */}
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
