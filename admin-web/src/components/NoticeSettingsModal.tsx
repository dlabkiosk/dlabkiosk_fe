import { useState } from 'react';
import { LuPlus, LuX, LuGripVertical } from 'react-icons/lu';
import { getEditableSubjects, saveSubjects } from '../utils/noticeSubjects';
import styles from './NoticeSettingsModal.module.css';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function NoticeSettingsModal({ onClose, onSave }: Props) {
  const [subjects, setSubjects] = useState<string[]>(getEditableSubjects);
  const [newSubject, setNewSubject] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleAdd = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (subjects.includes(trimmed)) return;
    setSubjects([...subjects, trimmed]);
    setNewSubject('');
  };

  const handleRemove = (idx: number) => {
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...subjects];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setSubjects(next);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleSave = () => {
    saveSubjects(subjects);
    onSave();
    onClose();
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

          {/* 전체(고정) */}
          <div className={styles.fixedItem}>
            <span className={styles.itemText}>전체</span>
            <span className={styles.fixedLabel}>고정</span>
          </div>

          <div className={styles.list} onDragOver={(e) => e.preventDefault()} onDrop={handleDragEnd}>
            {subjects.map((subject, idx) => (
              <div
                key={`${subject}-${idx}`}
                className={`${styles.item} ${dragIdx === idx ? styles.itemDragging : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={handleDragEnd}
              >
                <LuGripVertical className={styles.gripIcon} />
                <span className={styles.itemText}>{subject}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(idx)}
                  title="삭제"
                >
                  <LuX />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.addInput}
              placeholder="새 말머리 입력"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={20}
            />
            <button type="button" className={styles.addBtn} onClick={handleAdd}>
              <LuPlus /> 추가
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  );
}
