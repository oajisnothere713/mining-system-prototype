import React, { useState } from 'react';
import './SchedulePage.css';
import CrewPlanner from './CrewPlanner';
import FleetPlanner from './FleetPlanner';
import BookingForm from './BookingForm';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { useToast } from '../../context/ToastContext/ToastContext';
import { fetchBookings, getBookings, PRODUCT_MAP, SERVICE_MAP, deleteBooking, updateBooking, isVehicleConflicted, isPersonConflicted, CREW_GROUPS_BY_PLANT, CREW_MAP, VEHICLE_GROUPS_BY_PLANT } from './bookingStore';

const O="#E8590C", OS="#FFF1E8", INK="#1A1D21", SL="#5B6470", LN="#E6E9ED", BG="#F7F8FA", WT="#fff", COLHEAD="#EEF1F5", FLEETCOL="#F4F6F9";
const GR="#2F9E44", GRS="#EBFBEE", AM="#F08C00", AMS="#FFF9DB", BL="#1971C2", BLS="#E7F5FF", RD="#E03131", RDS="#FFF0F0", SLS="#EEF0F2";

const STATUS = {
  Planned: { fg: BL, bg: BLS, dot: BL },
  "In Progress": { fg: "#9C6B00", bg: AMS, dot: AM },
  Delivered: { fg: GR, bg: GRS, dot: GR },
  Submitted: { fg: SL, bg: SLS, dot: SL },
  Cancelled: { fg: RD, bg: RDS, dot: RD }
};

const ORDER = ["Planned", "In Progress", "Delivered", "Submitted"];



// B array will now be computed dynamically.

function initStr(n) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function people(b) { return [].concat(b.operators || [], b.crew || []); }
function shortProd(b) {
  const p = (b.products || []).map(x => `${x[0]} ${x[1]}${x[2] === "t" ? "t" : ""}`);
  if ((b.services || []).length && !p.length) return b.services[0][0];
  return p.join(" · ");
}

const WeekPicker = ({ currentBase, onChange }) => {
  const [viewDate, setViewDate] = useState(new Date(currentBase));

  const weeks = React.useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1);
    let startDay = firstDay.getDay() || 7;
    const start = new Date(firstDay);
    start.setDate(1 - (startDay - 1));

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    
    const wks = [];
    for (let i = 0; i < 42; i += 7) {
      wks.push(days.slice(i, i + 7));
    }
    return wks;
  }, [viewDate]);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div style={{ position: 'absolute', top: 42, left: 0, background: '#fff', border: `1px solid ${LN}`, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.1)', padding: 16, zIndex: 100, width: 280 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: SL }}><i className="ti ti-chevron-left"></i></button>
        <span style={{ fontWeight: 700, fontSize: 14, color: INK }}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: SL }}><i className="ti ti-chevron-right"></i></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 11, fontWeight: 700, color: SL, marginBottom: 8 }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {weeks.map((week, i) => {
          const isActive = week.some(d => d.getFullYear() === currentBase.getFullYear() && d.getMonth() === currentBase.getMonth() && d.getDate() === currentBase.getDate());
          
          return (
            <div 
              key={i} 
              onClick={() => onChange(week[0])}
              style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', cursor: 'pointer', 
                background: isActive ? OS : 'transparent',
                borderRadius: 6,
                padding: '2px 0'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f5f7f9'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {week.map((d, j) => {
                const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                const isToday = new Date().toDateString() === d.toDateString();
                return (
                  <div key={j} style={{ 
                    padding: '6px 0', textAlign: 'center', fontSize: 13, fontWeight: 500,
                    color: isActive ? O : isCurrentMonth ? INK : '#ced4da',
                  }}>
                    <span style={{
                      display: 'inline-block', width: 24, height: 24, lineHeight: '24px', borderRadius: '50%',
                      border: isToday && !isActive ? `1px solid ${O}` : '1px solid transparent'
                    }}>
                      {d.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export default function SchedulePage() {
  const [tab, setTab] = useState("Schedule");
  const [workingWeek, setWorkingWeek] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [mode, setMode] = useState("fleet");
  const [collapsed, setCollapsed] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [baseDate, setBaseDate] = useState(getMonday(new Date()));
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  const { selectedPlant } = usePlant();
  const plantCode = selectedPlant?.code || "2025";
  const plantName = selectedPlant?.name || "Panna";
  const plantRegion = selectedPlant?.region || "Madhya Pradesh";

  const VGROUPS = React.useMemo(() => {
    return (VEHICLE_GROUPS_BY_PLANT[plantCode] || []).map(g => ({
      type: g.type,
      hint: g.hint,
      icon: g.type.includes("Crew") ? "ti-truck" : g.type.includes("Support") ? "ti-car-crane" : "ti-truck-loading",
      img: g.type.includes("Crew") ? "/images/crew_vehicle.png" : g.type.includes("Support") ? "/images/support_truck.png" : "/images/bmd_truck.png",
      lanes: (g.ids || []).map(id => ({ id, s: "active" }))
    }));
  }, [plantCode]);

  const CGROUPS = React.useMemo(() => {
    return (CREW_GROUPS_BY_PLANT[plantCode] || []).map(g => ({
      type: g.role,
      hint: g.hint,
      icon: "ti-user",
      lanes: g.members.map(m => ({ id: m.id, name: m.name }))
    }));
  }, [plantCode]);

  React.useEffect(() => {
    fetchBookings().then(() => {
      setRefreshKey(k=>k+1);
      setLoading(false);
    });

    const handleRollback = (e) => {
      if (addToast) addToast(e.detail || "Optimistic update failed. Changes reverted.", "error");
      setRefreshKey(k => k + 1);
      setActivePanel(null); // Close panel to avoid showing stale data
    };
    window.addEventListener('booking-rollback', handleRollback);
    return () => window.removeEventListener('booking-rollback', handleRollback);
  }, []);



  const B = React.useMemo(() => {
    const raw = getBookings().filter(b => b.plantCode === plantCode);
    const flattened = [];

    const generateDates = (b) => {
      return [b.date];
    };

    raw.forEach(b => {
      const datesToRender = generateDates(b);
      
      (b.deliveryDockets || []).forEach(dk => {
        const cParts = (b.customerName || b.customerId || "").split(" ");
        const baseItem = {
          id: b.blastNumber, // Shared ID for the linked series
          time: b.startTime,
          vehicle: dk.vehicleId,
          customer: cParts.length > 1 ? cParts[0] + " " + cParts[1] : cParts[0],
          customerFull: b.customerName || b.customerId,
          site: b.shipToSite,
          po: b.customerPO,
          operators: dk.operatorIds || [],
          crew: dk.shotfirerIds || [],
          products: (dk.products || []).filter(p=>p.materialId).map(p => {
             const m = PRODUCT_MAP[p.materialId];
             return [m ? m.name : p.materialId, p.plannedQty || p.qty, m ? m.uom : ""];
          }),
          services: (dk.services || []).filter(s=>s.serviceId).map(s => {
             const m = SERVICE_MAP[s.serviceId];
             return [m ? m.name : s.serviceId, s.qty, m ? m.uom : ""];
          }),
          notes: dk.notes || "",
          status: b.status || "Planned",
          dkStatus: dk.status || "Planned",
          multiDay: b.bookingType === "multi" ? { from: b.date, to: b.endDate } : null,
          recurrence: b.bookingType === "recurring" ? (b.recurrence?.frequency || b.recFreq) : null
        };

        datesToRender.forEach(d => {
           flattened.push({ ...baseItem, date: d });
        });
      });
    });
    return flattened;
  }, [refreshKey, plantCode]);

  React.useEffect(() => {
    setActivePanel(prev => {
      if (!prev) return prev;
      const updated = B.find(b => b.id === prev.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(prev)) {
        return updated;
      }
      return prev;
    });
  }, [B]);

  const fullWeek = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const today = new Date();
      const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      result.push({ k: `${yyyy}-${mm}-${dd}`, dow: days[d.getDay()], d: dd, we: isWeekend, today: isToday });
    }
    return result;
  }, [baseDate]);

  const groupsList = mode === "fleet" ? VGROUPS : CGROUPS;
  const activeWeek = workingWeek ? fullWeek.filter(d => !d.we) : fullWeek;
  const dayIndex = (k) => activeWeek.findIndex(d => d.k === k);

  const toggleGroup = (t) => {
    setCollapsed(prev => ({ ...prev, [t]: !prev[t] }));
  };

  const getLaneBookings = (laneId) => {
    const belongs = b => mode === "fleet" ? b.vehicle === laneId : people(b).indexOf(laneId) >= 0;
    const mine = B.filter(belongs);
    const single = {};
    mine.filter(b => !b.multiDay).forEach(b => {
      if (!single[b.date]) single[b.date] = [];
      single[b.date].push(b);
    });
    Object.values(single).forEach(l => l.sort((a, z) => a.time.localeCompare(z.time)));
    const multis = mine.filter(b => {
      if (!b.multiDay) return false;
      const wkStart = activeWeek[0].k;
      const wkEnd = activeWeek[activeWeek.length - 1].k;
      return b.multiDay.from <= wkEnd && b.multiDay.to >= wkStart;
    });
    return { single, multis };
  };

  const groupCount = (g) => {
    const ids = g.lanes.map(l => l.id);
    return B.filter(b => {
      const belongs = mode === "fleet" ? ids.indexOf(b.vehicle) >= 0 : people(b).some(p => ids.indexOf(p) >= 0);
      if (!belongs) return false;
      if (b.multiDay) {
        const wkStart = activeWeek[0].k;
        const wkEnd = activeWeek[activeWeek.length - 1].k;
        return b.multiDay.from <= wkEnd && b.multiDay.to >= wkStart;
      }
      return dayIndex(b.date) >= 0;
    }).length;
  };

  // ─── CARD COMPONENT ─────────────────────────────
  const Card = ({ b, spanning }) => {
    const s = STATUS[b.status];
    const pp = people(b);
    let hasClash = false;
    if (["Planned", "In Progress"].includes(b.status)) {
       const d = new Date(b.date);
       const e = b.multiDay ? new Date(b.multiDay.to) : new Date(b.date);
       for (let curr = new Date(d); curr <= e; curr.setDate(curr.getDate() + 1)) {
         const k = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
         if (b.vehicle && isVehicleConflicted(b.vehicle, k)) { hasClash = true; break; }
         if (pp.some(p => isPersonConflicted(p, k))) { hasClash = true; break; }
       }
    }
    return (
      <div 
        className="bk-card"
        onClick={() => setActivePanel(b)}
        style={{
          background: spanning ? `linear-gradient(90deg, #fff, #FFF8F3)` : WT,
          border: `1px solid ${spanning ? O : LN}`,
          borderLeft: `4px solid ${s.dot}`,
          borderRadius: 8,
          padding: '8px 10px',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <i className="ti ti-clock" style={{ fontSize: 11, color: SL }}></i>{b.time}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: s.fg, background: s.bg, padding: '2px 7px', borderRadius: 100, whiteSpace: 'nowrap' }}>
              {b.status}
            </span>
            {b.dkStatus?.toLowerCase() === "submitted" && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#2B8A3E', background: '#EBFBEE', border: '1px solid #B2F2BB', padding: '2px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <i className="ti ti-check" style={{ fontSize: 10, strokeWidth: 3 }}></i> Submitted
              </span>
            )}
          </div>
        </div>
        
        {(b.recurrence || b.multiDay) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 600, color: O, background: OS, padding: '2px 6px', borderRadius: 5, marginBottom: 5 }}>
            <i className={`ti ${b.multiDay ? "ti-arrow-right" : "ti-repeat"}`} style={{ fontSize: 10 }}></i>
            {b.multiDay ? `Multi-day · ${b.multiDay.from.slice(8)}–${b.multiDay.to.slice(8)} Jun` : b.recurrence}
          </div>
        )}
        
        <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, lineHeight: 1.25, marginBottom: 1 }}>
          {b.customer}
        </div>
        
        <div style={{ fontSize: 11, color: SL, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
          <i className="ti ti-map-pin" style={{ fontSize: 10 }}></i>{b.site}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, color: O, fontWeight: 700 }}>
            {b.id}
          </div>
          {hasClash && (
            <div title="Double-booked — vehicle or operator clashes with another blast on this date" style={{ fontSize: 9.5, fontWeight: 700, color: '#9C6B00', background: '#FFF9DB', border: '1px solid #F08C00', borderRadius: 4, padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'help' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 10 }}></i> Clash
            </div>
          )}
        </div>
        
        {shortProd(b) && (
          <div style={{ fontSize: 10, color: SL, background: BG, borderRadius: 4, padding: '3px 6px', marginBottom: 6, display: 'inline-block' }}>
            {shortProd(b)}
          </div>
        )}
        
        {mode === "fleet" ? (
          pp.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-users" style={{ fontSize: 12, color: SL }}></i>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {pp.slice(0, 3).map((p, i) => {
                  const name = CREW_MAP[p] ? CREW_MAP[p].name : p;
                  return (
                    <span key={i} title={name} style={{ width: 19, height: 19, borderRadius: '50%', background: i % 2 ? "#D8DEE6" : "#C7CFDA", color: "#3A4350", fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${WT}`, marginLeft: i ? -5 : 0 }}>
                      {initStr(name)}
                    </span>
                  );
                })}
                {pp.length > 3 && <span style={{ fontSize: 9.5, color: SL, marginLeft: 4 }}>+{pp.length - 3}</span>}
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, color: INK, background: BG, borderRadius: 5, padding: '3px 7px' }}>
            <i className="ti ti-truck" style={{ fontSize: 12, color: O }}></i>{b.vehicle}
          </div>
        )}
      </div>
    );
  };

  // ─── PANEL COMPONENT ──────────────────────────
  const Panel = ({ b, onClose }) => {
    if (!b) return null;
    const s = STATUS[b.status] || STATUS["Planned"];
    const ci = ORDER.indexOf(b.status);
    const pl = [
      ...(b.operators || []).map(p => ({ n: CREW_MAP[p] ? CREW_MAP[p].name : p, r: "BMD Operator" })), 
      ...(b.crew || []).map(p => ({ n: CREW_MAP[p] ? CREW_MAP[p].name : p, r: "Blaster / Shotfirer" }))
    ];

    const btnBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
    const gb = { ...btnBase, background: '#fff', border: `1px solid ${LN}`, color: INK };
    const sb = { ...btnBase, border: 'none', color: '#fff' };

    return (
      <>
        <div className="panel-overlay" onClick={onClose}></div>
        <div className="panel-content">
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${LN}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: SL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Blast Number</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK, letterSpacing: -0.4 }}>{b.id}</div>
              </div>
              <button onClick={onClose} style={{ background: BG, border: 'none', cursor: 'pointer', color: SL, width: 32, height: 32, borderRadius: 8, fontSize: 18 }}>&times;</button>
            </div>
            {(b.recurrence || b.multiDay) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: O, background: OS, padding: '4px 10px', borderRadius: 6, marginTop: 10 }}>
                <i className={`ti ${b.multiDay ? "ti-arrow-right" : "ti-repeat"}`}></i>
                {b.multiDay ? `Multi-day booking · ${b.multiDay.from.slice(8)}–${b.multiDay.to.slice(8)} Jun 2026` : `Recurring · ${b.recurrence}`}
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              {ORDER.map((st, i) => {
                const done = i <= ci;
                const active = i === ci;
                return (
                  <React.Fragment key={st}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: done ? STATUS[st].dot : '#fff', border: `2px solid ${done ? STATUS[st].dot : LN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>
                        {done && "✓"}
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, color: active ? STATUS[st].fg : done ? INK : SL, textAlign: 'center', maxWidth: 54, lineHeight: 1.2 }}>{st}</span>
                    </div>
                    {i < ORDER.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: i < ci ? STATUS[ORDER[i + 1]].dot : LN, marginTop: -18 }}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: SL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Delivery</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}>
                <span style={{ color: SL }}>Status</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}><span style={{ fontSize: 12, fontWeight: 700, color: s.fg, background: s.bg, padding: '3px 10px', borderRadius: 100 }}>{b.status}</span></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}>
                <span style={{ color: SL }}>{b.multiDay ? "Dates" : "Date & Time"}</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}>{b.multiDay ? `${b.multiDay.from.slice(8)}–${b.multiDay.to.slice(8)} Jun · ${b.time}` : `${b.date.slice(8)} Jun 2026 · ${b.time}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}>
                <span style={{ color: SL }}>Vehicle</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}>{b.vehicle}</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: SL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Customer</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}><span style={{ color: SL }}>Sold-to</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}>{b.customerFull}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}><span style={{ color: SL }}>Ship-to Site</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}>{b.site}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${BG}`, fontSize: 13 }}><span style={{ color: SL }}>Customer PO</span><span style={{ color: INK, fontWeight: 600, textAlign: 'right' }}>{b.po}</span></div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: SL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Crew ({pl.length})</div>
              {pl.length === 0 ? (
                <div style={{ fontSize: 13, color: SL }}>No crew assigned</div>
              ) : (
                pl.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#C7CFDA', color: '#3A4350', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initStr(p.n)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{p.n}</div>
                      <div style={{ fontSize: 11.5, color: SL }}>{p.r}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: SL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Docket Notes</div>
              <div style={{ fontSize: 13, color: INK, padding: '7px 0', lineHeight: 1.5 }}>
                {b.notes ? b.notes : "—"}
              </div>
            </div>

            {((b.products && b.products.length > 0) || (b.services && b.services.length > 0)) && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 10.5, color: SL, fontWeight: 700, textTransform: 'uppercase', padding: '0 0 6px' }}>Item</th>
                    <th style={{ textAlign: 'right', fontSize: 10.5, color: SL, fontWeight: 700, textTransform: 'uppercase', padding: '0 0 6px' }}>Planned</th>
                    {["Delivered", "Submitted"].includes(b.status) && <th style={{ textAlign: 'right', fontSize: 10.5, color: SL, fontWeight: 700, textTransform: 'uppercase', padding: '0 0 6px' }}>Actual</th>}
                  </tr>
                </thead>
                <tbody>
                  {(b.products || []).map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BG}` }}>
                      <td style={{ fontSize: 12.5, color: SL, padding: '7px 0' }}>{r[0]}</td>
                      <td style={{ fontSize: 12.5, textAlign: 'right', fontWeight: 600, color: INK, padding: '7px 0' }}>{r[1]} {r[2]}</td>
                      {["Delivered", "Submitted"].includes(b.status) && <td style={{ fontSize: 12.5, textAlign: 'right', fontWeight: 600, color: GR, padding: '7px 0' }}>{r[1]} {r[2]}</td>}
                    </tr>
                  ))}
                  {(b.services || []).map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BG}` }}>
                      <td style={{ fontSize: 12.5, color: SL, padding: '7px 0' }}>{r[0]}</td>
                      <td style={{ fontSize: 12.5, textAlign: 'right', fontWeight: 600, color: INK, padding: '7px 0' }}>{r[1]} {r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div style={{ padding: '16px 22px', borderTop: `1px solid ${LN}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {b.status === "Planned" && (
              <>
                <button onClick={() => { updateBooking(b.id, { status: "In Progress" }); setRefreshKey(k=>k+1); setActivePanel({...b, status: "In Progress"}); }} style={{ ...sb, background: O, width: '100%' }}><i className="ti ti-send"></i> Submit Delivery</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setEditingBookingId(b.id); setShowBookingForm(true); }} style={{ ...gb, flex: 1, padding: '11px 0' }}><i className="ti ti-pencil"></i> Edit Booking</button>
                  <button onClick={() => { updateBooking(b.id, { status: "Cancelled" }); setRefreshKey(k=>k+1); setActivePanel(null); }} style={{ ...gb, flex: 1, color: '#9C6B00', borderColor: '#F08C00', padding: '11px 0' }}><i className="ti ti-ban"></i> Cancel Booking</button>
                </div>
                <button onClick={() => { deleteBooking(b.id); setRefreshKey(k=>k+1); setActivePanel(null); }} style={{ ...gb, width: '100%', color: '#E03131', borderColor: '#E03131' }}><i className="ti ti-trash"></i> Delete Booking</button>
              </>
            )}
            {b.status === "In Progress" && (
              <>
                <button onClick={() => { updateBooking(b.id, { status: "Delivered" }); setRefreshKey(k=>k+1); setActivePanel({...b, status: "Delivered"}); }} style={{ ...sb, background: AM, width: '100%' }}><i className="ti ti-check"></i> Mark as Delivered</button>
                <button onClick={() => { updateBooking(b.id, { status: "Cancelled" }); setRefreshKey(k=>k+1); setActivePanel(null); }} style={{ ...gb, width: '100%', color: '#9C6B00', borderColor: '#F08C00' }}><i className="ti ti-ban"></i> Cancel Booking</button>
              </>
            )}
            {b.status === "Delivered" && (
              <>
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button style={{...gb, flex: 1}}><i className="ti ti-file-text"></i> View Docket</button>
                  <button onClick={() => { updateBooking(b.id, { status: "Submitted" }); setRefreshKey(k=>k+1); setActivePanel({...b, status: "Submitted"}); }} style={{ ...sb, background: GR, flex: 1 }}><i className="ti ti-send"></i> Submit to ERP</button>
                </div>
              </>
            )}
            {b.status === "Submitted" && (
              <button style={{ ...gb, width: '100%' }}><i className="ti ti-file-text"></i> View Docket (read-only)</button>
            )}
            {b.status === "Cancelled" && (
              <>
                <button onClick={() => { updateBooking(b.id, { status: "Planned" }); setRefreshKey(k=>k+1); setActivePanel({...b, status: "Planned"}); }} style={{ ...gb, width: '100%', color: BL, borderColor: BL }}><i className="ti ti-refresh"></i> Reactivate Booking</button>
                <button onClick={() => { deleteBooking(b.id); setRefreshKey(k=>k+1); setActivePanel(null); }} style={{ ...gb, width: '100%', color: '#E03131', borderColor: '#E03131' }}><i className="ti ti-trash"></i> Delete Permanently</button>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────
  const cols = `repeat(${activeWeek.length}, 1fr)`;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8F9FA' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, color: O, animation: 'spin 1s linear infinite' }}></i>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: '#495057' }}>Loading Schedule Data...</div>
      </div>
    );
  }

  if (showBookingForm) {
    return <BookingForm 
      plant={{code: plantCode, name: plantName, region: plantRegion}} 
      editBlastId={editingBookingId}  
      expandDocket={editingBookingId ? 0 : null}
      onClose={() => {
        setEditingBookingId(null);
        setShowBookingForm(false);
      }} 
      onSaved={(doc) => {
        setRefreshKey(k => k + 1);
        setEditingBookingId(null);
        setShowBookingForm(false);
      }} 
    />;
  }

  return (
    <div className="schedule-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Blast Scheduling Board</div>
          <div style={{ fontSize: 14, color: SL, marginTop: 5 }}>{plantName} ({plantCode}) · {plantRegion}</div>
        </div>
        <button onClick={() => setShowBookingForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: O, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
          <i className="ti ti-plus" style={{ fontSize: 16 }}></i>New Booking
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: WT, border: `1px solid ${LN}`, borderRadius: 10, padding: 4 }}>
          {["Schedule", "Staff Availability", "Vehicle Availability"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t ? O : 'transparent', color: tab === t ? '#fff' : SL, whiteSpace: 'nowrap' }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setWorkingWeek(!workingWeek)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: `1px solid ${LN}`, borderRadius: 9, background: '#fff', cursor: 'pointer' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: SL }}>{workingWeek ? "Mon–Fri" : "Full week"}</span>
            <span style={{ width: 34, height: 18, borderRadius: 100, background: workingWeek ? O : "#CBD2D9", position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', top: 2, left: workingWeek ? 2 : 18, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }}></span>
            </span>
          </button>
          <button onClick={() => setBaseDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${LN}`, background: WT, cursor: 'pointer', color: SL }}><i className="ti ti-chevron-left"></i></button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              onClick={() => setShowWeekPicker(!showWeekPicker)}
              style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${LN}`, background: WT, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, color: INK }}
            >
              <i className="ti ti-calendar" style={{ color: O }}></i>
              {(() => {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const sDate = new Date(fullWeek[0].k);
                const eDate = new Date(fullWeek[6].k);
                return `${fullWeek[0].d} ${months[sDate.getMonth()]} – ${fullWeek[6].d} ${months[eDate.getMonth()]}`;
              })()}
            </button>
            {showWeekPicker && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 90 }} onClick={() => setShowWeekPicker(false)}></div>
                <WeekPicker 
                  currentBase={baseDate} 
                  onChange={(d) => { setBaseDate(d); setShowWeekPicker(false); }} 
                />
              </>
            )}
          </div>
          <button onClick={() => setBaseDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${LN}`, background: WT, cursor: 'pointer', color: SL }}><i className="ti ti-chevron-right"></i></button>
          <button onClick={() => setBaseDate(getMonday(new Date()))} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${O}`, background: OS, fontWeight: 600, fontSize: 13.5, color: O, cursor: 'pointer' }}>Current Week</button>
        </div>
      </div>

      {tab === "Schedule" && (
        <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap', fontSize: 12.5, color: SL, alignItems: 'center', background: '#fff', border: `1px solid ${LN}`, borderRadius: 10, padding: '10px 16px' }}>
          <span style={{ fontWeight: 700, color: INK, fontSize: 12 }}>Status:</span>
          {ORDER.map(k => (
            <span key={k} style={{ fontSize: 10, fontWeight: 700, color: STATUS[k].fg, background: STATUS[k].bg, padding: '2px 8px', borderRadius: 100 }}>{k}</span>
          ))}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: SL }}>
            <i className="ti ti-repeat" style={{ color: O }}></i> Recurring &nbsp;·&nbsp; <i className="ti ti-arrow-right" style={{ color: O }}></i> Multi-day
          </span>
        </div>
      )}


      {tab === "Schedule" ? (
        <div style={{ background: WT, border: `1px solid ${LN}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: workingWeek ? 820 : 980 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `200px ${cols}`, borderBottom: `2px solid #D6DBE2` }}>
                <div style={{ padding: '10px 16px', background: COLHEAD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: `3px solid ${LN}` }}>
                  {mode === "fleet" ? (
                    <img src="/images/bmd_truck.png" style={{ height: 18, width: 28, objectFit: 'contain' }} alt="Fleet" />
                  ) : (
                    <i className="ti ti-users" style={{ fontSize: 16, color: O }}></i>
                  )}
                  <div style={{ display: 'flex', background: '#fff', border: `1px solid #D6DBE2`, borderRadius: 9, padding: 3, textTransform: 'none', letterSpacing: 0 }}>
                    <button onClick={() => { setMode("fleet"); setCollapsed({}); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: mode === "fleet" ? O : 'transparent', color: mode === "fleet" ? '#fff' : SL }}>
                      <div style={{ background: mode === "fleet" ? '#fff' : 'transparent', borderRadius: 4, padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/images/bmd_truck.png" style={{ height: 12, width: 18, objectFit: 'contain', filter: mode === "fleet" ? 'none' : 'grayscale(100%) opacity(0.6)' }} alt="Fleet" />
                      </div>
                      Fleet
                    </button>
                    <button onClick={() => { setMode("crew"); setCollapsed({}); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: mode === "crew" ? O : 'transparent', color: mode === "crew" ? '#fff' : SL }}>
                      <i className="ti ti-users" style={{ fontSize: 13 }}></i> Crew
                    </button>
                  </div>
                </div>
                {activeWeek.map(d => (
                  <div key={d.k} style={{ padding: '11px 8px', textAlign: 'center', borderLeft: `1px solid ${LN}`, background: d.today ? OS : COLHEAD }}>
                    <div style={{ fontSize: 11, color: d.today ? O : SL, fontWeight: 700, textTransform: 'uppercase' }}>{d.dow}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d.today ? O : INK, marginTop: 1 }}>{d.d}</div>
                  </div>
                ))}
              </div>

              {groupsList.map(g => {
                const ic = collapsed[g.type];
                return (
                  <React.Fragment key={g.type}>
                    <div onClick={() => toggleGroup(g.type)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: '#2B2F36', cursor: 'pointer', borderLeft: `4px solid ${O}`, borderBottom: `1px solid ${LN}` }}>
                      <i className={`ti ti-chevron-${ic ? "right" : "down"}`} style={{ fontSize: 16, color: '#A8AEB8' }}></i>
                      {mode === "fleet" && g.img ? (
                        <img src={g.img} style={{ height: 18, width: 28, objectFit: 'contain' }} alt={g.type} />
                      ) : (
                        <i className={`ti ${g.icon}`} style={{ fontSize: 17, color: O }}></i>
                      )}
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{g.type}</span>
                      <span style={{ fontSize: 11.5, color: '#A8AEB8' }}>{g.hint}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.15)', padding: '2px 10px', borderRadius: 100 }}>
                        {groupCount(g)} booking{groupCount(g) !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {!ic && g.lanes.map(lane => {
                      const lb = getLaneBookings(lane.id);
                      const icon = mode === "fleet" ? g.icon : "ti-user";
                      return (
                        <div key={lane.id} style={{ display: 'grid', gridTemplateColumns: `200px ${cols}`, borderBottom: `1px solid ${LN}`, minHeight: 78 }}>
                          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11, borderRight: `3px solid ${LN}`, background: FLEETCOL }}>
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: lane.s === "maintenance" ? RDS : OS, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: `1px solid ${lane.s === "maintenance" ? RD : O}44` }}>
                              {mode === "fleet" && g.img ? (
                                <img src={g.img} style={{ width: "90%", height: "90%", objectFit: "contain", opacity: lane.s === "maintenance" ? 0.6 : 1 }} alt={g.type} />
                              ) : (
                                <i className={`ti ${icon}`} style={{ fontSize: 19, color: lane.s === "maintenance" ? RD : O }}></i>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{lane.name || lane.id}</div>
                              {mode === "fleet" ? (
                                lane.s === "maintenance" ? (
                                  <span style={{ fontSize: 10.5, color: RD, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-tool" style={{ fontSize: 11 }}></i>Maintenance</span>
                                ) : (
                                  <span style={{ fontSize: 10.5, color: GR, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-circle-dot" style={{ fontSize: 10 }}></i>Available</span>
                                )
                              ) : (
                                <span style={{ fontSize: 10.5, color: SL, fontWeight: 500 }}>{g.type.replace(/s$/, "")}</span>
                              )}
                            </div>
                          </div>

                          <div style={{ gridColumn: `2 / span ${activeWeek.length}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                            {/* Background Grid for vertical lines and lane status */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: cols, pointerEvents: 'none' }}>
                              {activeWeek.map(d => {
                                const maint = lane.s === "maintenance" && ["2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"].includes(d.k);
                                return (
                                  <div key={d.k} style={{ borderLeft: `1px solid ${LN}`, background: maint ? "repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 6px,#fff 6px,#fff 12px)" : (d.today ? "#FFFBF7" : "transparent") }} />
                                );
                              })}
                            </div>

                            {/* Foreground Content */}
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                              {lb.multis.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '7px 0 0' }}>
                                  {lb.multis.map((m, i) => {
                                    const f = Math.max(0, dayIndex(m.multiDay.from));
                                    const tr = dayIndex(m.multiDay.to);
                                    const t = tr < 0 ? activeWeek.length - 1 : tr;
                                    return (
                                      <div key={i} style={{ gridColumn: `${f + 1} / span ${t - f + 1}`, padding: '0 7px' }}>
                                        <Card b={m} spanning={true} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: cols, flexGrow: 1 }}>
                                {activeWeek.map(d => {
                                  const cell = lb.single[d.k] || [];
                                  const maint = lane.s === "maintenance" && ["2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"].includes(d.k);
                                  return (
                                    <div key={d.k} style={{ padding: (cell.length > 0 || maint) ? 7 : '0 7px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {maint ? (
                                        <div style={{ fontSize: 10, color: RD, fontWeight: 600, textAlign: 'center', paddingTop: lb.multis.length > 0 ? 0 : 24 }}>
                                          {lb.multis.length > 0 ? "" : "Out of service"}
                                        </div>
                                      ) : (
                                        cell.map(b => <Card key={b.id} b={b} spanning={false} />)
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      ) : tab === "Staff Availability" ? (
        <CrewPlanner plant={plantCode} workingWeek={workingWeek} fullWeek={fullWeek} refreshKey={refreshKey} />
      ) : tab === "Vehicle Availability" ? (
        <FleetPlanner plant={plantCode} workingWeek={workingWeek} fullWeek={fullWeek} refreshKey={refreshKey} />
      ) : null}

      {activePanel && <Panel b={activePanel} onClose={() => setActivePanel(null)} />}
    </div>
  );
}