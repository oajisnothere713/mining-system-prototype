import React from 'react';
import { Table, FileText, FilePlus } from 'lucide-react';

export default function ApprovalsTab({ rows, cat, setCat, forecast }) {
  const stMeta = {
    created: { label: 'Orders Created', fg: '#2E7D46', bg: '#EAF3EC' },
    review: { label: 'Under Review', fg: '#A66A0C', bg: '#FAF2E0' },
    draft: { label: 'Draft', fg: '#5B6470', bg: '#EEF0F2' }
  };

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const weekDates = Array.from({ length: 4 }).map((_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}`;
    } else {
      return `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })}`;
    }
  });

  const currentStatus = forecast.plan?.status || 'draft';
  const confidence = forecast.plan?.confidence || 85;

  const confColor = (c) => c >= 90 ? '#2E7D46' : c >= 60 ? '#D08A1A' : '#C0392B';

  const weekMeta = [
    { 
      label: 'Week 1', 
      dates: weekDates[0], 
      status: currentStatus, 
      conf: 97, 
      firmNote: currentStatus === 'created' ? 'Orders successfully submitted to ERP.' : 'Nearly all bookings carry a confirmed PO + assigned truck.' 
    },
    { label: 'Week 2', dates: weekDates[1], status: currentStatus === 'created' ? 'created' : 'review', conf: 78, firmNote: 'Mostly confirmed; 2 bookings still unassigned, 1 PO pending.' },
    { label: 'Week 3', dates: weekDates[2], status: 'draft', conf: 60, firmNote: 'Half soft bookings; no resources assigned yet.' },
    { label: 'Week 4', dates: weekDates[3], status: 'draft', conf: 35, firmNote: 'Mostly tentative; this horizon historically still shifts a lot.' },
  ];

  const weeks = weekMeta.map((w, i) => {
    const st = stMeta[w.status];
    const created = w.status === 'created';
    return {
      label: w.label, dates: w.dates, conf: w.conf, confColor: confColor(w.conf), firmNote: w.firmNote,
      statusLabel: st.label, statusFg: st.fg, statusBg: st.bg,
      btnLabel: created ? 'View Orders' : 'Create Planned Orders',
      btnIcon: created ? FileText : FilePlus,
      btnStyle: {
        fontFamily: 'inherit', width: '100%', marginTop: '11px', padding: '9px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        ...(created ? { background: '#EAF3EC', color: '#2E7D46', border: '1px solid #C9E0CF' } : { background: '#DC5B16', color: '#fff', border: 'none' })
      }
    };
  });

  const weekHeads = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
  const demandRows = rows.filter(r => r.c === cat).map(r => ({
    name: r.n, u: r.u,
    cells: r.w.map(v => v === 0 ? '—' : v.toLocaleString('en-US')),
    totalLbl: r.total.toLocaleString('en-US') + ' ' + r.u
  }));

  return (
    <div className="fc-scroll-area">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
        {weeks.map((w, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '15px', borderTop: `3px solid ${w.statusFg}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{w.label}</div>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', color: w.statusFg, background: w.statusBg }}>{w.statusLabel}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#9098A1', marginTop: '2px' }}>{w.dates}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '13px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: w.confColor }}>{w.conf}%</div>
              <div style={{ fontSize: '11.5px', color: '#5B6470' }}>demand firmness</div>
            </div>
            <div style={{ height: '6px', background: '#EEF0F2', borderRadius: '4px', overflow: 'hidden', marginTop: '7px' }}>
              <div style={{ width: `${w.conf}%`, height: '100%', background: w.confColor, borderRadius: '4px' }}></div>
            </div>
            <div style={{ fontSize: '11px', color: '#9098A1', marginTop: '8px', lineHeight: 1.4 }}>{w.firmNote}</div>
            <button 
              style={w.btnStyle}
              onClick={() => {
                if (!created && (w.status === 'review' || w.status === 'draft')) {
                  forecast.updatePlanStatus('created');
                }
              }}
            >
              <w.btnIcon size={15} /> {w.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #E1E4E8', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={16} color="#DC5B16" /> Planned quantity by week
          </div>
          <span style={{ fontSize: '11.5px', color: '#9098A1' }}>
            aggregated demand · <span style={{ color: '#DC5B16', fontWeight: 600 }}>orange total</span> is the signal sent to supply chain
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button onClick={() => setCat('BULK')} className={`fc-cat-btn ${cat === 'BULK' ? 'fc-cat-btn-active' : ''}`}>BULK</button>
            <button onClick={() => setCat('IS&PE')} className={`fc-cat-btn ${cat === 'IS&PE' ? 'fc-cat-btn-active' : ''}`}>IS&PE</button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(4, 1fr) 120px', padding: '0 18px', borderBottom: '1px solid #E1E4E8', background: '#FBFBFC' }}>
          <div style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Material</div>
          {weekHeads.map((h, i) => (
            <div key={i} style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>{h}</div>
          ))}
          <div style={{ padding: '9px 0', fontSize: '10.5px', fontWeight: 700, color: '#17191C', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>4-wk total</div>
        </div>

        {demandRows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) repeat(4, 1fr) 120px', padding: '0 18px', borderBottom: '1px solid #F2F3F5', alignItems: 'center' }}>
            <div style={{ padding: '11px 0', fontSize: '13px', fontWeight: 600 }}>
              {r.name} <span style={{ color: '#AEB4BC', fontFamily: "'DM Mono', monospace", fontSize: '10.5px', fontWeight: 500 }}>{r.u}</span>
            </div>
            {r.cells.map((c, j) => (
              <div key={j} style={{ padding: '11px 0', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>{c}</div>
            ))}
            <div style={{ padding: '11px 0', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#DC5B16' }}>{r.totalLbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
