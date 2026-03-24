import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LuSmartphone,
  LuArrowUpDown,
  LuArrowUp,
  LuArrowDown,
  LuPencil,
  LuTrash2,
  LuX,
} from 'react-icons/lu';
import {
  getPhoneSubmissions,
  deletePhoneSubmission,
  updatePhoneSubmission,
  exportPhoneSubmissions,
} from '../api/phoneSubmissionApi';
import type { PhoneSubmission, PageResponse } from '../api/phoneSubmissionApi';
import useConfirm from '../hooks/useConfirm';
import styles from './PhoneManagement.module.css';

/* ── 정렬 ── */

type SortField = 'studentName' | 'studentNumber' | 'className' | 'seatLabel' | 'parentPhoneNumber' | 'memo';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField | null;
  dir: SortDir;
}

function compareRows(a: PhoneSubmission, b: PhoneSubmission, field: SortField, dir: SortDir): number {
  let va: string;
  let vb: string;

  switch (field) {
    case 'studentName': va = a.studentName; vb = b.studentName; break;
    case 'studentNumber': va = a.studentNumber; vb = b.studentNumber; break;
    case 'className': va = a.className; vb = b.className; break;
    case 'seatLabel': va = a.seatLabel; vb = b.seatLabel; break;
    case 'parentPhoneNumber': va = a.parentPhoneNumber ?? ''; vb = b.parentPhoneNumber ?? ''; break;
    case 'memo': va = a.memo ?? ''; vb = b.memo ?? ''; break;
  }

  const cmp = va.localeCompare(vb);
  return dir === 'desc' ? -cmp : cmp;
}

/* ── CSV 다운로드 ── */

function downloadCsv(rows: PhoneSubmission[], dateLabel: string) {
  const header = '이름,학번,반,좌석번호,학부모 전화번호,신청일,신청기간,메모';
  const lines = rows.map((r) => {
    const period = r.submissionType === 'PERMANENT'
      ? `${r.startDate} ~ 퇴원까지`
      : (r.endDate ? `${r.startDate} ~ ${r.endDate}` : r.startDate);
    const date = r.submittedAt.slice(0, 10);
    const memo = (r.memo || '').replace(/,/g, ' ');
    return `${r.studentName},${r.studentNumber},${r.className},${r.seatLabel},${r.parentPhoneNumber || ''},${date},${period},${memo}`;
  });

  const bom = '\uFEFF';
  const csv = bom + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `휴대폰미소지_${dateLabel}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ── 기간 표시 헬퍼 ── */
function formatPeriod(row: PhoneSubmission): string {
  if (row.submissionType === 'NO_PHONE') {
    return '휴대폰 없음';
  }
  if (row.submissionType === 'PERMANENT') {
    return `${row.startDate} ~ 퇴원까지`;
  }
  return row.endDate ? `${row.startDate} ~ ${row.endDate}` : row.startDate;
}

const ITEMS_PER_PAGE = 12;
const MEMO_MAX_LENGTH = 20;

/* ── Page ── */

export default function PhoneManagement() {
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const today = new Date().toISOString().slice(0, 10);

  /* 필터 */
  const [searchName, setSearchName] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchDate, setSearchDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState({ name: '', number: '', className: '', date: today });

  /* 정렬 */
  const [sort, setSort] = useState<SortState>({ field: null, dir: 'asc' });

  /* 페이지 */
  const [page, setPage] = useState(1);

  /* 선택 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* API 데이터 (전체 → 클라이언트 필터/페이징) */
  const [allData, setAllData] = useState<PhoneSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  /* 모달 */
  const [detailTarget, setDetailTarget] = useState<PhoneSubmission | null>(null);
  const [editTarget, setEditTarget] = useState<PhoneSubmission | null>(null);
  const [editForm, setEditForm] = useState({ memo: '', parentPhoneNumber: '' });

  /* ── 서버에서 데이터 조회 (선택 날짜 기준 해당 월 범위로 요청) ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = appliedFilters.date || today;
      const d = new Date(dateStr);
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const endDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const result: PageResponse<PhoneSubmission> = await getPhoneSubmissions({
        startDate,
        endDate,
        studentName: appliedFilters.name || undefined,
        studentNumber: appliedFilters.number || undefined,
        page: 0,
        size: 9999,
      });
      setAllData(result.content);
    } catch (err) {
      console.error('휴대폰 미소지 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.name, appliedFilters.number, appliedFilters.date, today]);

  /* ── 클라이언트 날짜 필터: 선택 날짜가 startDate~endDate 범위에 포함되는 건만 ── */
  const filteredData = useMemo(() => {
    let rows = allData;

    // 날짜 필터: 선택한 날짜가 신청기간(startDate ~ endDate) 안에 포함되는지
    if (appliedFilters.date) {
      const target = appliedFilters.date; // 'YYYY-MM-DD'
      rows = rows.filter((r) => {
        // NO_PHONE은 날짜 무관하게 항상 포함
        if (r.submissionType === 'NO_PHONE') return true;
        if (target < r.startDate) return false;
        // PERMANENT(퇴원까지)이면 endDate가 없으므로 startDate 이후는 모두 포함
        if (r.submissionType === 'PERMANENT' || !r.endDate) return true;
        return target <= r.endDate;
      });
    }

    // 반 필터 (서버에서 지원 안 하므로 클라이언트에서 처리)
    if (appliedFilters.className) {
      const keyword = appliedFilters.className.toLowerCase();
      rows = rows.filter((r) => (r.className ?? '').toLowerCase().includes(keyword));
    }

    return rows;
  }, [allData, appliedFilters.date, appliedFilters.className]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── 필터 ── */
  const handleSearch = () => {
    setAppliedFilters({ name: searchName, number: searchNumber, className: searchClass, date: searchDate });
    setPage(1);
  };

  const handleReset = () => {
    setSearchName('');
    setSearchNumber('');
    setSearchClass('');
    setSearchDate(today);
    setAppliedFilters({ name: '', number: '', className: '', date: today });
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

  /* ── 삭제 (confirm 취소 시 detailTarget이 있으면 상세 모달 유지) ── */
  const handleDelete = async (id: number) => {
    if (!(await confirm('해당 미소지 신청을 삭제하시겠습니까?'))) return;
    try {
      await deletePhoneSubmission(id);
      setDetailTarget(null);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      await fetchData();
    } catch (err) {
      console.error('삭제 실패:', err);
      await alert('삭제에 실패했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!(await confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`))) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deletePhoneSubmission(id)));
      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      console.error('일괄 삭제 실패:', err);
      await alert('일부 항목 삭제에 실패했습니다.');
      await fetchData();
    }
  };

  /* ── 수정 ── */
  const openEdit = (row: PhoneSubmission, fromDetail = false) => {
    setEditTarget(row);
    setEditForm({ memo: row.memo || '', parentPhoneNumber: row.parentPhoneNumber || '' });
    // 상세 모달에서 진입 시 detailTarget 유지 (수정 취소하면 상세로 복귀)
    if (!fromDetail) setDetailTarget(null);
  };

  const handleEditCancel = () => {
    // detailTarget이 남아 있으면 상세 모달로 복귀, 아니면 그냥 닫기
    setEditTarget(null);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      await updatePhoneSubmission(editTarget.id, {
        submissionType: editTarget.submissionType,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        memo: editForm.memo,
        parentPhoneNumber: editForm.parentPhoneNumber,
      });
      setEditTarget(null);
      setDetailTarget(null);
      await fetchData();
    } catch (err) {
      console.error('수정 실패:', err);
      await alert('수정에 실패했습니다.');
    }
  };

  /* ── EXCEL ── */
  const handleExcel = async () => {
    if (filteredData.length > 0) {
      downloadCsv(filteredData, appliedFilters.date || today);
    } else {
      try {
        await exportPhoneSubmissions({
          startDate: appliedFilters.date || undefined,
          endDate: appliedFilters.date || undefined,
        });
      } catch {
        await alert('엑셀 다운로드에 실패했습니다.');
      }
    }
  };

  /* ── 클라이언트 정렬 ── */
  const sortedData = useMemo(() => {
    if (!sort.field) return filteredData;
    return [...filteredData].sort((a, b) => compareRows(a, b, sort.field!, sort.dir));
  }, [filteredData, sort]);

  /* ── 클라이언트 페이지네이션 ── */
  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
  const pagedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, page]);

  const allSelected = pagedData.length > 0 && pagedData.every((r: PhoneSubmission) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedData.map((r: PhoneSubmission) => r.id)));
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

  /* ── 메모 truncate ── */
  const truncateMemo = (memo: string | null | undefined): string => {
    if (!memo) return '-';
    if (memo.length <= MEMO_MAX_LENGTH) return memo;
    return memo.slice(0, MEMO_MAX_LENGTH) + '…';
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuSmartphone className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>휴대폰 미소지 관리</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-name">학생명</label>
            <input
              id="phone-name"
              className={styles.filterInput}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-number">학번</label>
            <input
              id="phone-number"
              className={styles.filterInput}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-class">반</label>
            <input
              id="phone-class"
              className={styles.filterInput}
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="phone-date">날짜</label>
            <input
              id="phone-date"
              type="date"
              className={styles.filterDateInput}
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>

          <div className={styles.filterActions}>
            <button type="button" className={styles.searchButton} onClick={handleSearch}>검색</button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>초기화</button>
            <button type="button" className={styles.excelButton} onClick={handleExcel}>EXCEL</button>
          </div>
        </div>
      </div>

      {/* 일괄 삭제 */}
      {selectedIds.size > 0 && (
        <div>
          <button type="button" className={styles.bulkDeleteButton} onClick={handleBulkDelete}>
            선택 삭제 ({selectedIds.size}건)
          </button>
        </div>
      )}

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
              <th className={styles.sortableCol} onClick={() => handleSort('className')}>
                반 <SortIcon field="className" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('seatLabel')}>
                좌석번호 <SortIcon field="seatLabel" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('parentPhoneNumber')}>
                학부모 전화번호 <SortIcon field="parentPhoneNumber" />
              </th>
              <th className={styles.sortableCol} onClick={() => handleSort('memo')}>
                메모 <SortIcon field="memo" />
              </th>
              <th className={styles.actionCol}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.emptyRow}>
                <td colSpan={8}>불러오는 중...</td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={8}>데이터가 없습니다.</td>
              </tr>
            ) : (
              pagedData.map((row: PhoneSubmission) => (
                <tr
                  key={row.id}
                  className={styles.clickableRow}
                  onClick={() => setDetailTarget(row)}
                >
                  <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                    />
                  </td>
                  <td>{row.studentName}</td>
                  <td>{row.studentNumber}</td>
                  <td>{row.className}</td>
                  <td>{row.seatLabel}</td>
                  <td>{row.parentPhoneNumber || '-'}</td>
                  <td className={styles.memoTd}>{truncateMemo(row.memo)}</td>
                  <td className={styles.actionCol} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionGroup}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        title="수정"
                        onClick={() => openEdit(row)}
                      >
                        <LuPencil />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="삭제"
                        onClick={() => handleDelete(row.id)}
                      >
                        <LuTrash2 />
                      </button>
                    </div>
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

      {/* ── 자세히 보기 모달 (수정 모달이 열려있으면 숨김) ── */}
      {detailTarget && !editTarget && (
        <div className={styles.overlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={() => setDetailTarget(null)}>
              <LuX />
            </button>
            <h3 className={styles.modalTitle}>미소지 신청 상세</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr>
                  <th>이름</th>
                  <td>{detailTarget.studentName}</td>
                </tr>
                <tr>
                  <th>학번</th>
                  <td>{detailTarget.studentNumber}</td>
                </tr>
                <tr>
                  <th>반</th>
                  <td>{detailTarget.className}</td>
                </tr>
                <tr>
                  <th>좌석번호</th>
                  <td>{detailTarget.seatLabel}</td>
                </tr>
                <tr>
                  <th>신청일</th>
                  <td>{detailTarget.submittedAt.slice(0, 10)}</td>
                </tr>
                <tr>
                  <th>신청기간</th>
                  <td>
                    {detailTarget.submissionType === 'NO_PHONE' ? (
                      <span className={styles.noPhoneBadge}>휴대폰 없음</span>
                    ) : detailTarget.submissionType === 'PERMANENT' ? (
                      <>{detailTarget.startDate} ~ <span className={styles.permanentBadge}>퇴원까지</span></>
                    ) : (
                      formatPeriod(detailTarget)
                    )}
                  </td>
                </tr>
                <tr>
                  <th>학부모 전화번호</th>
                  <td>{detailTarget.parentPhoneNumber || '-'}</td>
                </tr>
                <tr>
                  <th>메모</th>
                  <td className={styles.detailMemo}>{detailTarget.memo || '-'}</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnPrimary}
                onClick={() => openEdit(detailTarget, true)}
              >
                수정
              </button>
              <button
                type="button"
                className={styles.modalBtnDanger}
                onClick={() => handleDelete(detailTarget.id)}
              >
                삭제
              </button>
              <button
                type="button"
                className={styles.modalBtnSecondary}
                onClick={() => setDetailTarget(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {editTarget && (
        <div className={styles.overlay} onClick={handleEditCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} onClick={handleEditCancel}>
              <LuX />
            </button>
            <h3 className={styles.modalTitle}>미소지 신청 수정</h3>
            <table className={styles.detailTable}>
              <tbody>
                <tr>
                  <th>이름</th>
                  <td>{editTarget.studentName}</td>
                </tr>
                <tr>
                  <th>학번</th>
                  <td>{editTarget.studentNumber}</td>
                </tr>
                <tr>
                  <th>학부모 전화번호</th>
                  <td>
                    <input
                      type="text"
                      className={styles.editInput}
                      value={editForm.parentPhoneNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentPhoneNumber: e.target.value }))}
                      placeholder="학부모 전화번호"
                    />
                  </td>
                </tr>
                <tr>
                  <th>메모</th>
                  <td>
                    <textarea
                      className={styles.editTextarea}
                      value={editForm.memo}
                      onChange={(e) => setEditForm((f) => ({ ...f, memo: e.target.value }))}
                      placeholder="메모를 입력하세요"
                      rows={4}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnSecondary}
                onClick={handleEditCancel}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.modalBtnPrimary}
                onClick={handleEditSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
