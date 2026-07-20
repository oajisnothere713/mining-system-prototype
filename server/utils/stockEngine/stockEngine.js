const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const Stock = require('../../models/Stock/Stock');
const Delivery = require('../../models/Delivery/Delivery');
const Booking = require('../../models/Schedule/Booking');

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

  // Get all bookings for this plant
  const bookings = await Booking.find({ plantCode });

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

  const formatD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayDate = new Date();
  const yestDate = new Date(); yestDate.setDate(todayDate.getDate() - 1);
  const tomDate = new Date(); tomDate.setDate(todayDate.getDate() + 1);

  const TODAY_STR = formatD(todayDate);
  const YEST_STR = formatD(yestDate);
  const TOM_STR = formatD(tomDate);

  // Group deliveries by material, state, and day label
  const completeDeliveriesByMaterialDay = {};
  const pendingDeliveriesByMaterialDay = {};

  for (const delivery of deliveries) {
    const dStr = formatD(new Date(delivery.date));
    let dayLabel = null;
    if (dStr === TODAY_STR) dayLabel = "Today";
    else if (dStr === YEST_STR) dayLabel = "Yesterday";
    else if (dStr === TOM_STR) dayLabel = "Tomorrow";
    
    if (!dayLabel) continue;

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
        if (!completeDeliveriesByMaterialDay[matName]) completeDeliveriesByMaterialDay[matName] = { Yesterday: [], Today: [], Tomorrow: [] };
        completeDeliveriesByMaterialDay[matName][dayLabel].push(item);
      } else if (delivery.state === 'physical_pending') {
        if (!pendingDeliveriesByMaterialDay[matName]) pendingDeliveriesByMaterialDay[matName] = { Yesterday: [], Today: [], Tomorrow: [] };
        pendingDeliveriesByMaterialDay[matName][dayLabel].push(item);
      }
    }
  }

  // Group bookings by material and day label
  const custDeliveriesByMaterialDay = {};
  


  for (const b of bookings) {
    if (b.status === "Cancelled") continue;

    let dayLabel = null;
    if (b.date === TODAY_STR) dayLabel = "Today";
    else if (b.date === YEST_STR) dayLabel = "Yesterday";
    else if (b.date === TOM_STR) dayLabel = "Tomorrow";
    
    if (!dayLabel) continue;

    for (const docket of b.deliveryDockets) {
      for (const prod of docket.products) {
        if (!prod.name) continue;
        const matName = prod.name;
        if (!custDeliveriesByMaterialDay[matName]) {
          custDeliveriesByMaterialDay[matName] = { Yesterday: [], Today: [], Tomorrow: [] };
        }
        custDeliveriesByMaterialDay[matName][dayLabel].push([b.blastNumber, prod.plannedQty]);
      }
    }
  }

  // Build the grid
  const grid = {};
  const days = ['Yesterday', 'Today', 'Tomorrow'];

  for (const [matName, matData] of Object.entries(materialMap)) {
    grid[matName] = {};

    let runningOpening = matData.opening;

    for (const day of days) {
      const pgrCList = (completeDeliveriesByMaterialDay[matName] && completeDeliveriesByMaterialDay[matName][day]) || [];
      const pgrPList = (pendingDeliveriesByMaterialDay[matName] && pendingDeliveriesByMaterialDay[matName][day]) || [];
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

  const formatD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayDate = new Date();
  const yestDate = new Date(); yestDate.setDate(todayDate.getDate() - 1);
  const tomDate = new Date(); tomDate.setDate(todayDate.getDate() + 1);

  const TODAY_STR = formatD(todayDate);
  const YEST_STR = formatD(yestDate);
  const TOM_STR = formatD(tomDate);
  
  const targetDateStr = day === 'Today' ? TODAY_STR : (day === 'Yesterday' ? YEST_STR : TOM_STR);

  if (column === 'pgrComplete' || column === 'pgrC') {
    const deliveries = await Delivery.find({
      plant: plant._id,
      state: 'complete',
      'lines.material': material._id,
    }).populate('lines.material');

    for (const del of deliveries) {
      const dStr = formatD(new Date(del.date));
      if (dStr !== targetDateStr) continue;

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
  } else if (column === 'pgrPending' || column === 'pgrP') {
    const deliveries = await Delivery.find({
      plant: plant._id,
      state: 'physical_pending',
      'lines.material': material._id,
    }).populate('lines.material');

    for (const del of deliveries) {
      const dStr = formatD(new Date(del.date));
      if (dStr !== targetDateStr) continue;

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
  } else if (column === 'customerDelivery' || column === 'cd') {
    const bookings = await Booking.find({ plantCode });

    for (const b of bookings) {
      if (b.status === "Cancelled") continue;
      if (b.date !== targetDateStr) continue;

      for (const docket of b.deliveryDockets) {
        for (const prod of docket.products) {
          if (prod.materialId === material._id.toString()) {
            breakdown.items.push([b.blastNumber, prod.plannedQty]);
            breakdown.total += prod.plannedQty;
          }
        }
      }
    }
  }

  return breakdown;
};

module.exports = { calculateStockGrid, getBreakdownDetails };
