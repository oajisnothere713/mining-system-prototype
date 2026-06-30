import React, { useState, useMemo } from 'react';
import { LayoutGrid, ClipboardCheck, Truck, Target } from 'lucide-react';
import { usePlant } from '../../context/PlantContext/PlantContext';
import WorkbenchTab from './WorkbenchTab';
import ApprovalsTab from './ApprovalsTab';
import CapacityTab from './CapacityTab';
import AccuracyTab from './AccuracyTab';
import './ForecastBoard.css';
import { useForecast } from '../../hooks/useForecast/useForecast';
import { Loader2 } from 'lucide-react';

function getSev(l){
  if(l==='critical') return {fg:'#C0392B',bg:'#FAE9E7',border:'#F0D9D6',dot:'#C0392B',label:'Critical',icon:'ti ti-alert-circle'};
  if(l==='watch') return {fg:'#A66A0C',bg:'#FAF2E0',border:'#EFE2C2',dot:'#D08A1A',label:'Watch',icon:'ti ti-alert-triangle'};
  return {fg:'#2E7D46',bg:'#EAF3EC',border:'#C9E0CF',dot:'#2E7D46',label:'Healthy',icon:'ti ti-circle-check'};
}

function computeMat(m){
  const total = m.weeklyDemand.reduce((a, b) => a + b, 0);
  const avg = total / 4;
  const cover = avg > 0 ? m.stock / avg : 99;
  const bal = m.stock - total;
  const level = cover < 1 ? 'critical' : cover < 4 ? 'watch' : 'good';
  return {
    ...m,
    n: m.name,
    c: m.category,
    u: m.uom,
    s: m.stock,
    w: m.weeklyDemand,
    total, avg, cover, bal, level, sv: getSev(level),
    stockLbl: m.stock.toLocaleString('en-US'), totalLbl: total.toLocaleString('en-US'),
    coverLbl: cover >= 6 ? '6w+' : cover.toFixed(1) + 'w', custCount: 3
  };
}

export default function ForecastBoardPage() {
  const { selectedPlant } = usePlant();
  const forecast = useForecast();
  
  const [nav, setNav] = useState('work');
  const [cat, setCat] = useState('BULK');
  const [sevFilter, setSevFilter] = useState('all');
  const [selName, setSelName] = useState('AN Prill');
  const [modalScope, setModalScope] = useState(null);

  const rows = useMemo(() => forecast.materials.map(computeMat), [forecast.materials]);
  const bulkRows = useMemo(() => rows.filter(r => r.c === 'BULK'), [rows]);
  const ispeRows = useMemo(() => rows.filter(r => r.c === 'IS&PE'), [rows]);

  const critCount = rows.filter(r => r.level === 'critical').length;
  const reviewCount = forecast.plan?.status === 'review' ? 1 : forecast.plan?.status === 'draft' ? 1 : 0;

  const kpis = [
    { val: critCount, label: 'Critical', color: '#C0392B' },
    { val: bulkRows.reduce((a, r) => a + r.total, 0).toLocaleString('en-US'), label: 'BULK plan (t)', color: '#17191C' },
    { val: forecast.accuracy?.length > 0 ? `${forecast.accuracy[0].accuracy}%` : '97%', label: 'Last-wk accuracy', color: '#2E7D46' },
  ];

  const navDefs = [
    { key: 'work', label: 'Workbench', icon: LayoutGrid, badge: critCount },
    { key: 'approvals', label: 'Approvals', icon: ClipboardCheck, badge: reviewCount },
    { key: 'capacity', label: 'Capacity & Gaps', icon: Truck, badge: 0 },
    { key: 'accuracy', label: 'Accuracy', icon: Target, badge: 0 },
  ];

  // Provide state context to the active tab
  const tabProps = {
    forecast,
    rows, bulkRows, ispeRows,
    nav, cat, setCat,
    sevFilter, setSevFilter,
    selName, setSelName,
    modalScope, setModalScope
  };

  if (forecast.loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#EEF0F2', margin: '-28px', height: 'calc(100% + 56px)' }}>
        <Loader2 className="lucide-spin" size={32} color="var(--blue)" />
      </div>
    );
  }

  if (!forecast.materials || forecast.materials.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#EEF0F2', margin: '-28px', height: 'calc(100% + 56px)', color: '#5B6470' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No forecast data available</div>
        <div style={{ fontSize: '14px' }}>There is no forecast data for {selectedPlant?.name || 'this plant'}. Please run the seed script or select a different plant.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#EEF0F2', margin: '-28px', height: 'calc(100% + 56px)' }}>

      {/* ===== ROW 1: Title + KPIs ===== */}
      <div className="fc-header-top" style={{ borderTop: '1px solid #E1E4E8' }}>
        <div className="fc-header-title-block">
          <div className="fc-header-title">
            Forecast Board <span className="fc-header-depot">· {selectedPlant.name} depot</span>
          </div>
          <div className="fc-header-sub">
            4-week rolling demand &amp; supply plan · 23 Jun – 20 Jul 2026
          </div>
        </div>

        <div className="fc-header-kpis">
          {kpis.map((k, idx) => (
            <div key={idx} className="fc-header-kpi">
              <div className="fc-header-kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="fc-header-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== ROW 2: Tab Navigation ===== */}
      <div className="fc-header-nav">
        {navDefs.map(n => {
          const on = nav === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setNav(n.key)}
              className={`fc-nav-btn ${on ? 'fc-nav-btn-active' : ''}`}
            >
              <n.icon size={15} strokeWidth={2.2} />
              <span>{n.label}</span>
              {n.badge > 0 && (
                <span className="fc-nav-badge">
                  {n.badge}
                </span>
              )}
            </button>
          );
        })}
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
