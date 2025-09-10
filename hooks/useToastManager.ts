import { useState, useCallback } from 'react';

export interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export function useToastManager() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
  }, []);

  const showSuccessToast = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showErrorToast = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfoToast = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  return {
    toast,
    showToast,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    closeToast
  };
}