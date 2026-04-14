import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuChevronDown } from 'react-icons/lu';
import noticeIcon from '../assets/notice_active.png';
import editIcon from '../assets/edit.png';
import trashIcon from '../assets/trash.png';
import { getNotice, updateNotice, deleteNotice } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import { getMe } from '../api/authApi';
import { getStores } from '../api/storeApi';
import type { Store } from '../api/storeApi';
import { ApiError } from '../api/client';
import useConfirm from '../hooks/useConfirm';
import { getNoticeCategories } from '../api/noticeCategoryApi';
import type { NoticeCategory } from '../api/noticeCategoryApi';
import styles from './NoticeDetail.module.css';

export default function NoticeDetail() {
  const { noticeId } = useParams<{ noticeId: string }>();
  const navigate = useNavigate();
  const { confirm, alert, ConfirmDialog } = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const editDropdownRef = useRef<HTMLDivElement>(null);

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target as Node)) {
        setEditDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* 수정 모드 */
  const [editing, setEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<NoticeCategory[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /* ADMIN 역할 & 지점 선택 */
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [editStoreId, setEditStoreId] = useState<number | null>(null);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotice = useCallback(async () => {
    if (!noticeId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getNotice(Number(noticeId));
      setNotice(data);
    } catch {
      setError('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    fetchNotice();
    getNoticeCategories()
      .then((list) => setCategoryOptions(list))
      .catch(() => {});
  }, [fetchNotice]);

  const startEditing = () => {
    if (!notice) return;
    setEditCategoryId(notice.categoryId);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditPinned(notice.pinned);
    setEditActive(notice.active);
    setEditStoreId(notice.storeId);
    setEditDropdownOpen(false);
    setStoreDropdownOpen(false);
    setSaveError('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError('');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaveError('');

    if (isAdmin && !editStoreId) {
      setSaveError('지점을 선택해주세요.');
      return;
    }
    if (!editCategoryId) {
      setSaveError('말머리를 선택해주세요.');
      return;
    }
    if (!editTitle.trim()) {
      setSaveError('제목을 입력해주세요.');
      return;
    }
    if (!editContent.trim()) {
      setSaveError('내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateNotice(
        Number(noticeId),
        { categoryId: editCategoryId, title: editTitle.trim(), content: editContent, pinned: editPinned, active: editActive },
        isAdmin && editStoreId ? editStoreId : undefined,
      );
      setNotice(updated);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('수정에 실패했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm('정말 이 공지사항을 삭제하시겠습니까?'))) return;
    try {
      await deleteNotice(Number(noticeId));
      navigate('/notices');
    } catch {
      await alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingMessage}>불러오는 중...</div>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className={styles.page}>
        <div className={styles.errorMessage}>{error || '공지사항을 찾을 수 없습니다.'}</div>
        <button type="button" className={styles.backLink} onClick={() => navigate('/notices')}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

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
          <h1 className={styles.pageTitle}>공지사항 {editing ? '수정' : '조회'}</h1>
        </div>
      </div>

      {/* Content Card */}
      <div className={styles.card}>
        {editing ? (
          /* ── 수정 모드 ── */
          <>
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
                    <span className={!editStoreId ? styles.dropdownPlaceholder : ''}>
                      {editStoreId
                        ? stores.find((s) => s.id === editStoreId)?.storeName ?? '선택'
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
                            className={`${styles.dropdownItem} ${editStoreId === store.id ? styles.dropdownItemActive : ''}`}
                            onClick={() => { setEditStoreId(store.id); setStoreDropdownOpen(false); }}
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
              <div className={styles.dropdown} ref={editDropdownRef}>
                <button
                  type="button"
                  className={`${styles.dropdownTrigger} ${editDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                  onClick={() => setEditDropdownOpen((v) => !v)}
                >
                  <span className={!editCategoryId ? styles.dropdownPlaceholder : ''}>
                    {editCategoryId ? categoryOptions.find((c) => c.id === editCategoryId)?.name ?? '선택' : '선택'}
                  </span>
                  <LuChevronDown className={`${styles.dropdownChevron} ${editDropdownOpen ? styles.dropdownChevronOpen : ''}`} />
                </button>
                {editDropdownOpen && (
                  <ul className={styles.dropdownMenu}>
                    {categoryOptions.map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className={`${styles.dropdownItem} ${editCategoryId === opt.id ? styles.dropdownItemActive : ''}`}
                          onClick={() => { setEditCategoryId(opt.id); setEditDropdownOpen(false); }}
                        >
                          {opt.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>제목</label>
              <div className={styles.editTitleRow}>
                {editCategoryId && (
                  <span className={styles.titlePrefix}>[{categoryOptions.find((c) => c.id === editCategoryId)?.name}]</span>
                )}
                <input
                  type="text"
                  className={styles.input}
                  placeholder="공지 제목을 입력해주세요"
                  maxLength={100}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <span className={styles.charCount}>{editTitle.length}/100</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>내용</label>
              <textarea
                className={styles.textarea}
                placeholder="공지 내용을 입력해주세요."
                maxLength={5000}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
              />
              <span className={styles.charCount}>{editContent.length}/5,000</span>
            </div>

            <div className={styles.pinnedField}>
              <span className={styles.pinnedLabel}>고정 공지로 등록</span>
              <button
                type="button"
                className={`${styles.toggle} ${editPinned ? styles.toggleOn : ''}`}
                onClick={() => setEditPinned((v) => !v)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {saveError && <p className={styles.error}>{saveError}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.submitButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={cancelEditing}
              >
                취소
              </button>
            </div>
          </>
        ) : (
          /* ── 조회 모드 ── */
          <>
            <div className={styles.titleRow}>
              <div className={styles.meta}>
                <span className={styles.storeName}>{notice.storeName}</span>
                {notice.pinned && <span className={styles.pinnedBadge}>고정</span>}
                <span className={styles.date}>작성자: {notice.createdBy} · {formatDate(notice.createdAt)}</span>
              </div>
              <div className={styles.kebabWrap} ref={menuRef}>
                <button type="button" className={styles.kebabBtn} onClick={() => setMenuOpen((v) => !v)}>
                  <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                    <circle cx="2" cy="2" r="2" />
                    <circle cx="2" cy="8" r="2" />
                    <circle cx="2" cy="14" r="2" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className={styles.kebabMenu}>
                    <button type="button" className={styles.kebabMenuItem} onClick={() => { setMenuOpen(false); startEditing(); }}>
                      <img src={editIcon} alt="" className={styles.kebabMenuIcon} />
                      수정
                    </button>
                    <button type="button" className={styles.kebabMenuItem} onClick={() => { setMenuOpen(false); handleDelete(); }}>
                      <img src={trashIcon} alt="" className={styles.kebabMenuIcon} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h2 className={styles.noticeTitle}>
              {notice.categoryName ? `[${notice.categoryName}] ${notice.title}` : notice.title}
            </h2>

            <div className={styles.divider} />

            <div className={styles.content}>{notice.content}</div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.listButton}
                onClick={() => navigate('/notices')}
              >
                목록으로
              </button>
            </div>
          </>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
