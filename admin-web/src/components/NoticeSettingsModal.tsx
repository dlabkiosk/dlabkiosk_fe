import { useState, useEffect } from 'react';
import { LuPlus, LuX, LuGripVertical } from 'react-icons/lu';
import {
  getNoticeCategories,
  createNoticeCategory,
  deleteNoticeCategory,
  updateNoticeCategoryOrder,
} from '../api/noticeCategoryApi';
import type { NoticeCategory } from '../api/noticeCategoryApi';
import styles from './NoticeSettingsModal.module.css';

interface Props {
  storeId?: number;
  onClose: () => void;
  onSave: () => void;
}

export default function NoticeSettingsModal({ storeId, onClose, onSave }: Props) {
  const [categories, setCategories] = useState<NoticeCategory[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getNoticeCategories(storeId)
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleAdd = async () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name === trimmed)) {
      setError('이미 존재하는 말머리입니다.');
      return;
    }
    try {
      setError('');
      const created = await createNoticeCategory(trimmed, storeId);
      setCategories((prev) => [...prev, created]);
      setNewSubject('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '추가 실패');
    }
  };

  const handleRemove = async (cat: NoticeCategory) => {
    try {
      setError('');
      await deleteNoticeCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...categories];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setCategories(next);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const orderedIds = categories.map((c) => c.id);
      const updated = await updateNoticeCategoryOrder(orderedIds, storeId);
      setCategories(updated);
      onSave();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '순서 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>공지 설정</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <LuX />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <label className={styles.sectionLabel}>말머리 관리</label>
            <p className={styles.sectionHint}>드래그하여 순서를 변경할 수 있습니다.</p>
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: 'var(--font-size-xs)', margin: '0 0 8px' }}>{error}</p>}

          {loading ? (
            <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-muted)' }}>로딩 중...</p>
          ) : (
            <div className={styles.list} onDragOver={(e) => e.preventDefault()} onDrop={handleDragEnd}>
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className={`${styles.item} ${dragIdx === idx ? styles.itemDragging : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDragEnd}
                >
                  <LuGripVertical className={styles.gripIcon} />
                  <span className={styles.itemText}>{cat.name}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(cat)}
                    title="삭제"
                  >
                    <LuX />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.addInput}
              placeholder="새 말머리 입력"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={10}
            />
            <button type="button" className={styles.addBtn} onClick={handleAdd}>
              <LuPlus /> 추가
            </button>
          </div>
          <p className={styles.sectionHint}>순서를 변경한 경우 저장 버튼을 눌러주세요.</p>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
