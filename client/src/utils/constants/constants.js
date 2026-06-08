export const ORANGE = "#E8590C";
export const ORANGE_SOFT = "#FFF1E8";
export const INK = "#1A1D21";
export const SLATE = "#5B6470";
export const LINE = "#E6E9ED";
export const BG = "#F7F8FA";
export const GREEN = "#2F9E44";
export const GREEN_SOFT = "#EBFBEE";
export const AMBER = "#F08C00";
export const AMBER_SOFT = "#FFF9DB";
export const BLUE = "#1971C2";
export const BLUE_SOFT = "#E7F5FF";
export const RED = "#E03131";
export const RED_SOFT = "#FFF0F0";

export const PLANTS = [
  { code: "2010", name: "Nimbahera", region: "Rajasthan" },
  { code: "2025", name: "Panna", region: "Madhya Pradesh" },
  { code: "2040", name: "Muddapur", region: "Karnataka" },
];

export const MATERIALS = {
  "Ammonium Nitrate Emulsion (ANE)": { type: "Bulk", uom: "t" },
  "Ammonium Nitrate (AN)": { type: "Bulk", uom: "t" },
  "Bulk Emulsion": { type: "Bulk", uom: "t" },
  "Prill": { type: "Bulk", uom: "t" },
  "Detonator — 1.5m, 0.02s": { type: "Initiating Systems", uom: "ea" },
  "Booster — 400g": { type: "Initiating Systems", uom: "ea" },
  "Detonating Cord — 10g/m": { type: "Initiating Systems", uom: "m" },
};

export const LOW_PCT = 0.15;
export const HIGH_PCT = 0.92;

export const DAYS = ["Yesterday", "Today", "Tomorrow"];

export const STOCK_BASE = {
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

export const CUSTOMER_DELIVERY = {
  "2025": {
    Yesterday: { "Ammonium Nitrate (AN)": [["BK-7781", 38.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-7782", 41.0]], "Prill": [["BK-7783", 12.0]], "Detonator — 1.5m, 0.02s": [["BK-7781", 900]], "Booster — 400g": [["BK-7782", 420]] },
    Today: { "Ammonium Nitrate (AN)": [["BK-7791", 22.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-7792", 48.0]], "Prill": [["BK-7793", 14.0]], "Detonator — 1.5m, 0.02s": [["BK-7791", 600]], "Booster — 400g": [["BK-7792", 300]] },
    Tomorrow: { "Ammonium Nitrate (AN)": [["BK-7801", 36.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-7802", 30.0]], "Prill": [["BK-7803", 10.0]], "Detonator — 1.5m, 0.02s": [["BK-7801", 800]], "Booster — 400g": [["BK-7802", 250]] },
  },
  "2010": {
    Yesterday: { "Ammonium Nitrate (AN)": [["BK-3301", 20.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-3302", 25.0]], "Booster — 400g": [["BK-3301", 200]] },
    Today: { "Ammonium Nitrate (AN)": [["BK-3311", 18.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-3312", 22.0]], "Booster — 400g": [["BK-3311", 150]] },
    Tomorrow: { "Ammonium Nitrate (AN)": [["BK-3321", 24.0]], "Ammonium Nitrate Emulsion (ANE)": [["BK-3322", 10.0]], "Booster — 400g": [["BK-3321", 180]] },
  },
  "2040": {
    Yesterday: { "Ammonium Nitrate (AN)": [["BK-5501", 30.0]], "Prill": [["BK-5502", 8.0]], "Detonator — 1.5m, 0.02s": [["BK-5501", 400]] },
    Today: { "Ammonium Nitrate (AN)": [["BK-5511", 28.0]], "Prill": [["BK-5512", 6.0]], "Detonator — 1.5m, 0.02s": [["BK-5511", 350]] },
    Tomorrow: { "Ammonium Nitrate (AN)": [["BK-5521", 26.0]], "Prill": [["BK-5522", 5.0]], "Detonator — 1.5m, 0.02s": [["BK-5521", 300]] },
  },
};
