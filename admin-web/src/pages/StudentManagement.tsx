import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuRotateCcw, LuUsers } from 'react-icons/lu';
import styles from './StudentManagement.module.css';

/* ── Mock Data (kiosk-app mockStudents 기반 + 확장) ── */

interface StudentRow {
  name: string;
  studentId: string;
  className: string;
  seat: string;
  tuitionPaid: boolean;
  studyRoom: boolean;
  lunch: boolean;
  dinner: boolean;
}

const MOCK_STUDENTS: StudentRow[] = [
  {
    name: '김예진',
    studentId: '250101',
    className: 'A',
    seat: 'A10',
    tuitionPaid: true,
    studyRoom: true,
    lunch: true,
    dinner: true,
  },
  {
    name: '이진규',
    studentId: '250202',
    className: 'B',
    seat: 'B03',
    tuitionPaid: true,
    studyRoom: true,
    lunch: true,
    dinner: false,
  },
  {
    name: '김경진',
    studentId: '111111',
    className: 'A',
    seat: 'A05',
    tuitionPaid: true,
    studyRoom: false,
    lunch: true,
    dinner: true,
  },
  
];

const CLASS_OPTIONS = ['전체', 'A', 'B'];
const CATEGORY_OPTIONS = ['전체', '재원', '퇴원'];

/* ── Helpers ── */

function getToday() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function generateYears() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 2; y <= current + 1; y++) {
    years.push(y);
  }
  return years;
}

function generateMonths() {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

function generateDays(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}

/* ── Page ── */

export default function StudentManagement() {
  const navigate = useNavigate();
  const today = getToday();

  /* Date selectors (top right) */
  const [selectedYear, setSelectedYear] = useState(today.year);
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [selectedDay, setSelectedDay] = useState(today.day);

  /* Filter inputs */
  const [searchStudentId, setSearchStudentId] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchDate, setSearchDate] = useState('');

  /* Applied filters */
  const [appliedFilters, setAppliedFilters] = useState({
    studentId: '',
    className: '',
    name: '',
    category: '',
    date: '',
  });

  /* Checkboxes */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredStudents = useMemo(() => {
    return MOCK_STUDENTS.filter((s) => {
      if (appliedFilters.studentId && !s.studentId.includes(appliedFilters.studentId)) {
        return false;
      }
      if (appliedFilters.name && !s.name.includes(appliedFilters.name)) {
        return false;
      }
      if (appliedFilters.className && appliedFilters.className !== '전체' && s.className !== appliedFilters.className) {
        return false;
      }
      return true;
    });
  }, [appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({
      studentId: searchStudentId.trim(),
      className: searchClass,
      name: searchName.trim(),
      category: searchCategory,
      date: searchDate,
    });
  };

  const handleReset = () => {
    setSearchStudentId('');
    setSearchClass('');
    setSearchName('');
    setSearchCategory('');
    setSearchDate('');
    setAppliedFilters({ studentId: '', className: '', name: '', category: '', date: '' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const allChecked = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.studentId));

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.studentId)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = () => {
    const mm = String(selectedMonth).padStart(2, '0');
    const dd = String(selectedDay).padStart(2, '0');
    return `${selectedYear}.${mm}.${dd}`;
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <LuUsers className={styles.pageTitleIcon} />
          <h2 className={styles.pageTitle}>학생관리</h2>
        </div>
      </div>

      {/* Filter Row */}
      <div className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-sid">학번</label>
            <input
              id="filter-sid"
              className={styles.filterInput}
              type="text"
              placeholder=""
              value={searchStudentId}
              onChange={(e) => setSearchStudentId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-class">반</label>
            <input
              id="filter-class"
              className={styles.filterInput}
              type="text"
              placeholder=""
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-name">학생명</label>
            <input
              id="filter-name"
              className={styles.filterInputWide}
              type="text"
              placeholder=""
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-category">구분</label>
            <input
              id="filter-category"
              className={styles.filterInput}
              type="text"
              placeholder=""
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-date">날짜</label>
            <input
              id="filter-date"
              className={styles.filterInput}
              type="text"
              placeholder={formatDate()}
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button className={styles.searchButton} type="button" onClick={handleSearch}>
            검색
          </button>

          <button className={styles.resetButton} type="button" onClick={handleReset}>
            초기화
          </button>
        </div>
      </div>

      {/* Student List Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th>이름</th>
              <th>학번</th>
              <th>반</th>
              <th>좌석</th>
              <th>교습비</th>
              <th>독서실비</th>
              <th>점심</th>
              <th>저녁</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr className={styles.emptyRow}>
                <td colSpan={10}>검색 결과가 없습니다.</td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr
                  key={student.studentId}
                  onClick={() => navigate(`/students/${student.studentId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td
                    className={styles.checkboxCol}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.studentId)}
                      onChange={() => toggleOne(student.studentId)}
                    />
                  </td>
                  <td>{student.name}</td>
                  <td>{student.studentId}</td>
                  <td>{student.className}</td>
                  <td>{student.seat}</td>
                  <td>{student.tuitionPaid ? 'O' : 'X'}</td>
                  <td>{student.studyRoom ? 'O' : 'X'}</td>
                  <td>{student.lunch ? 'O' : 'X'}</td>
                  <td>{student.dinner ? 'O' : 'X'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
