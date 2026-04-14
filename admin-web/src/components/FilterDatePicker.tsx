import { useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ko } from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';
import s from './FilterDatePicker.module.css';

registerLocale('ko', ko);

interface FilterDatePickerProps {
  value: string;           // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  id?: string;
  minDate?: string;        // 'YYYY-MM-DD'
  maxDate?: string;        // 'YYYY-MM-DD'
  placeholder?: string;
}

function toDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toStr(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function FilterDatePicker({ value, onChange, id, minDate, maxDate, placeholder }: FilterDatePickerProps) {
  const ref = useRef<DatePicker>(null);

  return (
    <div className={s.wrap} onClick={() => ref.current?.setOpen(true)}>
      <DatePicker
        id={id}
        ref={ref}
        locale="ko"
        selected={toDate(value)}
        onChange={(d: Date | null) => {
          onChange(toStr(d));
          setTimeout(() => ref.current?.setOpen(false), 0);
        }}
        dateFormat="yyyy-MM-dd"
        className={value ? s.input : `${s.input} ${s.inputPlaceholder}`}
        placeholderText={placeholder}
        calendarClassName={s.calendar}
        dayClassName={() => s.day}
        popperClassName={s.popper}
        showPopperArrow={false}
        minDate={toDate(minDate ?? '') ?? undefined}
        maxDate={toDate(maxDate ?? '') ?? undefined}
        popperProps={{ strategy: 'fixed' }}
      />
      <svg className={s.arrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
