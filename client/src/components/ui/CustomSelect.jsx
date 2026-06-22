import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder = "Select...", disabled = false, style = {}, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getLabel = (v) => {
    if (!v && v !== 0) return placeholder;
    const opt = options.find(o => (typeof o === 'object' ? o.value === v : o === v));
    if (!opt) return placeholder;
    return typeof opt === 'object' ? opt.label : opt;
  };

  const isPlaceholder = !options.find(o => (typeof o === 'object' ? o.value === value : o === value));

  return (
    <div ref={ref} className={className} style={{ position: 'relative', width: '100%', ...style }}>
      <div 
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #E6E9ED", borderRadius: 9,
          fontSize: 14, fontWeight: 500, color: disabled ? "#A8AEB8" : (isPlaceholder ? "#5B6470" : "#1A1D21"), background: disabled ? "#F7F8FA" : "#fff",
          display: "flex", justifyContent: "space-between", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {getLabel(value)}
        </span>
        <ChevronDown size={15} color="#5B6470" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: 4,
          background: '#fff', border: '1px solid #E6E9ED', borderRadius: 9, boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          maxHeight: 250, overflowY: 'auto', zIndex: 100
        }}>
          {options.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13.5, color: "#5B6470", fontStyle: "italic" }}>No options</div>
          ) : options.map((o, i) => {
            const v = typeof o === 'object' ? o.value : o;
            const l = typeof o === 'object' ? o.label : o;
            const isHeader = typeof o === 'object' && o.isHeader;
            const disabledOpt = typeof o === 'object' && o.disabled;
            
            if (isHeader) {
               return <div key={i} style={{ padding: "8px 12px", fontSize: 11.5, fontWeight: 700, color: "#5B6470", textTransform: "uppercase", letterSpacing: 0.5, background: "#F7F8FA" }}>{l}</div>;
            }
            
            const isSelected = v === value;
            return (
              <div
                key={i}
                onClick={() => { if(!disabledOpt) { onChange(v); setOpen(false); } }}
                style={{
                  padding: "10px 12px", fontSize: 14, fontWeight: isSelected ? 600 : 500,
                  color: disabledOpt ? "#A8AEB8" : (isSelected ? "#E8590C" : "#1A1D21"), cursor: disabledOpt ? "not-allowed" : "pointer",
                  background: isSelected ? "#FFF1E8" : "transparent"
                }}
                onMouseEnter={e => !isSelected && !disabledOpt && (e.currentTarget.style.background = "#F7F8FA")}
                onMouseLeave={e => !isSelected && !disabledOpt && (e.currentTarget.style.background = "transparent")}
              >
                {l}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
