import { MATERIALS, DAYS, STOCK_BASE } from '../constants/constants';

/**
 * Build an object mapping material names to arrays of inbound line items
 * for a given plant and delivery state.
 */
export function inboundByMaterial(deliveries, plant, stateWanted) {
  const out = {};
  deliveries
    .filter((d) => d.plant === plant && d.state === stateWanted)
    .forEach((d) => {
      d.lines.forEach((ln) => {
        (out[ln.material] = out[ln.material] || []).push({
          ibd: d.id,
          po: d.po,
          supplier: d.supplier,
          qty: ln.received,
        });
      });
    });
  return out;
}

/**
 * Build customer delivery data from real bookings for a specific date.
 * Returns { materialName: [[bookingId, qty], ...] }
 */
function customerDeliveryForDate(bookings, plant, dateStr) {
  const out = {};
  if (!bookings || !bookings.length) return out;

  bookings
    .filter((b) => {
      if (b.plantCode !== plant) return false;
      if (b.status === "cancelled") return false;
      // Check if booking covers this date
      if (b.endDate) return dateStr >= b.date && dateStr <= b.endDate;
      return b.date === dateStr;
    })
    .forEach((b) => {
      (b.deliveryDockets || []).forEach((dk) => {
        (dk.products || []).forEach((p) => {
          if (p.name && p.plannedQty) {
            (out[p.name] = out[p.name] || []).push([b._id || b.blastNumber, Number(p.plannedQty)]);
          }
        });
      });
    });
  return out;
}

export function buildStock(deliveries, plant, targetDateStr = "2026-06-22", bookings = [], masterMaterials = null) {
  const base = STOCK_BASE[plant] || {};
  
  // Use the master materials list from the API if provided,
  // otherwise fall back to the hardcoded MATERIALS constant
  let matsSet;
  let matsMeta = {}; // { name: { type, uom } }
  
  if (masterMaterials && masterMaterials.length > 0) {
    matsSet = new Set(masterMaterials.map(m => m.name));
    masterMaterials.forEach(m => {
      matsMeta[m.name] = { type: m.type || 'Unknown', uom: m.uom || '-' };
    });
  } else {
    matsSet = new Set(Object.keys(MATERIALS));
    Object.entries(MATERIALS).forEach(([name, info]) => {
      matsMeta[name] = { type: info.type || 'Unknown', uom: info.uom || '-' };
    });
  }
  
  // Also include materials from deliveries/bookings that might not be in the master list
  deliveries.forEach((d) => {
    if (d.plant === plant) {
      d.lines.forEach((ln) => {
        if (ln.material) {
          matsSet.add(ln.material);
          if (!matsMeta[ln.material]) {
            matsMeta[ln.material] = { type: 'Unknown', uom: '-' };
          }
        }
      });
    }
  });

  (bookings || []).forEach((b) => {
    if (b.plantCode === plant) {
      (b.deliveryDockets || []).forEach((dk) => {
        (dk.products || []).forEach((p) => {
          if (p.name) {
            matsSet.add(p.name);
            if (!matsMeta[p.name]) {
              matsMeta[p.name] = { type: p.category || 'Unknown', uom: p.uom || '-' };
            }
          }
        });
      });
    }
  });

  const mats = Array.from(matsSet);
  
  // Helper to filter inbound deliveries by date and state
  const inboundForDate = (dateStr, stateWanted) => {
    const out = {};
    
    // Safely parse YYYY-MM-DD to "D Mmm YYYY" avoiding browser timezone/locale issues
    const [yyyy, mm, dd] = dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${parseInt(dd, 10)} ${months[parseInt(mm, 10) - 1]} ${yyyy}`;
    
    deliveries
      .filter((d) => d.plant === plant && d.state === stateWanted && (d.date === formatted || d.date === dateStr))
      .forEach((d) => {
        d.lines.forEach((ln) => {
          (out[ln.material] = out[ln.material] || []).push({
            ibd: d.id || d.ibdNumber,
            po: d.po || d.poNumber,
            supplier: d.supplier,
            qty: ln.received,
          });
        });
      });
    return out;
  };

  const result = {};
  let prevClosing = {};

  const baseDate = new Date("2026-06-21");
  const end = new Date(targetDateStr);

  // If the selected date is before our prototype baseline, 
  // return a correctly structured ledger but with 0 values.
  if (end < baseDate) {
    result[targetDateStr] = mats.map((m) => ({
      material: m,
      type: matsMeta[m]?.type || 'Unknown',
      uom: matsMeta[m]?.uom || '-',
      capacity: base[m]?.capacity || 0,
      opening: 0,
      pgrC: 0,
      pgrP: 0,
      cd: 0,
      closing: 0,
      pgrCList: [],
      pgrPList: [],
      cdList: [],
    }));
    return result;
  }

  // Generate sequence of dates from 2026-06-21 up to targetDateStr
  const dates = [];
  let curr = new Date(baseDate);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  // Calculate rolling ledger
  dates.forEach((dateStr) => {
    const complete = inboundForDate(dateStr, "complete");
    const pending = inboundForDate(dateStr, "physical_pending");
    const cdMap = customerDeliveryForDate(bookings, plant, dateStr);
    
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
        material: m,
        type: matsMeta[m]?.type || 'Unknown',
        uom: matsMeta[m]?.uom || '-',
        capacity: cap,
        opening: +opening.toFixed(2),
        pgrC,
        pgrP,
        cd,
        closing,
        pgrCList,
        pgrPList,
        cdList,
      };
    });
    
    prevClosing = {};
    result[dateStr].forEach((r) => (prevClosing[r.material] = r.closing));
  });

  return result;
}
