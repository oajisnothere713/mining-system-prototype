import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext/ToastContext';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { getDeliveryById, confirmPGR, receivePhysical } from '../../services/deliveryService/deliveryService';
import { MATERIALS } from '../../utils/constants/constants';
import { fmt, unit } from '../../utils/formatters/formatters';
import Pill from '../../components/ui/Pill/Pill';
import TypeTag from '../../components/ui/TypeTag/TypeTag';
import Banner from '../../components/ui/Banner/Banner';
import './DeliveryDetailPage.css';

function ibdStatus(d) {
  switch (d.state) {
    case 'complete': return 'PGR Complete';
    case 'physical_pending': return 'PGR Pending';
    case 'in_transit': return 'In Transit';
    case 'mismatch': return 'Qty Mismatch';
    default: return 'Awaiting PGR';
  }
}

export default function DeliveryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlant } = usePlant();
  const [delivery, setDelivery] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDeliveryById(id)
      .then((data) => {
        setDelivery(data);
        setLines(data.lines.map((l) => ({ ...l })));
      })
      .catch(() => {
        // If API fails, just stay on loading
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <button onClick={() => navigate('/deliveries')} className="detail-back-btn">
          <ArrowLeft size={15} /> Back to Inbound Delivery
        </button>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate)' }}>Loading delivery...</div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div>
        <button onClick={() => navigate('/deliveries')} className="detail-back-btn">
          <ArrowLeft size={15} /> Back to Inbound Delivery
        </button>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--slate)' }}>Delivery not found.</div>
      </div>
    );
  }

  const done = delivery.state === 'complete';
  const physical = delivery.state === 'physical_pending';

  const setRecv = (i, v) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, received: parseFloat(v) || 0 } : l)));

  const lineMatch = (l) => +(+l.received - +l.expected).toFixed(3) === 0;
  const allMatch = lines.every(lineMatch);

  const handleConfirmPGR = async () => {
    try {
      await confirmPGR(delivery.id, lines);
      toast(`Goods Receipt posted for ${delivery.id} · stock updated to PGR Complete`);
      navigate('/deliveries');
    } catch {
      toast('Failed to confirm PGR');
    }
  };

  const handleReceivePhysical = async () => {
    try {
      await receivePhysical(delivery.id, lines);
      toast(`${delivery.id} physically received · shown as PGR Pending in stock`);
      navigate('/deliveries');
    } catch {
      toast('Failed to receive physically');
    }
  };

  const chainItems = [
    ['Purchase Order', delivery.po, 'var(--blue)', 'var(--blue-soft)'],
    ['Inbound Delivery', delivery.id, 'var(--orange)', 'var(--orange-soft)'],
    ['Goods Receipt', done ? 'Posted' : 'Pending', done ? 'var(--green)' : 'var(--slate)', done ? 'var(--green-soft)' : '#F1F3F5'],
  ];

  return (
    <div>
      <button onClick={() => navigate('/deliveries')} className="detail-back-btn">
        <ArrowLeft size={15} /> Back to Inbound Delivery
      </button>

      <div className="detail-header">
        <h1 className="detail-title">{delivery.id}</h1>
        <Pill status={ibdStatus(delivery)} />
      </div>

      <div className="detail-subtitle">
        Linked to <b>{delivery.po}</b> (raised {delivery.poDate}) · {delivery.supplier} · arriving {delivery.date}
      </div>

      <div className="detail-chain">
        {chainItems.map(([k, v, c, s], i) => (
          <div key={k} className="detail-chain-item">
            <div className="detail-chain-badge" style={{ background: s, color: c }}>
              <span className="detail-chain-badge-label">{k}: </span>{v}
            </div>
            {i < 2 && <span className="detail-chain-arrow">→</span>}
          </div>
        ))}
      </div>

      <div className="detail-card">
        <div className="detail-card-title">Goods Receipt — Line Items</div>
        <table className="detail-table">
          <thead>
            <tr>
              {['Material', 'Type', 'Expected', 'Received', 'UoM', 'Quantities Match'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const m = MATERIALS[l.material] || { type: 'Bulk', uom: 't' };
              const match = lineMatch(l);
              const variance = +(+l.received - +l.expected).toFixed(2);
              return (
                <tr key={i}>
                  <td className="detail-material-name">{l.material}</td>
                  <td><TypeTag type={m.type} /></td>
                  <td>{fmt(l.expected, m.uom)}</td>
                  <td>
                    <input
                      type="number"
                      value={l.received}
                      disabled={done || physical}
                      onChange={(e) => setRecv(i, e.target.value)}
                      className="detail-recv-input"
                      style={{
                        border: `1px solid ${match ? 'var(--line)' : 'var(--red)'}`,
                        background: (done || physical) ? 'var(--bg)' : '#fff',
                      }}
                    />
                  </td>
                  <td>{unit(m.uom)}</td>
                  <td>
                    {match ? (
                      <span className="detail-match">
                        <CheckCircle2 size={16} /> Match
                      </span>
                    ) : (
                      <span className="detail-mismatch">
                        <XCircle size={16} /> {variance > 0 ? '+' : ''}{fmt(variance, m.uom)} {unit(m.uom)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="detail-actions">
          {done ? (
            <Banner color="var(--green)" soft="var(--green-soft)" icon={CheckCircle2}>
              Goods Receipt posted to ERP · Inventory updated as PGR Complete
            </Banner>
          ) : physical ? (
            <Banner color="#9C6B00" soft="var(--amber-soft)" icon={AlertTriangle}>
              Physically received and reflected in stock as <b>PGR Pending</b>. PGR is blocked due to a quantity variance — supply chain must reverse this IBD and re-issue a corrected one in the ERP. Use <b>Sync with ERP</b> on the dashboard to fetch the corrected delivery.
            </Banner>
          ) : !allMatch ? (
            <>
              <Banner color="var(--red)" soft="var(--red-soft)" icon={AlertTriangle}>
                One or more lines do not match the expected quantity. Goods Receipt cannot be posted. Either correct the entry, or record the physical arrival and let supply chain re-issue a corrected IBD in the ERP.
              </Banner>
              <div className="detail-action-buttons">
                <button disabled className="detail-btn-solid detail-btn-blocked">
                  <ClipboardCheck size={18} /> Confirm Goods Receipt (blocked)
                </button>
                <button onClick={handleReceivePhysical} className="detail-btn-solid detail-btn-physical">
                  <Package size={18} /> Receive Physically (PGR Pending)
                </button>
              </div>
            </>
          ) : (
            <>
              <Banner color="var(--blue)" soft="var(--blue-soft)" icon={Info}>
                All lines match the expected quantities. On confirmation, a Goods Receipt posts to ERP and stock updates in real time as PGR Complete — no SAP GUI needed.
              </Banner>
              <button onClick={handleConfirmPGR} className="detail-btn-solid detail-btn-confirm">
                <ClipboardCheck size={18} /> Confirm Goods Receipt
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
