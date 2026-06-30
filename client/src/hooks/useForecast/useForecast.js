import { useState, useEffect, useCallback } from 'react';
import forecastService from '../../services/forecastService/forecastService';
import { usePlant } from '../../context/PlantContext/PlantContext';
import { useToast } from '../../context/ToastContext/ToastContext';

export function useForecast() {
  const { selectedPlant } = usePlant();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [plan, setPlan] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [accuracy, setAccuracy] = useState([]);

  const fetchData = useCallback(async () => {
    if (!selectedPlant || !selectedPlant._id) return;

    try {
      setLoading(true);
      const [matsRes, planRes, capRes, accRes] = await Promise.all([
        forecastService.getMaterials(selectedPlant._id),
        forecastService.getPlan(selectedPlant._id),
        forecastService.getCapacity(selectedPlant._id),
        forecastService.getAccuracy(selectedPlant._id)
      ]);

      if (matsRes.success) setMaterials(matsRes.data);
      if (planRes.success) setPlan(planRes.data);
      if (capRes.success) setCapacity(capRes.data);
      if (accRes.success) setAccuracy(accRes.data);

    } catch (err) {
      console.error(err);
      showToast('Error fetching forecast data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPlant, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateDemand = async (id, weeklyDemand) => {
    try {
      const res = await forecastService.updateMaterial(id, { weeklyDemand });
      if (res.success) {
        setMaterials(prev => prev.map(m => m._id === id ? res.data : m));
        // Also refresh capacity when demand changes
        const capRes = await forecastService.getCapacity(selectedPlant._id);
        if (capRes.success) setCapacity(capRes.data);
        return true;
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update demand', 'error');
    }
    return false;
  };

  const updatePlanStatus = async (status) => {
    if (!plan) return false;
    try {
      const res = await forecastService.updatePlanStatus(plan._id, status);
      if (res.success) {
        setPlan(res.data);
        showToast('Plan status updated successfully', 'success');
        return true;
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update plan status', 'error');
    }
    return false;
  };

  return {
    loading,
    materials,
    plan,
    capacity,
    accuracy,
    updateDemand,
    updatePlanStatus,
    refresh: fetchData,
  };
}
