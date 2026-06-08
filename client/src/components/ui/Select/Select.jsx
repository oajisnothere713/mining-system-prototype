import React from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

export default function Select({ value, onChange, options }) {
  return (
    <div className="select-wrapper">
      <select
        className="select-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={15} className="select-chevron" />
    </div>
  );
}
