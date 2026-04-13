const STORAGE_KEY = 'admin:noticeSubjects';
const DEFAULT_SUBJECTS = ['전체', '국어', '수학', '과학', '사회', '한국사'];

/** 저장된 말머리 목록 반환 */
export function getSubjects(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return [...DEFAULT_SUBJECTS];
}

/** 말머리 목록 저장 */
export function saveSubjects(subjects: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

/** 폼에서 사용할 말머리 목록 ('선택' + 말머리들) */
export function getFormSubjects(): string[] {
  return ['선택', ...getSubjects()];
}
