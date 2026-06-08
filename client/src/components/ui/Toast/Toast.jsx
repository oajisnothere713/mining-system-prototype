import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import './Toast.css';

export default function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  if (!msg) return null;

  return (
    <div className="toast">
      <CheckCircle2 size={18} className="toast-icon" />
      {msg}
    </div>
  );
}
