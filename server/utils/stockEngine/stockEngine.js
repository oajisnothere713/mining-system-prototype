const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const Stock = require('../../models/Stock/Stock');
const Delivery = require('../../models/Delivery/Delivery');
const CustomerDelivery = require('../../models/CustomerDelivery/CustomerDelivery');

/**
 * Calculate the full stock grid for a given plant.
 * Returns an object keyed by material name, each containing
 * Yesterday/Today/Tomorrow with: opening, pgrC, pgrP, cd, closing, capacity, etc.
 *
 * @param {string} plantCode - The plant code (e.g. "2025")
 * @returns {Object} Stock grid keyed by material name
 */
const calculateStockGrid = async (plantCode) => {
  const plant = await Plant.findOne({ code: plantCode });
  if (!plant) {
    throw new Error(`Plant with code ${plantCode} not found`);
  }

  // Get all stock base records for this plant
  const stockRecords = await Stock.find({ plant: plant._id }).populate('material');

  // Get all deliveries for this plant
  const deliveries = await Delivery.find({ plant: plant._id }).populate('lines.material');

  // Get all customer deliveries for this plant
  const customerDeliveries = await CustomerDelivery.find({ plant: plant._id }).populate('material');

  // Build a map of materials from stock records
  const materialMap = {};
  for (const record of stockRecords) {
    if (!record.material) continue;
    const matName = record.material.name;
    if (!materialMap[matName]) {
      materialMap[matName] = {
        materialId: record.material._id,
        uom: record.material.uom,
        type: record.material.type,
        opening: record.opening,
        capacity: record.capacity,
      };
    }
  }

  // Group deliveries by material and state (for Today only as per front-end design)
  const completeDeliveriesByMaterial = {};
  const pendingDeliveriesByMaterial = {};

  for (const delivery of deliveries) {
    for (const line of delivery.lines) {
      if (!line.material) continue;
      const matName = line.material.name;
      const item = {
        ibd: delivery.ibdNumber,
        po: delivery.poNumber,
        supplier: delivery.supplier,
        qty: line.received
      };

      if (delivery.state === 'complete') {
        if (!completeDeliveriesByMaterial[matName]) completeDeliveriesByMaterial[matName] = [];
        completeDeliveriesByMaterial[matName].push(item);
      } else if (delivery.state === 'physical_pending') {
        if (!pendingDeliveriesByMaterial[matName]) pendingDeliveriesByMaterial[matName] = [];
        pendingDeliveriesByMaterial[matName].push(item);
      }
    }
  }

  // Group customer deliveries by material and day label
  const custDeliveriesByMaterialDay = {};
  for (const cd of customerDeliveries) {
    if (!cd.material) continue;
    const matName = cd.material.name;
    if (!custDeliveriesByMaterialDay[matName]) {
      custDeliveriesByMaterialDay[matName] = { Yesterday: [], Today: [], Tomorrow: [] };
    }
    if (custDeliveriesByMaterialDay[matName][cd.dayLabel]) {
      custDeliveriesByMaterialDay[matName][cd.dayLabel].push([cd.bookingRef, cd.quantity]);
    }
  }

  // Build the grid
  const grid = {};
  const days = ['Yesterday', 'Today', 'Tomorrow'];

  for (const [matName, matData] of Object.entries(materialMap)) {
    grid[matName] = {};

    let runningOpening = matData.opening;

    for (const day of days) {
      const pgrCList = day === 'Today' ? (completeDeliveriesByMaterial[matName] || []) : [];
      const pgrPList = day === 'Today' ? (pendingDeliveriesByMaterial[matName] || []) : [];
      const cdList = (custDeliveriesByMaterialDay[matName] && custDeliveriesByMaterialDay[matName][day]) || [];

      const pgrC = pgrCList.reduce((sum, item) => sum + item.qty, 0);
      const pgrP = pgrPList.reduce((sum, item) => sum + item.qty, 0);
      const cd = cdList.reduce((sum, item) => sum + item[1], 0);

      const closing = +(runningOpening + pgrC + pgrP - cd).toFixed(2);

      grid[matName][day] = {
        material: matName,
        type: matData.type,
        uom: matData.uom,
        capacity: matData.capacity,
        opening: +runningOpening.toFixed(2),
        pgrC,
        pgrP,
        cd,
        closing,
        pgrCList,
        pgrPList,
        cdList
      };

      // Next day's opening = this day's closing
      runningOpening = closing;
    }
  }

  return grid;
};

/**
 * Get breakdown details for a specific cell in the stock grid
 */
const getBreakdownDetails = async (plantCode, materialName, column, day) => {
  const plant = await Plant.findOne({ code: plantCode });
  if (!plant) {
    throw new Error(`Plant with code ${plantCode} not found`);
  }

  const material = await Material.findOne({ name: materialName });
  if (!material) {
    throw new Error(`Material "${materialName}" not found`);
  }

  const breakdown = { items: [], total: 0 };

  if (column === 'pgrComplete' || column === 'pgrC') {
    if (day === 'Today') {
      const deliveries = await Delivery.find({
        plant: plant._id,
        state: 'complete',
        'lines.material': material._id,
      }).populate('lines.material');

      for (const del of deliveries) {
        for (const line of del.lines) {
          if (line.material._id.toString() === material._id.toString()) {
            breakdown.items.push({
              ibd: del.ibdNumber,
              po: del.poNumber,
              supplier: del.supplier,
              qty: line.received,
            });
            breakdown.total += line.received;
          }
        }
      }
    }
  } else if (column === 'pgrPending' || column === 'pgrP') {
    if (day === 'Today') {
      const deliveries = await Delivery.find({
        plant: plant._id,
        state: 'physical_pending',
        'lines.material': material._id,
      }).populate('lines.material');

      for (const del of deliveries) {
        for (const line of del.lines) {
          if (line.material._id.toString() === material._id.toString()) {
            breakdown.items.push({
              ibd: del.ibdNumber,
              po: del.poNumber,
              supplier: del.supplier,
              qty: line.received,
            });
            breakdown.total += line.received;
          }
        }
      }
    }
  } else if (column === 'customerDelivery' || column === 'cd') {
    const custDels = await CustomerDelivery.find({
      plant: plant._id,
      material: material._id,
      dayLabel: day,
    });

    for (const cd of custDels) {
      breakdown.items.push([cd.bookingRef, cd.quantity]);
      breakdown.total += cd.quantity;
    }
  }

  return breakdown;
};

module.exports = { calculateStockGrid, getBreakdownDetails };
