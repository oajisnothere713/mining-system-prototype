import React, { useState } from 'react';
import { Bell, ChevronDown, Factory, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { usePlant } from '../../../context/PlantContext/PlantContext';
import './Header.css';

export default function Header() {
  const { plants, selectedPlant, setSelectedPlant } = usePlant();
  const [notif, setNotif] = useState(false);

  const notifications = [
    {
      t: 'Low stock alert',
      d: 'ANE at Panna approaching low threshold',
      c: 'var(--amber)',
      icon: AlertTriangle,
    },
    {
      t: 'PGR pending',
      d: 'Deliveries awaiting goods receipt',
      c: 'var(--blue)',
      icon: ClipboardCheck,
    },
  ];

  return (
    <header className="header">
      <div className="header-left">
        <Factory size={16} style={{ color: 'var(--slate)' }} />
        <span className="header-plant-label">Plant</span>
        <div className="header-plant-select-wrapper">
          <select
            className="header-plant-select"
            value={selectedPlant.code}
            onChange={(e) => {
              const p = plants.find((p) => p.code === e.target.value);
              if (p) setSelectedPlant(p);
            }}
          >
            {plants.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="header-plant-chevron" />
        </div>
      </div>
      <div className="header-right">
        <button className="header-bell-btn" onClick={() => setNotif((v) => !v)}>
          <Bell size={20} className="header-bell-icon" />
          <span className="header-bell-badge">2</span>
        </button>
        {notif && (
          <div className="header-notif-dropdown">
            <div className="header-notif-title">Notifications</div>
            {notifications.map((n, i) => (
              <div key={i} className="header-notif-item">
                <n.icon size={17} className="header-notif-item-icon" style={{ color: n.c }} />
                <div>
                  <div className="header-notif-item-title">{n.t}</div>
                  <div className="header-notif-item-desc">{n.d}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="header-avatar">PA</div>
      </div>
    </header>
  );
}
