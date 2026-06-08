import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPlants } from '../../services/plantService/plantService';
import { PLANTS as FALLBACK_PLANTS } from '../../utils/constants/constants';

const PlantContext = createContext(null);

export function PlantProvider({ children }) {
  const [plants, setPlants] = useState(FALLBACK_PLANTS);
  const [selectedPlant, setSelectedPlant] = useState(
    FALLBACK_PLANTS.find((p) => p.code === '2025') || FALLBACK_PLANTS[0]
  );

  useEffect(() => {
    getPlants()
      .then((data) => {
        if (data && data.length > 0) {
          setPlants(data);
          const defaultPlant = data.find((p) => p.code === '2025') || data[0];
          setSelectedPlant(defaultPlant);
        }
      })
      .catch(() => {
        // Use fallback plants
      });
  }, []);

  return (
    <PlantContext.Provider value={{ plants, selectedPlant, setSelectedPlant }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlant() {
  const ctx = useContext(PlantContext);
  if (!ctx) throw new Error('usePlant must be used within a PlantProvider');
  return ctx;
}

export default PlantContext;
