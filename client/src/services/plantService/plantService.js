import axiosInstance from '../api/axiosInstance';

/**
 * Get list of all plants.
 */
export async function getPlants() {
  const res = await axiosInstance.get('/plants');
  return res.data.data;
}
