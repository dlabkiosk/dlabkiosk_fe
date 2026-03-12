import { useState } from 'react';
import { LuChevronUp, LuPencil } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

/* ── Mock Data ── */

interface AttendanceRow {
  date: string;
  time: string;
  category: string;
  memo: string;
}

const MOCK_ATTENDANCE: AttendanceRow[] = [
  {
    date: '2026년 02월 26일 목요일',
    time: '15:30',
    category: '20:00-정기',
    memo: '지각,원거리,조퇴,운동',
  },
  {
    date: '2026년 02월 26일 목요일',
    time: '15:30',
    category: '20:00-정기',
    memo: '지각,원거리,조퇴,운동',
  },
  {
    date: '2026년 02월 26일 목요일',
    time: '15:30',
    category: '20:00-정기',
    memo: '지각,원거리,조퇴,운동',
  },
  {
    date: '2026년 02월 26일 목요일',
    time: '15:30',
    category: '20:00-정기',
    memo: '지각,원거리,조퇴,운동',
  },
];

/* ── AttendanceTab ── */

export default function AttendanceTab() {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allChecked =
    MOCK_ATTENDANCE.length > 0 &&
    MOCK_ATTENDANCE.every((_, i) => selectedIds.has(i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(MOCK_ATTENDANCE.map((_, i) => i)));
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

  return (
    <>
      <div
        className={styles.sectionHeader}
        onClick={() => setSectionOpen((v) => !v)}
      >
        <span className={styles.sectionTitle}>출결사항</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.attendanceContent}>
          {/* Action buttons */}
          <div className={styles.attendanceActions}>
            <button className={styles.attendanceDeleteBtn} type="button">
              선택 삭제
            </button>
            <button className={styles.attendanceRegisterBtn} type="button">
              등록
            </button>
            <button className={styles.attendanceExcelBtn} type="button">
              EXCEL
            </button>
          </div>

          {/* Table */}
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col />
              <col style={{ width: '48px' }} />
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
                <th>날짜</th>
                <th>시간</th>
                <th>출결 사항</th>
                <th>메모</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {MOCK_ATTENDANCE.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyContent}>
                    출결 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                MOCK_ATTENDANCE.map((row, idx) => (
                  <tr key={idx}>
                    <td
                      className={styles.checkboxCol}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(idx)}
                        onChange={() => toggleOne(idx)}
                      />
                    </td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.category}</td>
                    <td>{row.memo}</td>
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
        </div>
      )}
    </>
  );
}
