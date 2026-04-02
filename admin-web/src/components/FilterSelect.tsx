import { useState, useRef, useEffect } from 'react';
import s from './FilterSelect.module.css';

interface FilterSelectProps {
  value: string;
  options: string[];
  /** 옵션 value → 표시 텍스트 매핑 (없으면 value 그대로 표시) */
  labelMap?: Record<string, string>;
  /** 아무것도 선택하지 않은 기본 상태일 때 보여줄 placeholder (기본: '전체') */
  placeholder?: string;
  /** placeholder로 간주할 값 (기본: options[0]) */
  defaultValue?: string;
  onChange: (value: string) => void;
}

export default function FilterSelect({ value, options, labelMap, placeholder = '전체', defaultValue, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const placeholderValue = defaultValue ?? options[0];
  const isPlaceholder = value === placeholderValue;

  /* 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayLabel = (v: string) => labelMap?.[v] ?? v;

  return (
    <div className={s.wrap} ref={ref}>
      <button
        type="button"
        className={`${s.trigger} ${open ? s.triggerOpen : ''}`}
        onClick={() => setOpen((p) => !p)}
      >
        <span className={s.triggerText}>
          {displayLabel(value)}
        </span>
        <svg className={s.arrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className={s.menu}>
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={`${s.item} ${opt === value ? s.itemActive : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {displayLabel(opt)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
