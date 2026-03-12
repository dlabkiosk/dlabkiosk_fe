import { useState } from 'react';
import { LuChevronUp, LuChevronLeft, LuChevronRight, LuPencil } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

/* ── Mock Data ── */

interface StudyTimeRow {
  no: number;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  studyTime: string;
  category: string;
}

const MOCK_STUDY_TIME: StudyTimeRow[] = [
  { no: 1, date: '2026년 02월 26일 목요일', checkInTime: '19:00', checkOutTime: '21:30', studyTime: '2시간 10분', category: '-' },
  { no: 2, date: '2026년 02월 25일 목요일', checkInTime: '19:10', checkOutTime: '21:00', studyTime: '1시간 40분', category: '-' },
  { no: 3, date: '2026년 02월 24일 목요일', checkInTime: '14:00', checkOutTime: '16:30', studyTime: '2시간 (120분)', category: '-' },
  { no: 4, date: '2026년 02월 23일 목요일', checkInTime: '-', checkOutTime: '-', studyTime: '-', category: '-' },
  { no: 5, date: '2026년 02월 22일 목요일', checkInTime: '-', checkOutTime: '-', studyTime: '-', category: '-' },
  { no: 6, date: '2026년 02월 21일 목요일', checkInTime: '-', checkOutTime: '-', studyTime: '-', category: '-' },
  { no: 7, date: '2026년 02월 20일 목요일', checkInTime: '-', checkOutTime: '-', studyTime: '-', category: '-' },
  { no: 8, date: '2026년 02월 19일 목요일', checkInTime: '-', checkOutTime: '-', studyTime: '-', category: '-' },
];

const ITEMS_PER_PAGE = 8;

/* ── StudyTimeTab ── */

export default function StudyTimeTab() {
  const now = new Date();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(1);

  const allChecked =
    MOCK_STUDY_TIME.length > 0 &&
    MOCK_STUDY_TIME.every((_, i) => selectedIds.has(i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(MOCK_STUDY_TIME.map((_, i) => i)));
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

  const totalPages = Math.max(1, Math.ceil(MOCK_STUDY_TIME.length / ITEMS_PER_PAGE));
  const pagedData = MOCK_STUDY_TIME.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div
        className={styles.sectionHeader}
        onClick={() => setSectionOpen((v) => !v)}
      >
        <span className={styles.sectionTitle}>순공시간</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.attendanceContent}>
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

          {/* Date picker row */}
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

          {/* Table */}
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
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
                <th>등원시간</th>
                <th>하원시간</th>
                <th>순공시간</th>
                <th>구분</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyContent}>
                    순공시간 내역이 없습니다.
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
                    <td>{row.checkInTime}</td>
                    <td>{row.checkOutTime}</td>
                    <td>{row.studyTime}</td>
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
