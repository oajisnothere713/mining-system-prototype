import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import FOIAssistant from '../../FOIAssistant/FOIAssistant';
import * as deliveryService from '../../../services/deliveryService/deliveryService';
import { useToast } from '../../../context/ToastContext/ToastContext';
import { usePlant } from '../../../context/PlantContext/PlantContext';
import './AppLayout.css';

export default function AppLayout() {
  const [aiOpen, setAiOpen] = useState(false);
  const { showToast } = useToast();
  const { selectedPlant } = usePlant();

  const handleAction = async (action) => {
    if (!action) return;
    try {
      if (action.action === "confirm_pgr" || action.action === "receive_physical") {
        const id = action.ibd_id;
        const delivery = await deliveryService.getDeliveryById(id);
        const lines = delivery.lines.map(l => ({
          material: l.material._id || l.material,
          expected: l.expected,
          received: l.received
        }));

        if (action.action === "confirm_pgr") {
          await deliveryService.confirmPGR(id, lines);
          showToast(`Goods Receipt posted for ${id} · stock updated to PGR Complete`, 'success');
        } else {
          await deliveryService.receivePhysical(id, lines);
          showToast(`${id} physically received · shown as PGR Pending in stock`, 'success');
        }
      } else if (action.action === "sync_erp") {
        const result = await deliveryService.syncERP(selectedPlant.code);
        showToast(result.changed ? "Synced with ERP · corrected delivery received, PGR now enabled" : "Synced with ERP · no changes", 'success');
      }
    } catch (e) {
      showToast(`Action failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar aiOpen={aiOpen} toggleAi={() => setAiOpen(!aiOpen)} />
      <div className="app-layout-main">
        <Header />
        <main className="app-layout-content">
          <Outlet />
        </main>
      </div>
      <FOIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} onAction={handleAction} />
    </div>
  );
}
