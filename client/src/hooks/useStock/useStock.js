import { useState, useCallback } from 'react';
import * as stockService from '../../services/stockService/stockService';

/**
 * Custom hook for managing stock state.
 */
export default function useStock() {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStock = useCallback(async (plantCode, day) => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockService.getStock(plantCode, day);
      setStock(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch stock');
      setStock(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stock,
    setStock,
    loading,
    error,
    fetchStock,
  };
}
