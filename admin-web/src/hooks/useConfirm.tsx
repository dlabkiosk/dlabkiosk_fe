import { useState, useCallback, useMemo } from 'react';
import ConfirmModal from '../components/ConfirmModal';

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
  options?: ConfirmOptions;
}

export default function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (message: string, options?: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ message, resolve, options });
      }),
    [],
  );

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  /** alert 대체 (확인 버튼만 표시) */
  const alert = useCallback(
    (message: string): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ message, resolve, options: { cancelLabel: '' } });
      }),
    [],
  );

  const ConfirmDialog = useMemo(() => {
    if (!state) return null;
    // cancelLabel이 빈 문자열이면 alert 모드 (확인만)
    const isAlert = state.options?.cancelLabel === '';
    return (
      <ConfirmModal
        message={state.message}
        onConfirm={handleConfirm}
        onCancel={isAlert ? handleConfirm : handleCancel}
        confirmLabel={state.options?.confirmLabel ?? '확인'}
        cancelLabel={isAlert ? '' : (state.options?.cancelLabel ?? '취소')}
      />
    );
  }, [state, handleConfirm, handleCancel]);

  return { confirm, alert, ConfirmDialog };
}
