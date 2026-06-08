import axiosInstance from '../api/axiosInstance';

/**
 * Get stock data for a plant on a specific day.
 */
export async function getStock(plantCode, day) {
  const res = await axiosInstance.get('/stock', {
    params: { plant: plantCode, day },
  });
  return res.data.data;
}

/**
 * Get breakdown data for a specific material and column.
 */
export async function getBreakdown(plantCode, materialName, column, day) {
  const res = await axiosInstance.get('/stock/breakdown', {
    params: { plant: plantCode, material: materialName, column, day },
  });
  return res.data.data;
}
