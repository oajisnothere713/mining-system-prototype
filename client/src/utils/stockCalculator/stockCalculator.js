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

/**
 * Build the full stock table for a plant across all three days.
 * This is a client-side fallback when the API is unavailable.
 */
export function buildStock(deliveries, plant) {
  const base = STOCK_BASE[plant] || {};
  const mats = Object.keys(base);
  const complete = inboundByMaterial(deliveries, plant, "complete");
  const pending = inboundByMaterial(deliveries, plant, "physical_pending");
  const result = {};
  let prevClosing = {};

  DAYS.forEach((day) => {
    result[day] = mats.map((m) => {
      const cap = base[m].capacity;
      const opening = day === "Yesterday" ? base[m].opening : prevClosing[m];
      const pgrC = day === "Today" ? (complete[m] || []).reduce((s, x) => s + x.qty, 0) : 0;
      const pgrP = day === "Today" ? (pending[m] || []).reduce((s, x) => s + x.qty, 0) : 0;
      const cdList = (CUSTOMER_DELIVERY[plant]?.[day]?.[m]) || [];
      const cd = cdList.reduce((s, x) => s + x[1], 0);
      const closing = +(opening + pgrC + pgrP - cd).toFixed(2);
      return {
        material: m,
        type: MATERIALS[m].type,
        uom: MATERIALS[m].uom,
        capacity: cap,
        opening: +opening.toFixed(2),
        pgrC,
        pgrP,
        cd,
        closing,
        pgrCList: day === "Today" ? (complete[m] || []) : [],
        pgrPList: day === "Today" ? (pending[m] || []) : [],
        cdList,
      };
    });
    prevClosing = {};
    result[day].forEach((r) => (prevClosing[r.material] = r.closing));
  });

  return result;
}
