import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout-main">
        <Header />
        <main className="app-layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
