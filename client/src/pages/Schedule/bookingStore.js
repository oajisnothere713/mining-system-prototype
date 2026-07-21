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
export let PRODUCT_CATS = [];
export let PRODUCT_MAP = {};

export async function fetchMaterials() {
  try {
    const res = await fetch("/api/materials");
    const json = await res.json();
    if (json.success) {
      const byType = { BULK: [], "IS&PE": [] };
      
      json.data.forEach(m => {
        const cat = m.type === "Bulk" ? "BULK" : "IS&PE";
        byType[cat].push({ id: m._id, name: m.name, uom: m.uom, cat });
      });

      PRODUCT_CATS = [
        { cat: "BULK", items: byType.BULK },
        { cat: "IS&PE", items: byType["IS&PE"] }
      ];

      PRODUCT_MAP = {};
      PRODUCT_CATS.forEach(c => c.items.forEach(p => { PRODUCT_MAP[p.id] = p; }));
    }
  } catch (err) {
    console.error("Network error fetching materials:", err);
  }
}

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

const formatDbStatus = (s) => {
  if (!s) return s;
  const lower = s.toLowerCase();
  return lower === "in progress" ? "inprogress" : lower;
};

export function addBooking(doc) {
  const previousState = [...bookings];
  if (doc.status) doc.status = formatDbStatus(doc.status);
  if (doc.deliveryDockets) {
    doc.deliveryDockets.forEach(dk => { if (dk.status) dk.status = formatDbStatus(dk.status); });
  }
  bookings = [...bookings, doc];
  fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "add"));
  return doc;
}
export function updateBooking(id, changes) {
  const previousState = [...bookings];
  if (changes.status) changes.status = formatDbStatus(changes.status);
  bookings = bookings.map(b => b._id === id ? { ...b, ...changes, updatedAt: new Date().toISOString() } : b);
  fetch(`${API_URL}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "update"));
  return getBookingById(id);
}
export function updateDocketStatus(bookingId, docketNumber, newStatus) {
  const previousState = [...bookings];
  const b = bookings.find(x => x._id === bookingId);
  if (!b) return null;
  const clone = { ...b, deliveryDockets: b.deliveryDockets.map(dk => dk.docketNumber === docketNumber ? { ...dk, status: formatDbStatus(newStatus) } : dk) };
  clone.status = formatDbStatus(rollUpStatus(clone.deliveryDockets));
  bookings = bookings.map(x => x._id === bookingId ? clone : x);
  fetch(`${API_URL}/${bookingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clone) })
    .then(handleResponse)
    .catch(err => handleApiError(err, previousState, "update docket"));
  return clone;
}
export function replaceBooking(doc) {
  const previousState = [...bookings];
  if (doc.status) doc.status = formatDbStatus(doc.status);
  if (doc.deliveryDockets) {
    doc.deliveryDockets.forEach(dk => { if (dk.status) dk.status = formatDbStatus(dk.status); });
  }
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
    if (b.status === "Cancelled" || b.status === "Submitted") return;
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
    if (b.status === "Cancelled" || b.status === "Submitted") return;
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
