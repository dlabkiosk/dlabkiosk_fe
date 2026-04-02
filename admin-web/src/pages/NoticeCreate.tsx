import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuChevronDown } from 'react-icons/lu';
import noticeIcon from '../assets/notice_active.png';
import { createNotice } from '../api/noticeApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import { ApiError } from '../api/client';
import styles from './NoticeCreate.module.css';
import f from '../styles/filter.module.css';

const SUBJECT_OPTIONS = ['선택','전체', '국어', '수학', '과학', '사회', '한국사'];

export default function NoticeCreate() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('선택');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ADMIN 역할 & 지점 선택 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMe().then((me) => {
      if (me.role === 'ADMIN') {
        setIsAdmin(true);
        getStores().then((list) => setStores(list.filter((s) => s.active)));
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (isLoading) return;

    setError('');

    if (isAdmin && !selectedStoreId) {
      setError('지점을 선택해주세요.');
      return;
    }
    if (category === '선택') {
      setError('과목을 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    const fullTitle = `[${category}] ${title}`;

    setIsLoading(true);
    try {
      await createNotice(
        { title: fullTitle, content, pinned },
        isAdmin && selectedStoreId ? selectedStoreId : undefined,
      );
      navigate('/notices');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('공지사항 등록에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/notices')}
        >
          <LuArrowLeft />
        </button>
        <div className={styles.pageTitleGroup}>
          <img src={noticeIcon} alt="" className={styles.pageTitleIcon} />
          <h1 className={styles.pageTitle}>공지사항 등록</h1>
        </div>
      </div>

      {/* Form Card */}
      <div className={styles.formCard}>
        {/* ADMIN 전용: 지점 선택 */}
        {isAdmin && (
          <div className={styles.field}>
            <label className={styles.label}>지점</label>
            <div className={styles.dropdown} ref={storeDropdownRef} style={{ width: 200 }}>
              <button
                type="button"
                className={`${styles.dropdownTrigger} ${storeDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                onClick={() => setStoreDropdownOpen((v) => !v)}
              >
                <span className={!selectedStoreId ? styles.dropdownPlaceholder : ''}>
                  {selectedStoreId
                    ? stores.find((s) => s.id === selectedStoreId)?.storeName ?? '선택'
                    : '지점을 선택해주세요'}
                </span>
                <LuChevronDown className={`${styles.dropdownChevron} ${storeDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
              </button>
              {storeDropdownOpen && (
                <ul className={styles.dropdownMenu}>
                  {stores.map((store) => (
                    <li key={store.id}>
                      <button
                        type="button"
                        className={`${styles.dropdownItem} ${selectedStoreId === store.id ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setSelectedStoreId(store.id); setStoreDropdownOpen(false); }}
                      >
                        {store.storeName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>구분</label>
          <div className={styles.dropdown} ref={dropdownRef}>
            <button
              type="button"
              className={`${styles.dropdownTrigger} ${dropdownOpen ? styles.dropdownTriggerOpen : ''}`}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span className={category === '선택' ? styles.dropdownPlaceholder : ''}>
                {category}
              </span>
              <LuChevronDown className={`${styles.dropdownChevron} ${dropdownOpen ? styles.dropdownChevronOpen : ''}`} />
            </button>
            {dropdownOpen && (
              <ul className={styles.dropdownMenu}>
                {SUBJECT_OPTIONS.filter((o) => o !== '선택').map((opt) => (
                  <li key={opt}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${category === opt ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setCategory(opt); setDropdownOpen(false); }}
                    >
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>제목</label>
          <div className={styles.titleRow}>
            {category !== '선택' && (
              <span className={styles.titlePrefix}>[{category}]</span>
            )}
            <input
              type="text"
              className={styles.input}
              placeholder="공지 제목을 입력해주세요"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <span className={styles.charCount}>{title.length}/100</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>내용</label>
          <textarea
            className={styles.textarea}
            placeholder="공지 내용을 입력해주세요."
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
          />
          <span className={styles.charCount}>{content.length}/1,000</span>
        </div>

        <div className={styles.pinnedField}>
          <span className={styles.pinnedLabel}>고정 공지로 등록</span>
          <button
            type="button"
            className={`${styles.toggle} ${pinned ? styles.toggleOn : ''}`}
            onClick={() => setPinned((v) => !v)}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? '등록 중...' : '등록'}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate('/notices')}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
