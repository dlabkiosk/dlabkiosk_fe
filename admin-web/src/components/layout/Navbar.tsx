import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuSearch, LuLogOut, LuSettings, LuChevronDown } from 'react-icons/lu';
import { logout } from '../../api/authApi';
import logoImg from '../../assets/logo.png';
import profileImg from '../../assets/profile.png';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch { /* 실패해도 로그아웃 진행 */ }
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('adminName');
    sessionStorage.removeItem('storeName');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.logoArea}>
        <img src={logoImg} alt="D'Lab" className={styles.logoImage} />
        <span className={styles.storeName}>{(sessionStorage.getItem('storeName') ?? '').replace(/^D'?LAB\s*/i, '')}</span>
      </div>
      <div className={styles.rightArea}>
        <div className={styles.searchBox}>
          <LuSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="검색어를 입력해주세요"
          />
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
