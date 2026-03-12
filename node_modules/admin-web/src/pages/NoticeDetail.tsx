import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LuMegaphone, LuArrowLeft } from 'react-icons/lu';
import { getNotice, updateNotice, deleteNotice } from '../api/noticeApi';
import type { Notice } from '../api/noticeApi';
import { ApiError } from '../api/client';
import styles from './NoticeDetail.module.css';

const CATEGORY_OPTIONS = ['일반공지', '긴급공지'];

export default function NoticeDetail() {
  const { noticeId } = useParams<{ noticeId: string }>();
  const navigate = useNavigate();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* 수정 모드 */
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('일반공지');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
  }, [fetchNotice]);

  const startEditing = () => {
    if (!notice) return;
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditPinned(notice.pinned);
    setEditActive(notice.active);
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
      const updated = await updateNotice(Number(noticeId), {
        title: editTitle,
        content: editContent,
        pinned: editPinned,
        active: editActive,
      });
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
    if (!confirm('정말 이 공지사항을 삭제하시겠습니까?')) return;
    try {
      await deleteNotice(Number(noticeId));
      navigate('/notices');
    } catch {
      alert('삭제에 실패했습니다.');
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
          <LuMegaphone className={styles.pageTitleIcon} />
          <h1 className={styles.pageTitle}>공지사항 {editing ? '수정' : '조회'}</h1>
        </div>
      </div>

      {/* Content Card */}
      <div className={styles.card}>
        {editing ? (
          /* ── 수정 모드 ── */
          <>
            <div className={styles.field}>
              <label className={styles.label}>카테고리</label>
              <select
                className={styles.select}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>제목</label>
              <input
                type="text"
                className={styles.input}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            <div className={styles.pinnedField}>
              <label className={styles.pinnedLabel}>
                <input
                  type="checkbox"
                  checked={editPinned}
                  onChange={(e) => setEditPinned(e.target.checked)}
                  className={styles.pinnedCheckbox}
                />
                <span>고정 공지</span>
              </label>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>내용</label>
              <textarea
                className={styles.textarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
              />
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
            <div className={styles.meta}>
              <span className={styles.storeName}>{notice.storeName}</span>
              {notice.pinned && <span className={styles.pinnedBadge}>고정</span>}
              <span className={styles.date}>{formatDate(notice.createdAt)}</span>
            </div>

            <h2 className={styles.noticeTitle}>{notice.title}</h2>

            <div className={styles.divider} />

            <div className={styles.content}>{notice.content}</div>

            <div className={styles.divider} />

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.editButton}
                onClick={startEditing}
              >
                수정
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDelete}
              >
                삭제
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
