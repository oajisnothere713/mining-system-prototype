import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Truck,
  PackageSearch,
  CalendarRange,
  ClipboardCheck,
  Boxes,
  Factory,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { key: '/deliveries', label: 'Inbound Delivery', icon: Truck },
  { key: '/stock', label: 'Stock', icon: PackageSearch },
  { key: '/schedule', label: 'Schedule', icon: CalendarRange },
  { key: '/docket', label: 'Mobile Docket', icon: ClipboardCheck, soon: true },
  { key: '/portal', label: 'Customer Portal', icon: Boxes, soon: true },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Factory size={19} />
        </div>
        <div>
          <div className="sidebar-logo-text-top">Field Ops</div>
          <div className="sidebar-logo-text-bottom">Intelligence</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((it) => {
          const active = isActive(it.key);
          return (
            <button
              key={it.key}
              onClick={() => navigate(it.key)}
              className={`sidebar-nav-btn ${active ? 'sidebar-nav-btn--active' : ''}`}
            >
              <it.icon size={18} />
              <span className="sidebar-nav-label">{it.label}</span>
              {it.soon && <span className="sidebar-soon-badge">SOON</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        Prototype v2 · Demo data only
        <br />
        Not connected to ERP
      </div>
    </aside>
  );
}
