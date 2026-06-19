import React, { useState } from 'react';
import './SchedulePage.css';
import CrewPlanner from './CrewPlanner';
import FleetPlanner from './FleetPlanner';

const O="#E8590C", OS="#FFF1E8", INK="#1A1D21", SL="#5B6470", LN="#E6E9ED", BG="#F7F8FA", WT="#fff", COLHEAD="#EEF1F5", FLEETCOL="#F4F6F9";
const GR="#2F9E44", GRS="#EBFBEE", AM="#F08C00", AMS="#FFF9DB", BL="#1971C2", BLS="#E7F5FF", RD="#E03131", RDS="#FFF0F0", SLS="#EEF0F2";

const STATUS = {
  Planned: { fg: BL, bg: BLS, dot: BL },
  "In Progress": { fg: "#9C6B00", bg: AMS, dot: AM },
  Delivered: { fg: GR, bg: GRS, dot: GR },
  Submitted: { fg: SL, bg: SLS, dot: SL }
};

const ORDER = ["Planned", "In Progress", "Delivered", "Submitted"];

const VGROUPS = [
  { type: "BMD Trucks", hint: "Bulk Mixing & Delivery", icon: "ti-truck-loading", lanes: [{ id: "MH-12-BMD-01", s: "active" }, { id: "MH-12-BMD-02", s: "active" }, { id: "MH-12-BMD-03", s: "maintenance" }] },
  { type: "Blast Crew Vehicles", hint: "Carries blaster / shotfirer crew", icon: "ti-truck", lanes: [{ id: "MH-12-BCV-01", s: "active" }, { id: "MH-12-BCV-02", s: "active" }] },
  { type: "Support Trucks", hint: "Survey, mark-out & ancillary support", icon: "ti-car-crane", lanes: [{ id: "MH-12-SVY-01", s: "active" }, { id: "MH-12-SPT-01", s: "active" }] }
];

const CGROUPS = [
  { type: "BMD Operators", hint: "Operate the bulk delivery trucks", icon: "ti-user", lanes: [{ id: "Ramesh Patil" }, { id: "Suresh Yadav" }, { id: "Blair Huntingdon" }, { id: "Cas Davide" }] },
  { type: "Blasters / Shotfirers", hint: "Licensed to charge & fire", icon: "ti-user", lanes: [{ id: "Mike Sullivan" }, { id: "Dan Brooks" }] },
  { type: "Surveyors", hint: "Survey & mark-out", icon: "ti-user", lanes: [{ id: "James Lee" }] }
];

const B = [
  { id: "BL-2025-041", date: "2026-06-02", time: "04:30", vehicle: "MH-12-BMD-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit A", po: "4500087201", operators: ["Ramesh Patil", "Suresh Yadav"], crew: ["Mike Sullivan"], products: [["ANE", 22, "t"], ["Detonator 1.5m", 400, "ea"]], services: [["Site Service & Setup", 1, "ea"]], status: "Submitted" },
  { id: "BL-2025-042", date: "2026-06-02", time: "08:00", vehicle: "MH-12-BMD-02", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit B", po: "4500087202", operators: ["Blair Huntingdon"], crew: ["Dan Brooks"], products: [["Bulk Emulsion", 18, "t"]], services: [], status: "Submitted" },
  { id: "BL-2025-043", date: "2026-06-03", time: "04:30", vehicle: "MH-12-BMD-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit A", po: "4500087205", operators: ["Ramesh Patil"], crew: ["Mike Sullivan"], products: [["AN", 24, "t"], ["Detonator 1.5m", 300, "ea"]], services: [], status: "Delivered" },
  { id: "BL-2025-044", date: "2026-06-03", time: "07:00", vehicle: "MH-12-BMD-02", customer: "Aggregate Resources", customerFull: "Aggregate Resources Pvt Ltd", site: "Chittorgarh Quarry", po: "4500087210", operators: ["Cas Davide"], crew: ["Dan Brooks"], products: [["ANE", 15, "t"]], services: [], status: "Delivered" },
  { id: "BL-2025-045", date: "2026-06-04", time: "04:30", vehicle: "MH-12-BMD-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit A", po: "4500087215", operators: ["Suresh Yadav", "Ramesh Patil"], crew: ["Mike Sullivan"], products: [["ANE", 42, "t"], ["Booster 400g", 400, "ea"]], services: [["MMU Operation", 2, "ea"]], status: "In Progress", multiDay: { from: "2026-06-04", to: "2026-06-05" } },
  { id: "BL-2025-047", date: "2026-06-05", time: "11:00", vehicle: "MH-12-BMD-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit B", po: "4500087220", operators: ["Ramesh Patil"], crew: ["Mike Sullivan"], products: [["ANE", 22, "t"], ["Detonator 1.5m", 400, "ea"]], services: [], status: "Planned" },
  { id: "BL-2025-046", date: "2026-06-04", time: "06:00", vehicle: "MH-12-BMD-02", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Itauri-Jharkua Block", po: "4500087216", operators: ["Blair Huntingdon"], crew: ["Dan Brooks"], products: [["AN", 18, "t"]], services: [], status: "Planned" },
  { id: "BL-2025-048", date: "2026-06-05", time: "08:00", vehicle: "MH-12-BMD-02", customer: "Aggregate Resources", customerFull: "Aggregate Resources Pvt Ltd", site: "Kadapa Block-3", po: "4500087221", operators: ["Cas Davide"], crew: ["Dan Brooks"], products: [["Bulk Emulsion", 12, "t"]], services: [], status: "Planned" },
  { id: "BL-2025-049", date: "2026-06-04", time: "05:00", vehicle: "MH-12-BCV-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit A", po: "4500087230", operators: [], crew: ["Mike Sullivan", "Dan Brooks"], products: [], services: [["Blast Clearance", 1, "ea"]], status: "In Progress", recurrence: "Daily" },
  { id: "BL-2025-049b", date: "2026-06-05", time: "05:00", vehicle: "MH-12-BCV-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit A", po: "4500087230", operators: [], crew: ["Mike Sullivan", "Dan Brooks"], products: [], services: [["Blast Clearance", 1, "ea"]], status: "Planned", recurrence: "Daily" },
  { id: "BL-2025-052", date: "2026-06-04", time: "04:00", vehicle: "MH-12-SVY-01", customer: "JK Cement", customerFull: "JK Cement Works — Central", site: "Panna Pit B", po: "4500087235", operators: ["James Lee"], crew: [], products: [], services: [["Mark Out", 1, "ea"]], status: "Planned" }
];

function initStr(n) { return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
function people(b) { return [].concat(b.operators || [], b.crew || []); }
function shortProd(b) {
  const p = (b.products || []).map(x => `${x[0]} ${x[1]}${x[2] === "t" ? "t" : ""}`);
  if ((b.services || []).length && !p.length) return b.services[0][0];
  return p.join(" · ");
}

export default function SchedulePage() {
  const [tab, setTab] = useState("Schedule");
  const [workingWeek, setWorkingWeek] = useState(true);
  const [mode, setMode] = useState("fleet");
  const [collapsed, setCollapsed] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const [baseDate, setBaseDate] = useState(new Date());

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
    const multis = mine.filter(b => b.multiDay && (dayIndex(b.multiDay.from) >= 0 || dayIndex(b.multiDay.to) >= 0));
    return { single, multis };
  };

  const groupCount = (g) => {
    const ids = g.lanes.map(l => l.id);
    return B.filter(b => {
      const belongs = mode === "fleet" ? ids.indexOf(b.vehicle) >= 0 : people(b).some(p => ids.indexOf(p) >= 0);
      if (!belongs) return false;
      if (b.multiDay) return dayIndex(b.multiDay.from) >= 0 || dayIndex(b.multiDay.to) >= 0;
      return dayIndex(b.date) >= 0;
    }).length;
  };

  // ─── CARD COMPONENT ─────────────────────────────
  const Card = ({ b, spanning }) => {
    const s = STATUS[b.status];
    const pp = people(b);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: INK, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-clock" style={{ fontSize: 11, color: SL }}></i>{b.time}
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: s.fg, background: s.bg, padding: '2px 7px', borderRadius: 100, whiteSpace: 'nowrap' }}>
            {b.status}
          </span>
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
        
        <div style={{ fontSize: 10.5, color: O, fontWeight: 700, marginBottom: 6 }}>
          {b.id}
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
                {pp.slice(0, 3).map((p, i) => (
                  <span key={i} title={p} style={{ width: 19, height: 19, borderRadius: '50%', background: i % 2 ? "#D8DEE6" : "#C7CFDA", color: "#3A4350", fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${WT}`, marginLeft: i ? -5 : 0 }}>
                    {initStr(p)}
                  </span>
                ))}
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
    const s = STATUS[b.status];
    const ci = ORDER.indexOf(b.status);
    const pl = [...(b.operators || []).map(p => ({ n: p, r: "BMD Operator" })), ...(b.crew || []).map(p => ({ n: p, r: "Blaster / Shotfirer" }))];

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
          
          <div style={{ padding: '16px 22px', borderTop: `1px solid ${LN}`, flexShrink: 0, display: 'flex', gap: 10 }}>
            {b.status === "Planned" && (
              <><button style={gb}><i className="ti ti-pencil"></i> Edit</button><button style={{ ...sb, background: O, flex: 1 }}><i className="ti ti-send"></i> Submit Delivery</button></>
            )}
            {b.status === "In Progress" && (
              <button style={{ ...sb, background: AM, flex: 1 }}><i className="ti ti-file-text"></i> View Mobile Docket</button>
            )}
            {b.status === "Delivered" && (
              <><button style={gb}><i className="ti ti-file-text"></i> View Docket</button><button style={{ ...sb, background: GR, flex: 1 }}><i className="ti ti-send"></i> Submit to ERP</button></>
            )}
            {b.status === "Submitted" && (
              <button style={{ ...gb, flex: 1 }}><i className="ti ti-file-text"></i> View Docket (read-only)</button>
            )}
          </div>
        </div>
      </>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────
  const cols = `repeat(${activeWeek.length}, 1fr)`;

  return (
    <div className="schedule-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Blast Scheduling Board</div>
          <div style={{ fontSize: 14, color: SL, marginTop: 5 }}>Panna (2025) · Madhya Pradesh</div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: O, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14.5, fontWeight: 600, cursor: 'pointer' }}>
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
          <button style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${LN}`, background: WT, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13.5, color: INK }}><i className="ti ti-calendar" style={{ color: O }}></i>
            {(() => {
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const sDate = new Date(fullWeek[0].k);
              const eDate = new Date(fullWeek[6].k);
              return `${fullWeek[0].d} ${months[sDate.getMonth()]} – ${fullWeek[6].d} ${months[eDate.getMonth()]}`;
            })()}
          </button>
          <button onClick={() => setBaseDate(d => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })} style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${LN}`, background: WT, cursor: 'pointer', color: SL }}><i className="ti ti-chevron-right"></i></button>
          <button onClick={() => setBaseDate(new Date())} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${O}`, background: OS, fontWeight: 600, fontSize: 13.5, color: O, cursor: 'pointer' }}>Today</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap', fontSize: 12.5, color: SL, alignItems: 'center', background: '#fff', border: `1px solid ${LN}`, borderRadius: 10, padding: '10px 16px' }}>
        <span style={{ fontWeight: 700, color: INK, fontSize: 12 }}>Status:</span>
        {ORDER.map(k => (
          <span key={k} style={{ fontSize: 10, fontWeight: 700, color: STATUS[k].fg, background: STATUS[k].bg, padding: '2px 8px', borderRadius: 100 }}>{k}</span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: SL }}>
          <i className="ti ti-repeat" style={{ color: O }}></i> Recurring &nbsp;·&nbsp; <i className="ti ti-arrow-right" style={{ color: O }}></i> Multi-day
        </span>
      </div>

      {tab === "Schedule" ? (
        <div style={{ background: WT, border: `1px solid ${LN}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: workingWeek ? 820 : 980 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `200px ${cols}`, borderBottom: `2px solid #D6DBE2` }}>
                <div style={{ padding: '10px 16px', background: COLHEAD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: `3px solid ${LN}` }}>
                  <i className={`ti ${mode === "fleet" ? "ti-truck" : "ti-users"}`} style={{ fontSize: 16, color: O }}></i>
                  <div style={{ display: 'flex', background: '#fff', border: `1px solid #D6DBE2`, borderRadius: 9, padding: 3, textTransform: 'none', letterSpacing: 0 }}>
                    <button onClick={() => { setMode("fleet"); setCollapsed({}); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: mode === "fleet" ? O : 'transparent', color: mode === "fleet" ? '#fff' : SL }}>
                      <i className="ti ti-truck" style={{ fontSize: 13 }}></i> Fleet
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
                      <i className={`ti ${g.icon}`} style={{ fontSize: 17, color: O }}></i>
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
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: lane.s === "maintenance" ? RDS : OS, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={`ti ${icon}`} style={{ fontSize: 19, color: lane.s === "maintenance" ? RD : O }}></i>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{lane.id}</div>
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

                          <div style={{ gridColumn: `2 / span ${activeWeek.length}`, display: 'grid', gridTemplateColumns: cols }}>
                            {lb.multis.length > 0 && (
                              <div style={{ gridColumn: `1 / span ${activeWeek.length}`, display: 'grid', gridTemplateColumns: cols, padding: '7px 0 0' }}>
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

                            <div style={{ gridColumn: `1 / span ${activeWeek.length}`, display: 'grid', gridTemplateColumns: cols }}>
                              {activeWeek.map(d => {
                                const cell = lb.single[d.k] || [];
                                const maint = lane.s === "maintenance" && ["2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"].includes(d.k);
                                return (
                                  <div key={d.k} style={{ padding: 7, borderLeft: `1px solid ${LN}`, minHeight: 78, display: 'flex', flexDirection: 'column', gap: 6, background: maint ? "repeating-linear-gradient(45deg,#FFF5F5,#FFF5F5 6px,#fff 6px,#fff 12px)" : (d.today ? "#FFFBF7" : "transparent") }}>
                                    {maint ? (
                                      <div style={{ fontSize: 10, color: RD, fontWeight: 600, textAlign: 'center', paddingTop: 24 }}>Out of service</div>
                                    ) : (
                                      cell.map(b => <Card key={b.id} b={b} spanning={false} />)
                                    )}
                                  </div>
                                );
                              })}
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
        <CrewPlanner plant="2025" workingWeek={workingWeek} fullWeek={fullWeek} />
      ) : tab === "Vehicle Availability" ? (
        <FleetPlanner plant="2025" workingWeek={workingWeek} fullWeek={fullWeek} />
      ) : null}

      {activePanel && <Panel b={activePanel} onClose={() => setActivePanel(null)} />}
    </div>
  );
}
