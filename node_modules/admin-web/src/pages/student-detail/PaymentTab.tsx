import { useState, useRef, useEffect } from 'react';
import { LuChevronUp, LuChevronLeft, LuChevronRight, LuCalendar } from 'react-icons/lu';
import styles from '../StudentDetail.module.css';

/* ── Mock Data ── */

interface PaymentRow {
  date: string;
  detail: string;
  year: number;
  month: number;
  category: string;
  cashAmount: string;
  cardAmount: string;
  approvalNo: string;
  cardBank: string;
}

const MOCK_PAYMENTS: PaymentRow[] = [
  {
    date: '2026-03-11',
    detail: '2026 독학재수 교습비',
    year: 2026,
    month: 3,
    category: '교습비',
    cashAmount: '-',
    cardAmount: '300,000',
    approvalNo: '12345678',
    cardBank: '기후동행삼성카드',
  },
  {
    date: '2026-03-11',
    detail: '2026 독학재수 독서실비',
    year: 2026,
    month: 3,
    category: '독서실비',
    cashAmount: '-',
    cardAmount: '300,000',
    approvalNo: '12345678',
    cardBank: '기후동행삼성카드',
  },
  {
    date: '2026-02-15',
    detail: '2026 독학재수 식대비',
    year: 2026,
    month: 2,
    category: '식대비',
    cashAmount: '-',
    cardAmount: '300,000',
    approvalNo: '12345678',
    cardBank: '기후동행삼성카드',
  },
  {
    date: '2025-12-10',
    detail: '2025 독학재수 교습비',
    year: 2025,
    month: 12,
    category: '교습비',
    cashAmount: '-',
    cardAmount: '300,000',
    approvalNo: '12345678',
    cardBank: '기후동행삼성카드',
  },
];

/* ── Year/Month Picker ── */

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

interface YearMonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

function YearMonthPicker({ year, month, onChange }: YearMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (m: number) => {
    onChange(viewYear, m);
    setOpen(false);
  };

  return (
    <div className={styles.ymPicker} ref={ref}>
      <button
        className={styles.ymTrigger}
        type="button"
        onClick={() => {
          setViewYear(year);
          setOpen((v) => !v);
        }}
      >
        <LuCalendar className={styles.ymIcon} />
        <span>{year}년 {month}월</span>
      </button>

      {open && (
        <div className={styles.ymDropdown}>
          <div className={styles.ymHeader}>
            <button
              className={styles.ymNavButton}
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
            >
              <LuChevronLeft />
            </button>
            <span className={styles.ymYear}>{viewYear}년</span>
            <button
              className={styles.ymNavButton}
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
            >
              <LuChevronRight />
            </button>
          </div>
          <div className={styles.ymGrid}>
            {MONTH_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.ymMonth} ${viewYear === year && i + 1 === month ? styles.ymMonthActive : ''}`}
                onClick={() => handleSelect(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PaymentTab ── */

export default function PaymentTab() {
  const now = new Date();
  const [sectionOpen, setSectionOpen] = useState(true);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filteredPayments = MOCK_PAYMENTS.filter(
    (row) => row.year === filterYear && row.month === filterMonth,
  );

  const allChecked = filteredPayments.length > 0 && filteredPayments.every((_, i) => selectedIds.has(i));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayments.map((_, i) => i)));
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

  const handleYearMonthChange = (y: number, m: number) => {
    setFilterYear(y);
    setFilterMonth(m);
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className={styles.sectionHeader} onClick={() => setSectionOpen((v) => !v)}>
        <span className={styles.sectionTitle}>수납현황</span>
        <LuChevronUp
          className={`${styles.sectionChevron} ${sectionOpen ? '' : styles.sectionChevronOpen}`}
        />
      </div>
      {sectionOpen && (
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
              <th>납부 일자</th>
              <th>내역</th>
              <th>
                <YearMonthPicker
                  year={filterYear}
                  month={filterMonth}
                  onChange={handleYearMonthChange}
                />
              </th>
              <th>구분</th>
              <th>현금금액</th>
              <th>카드금액</th>
              <th>승인번호</th>
              <th>카드사 / 은행</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyContent}>
                  해당 월의 수납 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filteredPayments.map((row, idx) => (
                <tr key={idx}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(idx)}
                      onChange={() => toggleOne(idx)}
                    />
                  </td>
                  <td>{row.date}</td>
                  <td>{row.detail}</td>
                  <td>{row.year}년 {row.month}월</td>
                  <td>{row.category}</td>
                  <td>{row.cashAmount}</td>
                  <td>{row.cardAmount}</td>
                  <td>{row.approvalNo}</td>
                  <td>{row.cardBank}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
