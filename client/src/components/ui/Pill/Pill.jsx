import React from 'react';
import './Pill.css';

const STATUS_MAP = {
  'PGR Complete': ['#EBFBEE', '#2F9E44', '#2F9E44'],
  'PGR Pending': ['#FFF9DB', '#9C6B00', '#F08C00'],
  'In Transit': ['#E7F5FF', '#1971C2', '#1971C2'],
  'Qty Mismatch': ['#FFF0F0', '#E03131', '#E03131'],
  'Awaiting PGR': ['#F1F3F5', '#5B6470', '#5B6470'],
};

export default function Pill({ status }) {
  const s = STATUS_MAP[status] || ['#eee', '#5B6470', '#5B6470'];

  return (
    <span className="pill" style={{ background: s[0], color: s[1] }}>
      <span className="pill-dot" style={{ background: s[2] }} />
      {status}
    </span>
  );
}
