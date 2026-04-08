import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuLogOut, LuSettings, LuChevronDown } from 'react-icons/lu';
import { logout } from '../../api/authApi';
import logoImg from '../../assets/logo.png';
import profileImg from '../../assets/profile.png';
import styles from './Navbar.module.css';

interface SearchItem {
  label: string;
  keywords: string[];
  path: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: '대시보드', keywords: ['대시보드', '홈', 'dashboard'], path: '/' },
  { label: '출결 관리', keywords: ['출결', '출석', '결석', 'attendance'], path: '/attendance' },
  { label: '식사 신청 및 체크명단', keywords: ['식사', '급식', '식단', 'meal'], path: '/meals' },
  { label: '휴대폰 미소지 관리', keywords: ['휴대폰', '미소지', '핸드폰', 'phone'], path: '/phones' },
  { label: '좌석 이탈 관리', keywords: ['좌석이탈', '이탈', 'seat-leave'], path: '/seat-leaves' },
  { label: '좌석 관리', keywords: ['좌석', '좌석변경', '좌석배치', '좌석배치표', 'seat'], path: '/seats' },
  { label: '순공 관리', keywords: ['순공', '순공시간', '공부시간', 'study'], path: '/study-time' },
  { label: '공지 관리', keywords: ['공지', '공지사항', 'notice'], path: '/notices' },
  { label: '공지사항 등록', keywords: ['공지작성', '공지등록', '새공지'], path: '/notices/new' },
  { label: '설정', keywords: ['설정', 'settings'], path: '/settings' },
  { label: '설정 > 배너 관리', keywords: ['배너', '광고', 'banner'], path: '/settings?tab=배너 관리' },
  { label: '설정 > 시험일정 관리', keywords: ['시험', '시험일정', 'exam'], path: '/settings?tab=시험일정 관리' },
  { label: '설정 > 식단표 관리', keywords: ['식단표', '식단관리', 'meal schedule'], path: '/settings?tab=식단표 관리' },
  { label: '설정 > 이탈사유 관리', keywords: ['이탈사유', '사유'], path: '/settings?tab=이탈사유 관리' },
  { label: '설정 > 메시지 관리', keywords: ['메시지', '문자', 'message'], path: '/settings?tab=메시지 관리' },
  { label: '설정 > 데이터 관리', keywords: ['데이터', '학생', 'data'], path: '/settings?tab=데이터 관리' },
  { label: '설정 > 지점 정보', keywords: ['지점', '지점정보', '브랜치', 'branch', 'store'], path: '/settings?tab=지점 정보' },
];

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [searchText]);

  const handleSelectResult = (item: SearchItem) => {
    navigate(item.path);
    setSearchText('');
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectResult(searchResults[selectedIdx]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* 실패해도 로그아웃 진행 */ }
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('storeName');
    sessionStorage.removeItem('adminRole');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.logoArea}>
        <img src={logoImg} alt="D'Lab" className={styles.logoImage} />
        <span className={styles.storeName}>
          {sessionStorage.getItem('adminRole') === 'ADMIN'
            ? '통합 관리자'
            : (sessionStorage.getItem('storeName') ?? '').replace(/^D'?LAB\s*/i, '')}
        </span>
      </div>
      <div className={styles.rightArea}>
        <div className={styles.searchBox} ref={searchRef}>
          <LuSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="검색어를 입력해주세요"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setSearchOpen(true); setSelectedIdx(0); }}
            onFocus={() => { if (searchText.trim()) setSearchOpen(true); }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchOpen && searchResults.length > 0 && (
            <ul className={styles.searchResults}>
              {searchResults.map((item, idx) => (
                <li key={item.path}>
                  <button
                    type="button"
                    className={`${styles.searchResultItem} ${idx === selectedIdx ? styles.searchResultItemActive : ''}`}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => handleSelectResult(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.userMenu} ref={dropdownRef}>
          <button
            className={styles.userButton}
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <img src={profileImg} alt="" className={styles.userIcon} />
            <span className={styles.userName}>{sessionStorage.getItem('adminName') ?? '선생님'}</span>
            <LuChevronDown className={`${styles.userChevron} ${dropdownOpen ? styles.userChevronOpen : ''}`} />
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                type="button"
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              >
                <LuSettings className={styles.dropdownIcon} />
                <span>설정</span>
              </button>
              <button
                className={styles.dropdownItem}
                type="button"
                onClick={handleLogout}
              >
                <LuLogOut className={styles.dropdownIcon} />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
