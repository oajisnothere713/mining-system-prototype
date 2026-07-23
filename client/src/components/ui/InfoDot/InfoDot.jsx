import React from 'react';
import { Info } from 'lucide-react';
import './InfoDot.css';

export default function InfoDot({ text }) {
  return (
    <span className="info-dot" title={text}>
      <Info
        size={13}
        className="info-dot-icon"
      />
    </span>
  );
}
