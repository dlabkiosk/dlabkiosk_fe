import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import attendanceIcon from '../assets/attendance_active.png';
import downloadIcon from '../assets/download.png';
import qrDownloadIcon from '../assets/qr_download.png';
import { getAttendances, updateCheckInTime, updateCheckOut, deleteOngoingOuting } from '../api/attendanceApi';
import type { AttendanceRecord } from '../api/attendanceApi';
import { getSeatLeaves } from '../api/seatLeaveApi';
import { downloadStudentQr, downloadStudentsQrBulk } from '../api/studentApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import styles from './AttendanceManagement.module.css';
import f from '../styles/filter.module.css';
import FilterSelect from '../components/FilterSelect';
import useConfirm from '../hooks/useConfirm';

/* ── 출결 상태 ── */

const STATUS_OPTIONS = ['전체', '등원', '미출석', '외출', '하원', '좌석이탈'];
const PHONE_OPTIONS = ['전체', 'O', 'X'];

const ITEMS_PER_PAGE = 15;

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'seatLabel' | 'attendanceStatus' | 'checkedInAt' | 'phoneSubmitted';
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
  } else if (field === 'checkedInAt') {
    va = a.checkedInAt ?? '';
    vb = b.checkedInAt ?? '';
  } else {
    va = a[field] ?? '';
    vb = b[field] ?? '';
  }

  const cmp = va.localeCompare(vb, 'ko', { numeric: true });
  return dir === 'desc' ? -cmp : cmp;
}

/* ── CSV 다운로드 ── */

function formatCheckInAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function downloadCsv(rows: AttendanceRecord[]) {
  const header = '이름,학번,좌석,출결현황,등원시각,휴대폰 미소지';
  const lines = rows.map((r) => {
    const phone = r.phoneSubmitted ? 'O' : 'X';
    const checkIn = formatCheckInAt(r.checkedInAt);
    return `${r.studentName},${r.studentNumber},${r.seatLabel ?? ''},${r.attendanceStatus ?? ''},${checkIn},${phone}`;
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
  const { confirm, alert, ConfirmDialog } = useConfirm();

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

  /* 등원시각 수정 모달 */
  const [editTarget, setEditTarget] = useState<AttendanceRecord | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* 하원 취소 모달 */
  const [checkOutTarget, setCheckOutTarget] = useState<AttendanceRecord | null>(null);
  const [checkOutSaving, setCheckOutSaving] = useState(false);

  /* 외출 취소 모달 */
  const [outingTarget, setOutingTarget] = useState<AttendanceRecord | null>(null);
  const [outingSaving, setOutingSaving] = useState(false);

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
      // attendanceStatus 필터는 dsaDrift 케이스 포함을 위해 클라이언트에서 처리
      const commonParams = {
        studentName: searchName || undefined,
        studentNumber: searchStudentNumber || undefined,
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
      data = data.filter((r) => {
        // 기본: attendanceStatus 일치
        if (r.attendanceStatus === filterStatus) return true;
        // 추가: dsaDrift가 있고 우리 시스템 상태가 필터값과 일치 (ex: 미확인이지만 하원 취소 필요)
        if (r.dsaDrift && r.ourState === filterStatus) return true;
        return false;
      });
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
      void alert('QR 일괄 다운로드에 실패했습니다.');
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

  /** ISO → time input용 HH:mm (로컬 시각 기준). 값 없으면 현재 시각. */
  const toTimeInputValue = (iso: string | null): string => {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  /** 오늘 날짜(YYYY-MM-DD, 로컬 기준) */
  const todayDateStr = (): string => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${MM}-${dd}`;
  };

  /** HH:mm(24h) → { period: '오전'|'오후', hour12: '01'..'12', minute: '00'..'59' } */
  const parseTimeParts = (hhmm: string) => {
    const [h, m] = hhmm.split(':');
    const H = Number(h);
    const period = H < 12 ? '오전' : '오후';
    const h12 = H % 12 === 0 ? 12 : H % 12;
    return {
      period,
      hour12: String(h12).padStart(2, '0'),
      minute: (m ?? '00').padStart(2, '0'),
    };
  };

  /** { period, hour12, minute } → HH:mm(24h) */
  const composeTime = (period: string, hour12: string, minute: string): string => {
    const h12 = Number(hour12);
    let H = h12 % 12;
    if (period === '오후') H += 12;
    return `${String(H).padStart(2, '0')}:${minute}`;
  };

  const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const openEditModal = (row: AttendanceRecord) => {
    setEditTarget(row);
    setEditValue(toTimeInputValue(row.checkedInAt));
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditTarget(null);
    setEditValue('');
  };

  const handleEditSave = async () => {
    if (!editTarget || !editValue) return;
    setEditSaving(true);
    try {
      // 오늘 날짜 + 선택 시각 → LocalDateTime (YYYY-MM-DDTHH:mm:ss)
      const checkInAt = `${todayDateStr()}T${editValue}:00`;
      await updateCheckInTime(editTarget.studentId, checkInAt);
      setEditTarget(null);
      setEditValue('');
      await fetchData();
    } catch (err) {
      console.error('[updateCheckInTime] 실패', err);
      void alert('등원시각 수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const openCheckOutModal = (row: AttendanceRecord) => {
    setCheckOutTarget(row);
  };

  const closeCheckOutModal = () => {
    if (checkOutSaving) return;
    setCheckOutTarget(null);
  };

  const handleCheckOutCancel = async () => {
    if (!checkOutTarget) return;
    if (!(await confirm(`${checkOutTarget.studentName} 학생의 ${checkOutTarget.ourState ?? '하원'}을 취소하시겠습니까?`))) return;
    setCheckOutSaving(true);
    try {
      await updateCheckOut(checkOutTarget.studentId, null);
      setCheckOutTarget(null);
      await fetchData();
    } catch (err) {
      console.error('[updateCheckOut cancel] 실패', err);
      void alert('하원 취소에 실패했습니다.');
    } finally {
      setCheckOutSaving(false);
    }
  };

  const openOutingModal = (row: AttendanceRecord) => {
    setOutingTarget(row);
  };

  const closeOutingModal = () => {
    if (outingSaving) return;
    setOutingTarget(null);
  };

  const handleOutingDelete = async () => {
    if (!outingTarget) return;
    if (!(await confirm(`${outingTarget.studentName} 학생의 외출을 취소하시겠습니까?`))) return;
    setOutingSaving(true);
    try {
      await deleteOngoingOuting(outingTarget.studentId);
      setOutingTarget(null);
      await fetchData();
    } catch (err) {
      console.error('[deleteOngoingOuting] 실패', err);
      void alert('외출 취소에 실패했습니다.');
    } finally {
      setOutingSaving(false);
    }
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
              <th className={styles.sortableCol} onClick={() => handleSort('checkedInAt')}>
                등원시각 <SortIcon field="checkedInAt" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('phoneSubmitted')}>
                휴대폰 미소지 <SortIcon field="phoneSubmitted" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 8 : 7}>로딩 중...</td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={isAdmin ? 8 : 7}>출결 내역이 없습니다.</td>
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
                  <td onClick={(e) => e.stopPropagation()}>
                    {row.attendanceStatus ? (
                      row.dsaDrift && (row.ourState === '하원' || row.ourState === '조퇴') ? (
                        <button
                          type="button"
                          className={`${styles.statusBadge} ${styles.statusDrift}`}
                          onClick={() => openCheckOutModal(row)}
                          title={`DSA 상태: ${row.attendanceStatus} / 우리 시스템: ${row.ourState} — 클릭해서 취소`}
                        >
                          {row.ourState} 취소 필요
                        </button>
                      ) : row.dsaDrift && row.ourState === '외출' ? (
                        <button
                          type="button"
                          className={`${styles.statusBadge} ${styles.statusDrift}`}
                          onClick={() => openOutingModal(row)}
                          title={`DSA 상태: ${row.attendanceStatus} / 우리 시스템: 외출 — 클릭해서 취소`}
                        >
                          외출 취소 필요
                        </button>
                      ) : (
                        <span className={`${styles.statusBadge} ${getStatusClass(row.attendanceStatus)}`}>
                          {row.attendanceStatus}
                        </span>
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {['등원', '외출', '하원', '좌석이탈'].includes(row.attendanceStatus) ? (
                      row.checkedInAt ? (
                        <button
                          type="button"
                          className={`${styles.statusBadge} ${styles.checkInTimeBadge}`}
                          onClick={() => openEditModal(row)}
                          title="등원시각 수정"
                        >
                          {formatCheckInAt(row.checkedInAt)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.statusBadge} ${styles.checkInInputBadge}`}
                          onClick={() => openEditModal(row)}
                          title="등원시각 입력 (DSA 수기 등원)"
                        >
                          <span className={styles.checkInPlus}>+</span> 시각 입력
                        </button>
                      )
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

      {/* 등원시각 수정 모달 */}
      {editTarget && (
        <div className={styles.overlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeEditModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>등원시각 수정</h3>

            <div className={styles.qrInfo}>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>이름</span><span>{editTarget.studentName}</span></p>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>학번</span><span>{editTarget.studentNumber}</span></p>
              <p className={styles.qrInfoRow}>
                <span className={styles.qrLabel}>현재 등원시각</span>
                <span>{editTarget.checkedInAt ? formatCheckInAt(editTarget.checkedInAt) : '미입력 (DSA 수기 등원)'}</span>
              </p>
            </div>

            <div className={styles.editField}>
              <label className={styles.editLabel}>
                등원시각 <span className={styles.editHint}>(오늘 {todayDateStr()})</span>
              </label>
              <div className={styles.timePickerRow}>
                {(() => {
                  const { period, hour12, minute } = parseTimeParts(editValue || '00:00');
                  return (
                    <>
                      <FilterSelect
                        value={period}
                        options={['오전', '오후']}
                        onChange={(v) => setEditValue(composeTime(v, hour12, minute))}
                      />
                      <FilterSelect
                        value={hour12}
                        options={HOUR_OPTIONS}
                        onChange={(v) => setEditValue(composeTime(period, v, minute))}
                      />
                      <span className={styles.timeColon}>:</span>
                      <FilterSelect
                        value={minute}
                        options={MINUTE_OPTIONS}
                        onChange={(v) => setEditValue(composeTime(period, hour12, v))}
                      />
                    </>
                  );
                })()}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={closeEditModal} disabled={editSaving}>취소</button>
              <button type="button" className={styles.btnPrimary} onClick={handleEditSave} disabled={editSaving || !editValue}>
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하원 취소 모달 */}
      {checkOutTarget && (
        <div className={styles.overlay} onClick={closeCheckOutModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeCheckOutModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>{checkOutTarget.ourState === '조퇴' ? '조퇴' : '하원'} 취소</h3>

            <div className={styles.qrInfo}>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>이름</span><span>{checkOutTarget.studentName}</span></p>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>학번</span><span>{checkOutTarget.studentNumber}</span></p>
              <p className={styles.qrInfoRow}>
                <span className={styles.qrLabel}>DSA 상태</span>
                <span>{checkOutTarget.attendanceStatus}</span>
              </p>
              <p className={styles.qrInfoRow}>
                <span className={styles.qrLabel}>우리 시스템</span>
                <span>{checkOutTarget.ourState ?? '-'}</span>
              </p>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnDanger} onClick={handleCheckOutCancel} disabled={checkOutSaving}>
                {checkOutSaving ? '처리 중...' : '하원 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 외출 취소 모달 */}
      {outingTarget && (
        <div className={styles.overlay} onClick={closeOutingModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={closeOutingModal}>&#x2715;</button>
            <h3 className={styles.modalTitle}>외출 취소</h3>

            <div className={styles.qrInfo}>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>이름</span><span>{outingTarget.studentName}</span></p>
              <p className={styles.qrInfoRow}><span className={styles.qrLabel}>학번</span><span>{outingTarget.studentNumber}</span></p>
              <p className={styles.qrInfoRow}>
                <span className={styles.qrLabel}>DSA 상태</span>
                <span>{outingTarget.attendanceStatus}</span>
              </p>
              <p className={styles.qrInfoRow}>
                <span className={styles.qrLabel}>우리 시스템</span>
                <span>{outingTarget.ourState ?? '-'}</span>
              </p>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnDanger} onClick={handleOutingDelete} disabled={outingSaving}>
                {outingSaving ? '처리 중...' : '외출 취소'}
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
