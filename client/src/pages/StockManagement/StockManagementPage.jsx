import React, { useState, useMemo, useEffect } from 'react';
import { Download } from 'lucide-react';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { useToast } from '../../context/ToastContext/ToastContext';
import { getStock } from '../../services/stockService/stockService';
import { getDeliveries } from '../../services/deliveryService/deliveryService';
import { buildStock } from '../../utils/stockCalculator/stockCalculator';
import { DAYS, MATERIALS, HIGH_PCT, LOW_PCT } from '../../utils/constants/constants';
import { fmt, unit } from '../../utils/formatters/formatters';
import TypeTag from '../../components/ui/TypeTag/TypeTag';
import BreakdownTable from '../../components/tables/BreakdownTable/BreakdownTable';
import CustomDatePicker from '../../components/ui/CustomDatePicker';
import InfoDot from '../../components/ui/InfoDot/InfoDot';
import Modal from '../../components/ui/Modal/Modal';
import './StockManagementPage.css';

function LegendDot({ c, soft, label }) {
  return (
    <span className="stock-legend-item">
      <span
        className="stock-legend-dot"
        style={{ background: soft, border: `1.5px solid ${c}` }}
      />
      {label}
    </span>
  );
}

export default function StockManagementPage() {
  const { selectedPlant } = usePlant();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('2026-06-22');
  const [popup, setPopup] = useState(null);
  const [stockData, setStockData] = useState(null);

  const TABS = [
    { label: "Yesterday", date: "2026-06-21" },
    { label: "Today", date: "2026-06-22" },
    { label: "Tomorrow", date: "2026-06-23" },
  ];

  // Try API first, fall back to client-side calculation
  useEffect(() => {
    let cancelled = false;

    async function loadStock() {
      setStockData(null);
      try {
        // Try API
        const dayLabel = TABS.find(t => t.date === selectedDate)?.label || 'Today';
        const apiData = await getStock(selectedPlant.code, dayLabel);
        if (!cancelled && apiData) {
          setStockData(apiData);
          return;
        }
      } catch {
        // API failed, fall back to client-side
      }

      try {
        const deliveries = await getDeliveries(selectedPlant.code);
        if (!cancelled) {
          const computed = buildStock(deliveries, selectedPlant.code, selectedDate);
          setStockData(computed[selectedDate] || []);
        }
      } catch {
        if (!cancelled) {
          // Last resort: build with empty deliveries
          const computed = buildStock([], selectedPlant.code, selectedDate);
          setStockData(computed[selectedDate] || []);
        }
      }
    }

    loadStock();
    return () => { cancelled = true; };
  }, [selectedPlant.code, selectedDate]);

  const rows = stockData || [];

  const capColor = (r) => {
    const pct = r.closing / r.capacity;
    if (pct >= HIGH_PCT) return { tone: 'var(--red)', soft: 'var(--red-soft)' };
    if (pct <= LOW_PCT) return { tone: 'var(--amber)', soft: 'var(--amber-soft)' };
    return { tone: 'var(--green)', soft: 'var(--green-soft)' };
  };

  const openBreakdown = (r, col) => {
    if (col === 'pgrC') {
      setPopup({ title: `PGR Complete — ${r.material}`, kind: 'ibd', list: r.pgrCList || [], uom: r.uom });
    } else if (col === 'pgrP') {
      setPopup({ title: `PGR Pending — ${r.material}`, kind: 'ibd', list: r.pgrPList || [], uom: r.uom });
    } else if (col === 'cd') {
      setPopup({ title: `Customer Delivery — ${r.material}`, kind: 'cd', list: r.cdList || [], uom: r.uom });
    } else {
      setPopup({ title: `${col === 'open' ? 'Opening' : 'Closing'} Balance — ${r.material}`, kind: 'calc', r });
    }
  };

  const NumBtn = ({ r, col, value }) => (
    <button
      onClick={() => openBreakdown(r, col)}
      className={`stock-num-btn ${value === 0 ? 'stock-num-btn--zero' : 'stock-num-btn--nonzero'}`}
    >
      {fmt(value, r.uom)}
    </button>
  );

  const SkeletonRow = () => (
    <tr className="stock-skeleton-row" style={{ pointerEvents: 'none' }}>
      <td>
        <div className="stock-skeleton-box" style={{ width: '120px', marginBottom: '6px' }}></div>
        <div className="stock-skeleton-box" style={{ width: '80px', height: '14px' }}></div>
      </td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '50px', marginLeft: 'auto' }}></div></td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '50px', marginLeft: 'auto' }}></div></td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '50px', marginLeft: 'auto' }}></div></td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '50px', marginLeft: 'auto' }}></div></td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '60px', borderRadius: '8px', marginLeft: 'auto', height: '24px' }}></div></td>
      <td className="stock-td-right"><div className="stock-skeleton-box" style={{ width: '30px', marginLeft: 'auto' }}></div></td>
    </tr>
  );

  const cols = [
    ['Opening Balance', 'open', 'Stock on hand at start of day. Equals the previous day\'s closing balance.'],
    ['Inbound PGR Complete', 'pgrC', 'Quantity received AND goods-receipted in the ERP. This is official inventory.'],
    ['Inbound PGR Pending', 'pgrP', 'Quantity physically arrived but not yet goods-receipted in the ERP (awaiting correction/sync).'],
    ['Customer Delivery', 'cd', 'Quantity planned to be consumed / delivered out on this day. Subtracted from stock.'],
    ['Closing Balance', 'close', 'Opening + PGR Complete + PGR Pending − Customer Delivery.'],
  ];

  return (
    <div>
      <div className="stock-header">
        <div>
          <h1 className="stock-title">Stock Management</h1>
          <div className="stock-subtitle">
            Daily totals &amp; reconciliation · {selectedPlant.name} ({selectedPlant.code})
          </div>
        </div>
        <div className="stock-header-right">
          <div className="stock-day-tabs" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 140 }}>
              <CustomDatePicker 
                value={selectedDate} 
                onChange={setSelectedDate} 
              />
            </div>
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 2 }}>
              {TABS.map((t) => (
                <button
                  key={t.date}
                  onClick={() => setSelectedDate(t.date)}
                  className={`stock-day-tab ${selectedDate === t.date ? 'stock-day-tab--active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => toast('Export initiated — file will download shortly')} className="stock-btn-ghost">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      <div className="stock-legend">
        <LegendDot c="var(--green)" soft="var(--green-soft)" label="Healthy — can accommodate more stock" />
        <LegendDot c="var(--amber)" soft="var(--amber-soft)" label="Stock running low" />
        <LegendDot c="var(--red)" soft="var(--red-soft)" label="Reached maximum capacity" />
        <span className="stock-legend-click-hint">
          <span className="stock-legend-click-num">1,200</span> click any number for its breakdown
        </span>
      </div>

      <div className="stock-card">
        <div className="stock-card-title">Daily Totals — {selectedDate}</div>
        <div className="stock-scroll">
          <table className="stock-table">
            <thead>
              <tr>
                <th className="stock-th-material">Material</th>
                {cols.map(([label, key, info]) => (
                  <th key={key} className="stock-th-right">
                    <span className="stock-th-inner">
                      {label} <InfoDot text={info} />
                    </span>
                  </th>
                ))}
                <th className="stock-th-right">UoM</th>
              </tr>
            </thead>
            <tbody>
              {!stockData && Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)}
              {rows.map((r) => {
                const cc = capColor(r);
                return (
                  <tr key={r.material}>
                    <td>
                      <div className="stock-material-name">{r.material}</div>
                      <div className="stock-material-type"><TypeTag type={r.type} /></div>
                    </td>
                    <td className="stock-td-right"><NumBtn r={r} col="open" value={r.opening} /></td>
                    <td className="stock-td-right"><NumBtn r={r} col="pgrC" value={r.pgrC} /></td>
                    <td className="stock-td-right"><NumBtn r={r} col="pgrP" value={r.pgrP} /></td>
                    <td className="stock-td-right"><NumBtn r={r} col="cd" value={r.cd} /></td>
                    <td className="stock-td-right">
                      <span className="stock-closing" style={{ background: cc.soft, color: cc.tone }}>
                        <button
                          onClick={() => openBreakdown(r, 'close')}
                          className="stock-closing-btn"
                          style={{ color: cc.tone }}
                        >
                          {fmt(r.closing, r.uom)}
                        </button>
                      </span>
                    </td>
                    <td className="stock-td-right">{unit(r.uom)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stock-footer-note">
        Each day's opening balance equals the previous day's closing balance. Inbound quantities land on the day the delivery is received.
      </div>

      {popup && (
        <Modal title={popup.title} onClose={() => setPopup(null)}>
          {popup.kind === 'ibd' && (
            popup.list.length === 0
              ? <div className="stock-empty-msg">No inbound deliveries contribute to this figure for the selected day.</div>
              : <BreakdownTable
                  head={['IBD No.', 'PO No.', 'Supplier', 'Qty']}
                  rows={popup.list.map((x) => [x.ibd, x.po, x.supplier, fmt(x.qty, popup.uom) + ' ' + unit(popup.uom)])}
                  total={fmt(popup.list.reduce((s, x) => s + x.qty, 0), popup.uom) + ' ' + unit(popup.uom)}
                />
          )}
          {popup.kind === 'cd' && (
            popup.list.length === 0
              ? <div className="stock-empty-msg">No planned customer deliveries for this day.</div>
              : <BreakdownTable
                  head={['Booking', 'Qty']}
                  rows={popup.list.map((x) => [x[0], fmt(x[1], popup.uom) + ' ' + unit(popup.uom)])}
                  total={fmt(popup.list.reduce((s, x) => s + x[1], 0), popup.uom) + ' ' + unit(popup.uom)}
                />
          )}
          {popup.kind === 'calc' && (
            <div style={{ fontSize: 14 }}>
              {[
                ['Opening Balance', fmt(popup.r.opening, popup.r.uom), 'var(--ink)'],
                ['+ Inbound PGR Complete', fmt(popup.r.pgrC, popup.r.uom), 'var(--green)'],
                ['+ Inbound PGR Pending', fmt(popup.r.pgrP, popup.r.uom), '#9C6B00'],
                ['− Customer Delivery', fmt(popup.r.cd, popup.r.uom), 'var(--red)'],
              ].map(([k, v, c]) => (
                <div key={k} className="stock-calc-line">
                  <span className="stock-calc-line-label">{k}</span>
                  <span className="stock-calc-line-value" style={{ color: c }}>{v} {unit(popup.r.uom)}</span>
                </div>
              ))}
              <div className="stock-calc-total">
                <span>Closing Balance</span>
                <span className="stock-calc-total-value">{fmt(popup.r.closing, popup.r.uom)} {unit(popup.r.uom)}</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
