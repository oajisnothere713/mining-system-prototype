import React from 'react';
import { CalendarX, Bell, AlertTriangle, Check, X } from 'lucide-react';

export default function CapacityTab({ forecast }) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const weekDates = Array.from({ length: 4 }).map((_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}`;
    } else {
      return `${start.getDate()} ${start.toLocaleDateString('en-US', { month: 'short' })}–${end.getDate()} ${end.toLocaleDateString('en-US', { month: 'short' })}`;
    }
  });

  const capData = forecast.capacity?.weeks?.map((w, i) => ({
    label: `Week ${i + 1}`,
    dates: weekDates[i],
    truckUsed: w.truckUsed,
    truckTotal: w.truckTotal,
    crewUsed: w.crewUsed,
    crewTotal: w.crewTotal,
    dockets: w.dockets,
    badge: w.badge,
    badgeFg: w.badgeFg,
    badgeBg: w.badgeBg,
    badgeIcon: w.badgeFg === '#C0392B' ? AlertTriangle : w.badgeFg === '#A66A0C' ? AlertTriangle : Check
  })) || [];

  const utilColor = (p) => p >= 100 ? '#C0392B' : p >= 65 ? '#D08A1A' : '#2E7D46';

  const capWeeks = capData.map(c => {
    const tp = (c.truckUsed / c.truckTotal) * 100;
    const cp = (c.crewUsed / c.crewTotal) * 100;
    return { ...c, truckPct: tp, crewPct: cp, truckColor: utilColor(tp), crewColor: utilColor(cp) };
  });

  const gaps = forecast.capacity?.gaps || [];

  const changes = forecast.capacity?.changes || [];

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
            {gaps.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9098A1', fontSize: '12.5px', background: '#FBFBFC', borderRadius: '11px', border: '1px dashed #E1E4E8' }}>
                No unusual customer gaps detected at this time.
              </div>
            ) : gaps.map((g, i) => (
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
            {changes.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9098A1', fontSize: '12.5px', background: '#FBFBFC', borderRadius: '11px', border: '1px dashed #E1E4E8' }}>
                No bookings have been modified since your last review.
              </div>
            ) : changes.map((c, i) => (
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
