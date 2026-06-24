import React from 'react';
import { Package, ChartBar, Users, History, ArrowDownRight, Clock, AlertCircle, FilePlus } from 'lucide-react';

export default function WorkbenchTab({ 
  rows, bulkRows, ispeRows, 
  cat, setCat, 
  sevFilter, setSevFilter, 
  selName, setSelName,
  modalScope, setModalScope 
}) {
  const ispeCount = ispeRows.length;
  const bulkCount = bulkRows.length;
  const inCat = cat === 'BULK' ? bulkRows : ispeRows;

  const counts = {
    all: inCat.length,
    critical: inCat.filter(r => r.level === 'critical').length,
    watch: inCat.filter(r => r.level === 'watch').length,
    good: inCat.filter(r => r.level === 'good').length
  };

  const sevChips = [
    { key: 'all', label: 'All', col: '#9098A1' },
    { key: 'critical', label: 'Critical', col: '#C0392B' },
    { key: 'watch', label: 'Watch', col: '#D08A1A' },
    { key: 'good', label: 'OK', col: '#2E7D46' }
  ];

  const order = { critical: 0, watch: 1, good: 2 };
  const listRows = inCat
    .filter(r => sevFilter === 'all' ? true : r.level === sevFilter)
    .sort((a, b) => order[a.level] - order[b.level] || a.cover - b.cover);

  const sel = rows.find(r => r.n === selName) || inCat[0] || rows[0];
  const selSv = sel.sv;
  
  const balLbl = (sel.bal >= 0 ? '+' : '−') + Math.abs(sel.bal).toLocaleString('en-US') + ' ' + sel.u;
  const balColor = sel.bal < 0 ? '#C0392B' : '#2E7D46';
  const coverBig = sel.cover >= 6 ? '6+' : sel.cover.toFixed(1);

  const maxW = Math.max(...sel.w, 1);
  const weekLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
  const weekDates = ['23–27 Jun', '30–4 Jul', '7–11 Jul', '14–18 Jul'];
  
  const weekBars = sel.w.map((v, i) => ({
    wk: weekLabels[i],
    dates: weekDates[i],
    valLbl: v === 0 ? '—' : v.toLocaleString('en-US'),
    h: (v / maxW) * 100,
    fill: v === 0 ? '#EEF0F2' : '#DC5B16',
    lblColor: v === 0 ? '#AEB4BC' : '#17191C'
  }));

  const baseCustomers = [
    { name: 'JK Cement', site: 'Panna mine', dockets: 6, split: 0.5 },
    { name: 'Aggregate Resources Pvt Ltd', site: 'Satna quarry', dockets: 4, split: 0.32 },
    { name: 'Satpura Stone Works', site: 'Katni', dockets: 3, split: 0.18 },
  ];
  const selCustomers = baseCustomers.map(b => ({
    name: b.name, site: b.site, dockets: b.dockets,
    qty: Math.round(sel.total * b.split).toLocaleString('en-US'),
    pct: Math.round(b.split * 100)
  }));

  const seed = (sel.n.length * 7) % 12;
  const accSeq = [82 + seed % 6, 88 + seed % 5, 93 + seed % 4, 96 + seed % 4].map(x => Math.min(100, x));
  const selAccAvg = Math.round(accSeq.reduce((a, b) => a + b, 0) / 4);
  const accV = (s) => s >= 95 ? '#2E7D46' : s >= 80 ? '#A66A0C' : '#C0392B';
  
  const selChanges = [
    { icon: ArrowDownRight, color: '#A66A0C', text: 'Week 4 demand revised down by JK Cement (booking BL-2025-047).' },
    { icon: Clock, color: '#9098A1', text: `Reorder point reached in ${Math.max(0, Math.round(sel.cover * 7))} days at current run rate.` },
  ];

  const orderUrgent = sel.level === 'critical';

  return (
    <div className="fc-tab-wrapper">
      {/* Master List */}
      <div style={{ width: '404px', flexShrink: 0, background: '#fff', borderRight: '1px solid #E1E4E8', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flexShrink: 0, padding: '13px 16px 11px', borderBottom: '1px solid #EDEFF1' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <button onClick={() => { setCat('BULK'); setSevFilter('all'); }} className={`fc-cat-btn ${cat === 'BULK' ? 'fc-cat-btn-active' : ''}`}>
              BULK <span style={{ opacity: 0.6 }}>{bulkCount}</span>
            </button>
            <button onClick={() => { setCat('IS&PE'); setSevFilter('all'); }} className={`fc-cat-btn ${cat === 'IS&PE' ? 'fc-cat-btn-active' : ''}`}>
              IS&PE <span style={{ opacity: 0.6 }}>{ispeCount}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            {sevChips.map(c => (
              <button 
                key={c.key} 
                onClick={() => setSevFilter(c.key)} 
                className={`fc-sev-chip ${sevFilter === c.key ? 'fc-sev-chip-active' : ''}`}
              >
                {c.key !== 'all' && <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: c.col }}></span>}
                {c.label} {counts[c.key]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 78px 64px', padding: '7px 16px', borderBottom: '1px solid #EDEFF1', background: '#FBFBFC', fontSize: '10px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <div>Material · sorted by risk</div>
          <div style={{ textAlign: 'right' }}>4-wk plan</div>
          <div style={{ textAlign: 'right' }}>Cover</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {listRows.map(r => (
            <div key={r.n} onClick={() => setSelName(r.n)} className={`fc-list-row ${selName === r.n ? 'fc-list-row-active' : ''}`}>
              <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '3px', background: r.sv.dot, flexShrink: 0 }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.n}</div>
                <div style={{ fontSize: '11px', color: '#9098A1', marginTop: '1px' }}>{r.stockLbl} {r.u} in stock</div>
              </div>
              <div style={{ width: '78px', textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.totalLbl}</span> <span style={{ fontSize: '10px', color: '#AEB4BC', fontFamily: "'DM Mono', monospace" }}>{r.u}</span>
              </div>
              <div style={{ width: '64px', textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', color: r.sv.fg, background: r.sv.bg }}>{r.coverLbl}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspector */}
      <div className="fc-scroll-area">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: selSv.bg, color: selSv.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>{sel.n}</div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '6px', background: '#EEF0F2', color: '#5B6470' }}>{sel.c}</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#5B6470', marginTop: '3px' }}>
              Unit: {sel.u} · Supplier lead time {sel.lead} days · {sel.custCount} customers driving demand
            </div>
          </div>
          <button 
            onClick={() => setModalScope('mat')}
            style={{
              fontFamily: 'inherit', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              ...(orderUrgent ? { background: '#DC5B16', color: '#fff', border: 'none' } : { background: '#fff', color: '#17191C', border: '1px solid #E1E4E8' })
            }}
          >
            {orderUrgent ? <AlertCircle size={16} /> : <FilePlus size={16} />}
            {orderUrgent ? 'Order now' : 'Create Planned Order'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          <div style={{ background: selSv.bg, border: `1px solid ${selSv.border}`, borderRadius: '13px', padding: '15px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: selSv.fg, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selSv.label}
            </div>
            <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-1px', marginTop: '6px', color: selSv.fg }}>{coverBig}</div>
            <div style={{ fontSize: '12px', color: '#5B6470' }}>weeks of cover</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '15px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In stock</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>{sel.stockLbl}</div>
            <div style={{ fontSize: '12px', color: '#5B6470' }}>{sel.u} on hand</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '15px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>4-wk planned</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px', color: '#DC5B16' }}>{sel.totalLbl}</div>
            <div style={{ fontSize: '12px', color: '#5B6470' }}>{sel.u} demand</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '15px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9098A1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projected balance</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px', color: balColor }}>{balLbl}</div>
            <div style={{ fontSize: '12px', color: '#5B6470' }}>after 4 weeks</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '16px 18px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChartBar size={16} color="#DC5B16" /> Planned demand by week
            </div>
            <div style={{ fontSize: '11.5px', color: '#9098A1' }}>stock line shows when cover runs out</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', height: '150px', paddingTop: '8px', position: 'relative' }}>
            {weekBars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: b.lblColor }}>{b.valLbl}</div>
                <div style={{ width: '100%', maxWidth: '74px', background: b.fill, borderRadius: '7px 7px 0 0', height: `${b.h}%`, minHeight: '3px', transition: 'height .3s' }}></div>
                <div style={{ fontSize: '11.5px', color: '#5B6470', fontWeight: 600 }}>{b.wk}</div>
                <div style={{ fontSize: '10.5px', color: '#9098A1' }}>{b.dates}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '16px 18px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Users size={16} color="#9098A1" /> Customers driving this demand
            </div>
            {selCustomers.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '13px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#9098A1' }}>{c.dockets} dockets · {c.site}</div>
                </div>
                <div style={{ width: '120px' }}>
                  <div style={{ height: '7px', background: '#EEF0F2', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', background: '#DC5B16', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ width: '60px', textAlign: 'right', fontSize: '12.5px', fontWeight: 700 }}>{c.qty}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '16px 18px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <History size={16} color="#9098A1" /> Recent changes & accuracy
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '13px', borderBottom: '1px solid #F0F1F3', marginBottom: '13px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: accV(selAccAvg), letterSpacing: '-0.5px' }}>{selAccAvg}%</div>
                <div style={{ fontSize: '11px', color: '#5B6470' }}>4-wk avg accuracy</div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '5px', height: '38px' }}>
                {accSeq.map((s, i) => (
                  <div key={i} style={{ flex: 1, background: accV(s), borderRadius: '3px 3px 0 0', height: `${(s - 70) / 30 * 100}%` }}></div>
                ))}
              </div>
            </div>
            {selChanges.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '9px', marginBottom: '10px' }}>
                <c.icon size={15} color={c.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12px', color: '#3A3F45', lineHeight: 1.45 }}>{c.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
