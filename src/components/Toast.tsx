import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ToastInfo {
  id: number;
  message: string;
  isError?: boolean;
}

interface ToastProps {
  toast: ToastInfo | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toast.isError ? (
        <AlertCircle size={20} className="text-error" style={{ color: '#ffdad6' }} />
      ) : (
        <CheckCircle2 size={20} style={{ color: 'var(--primary-fixed)' }} />
      )}
      <span className="font-label-md">{toast.message}</span>
    </div>
  );
};
