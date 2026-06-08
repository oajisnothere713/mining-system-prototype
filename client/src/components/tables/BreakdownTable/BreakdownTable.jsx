import React from 'react';
import './BreakdownTable.css';

export default function BreakdownTable({ head, rows, total }) {
  return (
    <table className="breakdown-table">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} style={{ textAlign: i === head.length - 1 ? 'right' : 'left' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td
                key={j}
                style={{
                  textAlign: j === r.length - 1 ? 'right' : 'left',
                  fontWeight: j === 0 ? 600 : 400,
                  color: j === 0 ? 'var(--orange)' : 'var(--slate)',
                }}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
        <tr className="breakdown-table-total">
          <td colSpan={head.length - 1}>Total</td>
          <td style={{ textAlign: 'right' }}>{total}</td>
        </tr>
      </tbody>
    </table>
  );
}
