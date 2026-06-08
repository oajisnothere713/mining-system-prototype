import React from 'react';
import './TypeTag.css';

export default function TypeTag({ type }) {
  const isBulk = type === 'Bulk';
  return (
    <span className={`type-tag ${isBulk ? 'type-tag--bulk' : 'type-tag--initiating'}`}>
      {type}
    </span>
  );
}
