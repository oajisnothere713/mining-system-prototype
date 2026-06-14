import { useState, useCallback } from 'react';
import * as deliveryService from '../../services/deliveryService/deliveryService';

/**
 * Custom hook for managing deliveries state.
 */
export default function useDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeliveries = useCallback(async (plantCode, status) => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryService.getDeliveries(plantCode, status);
      setDeliveries(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmPGR = useCallback(async (id, lines, plantCode) => {
    try {
      await deliveryService.confirmPGR(id, lines);
      await fetchDeliveries(plantCode);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to confirm PGR');
      return false;
    }
  }, [fetchDeliveries]);

  const receivePhysical = useCallback(async (id, lines, plantCode) => {
    try {
      await deliveryService.receivePhysical(id, lines);
      await fetchDeliveries(plantCode);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to receive physically');
      return false;
    }
  }, [fetchDeliveries]);

  const syncERP = useCallback(async (plantCode) => {
    try {
      const result = await deliveryService.syncERP(plantCode);
      await fetchDeliveries(plantCode);
      return { changed: result && result.length > 0 };
    } catch (err) {
      setError(err.message || 'Failed to sync with ERP');
      return null;
    }
  }, [fetchDeliveries]);

  return {
    deliveries,
    setDeliveries,
    loading,
    error,
    fetchDeliveries,
    confirmPGR,
    receivePhysical,
    syncERP,
  };
}
