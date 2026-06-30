import React from 'react';
import { CalendarX, Bell, AlertTriangle, Check, X } from 'lucide-react';

export default function CapacityTab({ forecast }) {
  const capData = [
    { 
      label: 'Week 1', dates: '23–27 Jun', 
      truckUsed: Math.ceil(forecast.capacity?.utilized / 100) || 3, 
      truckTotal: Math.ceil((forecast.capacity?.totalCapacity || 500) / 100) || 5, 
      crewUsed: 6, crewTotal: 8, 
      dockets: 11, 
      badge: forecast.capacity?.utilized > forecast.capacity?.totalCapacity * 0.9 ? 'Nearing capacity limits' : 'Capacity healthy', 
      badgeFg: forecast.capacity?.utilized > forecast.capacity?.totalCapacity * 0.9 ? '#C0392B' : '#2E7D46', 
      badgeBg: forecast.capacity?.utilized > forecast.capacity?.totalCapacity * 0.9 ? '#FAE9E7' : '#EAF3EC', 
      badgeIcon: forecast.capacity?.utilized > forecast.capacity?.totalCapacity * 0.9 ? AlertTriangle : Check 
    },
    { label: 'Week 2', dates: '30 Jun–4 Jul', truckUsed: 2, truckTotal: 5, crewUsed: 5, crewTotal: 8, dockets: 9, badge: '3 truck · 3 crew slots open', badgeFg: '#A66A0C', badgeBg: '#FAF2E0', badgeIcon: AlertTriangle },
    { label: 'Week 3', dates: '7–11 Jul', truckUsed: 2, truckTotal: 5, crewUsed: 4, crewTotal: 8, dockets: 10, badge: '3 truck · 4 crew available', badgeFg: '#2E7D46', badgeBg: '#EAF3EC', badgeIcon: Check },
    { label: 'Week 4', dates: '14–18 Jul', truckUsed: 1, truckTotal: 5, crewUsed: 2, crewTotal: 8, dockets: 8, badge: '4 trucks · 6 crew — plenty of room', badgeFg: '#2E7D46', badgeBg: '#EAF3EC', badgeIcon: Check },
  ];

  const utilColor = (p) => p >= 100 ? '#C0392B' : p >= 65 ? '#D08A1A' : '#2E7D46';

  const capWeeks = capData.map(c => {
    const tp = (c.truckUsed / c.truckTotal) * 100;
    const cp = (c.crewUsed / c.crewTotal) * 100;
    return { ...c, truckPct: tp, crewPct: cp, truckColor: utilColor(tp), crewColor: utilColor(cp) };
  });

  const gaps = [
    ...(forecast.capacity?.gaps || []).map(g => ({ name: 'Capacity Warning', detail: g })),
    { name: 'Aggregate Resources Pvt Ltd', detail: 'No bookings in Week 3 — usual pattern is 2 deliveries/week. Last contact 3 weeks ago.' },
    { name: 'Satpura Stone Works', detail: 'No bookings in Week 2 or Week 3. Had 1–2 deliveries/week for the past 6 weeks.' },
  ];

  const changes = [
    { ref: 'BL-2025-047', cust: 'JK Cement', detail: 'ANFO reduced from 45t → 30t', impact: '↓ Week 4 ANFO total drops 15t', impactColor: '#A66A0C', border: '#EFE7D6', bg: '#FBFAF7' },
    { ref: 'BL-2025-048', cust: 'Aggregate Resources', detail: 'Booking cancelled', impact: '↓ Week 3 loses 12t Bulk Emulsion', impactColor: '#A66A0C', border: '#EFE7D6', bg: '#FBFAF7' },
    { ref: 'BL-2025-052', cust: 'JK Cement', detail: 'New booking added after Week 1 orders were created', impact: '⚠ Week 1 Planned Orders may need amendment', impactColor: '#C0392B', border: '#F0D9D6', bg: '#FCF2F1' },
  ];

  return (
    <div className="fc-scroll-area">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
        {capWeeks.map((c, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '13px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              {c.label} <span style={{ fontSize: '11px', color: '#9098A1', fontWeight: 500 }}>{c.dates}</span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '5px' }}>
                <span>BMD Trucks</span>
                <span style={{ color: c.truckColor }}>{c.truckUsed} / {c.truckTotal}</span>
              </div>
              <div style={{ height: '9px', background: '#EEF0F2', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${c.truckPct}%`, height: '100%', background: c.truckColor, borderRadius: '5px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '5px' }}>
                <span>Crew</span>
                <span style={{ color: c.crewColor }}>{c.crewUsed} / {c.crewTotal}</span>
              </div>
              <div style={{ height: '9px', background: '#EEF0F2', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${c.crewPct}%`, height: '100%', background: c.crewColor, borderRadius: '5px' }}></div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#5B6470', display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery dockets</span>
              <span style={{ fontWeight: 700, color: '#17191C' }}>{c.dockets}</span>
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, padding: '7px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: c.badgeFg, background: c.badgeBg }}>
              <c.badgeIcon size={14} /> {c.badge}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0F1F3', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarX size={16} color="#9098A1" /> Customer gap alerts
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', color: '#5B6470', marginBottom: '12px' }}>Customers with unusual breaks in their booking pattern over the next 4 weeks.</div>
            {gaps.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: '11px', padding: '12px 13px', borderRadius: '11px', background: '#FBFAF7', border: '1px solid #EFE7D6', marginBottom: '10px' }}>
                <AlertTriangle size={16} color="#D08A1A" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: '12px', color: '#5B6470', marginTop: '2px', lineHeight: 1.45 }}>{g.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E1E4E8', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0F1F3', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} color="#9098A1" /> Changes since last review
          </div>
          <div style={{ padding: '14px 16px' }}>
            {changes.map((c, i) => (
              <div key={i} style={{ border: `1px solid ${c.border}`, background: c.bg, borderRadius: '11px', padding: '12px 14px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                  {c.ref} <span style={{ fontFamily: "'DM Sans', sans-serif", color: '#5B6470', fontWeight: 600 }}>· {c.cust}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#5B6470', marginTop: '3px' }}>{c.detail}</div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, marginTop: '5px', color: c.impactColor }}>{c.impact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
