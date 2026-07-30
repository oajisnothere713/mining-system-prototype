const Plant = require('../../models/Plant/Plant');
const Material = require('../../models/Material/Material');
const Delivery = require('../../models/Delivery/Delivery');
const Booking = require('../../models/Schedule/Booking');

const STOCK_BASE = {
  "2025": {
    "Ammonium Nitrate (AN)": { opening: 142.0, capacity: 200 },
    "Ammonium Nitrate Emulsion (ANE)": { opening: 88.0, capacity: 150 },
    "Bulk Emulsion": { opening: 40.0, capacity: 120 },
    "Prill": { opening: 54.0, capacity: 120 },
    "Detonator — 1.5m, 0.02s": { opening: 4200, capacity: 6000 },
    "Booster — 400g": { opening: 1500, capacity: 3000 },
  },
  "2010": {
    "Ammonium Nitrate (AN)": { opening: 90.0, capacity: 160 },
    "Ammonium Nitrate Emulsion (ANE)": { opening: 60.0, capacity: 120 },
    "Booster — 400g": { opening: 900, capacity: 2000 },
  },
  "2040": {
    "Ammonium Nitrate (AN)": { opening: 110.0, capacity: 180 },
    "Prill": { opening: 40.0, capacity: 100 },
    "Detonator — 1.5m, 0.02s": { opening: 2000, capacity: 4000 },
  },
};

function inboundByMaterial(deliveries, plant, stateWanted, dateStr) {
  const out = {};
  
  const [yyyy, mm, dd] = dateStr.split('-');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatted = `${parseInt(dd, 10)} ${months[parseInt(mm, 10) - 1]} ${yyyy}`;
  
  deliveries
    .filter((d) => d.plant.toString() === plant.toString() && d.state === stateWanted)
    .filter(d => {
       const dbDateStr = new Date(d.date).toISOString().split('T')[0];
       // Check if DB Date string matches YYYY-MM-DD or the old 'D Mmm YYYY' format from frontend
       return dbDateStr === dateStr || d.date === formatted || d.date === dateStr;
    })
    .forEach((d) => {
      d.lines.forEach((ln) => {
        const matName = ln.material.name;
        if (!matName) return;
        (out[matName] = out[matName] || []).push({
          ibd: d.ibdNumber || d.id,
          po: d.poNumber || d.po,
          supplier: d.supplier,
          qty: ln.received,
        });
      });
    });
  return out;
}

function customerDeliveryForDate(bookings, plantCode, dateStr) {
  const out = {};
  if (!bookings || !bookings.length) return out;

  bookings
    .filter((b) => {
      if (b.plantCode !== plantCode) return false;
      if (b.status === "Cancelled") return false;
      if (b.endDate) return dateStr >= b.date && dateStr <= b.endDate;
      return b.date === dateStr;
    })
    .forEach((b) => {
      (b.deliveryDockets || []).forEach((dk) => {
        (dk.products || []).forEach((p) => {
          if (p.name && p.plannedQty) {
            const qty = (p.actualQty !== null && p.actualQty !== undefined) ? Number(p.actualQty) : Number(p.plannedQty);
            (out[p.name] = out[p.name] || []).push([b.blastNumber || b._id, qty]);
          }
        });
      });
    });
  return out;
}

const buildStock = async (plantCode, targetDateStr = "2026-06-22") => {
  const plant = await Plant.findOne({ code: plantCode });
  if (!plant) throw new Error(`Plant ${plantCode} not found`);

  const deliveries = await Delivery.find({ plant: plant._id }).populate('lines.material');
  const bookings = await Booking.find({ plantCode });
  const masterMaterials = await Material.find({});

  const base = STOCK_BASE[plantCode] || {};
  
  let matsSet = new Set(masterMaterials.map(m => m.name));
  let matsMeta = {};
  masterMaterials.forEach(m => {
    matsMeta[m.name] = { type: m.type || 'Unknown', uom: m.uom || '-' };
  });

  const mats = Array.from(matsSet);
  
  const result = {};
  let prevClosing = {};

  const baseDate = new Date("2026-06-21");
  const end = new Date(targetDateStr);

  if (end < baseDate) {
    result[targetDateStr] = mats.map((m) => ({
      material: m,
      type: matsMeta[m]?.type || 'Unknown',
      uom: matsMeta[m]?.uom || '-',
      capacity: base[m]?.capacity || 0,
      opening: 0, pgrC: 0, pgrP: 0, cd: 0, closing: 0,
      pgrCList: [], pgrPList: [], cdList: [],
    }));
    return result;
  }

  const dates = [];
  let curr = new Date(baseDate);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  dates.forEach((dateStr) => {
    const complete = inboundByMaterial(deliveries, plant._id, "complete", dateStr);
    const pending = inboundByMaterial(deliveries, plant._id, "physical_pending", dateStr);
    const cdMap = customerDeliveryForDate(bookings, plantCode, dateStr);
    
    result[dateStr] = mats.map((m) => {
      const cap = base[m]?.capacity || 0;
      const opening = dateStr === "2026-06-21" ? (base[m]?.opening || 0) : prevClosing[m];
      
      const pgrCList = complete[m] || [];
      const pgrC = pgrCList.reduce((s, x) => s + x.qty, 0);
      
      const pgrPList = pending[m] || [];
      const pgrP = pgrPList.reduce((s, x) => s + x.qty, 0);
      
      const cdList = cdMap[m] || [];
      const cd = cdList.reduce((s, x) => s + x[1], 0);
      
      const closing = +(opening + pgrC + pgrP - cd).toFixed(2);
      
      return {
        material: m, type: matsMeta[m]?.type || 'Unknown', uom: matsMeta[m]?.uom || '-',
        capacity: cap, opening: +opening.toFixed(2), pgrC, pgrP, cd, closing,
        pgrCList, pgrPList, cdList,
      };
    });
    
    prevClosing = {};
    result[dateStr].forEach((r) => (prevClosing[r.material] = r.closing));
  });

  return result;
};

const calculateStockGrid = async (plantCode) => {
  const d = new Date();
  const formatD = (date) => date.toISOString().split('T')[0];
  
  const todayDate = new Date();
  const yestDate = new Date(); yestDate.setDate(todayDate.getDate() - 1);
  const tomDate = new Date(); tomDate.setDate(todayDate.getDate() + 1);

  const targetDateStr = formatD(tomDate); // compute up to tomorrow
  const allDays = await buildStock(plantCode, targetDateStr);
  
  const yestStr = formatD(yestDate);
  const todayStr = formatD(todayDate);
  const tomStr = formatD(tomDate);

  const grid = {};
  
  const processDay = (label, dateStr) => {
    const rows = allDays[dateStr] || [];
    rows.forEach(r => {
      if (!grid[r.material]) grid[r.material] = {};
      grid[r.material][label] = r;
    });
  };

  processDay('Yesterday', yestStr);
  processDay('Today', todayStr);
  processDay('Tomorrow', tomStr);
  
  return grid;
};

const calculateStockForAnyDate = async (plantCode, targetDateStr) => {
  const allDays = await buildStock(plantCode, targetDateStr);
  return allDays[targetDateStr] || [];
};

const getBreakdownDetails = async () => { return { items: [], total: 0 }; }; // Stub if needed

module.exports = { calculateStockGrid, getBreakdownDetails, calculateStockForAnyDate };
