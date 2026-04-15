import { useState, useCallback, useMemo } from 'react';
import ConfirmModal, { PromptModal } from '../components/ConfirmModal';

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState {
  message: React.ReactNode;
  resolve: (value: boolean) => void;
  options?: ConfirmOptions;
}

interface PromptState {
  message: string;
  placeholder?: string;
  resolve: (value: string | null) => void;
}

export default function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);

  const confirm = useCallback(
    (message: React.ReactNode, options?: ConfirmOptions): Promise<boolean> =>
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
    (message: React.ReactNode): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ message, resolve, options: { cancelLabel: '' } });
      }),
    [],
  );

  /** prompt 대체 — 값 입력 모달 */
  const prompt = useCallback(
    (message: string, placeholder?: string): Promise<string | null> =>
      new Promise((resolve) => {
        setPromptState({ message, placeholder, resolve });
      }),
    [],
  );

  const handlePromptConfirm = useCallback((value: string) => {
    promptState?.resolve(value);
    setPromptState(null);
  }, [promptState]);

  const handlePromptCancel = useCallback(() => {
    promptState?.resolve(null);
    setPromptState(null);
  }, [promptState]);

  const ConfirmDialog = useMemo(() => {
    const elements: React.ReactNode[] = [];

    if (state) {
      const isAlert = state.options?.cancelLabel === '';
      elements.push(
        <ConfirmModal
          key="confirm"
          message={state.message}
          onConfirm={handleConfirm}
          onCancel={isAlert ? handleConfirm : handleCancel}
          confirmLabel={state.options?.confirmLabel ?? '확인'}
          cancelLabel={isAlert ? '' : (state.options?.cancelLabel ?? '취소')}
        />
      );
    }

    if (promptState) {
      elements.push(
        <PromptModal
          key="prompt"
          message={promptState.message}
          placeholder={promptState.placeholder}
          onConfirm={handlePromptConfirm}
          onCancel={handlePromptCancel}
        />
      );
    }

    return elements.length > 0 ? <>{elements}</> : null;
  }, [state, promptState, handleConfirm, handleCancel, handlePromptConfirm, handlePromptCancel]);

  return { confirm, alert, prompt, ConfirmDialog };
}
