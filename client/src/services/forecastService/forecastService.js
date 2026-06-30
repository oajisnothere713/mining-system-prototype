import axiosInstance from '../api/axiosInstance';

const getMaterials = async (plantId) => {
  const response = await axiosInstance.get(`/forecast/materials?plant=${plantId}`);
  return response.data;
};

const updateMaterial = async (id, data) => {
  const response = await axiosInstance.put(`/forecast/materials/${id}`, data);
  return response.data;
};

const getPlan = async (plantId) => {
  const response = await axiosInstance.get(`/forecast/plans?plant=${plantId}`);
  return response.data;
};

const updatePlanStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/forecast/plans/${id}/status`, { status });
  return response.data;
};

const getCapacity = async (plantId) => {
  const response = await axiosInstance.get(`/forecast/capacity?plant=${plantId}`);
  return response.data;
};

const getAccuracy = async (plantId) => {
  const response = await axiosInstance.get(`/forecast/accuracy?plant=${plantId}`);
  return response.data;
};

const forecastService = {
  getMaterials,
  updateMaterial,
  getPlan,
  updatePlanStatus,
  getCapacity,
  getAccuracy,
};

export default forecastService;
