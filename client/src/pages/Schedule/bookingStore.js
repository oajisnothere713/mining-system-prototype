/* ============================================================
   bookingStore.js — SINGLE SOURCE OF TRUTH for bookings
   ------------------------------------------------------------
   Holds bookings in a MongoDB-ready nested shape:
     Blast (one blastNumber) -> deliveryDockets[] -> each docket
       = one vehicle + operators + shotfirers + products + services

   The board, planners and form ALL read/write through here.
   The read/write fns mirror Mongo (find / insertOne / updateOne)
   so swapping to a real DB later means replacing only these fns.
   ============================================================ */

/* ---------- MASTER DATA (shared by form + board + planners) ---------- */

export const PLANTS = [
  { code: "2010", name: "Nimbahera", region: "Rajasthan" },
  { code: "2025", name: "Panna",     region: "Madhya Pradesh" },
  { code: "2040", name: "Muddapur",  region: "Karnataka" },
];

export const CUSTOMERS = [
  { id: "6201", name: "JK Cement Works — Central",        sites: ["Panna Pit A", "Panna Pit B", "Itauri-Jharkua Block"] },
  { id: "6202", name: "Aggregate Resources Pvt Ltd",      sites: ["Chittorgarh Quarry", "Kadapa Block-3"] },
  { id: "6203", name: "Deccan Limestone & Minerals Ltd",  sites: ["Gulbarga Mine", "Tandur Quarry"] },
  { id: "6204", name: "Bharat Aggregates Pvt Ltd",        sites: ["Nagpur Quarry-1", "Nagpur Quarry-2"] },
  { id: "6205", name: "Satpura Stone Works",              sites: ["Pachmarhi Site", "Betul Quarry"] },
  { id: "6206", name: "Vindhya Cement & Mining Co",       sites: ["Satna Mine", "Maihar Pit"] },
  { id: "6207", name: "Coastal Granites Ltd",             sites: ["Ongole Quarry", "Prakasam Block"] },
  { id: "6208", name: "Hindusthan Roadstone Pvt Ltd",     sites: ["Pune Quarry", "Lonavala Pit"] },
  { id: "6209", name: "Eastern Coalfields Contractor — JV", sites: ["Raniganj Block-A", "Asansol Pit"] },
  { id: "6210", name: "Malwa Infra Materials Ltd",        sites: ["Ratlam Quarry", "Dewas Site"] },
  { id: "9999", name: "Draft Customer",                   sites: ["—"] },
];

/* Vehicles grouped by type, per plant */
export const VEHICLE_GROUPS_BY_PLANT = {
  "2025": [
    { type: "BMD Trucks",          hint: "Bulk Mixing & Delivery",              ids: ["MH-12-BMD-01", "MH-12-BMD-02", "MH-12-BMD-03"] },
    { type: "Blast Crew Vehicles", hint: "Carries blaster / shotfirer crew",    ids: ["MH-12-BCV-01", "MH-12-BCV-02"] },
    { type: "Support Trucks",      hint: "Survey, mark-out & ancillary support", ids: ["MH-12-SVY-01", "MH-12-SPT-01"] },
  ],
  "2010": [
    { type: "BMD Trucks",     hint: "Bulk Mixing & Delivery",               ids: ["MH-14-BMD-01", "MH-14-BMD-02"] },
    { type: "Support Trucks", hint: "Survey, mark-out & ancillary support",  ids: ["MH-14-SPT-01"] },
  ],
  "2040": [
    { type: "BMD Trucks",          hint: "Bulk Mixing & Delivery",           ids: ["KA-25-BMD-01", "KA-25-BMD-02"] },
    { type: "Blast Crew Vehicles", hint: "Carries blaster / shotfirer crew", ids: ["KA-25-BCV-01"] },
  ],
};

/* Crew grouped by role, per plant */
export const CREW_GROUPS_BY_PLANT = {
  "2025": [
    { role: "BMD Operators", hint: "Operate the bulk delivery trucks", members: [
      { id: "EMP-2025-01", name: "Ramesh Patil" },
      { id: "EMP-2025-02", name: "Suresh Yadav" },
      { id: "EMP-2025-03", name: "Blair Huntingdon" },
      { id: "EMP-2025-04", name: "Cas Davide" }
    ]},
    { role: "Blasters / Shotfirers", hint: "Statutory blasting crew", members: [
      { id: "EMP-2025-05", name: "Mike Sullivan" },
      { id: "EMP-2025-06", name: "Dan Brooks" }
    ]},
    { role: "Surveyors", hint: "Bore tracking & mark-out", members: [
      { id: "EMP-2025-07", name: "James Lee" },
      { id: "EMP-2025-08", name: "Priya Sharma" }
    ]},
  ],
  "2010": [
    { role: "BMD Operators", hint: "Operate the bulk delivery trucks", members: [
      { id: "EMP-2010-01", name: "Arjun Mehta" },
      { id: "EMP-2010-02", name: "Vikram Singh" }
    ]},
    { role: "Blasters / Shotfirers", hint: "Statutory blasting crew", members: [
      { id: "EMP-2010-03", name: "Rahul Verma" }
    ]},
    { role: "Surveyors", hint: "Bore tracking & mark-out", members: [
      { id: "EMP-2010-04", name: "Neha Joshi" }
    ]},
  ],
  "2040": [
    { role: "BMD Operators", hint: "Operate the bulk delivery trucks", members: [
      { id: "EMP-2040-01", name: "Kiran Rao" },
      { id: "EMP-2040-02", name: "Manoj Gowda" }
    ]},
    { role: "Blasters / Shotfirers", hint: "Statutory blasting crew", members: [
      { id: "EMP-2040-03", name: "Sandeep Nair" }
    ]},
    { role: "Surveyors", hint: "Bore tracking & mark-out", members: [
      { id: "EMP-2040-04", name: "Anita Desai" }
    ]},
  ],
};

export const CREW_MAP = {};
Object.values(CREW_GROUPS_BY_PLANT).forEach(plantGroups => {
  plantGroups.forEach(group => {
    group.members.forEach(m => {
      CREW_MAP[m.id] = m;
    });
  });
});

/* Product catalogue, grouped by category (generic, non-Orica) */
export const PRODUCT_CATS = [
  { cat: "BULK", items: [
    { id: "BULK-ANFO",   name: "ANFO",                       uom: "t" },
    { id: "BULK-ANFOWR", name: "ANFO (Water-Resistant)",     uom: "t" },
    { id: "BULK-EMUL",   name: "Bulk Emulsion",              uom: "t" },
    { id: "BULK-DOPE",   name: "Doped Emulsion Blend",       uom: "t" },
    { id: "BULK-HA3070", name: "Heavy ANFO 30:70",           uom: "t" },
    { id: "BULK-HA5050", name: "Heavy ANFO 50:50",           uom: "t" },
    { id: "BULK-PUMP",   name: "Pumpable Emulsion",          uom: "t" },
    { id: "BULK-WGEL",   name: "Watergel / Slurry",          uom: "t" },
    { id: "BULK-PRILL",  name: "AN Prill (Technical Grade)", uom: "t" },
    { id: "BULK-LDANFO", name: "Low-Density ANFO",           uom: "t" },
  ]},
  { cat: "IS&PE", items: [
    { id: "IS-EDET",  name: "Electronic Detonator",                 uom: "ea" },
    { id: "IS-ELSD",  name: "Electric Detonator (Short Delay)",     uom: "ea" },
    { id: "IS-ELLD",  name: "Electric Detonator (Long Delay)",      uom: "ea" },
    { id: "IS-STIH",  name: "Shock-Tube Detonator (In-hole Delay)", uom: "ea" },
    { id: "IS-STSF",  name: "Shock-Tube Detonator (Surface/TLD)",   uom: "ea" },
    { id: "IS-PLDET", name: "Plain Detonator No. 8",                uom: "ea" },
    { id: "IS-CB150", name: "Cast Booster 150g",                    uom: "ea" },
    { id: "IS-CB400", name: "Cast Booster 400g",                    uom: "ea" },
    { id: "IS-CB1K",  name: "Cast Booster 1kg",                     uom: "ea" },
    { id: "IS-DC5",   name: "Detonating Cord 5 g/m",                uom: "m"  },
    { id: "IS-DC10",  name: "Detonating Cord 10 g/m",               uom: "m"  },
    { id: "IS-RELAY", name: "Detonating Relay / Connector",         uom: "ea" },
    { id: "IS-CE32",  name: "Cartridge Emulsion 32mm",              uom: "ea" },
    { id: "IS-CE65",  name: "Cartridge Emulsion 65mm",              uom: "ea" },
    { id: "IS-PWG",   name: "Packaged Watergel Cartridge",          uom: "ea" },
    { id: "IS-FUSE",  name: "Safety Fuse",                          uom: "m"  },
  ]},
];

export const PRODUCT_MAP = {};
PRODUCT_CATS.forEach(c => c.items.forEach(p => { PRODUCT_MAP[p.id] = { ...p, cat: c.cat }; }));

export const SERVICES = [
  { id: "SVC-SETUP",  name: "Site Service & Setup",        uom: "ea"  },
  { id: "SVC-BMDOP",  name: "BMD Operation Charge",        uom: "hr"  },
  { id: "SVC-FIXED",  name: "Fixed Plant Charge",          uom: "day" },
  { id: "SVC-BORE",   name: "Bore Tracking / Hole Survey", uom: "m"   },
  { id: "SVC-MARK",   name: "Blast Mark-Out",              uom: "m"   },
  { id: "SVC-CLEAR",  name: "Blast Clearance & Guarding",  uom: "hr"  },
  { id: "SVC-DTH",    name: "Down-the-hole Loading",       uom: "hr"  },
  { id: "SVC-STEM",   name: "Stemming Service",            uom: "hr"  },
  { id: "SVC-DESIGN", name: "Blast Design & Consultancy",  uom: "ea"  },
  { id: "SVC-FUME",   name: "Post-Blast Fume Clearance",   uom: "hr"  },
];
export const SERVICE_MAP = {};
SERVICES.forEach(s => { SERVICE_MAP[s.id] = s; });

/* ---------- STATUS MODEL ---------- */
// Delivery-docket lifecycle
export const DOCKET_STATUS_ORDER = ["Planned", "In Progress", "Delivered", "Signed", "Submitted"];
// Blast (schedule) rolled-up status vocabulary
export const BLAST_STATUS_ORDER  = ["Planned", "In Progress", "Partially Delivered", "Delivered", "Ready to Bill", "Submitted"];

/* Roll docket statuses up into one blast-level status */
export function rollUpStatus(dockets) {
  if (!dockets || !dockets.length) return "Planned";
  const all = (s) => dockets.every(d => d.status === s);
  const any = (s) => dockets.some(d => d.status === s);
  if (all("Submitted")) return "Submitted";
  if (dockets.every(d => d.status === "Signed" || d.status === "Submitted")) return "Ready to Bill";
  if (dockets.every(d => ["Delivered", "Signed", "Submitted"].includes(d.status))) return "Delivered";
  if (any("Delivered") || any("Signed") || any("Submitted")) return "Partially Delivered";
  if (any("In Progress")) return "In Progress";
  return "Planned";
}

/* ---------- SEED BOOKINGS (migrated to nested-docket shape) ---------- */
/* helper to build a product line from a catalogue id */
const P = (id, qty) => {
  const m = PRODUCT_MAP[id];
  return { materialId: id, name: m.name, category: m.cat, plannedQty: qty, uom: m.uom, actualQty: null };
};
const S = (id, qty) => {
  const s = SERVICE_MAP[id];
  return { serviceId: id, name: s.name, qty, uom: s.uom };
};

const STORAGE_KEY = "mining_bookings_db";

const DEFAULT_BOOKINGS = [
  { _id:"BL-2025-041", blastNumber:"BL-2025-041", plantCode:"2025", date:"2026-06-02", startTime:"04:30",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit A", customerPO:"4500087201", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-041-01", status:"Submitted", vehicleId:"MH-12-BMD-01",
        operatorIds:["EMP-2025-01","EMP-2025-02"], shotfirerIds:["EMP-2025-05"],
        products:[P("BULK-EMUL",22), P("IS-EDET",400)], services:[S("SVC-SETUP",1)], notes:"", signature:null },
    ], status:"Submitted" },

  { _id:"BL-2025-042", blastNumber:"BL-2025-042", plantCode:"2025", date:"2026-06-02", startTime:"08:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit B", customerPO:"4500087202", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-042-01", status:"Submitted", vehicleId:"MH-12-BMD-02",
        operatorIds:["EMP-2025-03"], shotfirerIds:["EMP-2025-06"],
        products:[P("BULK-EMUL",18)], services:[], notes:"", signature:null },
    ], status:"Submitted" },

  { _id:"BL-2025-043", blastNumber:"BL-2025-043", plantCode:"2025", date:"2026-06-03", startTime:"04:30",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit A", customerPO:"4500087205", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-043-01", status:"Delivered", vehicleId:"MH-12-BMD-01",
        operatorIds:["EMP-2025-01"], shotfirerIds:["EMP-2025-05"],
        products:[P("BULK-ANFO",24), P("IS-EDET",300)], services:[], notes:"", signature:null },
    ], status:"Delivered" },

  { _id:"BL-2025-044", blastNumber:"BL-2025-044", plantCode:"2025", date:"2026-06-03", startTime:"07:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6202", customerName:"Aggregate Resources Pvt Ltd", shipToSite:"Chittorgarh Quarry", customerPO:"4500087210", contractId:"C-ARP-23",
    deliveryDockets:[
      { docketNumber:"BL-2025-044-01", status:"Delivered", vehicleId:"MH-12-BMD-02",
        operatorIds:["EMP-2025-04"], shotfirerIds:["EMP-2025-06"],
        products:[P("BULK-EMUL",15)], services:[], notes:"", signature:null },
    ], status:"Delivered" },

  /* Multi-day blast with TWO dockets (two vehicles, same blast number) */
  { _id:"BL-2025-045", blastNumber:"BL-2025-045", plantCode:"2025", date:"2026-06-04", startTime:"04:30",
    bookingType:"multi", endDate:"2026-06-05", recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit A", customerPO:"4500087215", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-045-01", status:"In Progress", vehicleId:"MH-12-BMD-01",
        operatorIds:["EMP-2025-02","EMP-2025-01"], shotfirerIds:["EMP-2025-05"],
        products:[P("BULK-EMUL",42), P("IS-CB400",400)], services:[S("SVC-BMDOP",2)], notes:"", signature:null },
      { docketNumber:"BL-2025-045-02", status:"Planned", vehicleId:"MH-12-BCV-01",
        operatorIds:[], shotfirerIds:["EMP-2025-05","EMP-2025-06"],
        products:[], services:[S("SVC-CLEAR",1)], notes:"Crew support truck", signature:null },
    ], status:"In Progress" },

  { _id:"BL-2025-046", blastNumber:"BL-2025-046", plantCode:"2025", date:"2026-06-04", startTime:"06:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Itauri-Jharkua Block", customerPO:"4500087216", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-046-01", status:"Planned", vehicleId:"MH-12-BMD-02",
        operatorIds:["EMP-2025-03"], shotfirerIds:["EMP-2025-06"],
        products:[P("BULK-ANFO",18)], services:[], notes:"", signature:null },
    ], status:"Planned" },

  { _id:"BL-2025-047", blastNumber:"BL-2025-047", plantCode:"2025", date:"2026-06-05", startTime:"11:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit B", customerPO:"4500087220", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-047-01", status:"Planned", vehicleId:"MH-12-BMD-01",
        operatorIds:["EMP-2025-01"], shotfirerIds:["EMP-2025-05"],
        products:[P("BULK-EMUL",22), P("IS-EDET",400)], services:[], notes:"", signature:null },
    ], status:"Planned" },

  { _id:"BL-2025-048", blastNumber:"BL-2025-048", plantCode:"2025", date:"2026-06-05", startTime:"08:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6202", customerName:"Aggregate Resources Pvt Ltd", shipToSite:"Kadapa Block-3", customerPO:"4500087221", contractId:"C-ARP-23",
    deliveryDockets:[
      { docketNumber:"BL-2025-048-01", status:"Planned", vehicleId:"MH-12-BMD-02",
        operatorIds:["EMP-2025-04"], shotfirerIds:["EMP-2025-06"],
        products:[P("BULK-EMUL",12)], services:[], notes:"", signature:null },
    ], status:"Planned" },

  /* Recurring instances (each independent), share a crew vehicle */
  { _id:"BL-2025-049", blastNumber:"BL-2025-049", plantCode:"2025", date:"2026-06-04", startTime:"05:00",
    bookingType:"recurring", endDate:null, recurrence:{frequency:"daily", endDate:"2026-06-06", workingDaysOnly:true, occurrences:3},
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit A", customerPO:"4500087230", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-049-01", status:"In Progress", vehicleId:"MH-12-BCV-01",
        operatorIds:[], shotfirerIds:["EMP-2025-05","EMP-2025-06"],
        products:[], services:[S("SVC-CLEAR",1)], notes:"", signature:null },
    ], status:"In Progress" },

  { _id:"BL-2025-049b", blastNumber:"BL-2025-049b", plantCode:"2025", date:"2026-06-05", startTime:"05:00",
    bookingType:"recurring", endDate:null, recurrence:{frequency:"daily", endDate:"2026-06-06", workingDaysOnly:true, occurrences:3},
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit A", customerPO:"4500087230", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-049b-01", status:"Planned", vehicleId:"MH-12-BCV-01",
        operatorIds:[], shotfirerIds:["EMP-2025-05","EMP-2025-06"],
        products:[], services:[S("SVC-CLEAR",1)], notes:"", signature:null },
    ], status:"Planned" },

  { _id:"BL-2025-052", blastNumber:"BL-2025-052", plantCode:"2025", date:"2026-06-04", startTime:"04:00",
    bookingType:"single", endDate:null, recurrence:null,
    customerId:"6201", customerName:"JK Cement Works — Central", shipToSite:"Panna Pit B", customerPO:"4500087235", contractId:"C-JKC-24",
    deliveryDockets:[
      { docketNumber:"BL-2025-052-01", status:"Planned", vehicleId:"MH-12-SVY-01",
        operatorIds:["EMP-2025-07"], shotfirerIds:[],
        products:[], services:[S("SVC-MARK",1)], notes:"", signature:null },
    ], status:"Planned" },
];

let bookings = [];

const API_URL = "/api/bookings";

export async function fetchBookings() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    if (json.success) {
      bookings = json.data || [];
    }
  } catch (err) {
    console.error("Network error fetching bookings:", err);
    bookings = [];
  }
}

/* ---------- READ ---------- */
export const getBookings = () => bookings;
export const getBookingsByPlant = (plantCode) => bookings.filter(b => b.plantCode === plantCode);
export const getBookingById = (id) => bookings.find(b => b._id === id) || null;

/* ---------- WRITE (Optimistic + API sync) ---------- */
function handleApiError(err, previousState, actionName) {
  console.error(`Optimistic ${actionName} failed, rolling back!`, err);
  bookings = previousState;
  window.dispatchEvent(new CustomEvent('booking-rollback', { detail: `Failed to ${actionName} booking. Changes have been reverted.` }));
}

function handleResponse(res) {
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
}

export function addBooking(doc) {
  const previousState = [...bookings];
  bookings = [...bookings, doc];
  fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "add"));
  return doc;
}
export function updateBooking(id, changes) {
  const previousState = [...bookings];
  bookings = bookings.map(b => b._id === id ? { ...b, ...changes, updatedAt: new Date().toISOString() } : b);
  fetch(`${API_URL}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "update"));
  return getBookingById(id);
}
export function replaceBooking(doc) {
  const previousState = [...bookings];
  const exists = bookings.some(b => b._id === doc._id);
  bookings = exists ? bookings.map(b => b._id === doc._id ? doc : b) : [...bookings, doc];
  
  const req = exists 
    ? fetch(`${API_URL}/${doc._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) })
    : fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) });
    
  req.then(handleResponse).catch(err => handleApiError(err, previousState, "save"));
  return doc;
}
export function deleteBooking(id) {
  const previousState = [...bookings];
  bookings = bookings.filter(b => b._id !== id);
  fetch(`${API_URL}/${id}`, { method: "DELETE" })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "delete"));
}

/* ---------- NEXT BLAST NUMBER (unique) ---------- */
export function nextBlastNumber(plantCode = "2025") {
  let max = 0;
  bookings.forEach(b => {
    const m = /BL-\d{4}-(\d+)/.exec(b.blastNumber);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "BL-2025-" + String(max + 1).padStart(3, "0");
}

/* ---------- CONFLICT / AVAILABILITY HELPERS (board + planners + form) ---------- */
function blastCoversDate(b, dateKey) {
  if (!dateKey) return false;
  if (b.endDate) return dateKey >= b.date && dateKey <= b.endDate;
  return b.date === dateKey;
}
/* returns array of blastNumbers a vehicle is committed to on a date (optionally excluding one blast) */
export function vehicleAssignments(vehicleId, dateKey, excludeBlast = null) {
  const out = [];
  bookings.forEach(b => {
    if (b.status === "Cancelled") return;
    if (excludeBlast && b._id === excludeBlast) return;
    if (!blastCoversDate(b, dateKey)) return;
    (b.deliveryDockets || []).forEach(dk => { if (dk.vehicleId === vehicleId) out.push(b.blastNumber); });
  });
  return out;
}
/* returns array of blastNumbers a person (operator or shotfirer) is committed to on a date */
export function personAssignments(person, dateKey, excludeBlast = null) {
  const out = [];
  bookings.forEach(b => {
    if (b.status === "Cancelled") return;
    if (excludeBlast && b._id === excludeBlast) return;
    if (!blastCoversDate(b, dateKey)) return;
    (b.deliveryDockets || []).forEach(dk => {
      if ([...(dk.operatorIds || []), ...(dk.shotfirerIds || [])].includes(person)) out.push(b.blastNumber);
    });
  });
  return out;
}
/* a vehicle/person is double-booked on a date if assigned to >1 distinct blast */
export function isVehicleConflicted(vehicleId, dateKey) {
  return new Set(vehicleAssignments(vehicleId, dateKey)).size > 1;
}
export function isPersonConflicted(person, dateKey) {
  return new Set(personAssignments(person, dateKey)).size > 1;
}
