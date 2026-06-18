import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Truck,
  PackageSearch,
  CalendarRange,
  ClipboardCheck,
  Boxes,
  Factory,
  Sparkles,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { key: '/deliveries', label: 'Inbound Delivery', icon: Truck },
  { key: '/stock', label: 'Stock', icon: PackageSearch },
  { key: '/schedule', label: 'Schedule', icon: CalendarRange },
  { key: '/docket', label: 'Mobile Docket', icon: ClipboardCheck, soon: true },
  { key: '/portal', label: 'Customer Portal', icon: Boxes, soon: true },
];

export default function Sidebar({ aiOpen, toggleAi }) {
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
      <div className="sidebar-ai-container" style={{ padding: '12px', borderTop: '1px solid #E6E9ED' }}>
        <button 
          onClick={toggleAi} 
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px',
            border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
            background: aiOpen ? 'linear-gradient(135deg, rgba(232,89,12,.15), rgba(255,140,66,.1))' : 'transparent',
            color: aiOpen ? '#E8590C' : '#5B6470', fontSize: '14px', fontWeight: 600, transition: 'all 0.2s'
          }}
        >
          <Sparkles size={18} style={{ color: aiOpen ? '#E8590C' : '#9CA3AF' }} />
          <span style={{ flex: 1, textAlign: 'left' }}>FOI Assistant</span>
          <span style={{ fontSize: '10px', fontWeight: 700, background: aiOpen ? '#E8590C' : '#E8590C', color: '#fff', padding: '2px 6px', borderRadius: '5px' }}>AI</span>
        </button>
      </div>
      <div className="sidebar-footer">
        Prototype v2 · Demo data only
        <br />
        Not connected to ERP
      </div>
    </aside>
  );
}
