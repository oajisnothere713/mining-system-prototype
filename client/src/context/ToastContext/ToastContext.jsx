import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../../components/ui/Toast/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toastMsg, setToastMsg] = useState('');

  const toast = useCallback((message) => {
    setToastMsg(message);
  }, []);

  const clearToast = useCallback(() => {
    setToastMsg('');
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toast msg={toastMsg} onDone={clearToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export default ToastContext;
