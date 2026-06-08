import React from 'react';
import './Banner.css';

export default function Banner({ color, soft, icon: Icon, children }) {
  return (
    <div className="banner" style={{ background: soft, color }}>
      <Icon size={17} className="banner-icon" />
      <div>{children}</div>
    </div>
  );
}
