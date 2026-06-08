import React from 'react';
import { CalendarRange } from 'lucide-react';

export default function DocketPage() {
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.5 }}>
        Mobile Delivery Docket
      </h1>
      <div style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 22 }}>
        Designed next in the build sequence
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px dashed var(--line)',
          borderRadius: 14,
          padding: 60,
          textAlign: 'center',
          color: 'var(--slate)',
        }}
      >
        <CalendarRange size={40} style={{ color: 'var(--orange)', marginBottom: 16 }} />
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          Mobile Delivery Docket
        </div>
        <div style={{ fontSize: 14, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          Built in the next iteration, after sign-off on the Inbound Delivery, Goods Receipt and Stock screens.
        </div>
      </div>
    </div>
  );
}
