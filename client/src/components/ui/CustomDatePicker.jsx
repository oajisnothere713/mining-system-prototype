import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function CustomDatePicker({ value, onChange, placeholder = "dd-mm-yyyy", disabled = false, min = "", style = {}, className = "" }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef();

  useEffect(() => {
    if (value && !open) setViewDate(new Date(value));
  }, [value, open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const weeks = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1);
    let startDay = firstDay.getDay() || 7;
    const start = new Date(firstDay);
    start.setDate(1 - (startDay - 1));

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    
    const wks = [];
    for (let i = 0; i < 42; i += 7) {
      wks.push(days.slice(i, i + 7));
    }
    return wks;
  }, [viewDate]);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const formatDate = (dateString) => {
    if (!dateString) return placeholder;
    const [y, m, d] = dateString.split('-');
    return `${d}-${m}-${y}`;
  };

  const handleSelect = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    if (min && dateStr < min) return;
    onChange(dateStr);
    setOpen(false);
  };

  const currentSelection = value ? new Date(value) : null;

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
        <span>{formatDate(value)}</span>
        <Calendar size={15} color="#5B6470" style={{ flexShrink: 0 }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid #E6E9ED', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          padding: 16, zIndex: 100, width: 280
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5B6470', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lt;</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1D21' }}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5B6470', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&gt;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#5B6470', marginBottom: 8 }}>
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {weeks.map((week, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((d, j) => {
                  const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                  const isToday = new Date().toDateString() === d.toDateString();
                  const yStr = d.getFullYear();
                  const mStr = String(d.getMonth() + 1).padStart(2, '0');
                  const dStr = String(d.getDate()).padStart(2, '0');
                  const dateStr = `${yStr}-${mStr}-${dStr}`;
                  const isSelected = currentSelection && currentSelection.toDateString() === d.toDateString();
                  const isDisabled = min && dateStr < min;

                  return (
                    <div 
                      key={j} 
                      onClick={() => !isDisabled && handleSelect(d)}
                      style={{ 
                        padding: '4px 0', textAlign: 'center', fontSize: 13, fontWeight: 500,
                        color: isDisabled ? '#E6E9ED' : (isSelected ? '#fff' : (isCurrentMonth ? '#1A1D21' : '#ced4da')),
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span 
                        style={{
                          display: 'inline-block', width: 26, height: 26, lineHeight: '26px', borderRadius: '50%',
                          background: isSelected ? '#E8590C' : 'transparent',
                          border: isToday && !isSelected ? `1px solid #E8590C` : '1px solid transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = '#F7F8FA'; }}
                        onMouseLeave={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
