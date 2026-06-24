import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlantProvider } from './context/PlantContext/PlantContext';
import { ToastProvider } from './context/ToastContext/ToastContext';
import AppLayout from './components/layout/AppLayout/AppLayout';
import InboundDeliveryPage from './pages/InboundDelivery/InboundDeliveryPage';
import DeliveryDetailPage from './pages/DeliveryDetail/DeliveryDetailPage';
import StockManagementPage from './pages/StockManagement/StockManagementPage';
import SchedulePage from './pages/Schedule/SchedulePage';
import DocketPage from './pages/Docket/DocketPage';
import PortalPage from './pages/Portal/PortalPage';
import ForecastBoardPage from './pages/ForecastBoard/ForecastBoardPage';

export default function App() {
  return (
    <BrowserRouter>
      <PlantProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/deliveries" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/deliveries" element={<InboundDeliveryPage />} />
              <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
              <Route path="/stock" element={<StockManagementPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/docket" element={<DocketPage />} />
              <Route path="/portal" element={<PortalPage />} />
              <Route path="/forecast" element={<ForecastBoardPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </PlantProvider>
    </BrowserRouter>
  );
}
