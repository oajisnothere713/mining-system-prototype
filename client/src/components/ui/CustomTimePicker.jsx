import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';

export default function CustomTimePicker({ value, onChange, placeholder = "--:--", disabled = false, style = {}, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const times = useMemo(() => {
    const arr = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        arr.push(`${hh}:${mm}`);
      }
    }
    return arr;
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #E6E9ED", borderRadius: 9,
          fontSize: 14, fontWeight: 500, color: disabled ? "#A8AEB8" : (value ? "#1A1D21" : "#5B6470"), background: disabled ? "#F7F8FA" : "#fff",
          display: "flex", justifyContent: "space-between", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer"
        }}
      >
        <span>{value || placeholder}</span>
        <Clock size={15} color="#5B6470" style={{ flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: 4,
          background: '#fff', border: '1px solid #E6E9ED', borderRadius: 9, boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          maxHeight: 220, overflowY: 'auto', zIndex: 100
        }}>
          {times.map((t, i) => {
            const isSelected = t === value;
            return (
              <div
                key={i}
                onClick={() => { onChange(t); setOpen(false); }}
                style={{
                  padding: "8px 12px", fontSize: 14, fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? "#E8590C" : "#1A1D21", cursor: "pointer",
                  background: isSelected ? "#FFF1E8" : "transparent"
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "#F7F8FA")}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
              >
                {t}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
