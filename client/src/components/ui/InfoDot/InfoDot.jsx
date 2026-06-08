import React, { useState } from 'react';
import { Info } from 'lucide-react';
import './InfoDot.css';

export default function InfoDot({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="info-dot">
      <Info
        size={13}
        className="info-dot-icon"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      />
      {open && <span className="info-dot-tooltip">{text}</span>}
    </span>
  );
}
