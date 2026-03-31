import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import noticeIcon from '../assets/notice_active.png';
import { createNotice } from '../api/noticeApi';
import { ApiError } from '../api/client';
import styles from './NoticeCreate.module.css';

const CATEGORY_OPTIONS = ['선택', '일반공지', '긴급공지'];

export default function NoticeCreate() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('선택');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (isLoading) return;

    setError('');

    if (category === '선택') {
      setError('카테고리를 선택해주세요.');
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

    setIsLoading(true);
    try {
      await createNotice({
        title,
        content,
        pinned,
      });
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
        <div className={styles.field}>
          <label className={styles.label}>카테고리</label>
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
            placeholder="공지 제목을 입력해주세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.pinnedField}>
          <label className={styles.pinnedLabel}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className={styles.pinnedCheckbox}
            />
            <span>고정 공지로 등록</span>
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>내용</label>
          <textarea
            className={styles.textarea}
            placeholder="공지 내용을 입력해주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
          />
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
