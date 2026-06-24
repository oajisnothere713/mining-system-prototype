import React, { useState, useMemo } from 'react';
import { LayoutGrid, ClipboardCheck, Truck, Target } from 'lucide-react';
import WorkbenchTab from './WorkbenchTab';
import ApprovalsTab from './ApprovalsTab';
import CapacityTab from './CapacityTab';
import AccuracyTab from './AccuracyTab';
import './ForecastBoard.css';

// ---- MOCK DATA START ----
function getMats() {
  return [
    {n:'AN Prill', c:'BULK', u:'t', s:12,  w:[18,16,16,18], lead:5},
    {n:'ANFO', c:'BULK', u:'t', s:380, w:[42,38,45,30], lead:7},
    {n:'Bulk Emulsion', c:'BULK', u:'t', s:60, w:[18,22,20,15], lead:8},
    {n:'Heavy ANFO 30:70', c:'BULK', u:'t', s:95, w:[8,0,9,0], lead:7},
    {n:'Heavy ANFO 40:60', c:'BULK', u:'t', s:40, w:[6,5,4,6], lead:7},
    {n:'Heavy ANFO 50:50', c:'BULK', u:'t', s:14, w:[5,4,5,4], lead:7},
    {n:'Pumpable Emulsion', c:'BULK', u:'t', s:60, w:[0,0,12,0], lead:8},
    {n:'Packaged Emulsion', c:'BULK', u:'t', s:8, w:[3,4,3,3], lead:9},
    {n:'Watergel', c:'BULK', u:'t', s:30, w:[2,3,2,2], lead:9},
    {n:'Doped ANFO', c:'BULK', u:'t', s:5, w:[3,3,2,3], lead:6},
    {n:'Site-Sensitised Emulsion', c:'BULK', u:'t', s:120, w:[20,18,22,20], lead:8},
    {n:'Low-Density ANFO', c:'BULK', u:'t', s:6, w:[4,3,4,3], lead:6},
    {n:'Aluminised ANFO', c:'BULK', u:'t', s:50, w:[3,2,3,2], lead:7},
    {n:'Repumpable Emulsion', c:'BULK', u:'t', s:18, w:[6,5,6,5], lead:8},
    {n:'Electronic Detonator', c:'IS&PE', u:'ea', s:1800, w:[800,600,900,500], lead:10},
    {n:'Cast Booster 400g', c:'IS&PE', u:'ea', s:950, w:[400,400,320,200], lead:9},
    {n:'Cast Booster 150g', c:'IS&PE', u:'ea', s:2200, w:[300,250,300,250], lead:9},
    {n:'Detonating Cord 10 g/m', c:'IS&PE', u:'m', s:2400, w:[200,150,0,100], lead:9},
    {n:'Detonating Cord 5 g/m', c:'IS&PE', u:'m', s:600, w:[100,80,100,80], lead:9},
    {n:'Shock Tube Detonator', c:'IS&PE', u:'ea', s:300, w:[150,120,150,120], lead:10},
    {n:'Surface Connector', c:'IS&PE', u:'ea', s:80, w:[60,50,60,50], lead:8},
    {n:'Plain Detonator', c:'IS&PE', u:'ea', s:200, w:[120,100,120,100], lead:8},
    {n:'Safety Fuse', c:'IS&PE', u:'m', s:1500, w:[100,80,100,80], lead:7},
    {n:'DTH Delay', c:'IS&PE', u:'ea', s:90, w:[70,60,70,60], lead:11},
    {n:'Trunkline Delay', c:'IS&PE', u:'ea', s:40, w:[80,70,80,70], lead:12},
    {n:'Primer Cartridge', c:'IS&PE', u:'ea', s:5000, w:[400,350,400,350], lead:9},
  ];
}

function getSev(l){
  if(l==='critical') return {fg:'#C0392B',bg:'#FAE9E7',border:'#F0D9D6',dot:'#C0392B',label:'Critical',icon:'ti ti-alert-circle'};
  if(l==='watch') return {fg:'#A66A0C',bg:'#FAF2E0',border:'#EFE2C2',dot:'#D08A1A',label:'Watch',icon:'ti ti-alert-triangle'};
  return {fg:'#2E7D46',bg:'#EAF3EC',border:'#C9E0CF',dot:'#2E7D46',label:'Healthy',icon:'ti ti-circle-check'};
}

function computeMat(m){
  const total=m.w.reduce((a,b)=>a+b,0), avg=total/4;
  const cover= avg>0 ? m.s/avg : 99, bal=m.s-total;
  const level= cover<1?'critical':cover<4?'watch':'good';
  return {
    ...m, total, avg, cover, bal, level, sv:getSev(level),
    stockLbl: m.s.toLocaleString('en-US'), totalLbl: total.toLocaleString('en-US'),
    coverLbl: cover>=6?'6w+':cover.toFixed(1)+'w', custCount: 3
  };
}
// ---- MOCK DATA END ----

export default function ForecastBoardPage() {
  const [nav, setNav] = useState('work');
  const [cat, setCat] = useState('BULK');
  const [sevFilter, setSevFilter] = useState('all');
  const [selName, setSelName] = useState('AN Prill');
  const [modalScope, setModalScope] = useState(null);

  const rows = useMemo(() => getMats().map(computeMat), []);
  const bulkRows = useMemo(() => rows.filter(r => r.c === 'BULK'), [rows]);
  const ispeRows = useMemo(() => rows.filter(r => r.c === 'IS&PE'), [rows]);

  const titles = {
    work: ['Materials workbench', 'Stock risk & 4-week demand for every material'],
    approvals: ['Demand approval', 'Review weekly quantities and create Planned Orders'],
    capacity: ['Capacity & gaps', 'Vehicle / crew load and customer booking gaps'],
    accuracy: ['Forecast accuracy', 'How close past plans were to actual deliveries']
  };
  const [pageTitle, pageSub] = titles[nav];

  const kpis = [
    { val: rows.filter(r => r.level === 'critical').length, label: 'Critical', color: '#C0392B' },
    { val: bulkRows.reduce((a, r) => a + r.total, 0).toLocaleString('en-US'), label: 'BULK plan (t)', color: '#17191C' },
    { val: '97%', label: 'Last-wk accuracy', color: '#2E7D46' },
  ];

  const navDefs = [
    { key: 'work', label: 'Workbench', icon: LayoutGrid },
    { key: 'approvals', label: 'Approvals', icon: ClipboardCheck },
    { key: 'capacity', label: 'Capacity & Gaps', icon: Truck },
    { key: 'accuracy', label: 'Accuracy', icon: Target },
  ];

  // Provide state context to the active tab
  const tabProps = {
    rows, bulkRows, ispeRows,
    nav, cat, setCat,
    sevFilter, setSevFilter,
    selName, setSelName,
    modalScope, setModalScope
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#EEF0F2' }}>
      {/* Top Header */}
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #E1E4E8', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        
        {/* Title & Sub */}
        <div style={{ minWidth: '220px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: '#17191C' }}>{pageTitle}</div>
          <div style={{ fontSize: '12px', color: '#5B6470', marginTop: '1px' }}>{pageSub}</div>
        </div>

        {/* Tab Navigation (Moved here from prototype's sidebar) */}
        <div style={{ flex: 1, display: 'flex', gap: '8px', paddingLeft: '12px' }}>
          {navDefs.map(n => {
            const on = nav === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setNav(n.key)}
                className={`fc-nav-btn ${on ? 'fc-nav-btn-active' : ''}`}
              >
                <n.icon size={16} strokeWidth={2.5} />
                <span>{n.label}</span>
              </button>
            )
          })}
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {kpis.map((k, idx) => (
            <div key={idx} style={{ textAlign: 'right', paddingLeft: '16px', borderLeft: '1px solid #EDEFF1' }}>
              <div style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.4px', color: k.color }}>{k.val}</div>
              <div style={{ fontSize: '11px', color: '#5B6470', marginTop: '1px' }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {nav === 'work' && <WorkbenchTab {...tabProps} />}
        {nav === 'approvals' && <ApprovalsTab {...tabProps} />}
        {nav === 'capacity' && <CapacityTab {...tabProps} />}
        {nav === 'accuracy' && <AccuracyTab {...tabProps} />}
      </div>
    </div>
  );
}
