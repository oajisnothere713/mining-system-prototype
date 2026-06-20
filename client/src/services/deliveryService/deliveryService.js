import axiosInstance from '../api/axiosInstance';

/**
 * Get deliveries filtered by plant and optionally by status.
 */
export async function getDeliveries(plantCode, status) {
  const params = { plant: plantCode, _t: Date.now() };
  if (status && status !== 'All') params.status = status;
  const res = await axiosInstance.get('/deliveries', { params });
  return res.data.data;
}

/**
 * Get a single delivery by ID.
 */
export async function getDeliveryById(id) {
  const res = await axiosInstance.get(`/deliveries/${id}`);
  return res.data.data;
}

/**
 * Confirm goods receipt (PGR) for a delivery.
 */
export async function confirmPGR(id, lines, receiptDate) {
  const res = await axiosInstance.patch(`/deliveries/${id}/confirm-pgr`, { lines, date: receiptDate });
  return res.data.data;
}

/**
 * Receive a delivery physically (PGR Pending state).
 */
export async function receivePhysical(id, lines, receiptDate) {
  const res = await axiosInstance.patch(`/deliveries/${id}/receive-physical`, { lines, date: receiptDate });
  return res.data.data;
}

/**
 * Sync deliveries with ERP.
 */
export async function syncERP(plantCode) {
  const res = await axiosInstance.post('/deliveries/sync-erp', { plantCode });
  return res.data.data;
}
