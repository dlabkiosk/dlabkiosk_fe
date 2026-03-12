import { useState } from 'react';
import { LuChevronUp, LuChevronLeft, LuChevronRight, LuPencil } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

/* ── Mock Data ── */

type MeritType = '상점' | '벌점';

interface MeritRow {
  no: number;
  date: string;
  type: MeritType;
  score: number;
  reason: string;
  category: string;
}

const MOCK_MERIT: MeritRow[] = [
  { no: 1, date: '2026년 02월 26일 목요일', type: '상점', score: 5, reason: '자율학습 성실 참여', category: '-' },
  { no: 2, date: '2026년 02월 26일 목요일', type: '벌점', score: -10, reason: '무단 결석', category: '-' },
  { no: 3, date: '2026년 02월 26일 목요일', type: '상점', score: 3, reason: '과제 성실 제출/시험 성적 향상', category: '-' },
  { no: 4, date: '2026년 02월 26일 목요일', type: '벌점', score: -5, reason: '수업 중 휴대폰 사용', category: '-' },
  { no: 5, date: '2026년 02월 25일 목요일', type: '상점', score: 2, reason: '봉사활동 참여', category: '-' },
  { no: 6, date: '2026년 02월 25일 목요일', type: '벌점', score: -3, reason: '지각', category: '-' },
  { no: 7, date: '2026년 02월 24일 목요일', type: '상점', score: 10, reason: '모의고사 성적 우수', category: '-' },
  { no: 8, date: '2026년 02월 24일 목요일', type: '벌점', score: -2, reason: '사물함 미정리', category: '-' },
];

const ITEMS_PER_PAGE = 8;

/* ── MeritTab ── */

export default function MeritTab() {
  const now = new Date();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [filterType, setFilterType] = useState<'전체' | MeritType>('전체');
  const [page, setPage] = useState(1);

  const filtered = filterType === '전체'
    ? MOCK_MERIT
    : MOCK_MERIT.filter((r) => r.type === filterType);

  const totalMerit = MOCK_MERIT.filter((r) => r.type === '상점').reduce((sum, r) => sum + r.score, 0);
  const totalDemerit = MOCK_MERIT.filter((r) => r.type === '벌점').reduce((sum, r) => sum + Math.abs(r.score), 0);

  const allChecked =
    filtered.length > 0 &&
    filtered.every((_, i) => selectedIds.has(i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((_, i) => i)));
    }
  };

  const toggleOne = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pagedData = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div
        className={styles.sectionHeader}
        onClick={() => setSectionOpen((v) => !v)}
      >
        <span className={styles.sectionTitle}>상/벌점</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.attendanceContent}>
          {/* Summary cards */}
          <div className={styles.meritSummary}>
            <div className={styles.meritCard}>
              <span className={styles.meritCardLabel}>총 상점</span>
              <span className={styles.meritCardValue}>{totalMerit}점</span>
            </div>
            <div className={`${styles.meritCard} ${styles.meritCardDemerit}`}>
              <span className={styles.meritCardLabel}>총 벌점</span>
              <span className={styles.meritCardValue}>{totalDemerit}점</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.attendanceActions}>
            <button className={styles.attendanceExcelBtn} type="button">
              저장
            </button>
            <button className={styles.attendanceDeleteBtn} type="button">
              선택 삭제
            </button>
            <button className={styles.attendanceRegisterBtn} type="button">
              등록
            </button>
          </div>

          {/* Filters */}
          <div className={styles.meritFilters}>
            <div className={styles.studyDateRow}>
              <span className={styles.studyDateLabel}>날짜</span>
              <div className={styles.studyMonthPicker}>
                <button type="button" className={styles.studyMonthBtn} onClick={prevMonth}>
                  <LuChevronLeft />
                </button>
                <span className={styles.studyMonthText}>
                  {year}.{String(month).padStart(2, '0')}
                </span>
                <button type="button" className={styles.studyMonthBtn} onClick={nextMonth}>
                  <LuChevronRight />
                </button>
              </div>
            </div>

            <div className={styles.studyDateRow}>
              <span className={styles.studyDateLabel}>상/벌점</span>
              <select
                className={styles.meritSelect}
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as '전체' | MeritType); setPage(1); }}
              >
                <option value="전체">상점 / 벌점</option>
                <option value="상점">상점</option>
                <option value="벌점">벌점</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                  />
                </th>
                <th>NO</th>
                <th>날짜</th>
                <th>상/벌점</th>
                <th>점수</th>
                <th>사유</th>
                <th>구분</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyContent}>
                    상/벌점 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr key={row.no}>
                    <td
                      className={styles.checkboxCol}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has((page - 1) * ITEMS_PER_PAGE + idx)}
                        onChange={() => toggleOne((page - 1) * ITEMS_PER_PAGE + idx)}
                      />
                    </td>
                    <td>{String(row.no).padStart(2, '0')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td>
                      <span className={row.type === '상점' ? styles.meritBadge : styles.demeritBadge}>
                        {row.type}
                      </span>
                    </td>
                    <td className={row.score > 0 ? styles.meritScore : styles.demeritScore}>
                      {row.score > 0 ? `+${row.score}` : row.score}
                    </td>
                    <td>{row.reason || '-'}</td>
                    <td>{row.category}</td>
                    <td className={styles.editCol}>
                      <button
                        className={styles.editButton}
                        type="button"
                        title="수정"
                      >
                        <LuPencil />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <LuChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <LuChevronRight />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
