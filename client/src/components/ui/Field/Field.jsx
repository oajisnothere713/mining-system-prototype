import React from 'react';
import './Field.css';

export default function Field({ label, children }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}
