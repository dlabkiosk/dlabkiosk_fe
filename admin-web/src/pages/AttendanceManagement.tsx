import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import attendanceIcon from '../assets/attendance_active.png';
import downloadIcon from '../assets/download.png';
import qrDownloadIcon from '../assets/qr_download.png';
import { getAttendances } from '../api/attendanceApi';
import type { AttendanceRecord } from '../api/attendanceApi';
import { getSeatLeaves } from '../api/seatLeaveApi';
import { downloadStudentQr, downloadStudentsQrBulk } from '../api/studentApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import styles from './AttendanceManagement.module.css';
import f from '../styles/filter.module.css';
import FilterSelect from '../components/FilterSelect';

/* ── 출결 상태 ── */

const STATUS_OPTIONS = ['전체', '등원', '미출석', '외출', '하원', '공석', '미확인', '좌석이탈'];
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

  /* QR 모달 */
  const [qrStudent, setQrStudent] = useState<{ studentId: number; studentName: string; studentNumber: string; storeName: string } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

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
        attendanceStatus: (filterStatus !== '전체' && filterStatus !== '좌석이탈') ? filterStatus : undefined,
        phoneSubmitted: filterPhone === '전체' ? undefined : filterPhone === 'O',
      };

      const today = new Date().toISOString().slice(0, 10);

      let attendanceRows: AttendanceRecord[];
      if (isAdmin && effectiveStoreId == null && stores.length > 0) {
        const results = await Promise.all(
          stores.map(async (s) => {
            const list = await getAttendances({ storeId: s.id, ...commonParams });
            return list.map((r) => ({ ...r, storeName: s.storeName }));
          }),
        );
        attendanceRows = results.flat();
      } else {
        const data = await getAttendances({ storeId: effectiveStoreId, ...commonParams });
        const selectedStore = stores.find((s) => s.id === effectiveStoreId);
        attendanceRows = selectedStore ? data.map((r) => ({ ...r, storeName: selectedStore.storeName })) : data;
      }

      // 좌석이탈 현황 조회 → 현재 이탈 중인 학생 상태 덮어쓰기
      try {
        const seatLeaveRes = await getSeatLeaves({ startDate: today, endDate: today, page: 0, size: 9999 });
        const activeLeaves = new Set(
          seatLeaveRes.content
            .filter((sl) => !sl.endedAt)
            .map((sl) => sl.studentId),
        );
        if (activeLeaves.size > 0) {
          attendanceRows = attendanceRows.map((r) =>
            activeLeaves.has(r.studentId) ? { ...r, attendanceStatus: '좌석이탈' } : r,
          );
        }
      } catch {
        // 좌석이탈 조회 실패 시 무시
      }

      setRows(attendanceRows);
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
    window.location.reload();
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

  /* 선택 — 검색 결과 전체(filteredData) 기준 */
  const allChecked = filteredData.length > 0 && filteredData.every((r) => selectedIds.has(r.studentId));
  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((r) => r.studentId)));
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
      case '미출석': return styles.statusAbsent;
      case '외출': return styles.statusOuting;
      case '하원': return styles.statusLeft;
      case '공석': return styles.statusVacant;
      case '미확인': return styles.statusVacant;
      case '좌석이탈': return styles.statusSeatLeave;
      default: return '';
    }
  };

  const openQrModal = async (row: AttendanceRecord) => {
    setQrStudent({ studentId: row.studentId, studentName: row.studentName, studentNumber: row.studentNumber, storeName: row.storeName ?? '' });
    setQrUrl(null);
    setQrLoading(true);
    try {
      const blob = await downloadStudentQr(row.studentId);
      setQrUrl(URL.createObjectURL(blob));
    } catch {
      setQrUrl(null);
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    if (qrUrl) URL.revokeObjectURL(qrUrl);
    setQrStudent(null);
    setQrUrl(null);
  };

  /** 체크된 학생들의 QR을 ZIP으로 일괄 다운로드 */
  const [bulkQrLoading, setBulkQrLoading] = useState(false);
  const handleBulkQrDownload = async () => {
    if (selectedIds.size === 0 || bulkQrLoading) return;
    setBulkQrLoading(true);
    try {
      const blob = await downloadStudentsQrBulk(Array.from(selectedIds));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().slice(0, 10);
      link.download = `student-qr-${today}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[bulk QR download] 실패', err);
      alert('QR 일괄 다운로드에 실패했습니다.');
    } finally {
      setBulkQrLoading(false);
    }
  };

  const handleQrDownload = () => {
    if (!qrUrl || !qrStudent) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${qrStudent.studentName}_${qrStudent.studentNumber}.png`;
    link.click();
  };

  const handleQrPrint = () => {
    if (!qrUrl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR 인쇄</title><style>
        body { display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }
        img { max-width:400px; }
      </style></head><body>
        <img src="${qrUrl}" onload="window.print();window.close();" />
      </body></html>
    `);
    win.document.close();
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
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.contentCard}>
        <div className={styles.tableActions}>
          <button
            type="button"
            className={styles.qrButton}
            onClick={handleBulkQrDownload}
            disabled={selectedIds.size === 0 || bulkQrLoading}
          >
            {bulkQrLoading ? 'QR 다운로드 중...' : selectedIds.size > 0 ? `${selectedIds.size}명 QR 다운로드` : '전체 QR 다운로드'}
            <img src={qrDownloadIcon} alt="" className={styles.downloadIcon} />
          </button>
          <button type="button" className={f.excelButton} onClick={() => {
            const rows = selectedIds.size > 0
              ? filteredData.filter((r) => selectedIds.has(r.studentId))
              : filteredData;
            downloadCsv(rows);
          }}>{selectedIds.size > 0 ? `${selectedIds.size}명 엑셀 다운로드` : '전체 엑셀 다운로드'} <img src={downloadIcon} alt="" className={styles.downloadIcon} /></button>
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
                <td colSpan={isAdmin ? 7 : 6}>출결 내역이 없습니다.</td>
              </tr>
            ) : (
              pagedData.map((row) => (
                <tr key={row.studentId} className={styles.clickableRow} onClick={() => openQrModal(row)}>
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

      {/* QR 모달 */}
      {qrStudent && (
        <div className={styles.overlay} onClick={closeQrModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeQrModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>QR 코드</h3>

            <div className={styles.qrInfo}>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>이름</span><span>{qrStudent.studentName}</span></p>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>학번</span><span>{qrStudent.studentNumber}</span></p>
              {isAdmin && <p className={styles.qrInfoRow}><span className={styles.qrLabel}>지점</span><span>{qrStudent.storeName}</span></p>}
            </div>

            <div className={styles.qrImageWrap}>
              {qrLoading ? (
                <span className={styles.qrLoading}>불러오는 중...</span>
              ) : qrUrl ? (
                <img src={qrUrl} alt="QR" className={styles.qrImage} />
              ) : (
                <span className={styles.qrError}>QR 코드를 불러올 수 없습니다.</span>
              )}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={handleQrPrint} disabled={!qrUrl}>인쇄</button>
              <button type="button" className={styles.btnPrimary} onClick={handleQrDownload} disabled={!qrUrl}>다운로드</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
