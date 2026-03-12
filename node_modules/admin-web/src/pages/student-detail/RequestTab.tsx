import { useState } from 'react';
import { LuChevronUp, LuPencil } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

/* ── 신청 구분 ── */

const REQUEST_CATEGORY = {
  EARLY_LEAVE: '조퇴',
  LATE: '지각',
  ABSENT: '결석',
  OUTING: '외출',
  SEAT_CHANGE: '좌석변경',
  SEAT_LEAVE: '좌석이탈',
  NO_PHONE: '휴대폰 미소지',
} as const;

type RequestCategory = (typeof REQUEST_CATEGORY)[keyof typeof REQUEST_CATEGORY];

/* ── Mock Data ── */

interface RequestRow {
  no: number;
  submittedAt: string;
  desiredDate: string;
  requestTime: string;
  category: RequestCategory;
  reason: string;
}

const MOCK_REQUESTS: RequestRow[] = [
  { no: 1, submittedAt: '2026-02-26 08:20', desiredDate: '2026-02-26', requestTime: '08:30', category: '좌석이탈', reason: '병원 방문' },
  { no: 2, submittedAt: '2026-02-26 12:15', desiredDate: '2026-02-26', requestTime: '14:00', category: '조퇴', reason: '가정 사정' },
  { no: 3, submittedAt: '2026-02-25 09:50', desiredDate: '2026-02-25', requestTime: '10:00', category: '외출', reason: '학원 상담' },
  { no: 4, submittedAt: '2026-02-25 08:45', desiredDate: '2026-02-27', requestTime: '-', category: '결석', reason: '몸살' },
  { no: 5, submittedAt: '2026-02-24 11:20', desiredDate: '2026-02-24', requestTime: '-', category: '좌석변경', reason: '창가 자리 희망' },
  { no: 6, submittedAt: '2026-02-24 13:00', desiredDate: '2026-02-24', requestTime: '-', category: '좌석이탈', reason: '화장실' },
  { no: 7, submittedAt: '2026-02-23 09:05', desiredDate: '2026-02-23', requestTime: '-', category: '휴대폰 미소지', reason: '' },
];

/* ── RequestTab ── */

export default function RequestTab() {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allChecked =
    MOCK_REQUESTS.length > 0 &&
    MOCK_REQUESTS.every((_, i) => selectedIds.has(i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(MOCK_REQUESTS.map((_, i) => i)));
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
        <span className={styles.sectionTitle}>신청사항</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>

      {sectionOpen && (
        <div className={styles.attendanceContent}>
          {/* Action buttons */}
          <div className={styles.attendanceActions}>
            <button className={styles.attendanceRegisterBtn} type="button">
              등록
            </button>
            <button className={styles.attendanceDeleteBtn} type="button">
              선택 삭제
            </button>
            <button className={styles.attendanceExcelBtn} type="button">
              EXCEL
            </button>
          </div>

          {/* Table */}
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '22%' }} />
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
                <th>신청일</th>
                <th>신청 날짜</th>
                <th>신청 시간</th>
                <th>구분</th>
                <th>사유</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {MOCK_REQUESTS.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyContent}>
                    신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                MOCK_REQUESTS.map((row, idx) => (
                  <tr key={row.no}>
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
                    <td>{String(row.no).padStart(2, '0')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.submittedAt}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.desiredDate}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.requestTime}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.category}</td>
                    <td>{row.reason || '-'}</td>
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
