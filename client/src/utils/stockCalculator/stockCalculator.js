import { MATERIALS, DAYS, STOCK_BASE, CUSTOMER_DELIVERY } from '../constants/constants';

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

export function buildStock(deliveries, plant, targetDateStr = "2026-06-22") {
  const base = STOCK_BASE[plant] || {};
  const matsSet = new Set(Object.keys(MATERIALS));
  
  // Scan deliveries to see if there are any new materials not in our global constants
  deliveries.forEach((d) => {
    if (d.plant === plant) {
      d.lines.forEach((ln) => {
        if (ln.material) matsSet.add(ln.material);
      });
    }
  });
  const mats = Array.from(matsSet);
  
  // Helper to map actual dates to the prototype's mock data labels
  const getMockDayLabel = (dateStr) => {
    if (dateStr === "2026-06-21") return "Yesterday";
    if (dateStr === "2026-06-22") return "Today";
    if (dateStr === "2026-06-23") return "Tomorrow";
    return null;
  };

  // Helper to filter inbound deliveries by date and state
  const inboundForDate = (dateStr, stateWanted) => {
    const out = {};
    const mockLabel = getMockDayLabel(dateStr);
    
    // In the prototype, all "complete" / "physical_pending" deliveries are assumed to arrive "Today" (2026-06-22)
    // If the date is not 2026-06-22, we return empty arrays for inbound deliveries
    if (mockLabel !== "Today") return out;

    deliveries
      .filter((d) => d.plant === plant && d.state === stateWanted)
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
      type: MATERIALS[m]?.type || 'Unknown',
      uom: MATERIALS[m]?.uom || '-',
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
    const mockLabel = getMockDayLabel(dateStr);
    const complete = inboundForDate(dateStr, "complete");
    const pending = inboundForDate(dateStr, "physical_pending");
    
    result[dateStr] = mats.map((m) => {
      const cap = base[m]?.capacity || 0;
      const opening = dateStr === "2026-06-21" ? (base[m]?.opening || 0) : prevClosing[m];
      
      const pgrCList = complete[m] || [];
      const pgrC = pgrCList.reduce((s, x) => s + x.qty, 0);
      
      const pgrPList = pending[m] || [];
      const pgrP = pgrPList.reduce((s, x) => s + x.qty, 0);
      
      const cdList = (mockLabel ? CUSTOMER_DELIVERY[plant]?.[mockLabel]?.[m] : null) || [];
      const cd = cdList.reduce((s, x) => s + x[1], 0);
      
      const closing = +(opening + pgrC + pgrP - cd).toFixed(2);
      
      return {
        material: m,
        type: MATERIALS[m]?.type || 'Unknown',
        uom: MATERIALS[m]?.uom || '-',
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
