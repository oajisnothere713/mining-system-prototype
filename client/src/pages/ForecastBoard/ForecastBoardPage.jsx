import React, { useState, useMemo } from 'react';
import { LayoutGrid, ClipboardCheck, Truck, Target, Database } from 'lucide-react';
import { usePlant } from '../../context/PlantContext/PlantContext';
import WorkbenchTab from './WorkbenchTab';
import ApprovalsTab from './ApprovalsTab';
import CapacityTab from './CapacityTab';
import AccuracyTab from './AccuracyTab';
import './ForecastBoard.css';
import { useForecast } from '../../hooks/useForecast/useForecast';
import { Loader2 } from 'lucide-react';
import forecastService from '../../services/forecastService/forecastService';
import { useToast } from '../../context/ToastContext/ToastContext';

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
    stockLbl: m.stock.toLocaleString('en-US'),
    totalLbl: total.toLocaleString('en-US'),
    coverLbl: cover >= 6 ? '6w+' : cover.toFixed(1) + 'w',
    custCount: m.customers ? m.customers.length : 0
  };
}

export default function ForecastBoardPage() {
  const { selectedPlant } = usePlant();
  const { showToast } = useToast();
  const forecast = useForecast();
  
  const [nav, setNav] = useState('work');
  const [isSeeding, setIsSeeding] = useState(false);
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

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  
  const endDate = new Date(monday);
  endDate.setDate(monday.getDate() + 27);
  const dateRangeStr = `${monday.getDate()} ${monday.toLocaleDateString('en-US', { month: 'short' })} – ${endDate.getDate()} ${endDate.toLocaleDateString('en-US', { month: 'short' })} ${endDate.getFullYear()}`;

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#EEF0F2', margin: '-28px', height: 'calc(100% + 56px)' }}>
        {/* Skeleton ROW 1: Title + KPIs */}
        <div className="fc-header-top" style={{ borderTop: '1px solid #E1E4E8' }}>
          <div className="fc-header-title-block">
            <div className="skeleton-box" style={{ width: '250px', height: '28px', marginBottom: '8px', borderRadius: '6px' }}></div>
            <div className="skeleton-box" style={{ width: '300px', height: '16px', borderRadius: '4px' }}></div>
          </div>
          <div className="fc-header-kpis">
            {[1, 2, 3].map(i => (
              <div key={i} className="fc-header-kpi">
                <div className="skeleton-box" style={{ width: '40px', height: '32px', marginBottom: '4px', borderRadius: '6px' }}></div>
                <div className="skeleton-box" style={{ width: '80px', height: '14px', borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton ROW 2: Tab Navigation */}
        <div className="fc-header-nav">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="fc-nav-btn" style={{ cursor: 'default' }}>
              <div className="skeleton-box" style={{ width: '100px', height: '18px', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>

        {/* Skeleton Main Content */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', padding: '16px', gap: '16px' }}>
           {/* Sidebar Skeleton */}
           <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
             {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="skeleton-box" style={{ width: '100%', height: '56px', borderRadius: '8px' }}></div>
             ))}
           </div>
           {/* Main Area Skeleton */}
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div className="skeleton-box" style={{ width: '100%', height: '120px', borderRadius: '12px' }}></div>
             <div className="skeleton-box" style={{ width: '100%', flex: 1, borderRadius: '12px' }}></div>
           </div>
        </div>
      </div>
    );
  }

  if (!forecast.materials || forecast.materials.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#EEF0F2', margin: '-28px', height: 'calc(100% + 56px)', color: '#5B6470' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No forecast data available</div>
        <div style={{ fontSize: '14px', marginBottom: '16px' }}>There is no forecast data for {selectedPlant?.name || 'this plant'}. Please run the seed script or click the button below.</div>
        
        <button 
          onClick={async () => {
            if (!selectedPlant?._id) return;
            try {
              setIsSeeding(true);
              const res = await forecastService.seed(selectedPlant._id);
              if (res.success) {
                showToast('Database seeded successfully!', 'success');
                forecast.refresh();
              }
            } catch (err) {
              console.error(err);
              showToast('Failed to seed database', 'error');
            } finally {
              setIsSeeding(false);
            }
          }}
          disabled={isSeeding}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: isSeeding ? '#ccc' : '#FF5E00', color: 'white', border: 'none', borderRadius: '4px', cursor: isSeeding ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          {isSeeding ? <Loader2 size={18} className="spinner" /> : <Database size={18} />}
          {isSeeding ? 'Seeding...' : 'Seed Database Now'}
        </button>
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
            4-week rolling demand &amp; supply plan · {dateRangeStr}
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
