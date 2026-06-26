import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Truck,
  ClipboardCheck,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Download,
  RefreshCw,
} from 'lucide-react';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { useToast } from '../../context/ToastContext/ToastContext';
import useDeliveries from '../../hooks/useDeliveries/useDeliveries';
import Pill from '../../components/ui/Pill/Pill';
import Select from '../../components/ui/Select/Select';
import Field from '../../components/ui/Field/Field';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import './InboundDeliveryPage.css';

function ibdStatus(d) {
  switch (d.state) {
    case 'complete': return 'PGR Complete';
    case 'physical_pending': return 'PGR Pending';
    case 'in_transit': return 'In Transit';
    case 'mismatch': return 'Qty Mismatch';
    default: return 'Awaiting PGR';
  }
}

export default function InboundDeliveryPage() {
  const navigate = useNavigate();
  const { selectedPlant } = usePlant();
  const { toast } = useToast();
  const { deliveries, loading, fetchDeliveries, syncERP } = useDeliveries();
  const [q, setQ] = useState('');
  const [sf, setSf] = useState('All');
  const [df, setDf] = useState('');
  const [showF, setShowF] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDeliveries(selectedPlant.code);
  }, [selectedPlant.code, fetchDeliveries]);

  const rows = deliveries.filter((d) => d.plant === selectedPlant.code && !d.hidden);

  const counts = useMemo(() => ({
    total: rows.length,
    transit: rows.filter((d) => d.state === 'in_transit').length,
    pending: rows.filter((d) => d.state === 'physical_pending').length,
    awaiting: rows.filter((d) => d.state === 'awaiting').length,
    complete: rows.filter((d) => d.state === 'complete').length,
  }), [rows]);

  const cards = [
    { label: 'Total Deliveries', val: counts.total, icon: Boxes, soft: '#F1F3F5', color: 'var(--ink)' },
    { label: 'In Transit', val: counts.transit, icon: Truck, soft: 'var(--blue-soft)', color: 'var(--blue)' },
    { label: 'Awaiting / Pending PGR', val: counts.awaiting + counts.pending, icon: ClipboardCheck, soft: 'var(--amber-soft)', color: '#9C6B00' },
    { label: 'PGR Complete', val: counts.complete, icon: CheckCircle2, soft: 'var(--green-soft)', color: 'var(--green)' },
  ];

  const filtered = rows.filter((d) => {
    const hay = (d.id + d.po + d.supplier + d.lines.map((l) => l.material).join(' ')).toLowerCase();
    
    let dfFormatted = '';
    if (df) {
      const [y, m, day] = df.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dfFormatted = `${day} ${months[parseInt(m, 10) - 1]} ${y}`;
    }

    return (!q || hay.includes(q.toLowerCase())) && 
           (sf === 'All' || ibdStatus(d) === sf) &&
           (!df || d.date === dfFormatted);
  });

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncERP(selectedPlant.code);
    setSyncing(false);
    if (result) {
      toast(result.changed ? 'Synced with ERP · corrected delivery received, PGR now enabled' : 'Synced with ERP · no changes');
    }
  };

  const SkeletonRow = () => (
    <tr className="skeleton-row" style={{ pointerEvents: 'none' }}>
      <td><div className="skeleton-box" style={{ width: '80px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '90px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '80px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '80px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '140px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '60px' }}></div></td>
      <td><div className="skeleton-box" style={{ width: '90px', borderRadius: '100px' }}></div></td>
    </tr>
  );

  return (
    <div>
      <div className="ibd-page-header">
        <div>
          <h1 className="ibd-page-title">Inbound Delivery</h1>
          <div className="ibd-page-subtitle">
            Deliveries against purchase orders · {selectedPlant.name} ({selectedPlant.code}) · {selectedPlant.region}
          </div>
        </div>
        <button onClick={handleSync} className="ibd-sync-btn">
          <RefreshCw size={15} /> Sync with ERP
        </button>
      </div>

      <div className="ibd-cards">
        {cards.map((c) => (
          <div key={c.label} className="ibd-card">
            <div className="ibd-card-icon" style={{ background: c.soft }}>
              <c.icon size={18} style={{ color: c.color }} />
            </div>
            {loading ? (
              <div className="skeleton-box" style={{ height: 28, width: 40, marginTop: 4, marginBottom: 5 }}></div>
            ) : (
              <div className="ibd-card-value">{c.val}</div>
            )}
            <div className="ibd-card-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="ibd-toolbar">
        <div className="ibd-search-box">
          <Search size={16} className="ibd-search-icon" />
          <input
            className="ibd-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by IBD, PO, supplier or material"
          />
        </div>
        <button
          onClick={() => setShowF((v) => !v)}
          className={`ibd-btn-ghost ${showF ? 'ibd-btn-ghost--active' : ''}`}
        >
          <SlidersHorizontal size={15} /> Filters
        </button>
        <button
          onClick={() => toast('Export initiated — file will download shortly')}
          className="ibd-btn-ghost"
        >
          <Download size={15} /> Export
        </button>
      </div>

      {showF && (
        <div className="ibd-filter-panel">
          <Field label="Status">
            <Select
              value={sf}
              onChange={setSf}
              options={['All', 'Awaiting PGR', 'Qty Mismatch', 'PGR Pending', 'In Transit', 'PGR Complete']}
            />
          </Field>
          <Field label="Date">
            <CustomDatePicker
              value={df}
              onChange={(val) => setDf(val)}
              placeholder="dd-mm-yyyy"
            />
          </Field>
          <button onClick={() => { setSf('All'); setQ(''); setDf(''); }} className="ibd-filter-clear">
            Clear all
          </button>
        </div>
      )}

      <div className="ibd-table-wrapper">
        <table className="ibd-table">
          <thead>
            <tr>
              {['IBD No.', 'PO No.', 'PO Date', 'Delivery Date', 'Supplier', 'Line Items', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(loading || syncing) && Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)}
            {!(loading || syncing) && filtered.map((d) => (
              <tr key={d.id} onClick={() => navigate(`/deliveries/${d.id}`)}>
                <td className="ibd-id">{d.id}</td>
                <td className="ibd-po">{d.po}</td>
                <td>{d.poDate}</td>
                <td>{d.date}</td>
                <td>{d.supplier}</td>
                <td>{d.lines.length} item{d.lines.length > 1 ? 's' : ''}</td>
                <td><Pill status={ibdStatus(d)} /></td>
              </tr>
            ))}
            {!(loading || syncing) && filtered.length === 0 && (
              <tr className="ibd-empty-row">
                <td colSpan={7}>
                  No deliveries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
