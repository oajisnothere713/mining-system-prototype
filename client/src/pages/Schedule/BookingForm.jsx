import React, { useState, useMemo, useEffect } from "react";
import "./BookingForm.css";
import CustomSelect from "../../components/ui/CustomSelect";
import CustomDatePicker from "../../components/ui/CustomDatePicker";
import CustomTimePicker from "../../components/ui/CustomTimePicker";
import {
  CUSTOMERS, VEHICLE_GROUPS_BY_PLANT, CREW_GROUPS_BY_PLANT,
  PRODUCT_CATS, PRODUCT_MAP, SERVICES, SERVICE_MAP,
  getBookingById, addBooking, replaceBooking, nextBlastNumber,
  vehicleAssignments, personAssignments,
} from "./bookingStore";

const ON_LEAVE = { "EMP-2025-04": ["2026-06-05"] }; // Cas Davide
const onLeave = (id, d) => (ON_LEAVE[id] || []).includes(d);

function initials(name) { return name.split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join(""); }
function avatarHue(name) { const hues = [22, 215, 142, 265, 186, 35]; return hues[name.charCodeAt(0) % hues.length]; }

function emptyDocket() {
  return { vehicleId: "", operatorIds: [], shotfirerIds: [], products: [{ materialId: "", plannedQty: "" }], services: [], notes: "" };
}

function docToForm(doc) {
  return {
    _id: doc._id, blastNumber: doc.blastNumber, date: doc.date, startTime: doc.startTime || "04:30",
    bookingType: doc.bookingType || "single", endDate: doc.endDate || "",
    recFreq: doc.recurrence ? (doc.recurrence.frequency === "weekly" ? "Weekly" : "Daily") : "Daily",
    recEnd: doc.recurrence ? doc.recurrence.endDate : "",
    recWorkingOnly: doc.recurrence ? !!doc.recurrence.workingDaysOnly : true,
    customerId: doc.customerId || "", shipToSite: doc.shipToSite || "", customerPO: doc.customerPO || "", contract: doc.contractId || "",
    dockets: (doc.deliveryDockets || []).map(dk => ({
      vehicleId: dk.vehicleId || "", operatorIds: [...(dk.operatorIds || [])], shotfirerIds: [...(dk.shotfirerIds || [])],
      products: (dk.products && dk.products.length ? dk.products.map(p => ({ materialId: p.materialId, plannedQty: p.plannedQty })) : [{ materialId: "", plannedQty: "" }]),
      services: (dk.services || []).map(s => ({ serviceId: s.serviceId, qty: s.qty })),
      notes: dk.notes || "",
    })),
  };
}

export default function BookingForm({ plant, editBlastId = null, expandDocket = null, onClose, onSaved }) {
  const plantCode = plant?.code || "2025";
  const plantName = plant?.name || "Panna";

  const isEdit = !!editBlastId;
  const [f, setF] = useState(() => {
    if (isEdit) {
      const doc = getBookingById(editBlastId);
      if (doc) return docToForm(doc);
    }
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const nextNum = nextBlastNumber(plantCode);
    return {
      _id: nextNum, blastNumber: nextNum,
      date: todayStr, startTime: "04:30", bookingType: "single", endDate: todayStr,
      recFreq: "Daily", recEnd: "2026-07-31", recWorkingOnly: true,
      customerId: "", shipToSite: "", customerPO: "", contract: "",
      dockets: [emptyDocket()],
    };
  });

  const [saveAttempted, setSaveAttempted] = useState(false);
  const [accOpen, setAccOpen] = useState({ BULK: true, "IS&PE": true });

  const VEHICLE_GROUPS = VEHICLE_GROUPS_BY_PLANT[plantCode] || [];
  const CREW_GROUPS = CREW_GROUPS_BY_PLANT[plantCode] || [];
  const OPERATORS = (CREW_GROUPS.find(g => /operator/i.test(g.role)) || { members: [] }).members;
  const SHOTFIRERS = (CREW_GROUPS.find(g => /blaster|shotfirer/i.test(g.role)) || { members: [] }).members;

  const set = (patch) => setF(prev => ({ ...prev, ...patch }));
  const setDocket = (di, patch) => setF(prev => {
    const dockets = prev.dockets.map((d, i) => i === di ? { ...d, ...patch } : d);
    return { ...prev, dockets };
  });

  const customer = () => CUSTOMERS.find(c => c.id === f.customerId);

  const occ = useMemo(() => {
    if (f.bookingType !== "recurring" || !f.date || !f.recEnd) return 0;
    const s = new Date(f.date + "T00:00:00"), e = new Date(f.recEnd + "T00:00:00");
    if (e < s) return 0;
    let n = 0;
    if (f.recFreq === "Daily") {
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const w = d.getDay();
        if (f.recWorkingOnly && (w === 0 || w === 6)) continue;
        n++;
      }
    } else {
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 7)) n++;
    }
    return n;
  }, [f.bookingType, f.date, f.recEnd, f.recFreq, f.recWorkingOnly]);

  const recSummary = () => {
    if (!f.date || !f.recEnd) return "Set a start and end date to preview the schedule.";
    const fmtDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const dow = (s) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(s + "T00:00:00").getDay()];
    if (f.recFreq === "Daily") return `Repeats daily at ${f.startTime}, ${f.recWorkingOnly ? "Monday to Friday" : "every day"}, from ${fmtDate(f.date)} until ${fmtDate(f.recEnd)} — creates ${occ} separate booking${occ !== 1 ? "s" : ""}`;
    return `Repeats weekly on ${dow(f.date)} at ${f.startTime}, from ${fmtDate(f.date)} until ${fmtDate(f.recEnd)} — creates ${occ} separate booking${occ !== 1 ? "s" : ""}`;
  };

  const validationOk = () => {
    if (!(f.date && f.customerId && f.shipToSite)) return false;
    if (f.bookingType === "multi" && !f.endDate) return false;
    if (f.bookingType === "recurring" && (!f.recEnd || occ < 1)) return false;
    return f.dockets.length > 0 && f.dockets.every(dk =>
      dk.vehicleId && (dk.products.some(p => p.materialId && p.plannedQty) || dk.services.length > 0)
    );
  };

  const missingItems = () => {
    const items = [];
    if (!f.date) items.push("Delivery date");
    if (!f.customerId) items.push("Customer");
    if (!f.shipToSite) items.push("Ship-to site");
    if (f.bookingType === "multi" && !f.endDate) items.push("End date for multi-day booking");
    if (f.bookingType === "recurring" && (!f.recEnd || occ < 1)) items.push("Recurrence end date");
    f.dockets.forEach((dk, i) => {
      if (!dk.vehicleId) items.push(`Docket ${i + 1}: Vehicle`);
      if (!dk.products.some(p => p.materialId && p.plannedQty) && !dk.services.length)
        items.push(`Docket ${i + 1}: Products or services`);
    });
    return items;
  };

  const buildDoc = () => {
    const c = customer(); const now = new Date().toISOString();
    return {
      _id: f._id, blastNumber: f._id, plantCode: plantCode,
      date: f.date, startTime: f.startTime,
      bookingType: f.bookingType,
      endDate: f.bookingType === "multi" ? f.endDate : null,
      recurrence: f.bookingType === "recurring" ? { frequency: f.recFreq.toLowerCase(), endDate: f.recEnd, workingDaysOnly: f.recWorkingOnly, occurrences: occ } : null,
      customerId: f.customerId, customerName: c ? c.name : "", shipToSite: f.shipToSite,
      customerPO: f.customerPO, contractId: f.contract || null, status: "Planned",
      deliveryDockets: f.dockets.map((dk, i) => ({
        docketNumber: `${f._id}-${String(i + 1).padStart(2, "0")}`,
        status: "Planned",
        vehicleId: dk.vehicleId,
        operatorIds: dk.operatorIds, shotfirerIds: dk.shotfirerIds,
        products: dk.products.filter(p => p.materialId && p.plannedQty).map(p => {
          const m = PRODUCT_MAP[p.materialId];
          return { materialId: p.materialId, name: m ? m.name : p.materialId, category: m ? m.cat : null, plannedQty: Number(p.plannedQty), uom: m ? m.uom : null, actualQty: null };
        }),
        services: dk.services.map(s => {
          const sv = SERVICE_MAP[s.serviceId];
          return { serviceId: s.serviceId, name: sv ? sv.name : s.serviceId, qty: Number(s.qty) || 1, uom: sv ? sv.uom : "ea" };
        }),
        notes: dk.notes || "", signature: null
      })),
      createdAt: now, updatedAt: now
    };
  };

  const save = () => {
    if (!validationOk()) { setSaveAttempted(true); return; }
    const doc = buildDoc();
    if (isEdit) replaceBooking(doc); else addBooking(doc);
    onSaved && onSaved(doc);
  };

  const fmtDate = (s) => !s ? "—" : new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const dayFullStr = (s) => !s ? "" : new Date(s + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const cust = customer();
  const ok = validationOk();
  const missing = missingItems();

  const schedDone = !!(f.date && f.startTime);
  const custDone = !!(f.customerId && f.shipToSite);
  const dksDone = f.dockets.length > 0 && f.dockets.every(dk => dk.vehicleId && (dk.products.some(p => p.materialId && p.plannedQty) || dk.services.length > 0));

  const toggleProductCat = (cat) => setAccOpen(prev => ({ ...prev, [cat]: !prev[cat] }));

  const renderProductRow = (di, p, pi) => {
    const m = p.materialId ? PRODUCT_MAP[p.materialId] : null;
    const uom = m ? m.uom : "—";
    const cat = m ? m.cat : null;
    const catStyles = { BULK: { bg: "#EAF4FF", c: "#1762A8" }, "IS&PE": { bg: "#F3EEFF", c: "#6B3FC4" } };
    const cs = cat ? catStyles[cat] : null;
    return (
      <div key={pi} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, maxWidth: 760 }}>
        {cs && <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 5, background: cs.bg, color: cs.c, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: .3, flexShrink: 0 }}>{cat}</span>}
        <CustomSelect className="fld" value={p.materialId} onChange={val => {
          const newProducts = [...f.dockets[di].products];
          newProducts[pi].materialId = val;
          setDocket(di, { products: newProducts });
        }} style={{ flex: 1, fontSize: 13.5 }} placeholder="Select product…" options={PRODUCT_CATS.flatMap(c => [
          { label: c.cat, isHeader: true },
          ...c.items.map(pp => ({ value: pp.id, label: pp.name }))
        ])} />
        <input className="fld" type="number" min="0" placeholder="Qty" value={p.plannedQty || ""} onChange={e => {
          const newProducts = [...f.dockets[di].products];
          newProducts[pi].plannedQty = e.target.value;
          setDocket(di, { products: newProducts });
        }} style={{ width: 88 }} />
        <span style={{ width: 34, textAlign: "center", fontSize: 13, color: "#5B6470", fontWeight: 600, flexShrink: 0 }}>{uom}</span>
        <button className="icon-btn" onClick={() => {
          let newProducts = [...f.dockets[di].products];
          newProducts.splice(pi, 1);
          if (!newProducts.length) newProducts = [{ materialId: "", plannedQty: "" }];
          setDocket(di, { products: newProducts });
        }}><i className="ti ti-x" style={{ fontSize: 13 }}></i></button>
      </div>
    );
  };

  return (
    <div className="bf-wrap">
      {/* Sticky Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(236,239,243,.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid #D3D9E2" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 12 }}>
            <button className="chip" style={{ gap: 6 }} onClick={onClose}><i className="ti ti-arrow-left" style={{ fontSize: 14 }}></i> Board</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -.4, margin: 0 }}>{isEdit ? "Edit Booking" : "Create Booking"}</h1>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#E8590C" }}>{f._id}</span>
                <span className="pill" style={{ background: "#E7F5FF", color: "#1971C2" }}>PLANNED</span>
                <span style={{ fontSize: 13, color: "#5B6470" }}>· {plantName} ({plantCode})</span>
              </div>
            </div>
            <button className="chip" style={{ padding: "9px 16px" }} onClick={onClose}>Cancel</button>
            <div className="saveWrap" style={{ position: "relative" }}>
              <button onClick={save} style={{ padding: "10px 24px", border: "none", background: ok ? "#E8590C" : "#D0D4DA", color: ok ? "#fff" : "#9AA0A8", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: ok ? "pointer" : "not-allowed", letterSpacing: -.2, transition: "background .15s, transform .1s" }}>{isEdit ? "Save Changes" : "Save Booking"}</button>
              {!ok && missing.length > 0 && (
                <div className="missingTip" style={{ display: "none", position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#1A1D21", color: "#E2E5EA", borderRadius: 12, padding: "14px 16px", fontSize: 12.5, lineHeight: 1.75, minWidth: 248, zIndex: 200, boxShadow: "0 10px 30px rgba(0,0,0,.3)", pointerEvents: "none", animation: "slideDown .15s ease" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#F4A96A", textTransform: "uppercase", letterSpacing: .6, marginBottom: 10 }}>Still needed to save</div>
                  {missing.map((m, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "1px 0" }}>
                      <i className="ti ti-point-filled" style={{ color: "#E8590C", fontSize: 11, flexShrink: 0, marginTop: 3 }}></i>{m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {[[schedDone, "Schedule", "ti-calendar-event"], [custDone, "Customer & Site", "ti-building"], [dksDone, "Delivery Dockets", "ti-clipboard-list"]].map((step, i) => {
              const [done, label, icon] = step;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <i className="ti ti-chevron-right" style={{ color: "#B8BFC8", fontSize: 11 }}></i>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px 4px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: done ? "#EBFBEE" : "#fff", color: done ? "#2F9E44" : "#5B6470", border: `1px solid ${done ? "#ABEDC2" : "#DDE1E7"}` }}>
                    <i className={`ti ${done ? "ti-circle-check-filled" : icon}`} style={{ fontSize: 13 }}></i> {label}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Schedule Card */}
          <div className="bf-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
              <span className={`sec-ic ${schedDone ? "done" : ""}`}><i className={`ti ${schedDone ? "ti-circle-check-filled" : "ti-calendar-event"}`} style={{ fontSize: 18 }}></i></span>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -.2 }}>Schedule</span>
              {schedDone && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", background: "#EBFBEE", color: "#2F9E44", borderRadius: 100 }}>Complete ✓</span>}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1.4 }}>
                <label className="lbl">Delivery Date <span style={{ color: "#E8590C" }}>*</span></label>
                <CustomDatePicker className={`fld ${saveAttempted && !f.date ? "err" : ""}`} value={f.date} onChange={val => set({ date: val })} />
                {saveAttempted && !f.date && <div style={{ marginTop: 4, fontSize: 12, color: "#E03131", display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }}></i> Required</div>}
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl">Start Time</label>
                <CustomTimePicker className="fld" value={f.startTime} onChange={val => set({ startTime: val })} />
              </div>
            </div>
            {f.date ? (
              <div style={{ marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 6, background: "#F5F6F8", border: "1px solid #E4E8ED", borderRadius: 7, padding: "5px 10px", fontSize: 12.5, color: "#5B6470" }}>
                <i className="ti ti-calendar-stats" style={{ color: "#E8590C", fontSize: 13 }}></i>{dayFullStr(f.date)}
              </div>
            ) : <div style={{ marginBottom: 18 }}></div>}

            <label className="lbl">Booking Type</label>
            <div style={{ display: "flex", gap: 8, marginBottom: f.bookingType !== "single" ? 18 : 0 }}>
              {[["single", "Single Day", "ti-calendar"], ["multi", "Multi-Day", "ti-calendar-week"], ["recurring", "Recurring", "ti-repeat"]].map(([val, label, icon]) => {
                const on = f.bookingType === val;
                return (
                  <button key={val} onClick={() => set({ bookingType: val })} style={{ flex: 1, padding: "12px 8px", border: `1px solid ${on ? "#E8590C" : "#E4E8ED"}`, background: on ? "#FFF1E8" : "#fff", color: on ? "#E8590C" : "#5B6470", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all .12s" }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 20 }}></i>{label}
                  </button>
                );
              })}
            </div>

            {f.bookingType === "multi" && (
              <div>
                <label className="lbl">End Date <span style={{ color: "#E8590C" }}>*</span></label>
                <CustomDatePicker className={`fld ${saveAttempted && !f.endDate ? "err" : ""}`} value={f.endDate} min={f.date} onChange={val => set({ endDate: val })} />
                {f.endDate && (
                  <div style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 6, background: "#F5F6F8", border: "1px solid #E4E8ED", borderRadius: 7, padding: "5px 10px", fontSize: 12.5, color: "#5B6470" }}>
                    <i className="ti ti-clock" style={{ color: "#E8590C", fontSize: 13 }}></i>{Math.round((new Date(f.endDate + "T00:00:00") - new Date(f.date + "T00:00:00")) / 86400000) + 1} days total · ends {fmtDate(f.endDate)}
                  </div>
                )}
              </div>
            )}
            {f.bookingType === "recurring" && (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}><label className="lbl">Frequency</label>
                    <CustomSelect className="fld" value={f.recFreq} onChange={val => set({ recFreq: val })} options={["Daily", "Weekly"]} />
                  </div>
                  <div style={{ flex: 1 }}><label className="lbl">Repeat Until <span style={{ color: "#E8590C" }}>*</span></label>
                    <CustomDatePicker className={`fld ${saveAttempted && !f.recEnd ? "err" : ""}`} value={f.recEnd} min={f.date} onChange={val => set({ recEnd: val })} />
                  </div>
                </div>
                {f.recFreq === "Daily" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#1A1D21", marginBottom: 13, cursor: "pointer", fontWeight: 500 }}>
                    <input type="checkbox" checked={f.recWorkingOnly} onChange={e => set({ recWorkingOnly: e.target.checked })} style={{ width: 15, height: 15, accentColor: "#E8590C" }} /> Working days only (Mon–Fri)
                  </label>
                )}
                <div style={{ fontSize: 13, color: "#1A5C8F", background: "#E7F5FF", border: "1px solid #BDD8F5", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 9, alignItems: "flex-start", lineHeight: 1.55 }}>
                  <i className="ti ti-repeat" style={{ color: "#1971C2", marginTop: 2, flexShrink: 0, fontSize: 16 }}></i><span>{recSummary()}</span>
                </div>
              </>
            )}
          </div>

          {/* Customer Card */}
          <div className="bf-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
              <span className={`sec-ic ${custDone ? "done" : ""}`}><i className={`ti ${custDone ? "ti-circle-check-filled" : "ti-building-warehouse"}`} style={{ fontSize: 18 }}></i></span>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -.2 }}>Customer</span>
              {custDone && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px", background: "#EBFBEE", color: "#2F9E44", borderRadius: 100 }}>Complete ✓</span>}
            </div>
            <div style={{ marginBottom: cust ? 8 : 18 }}>
              <label className="lbl">Customer <span style={{ color: "#E8590C" }}>*</span></label>
              <CustomSelect className={`fld ${saveAttempted && !f.customerId ? "err" : ""}`} value={f.customerId} onChange={val => set({ customerId: val, shipToSite: "" })} options={CUSTOMERS.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))} placeholder="Select customer…" />
              {saveAttempted && !f.customerId && <div style={{ marginTop: 4, fontSize: 12, color: "#E03131", display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }}></i> Required</div>}
            </div>
            {cust && (
              <div style={{ marginBottom: 16, padding: "10px 12px", background: "#F7F8FA", borderRadius: 10, border: "1px solid #E4E8ED", display: "flex", alignItems: "center", gap: 10, animation: "fadeIn .15s ease" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `hsl(${avatarHue(cust.name)},90%,94%)`, color: `hsl(${avatarHue(cust.name)},75%,38%)`, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cust.name.charAt(0)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cust.name}</div>
                  <div style={{ fontSize: 12, color: "#5B6470" }}>ID {cust.id} · {cust.sites.length} site{cust.sites.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Ship-to Site <span style={{ color: "#E8590C" }}>*</span></label>
              <CustomSelect className={`fld ${saveAttempted && !f.shipToSite ? "err" : ""}`} disabled={!cust} value={f.shipToSite} onChange={val => set({ shipToSite: val })} options={cust ? cust.sites : []} placeholder={cust ? "Select site…" : "Select a customer first"} />
              {saveAttempted && !f.shipToSite && cust && <div style={{ marginTop: 4, fontSize: 12, color: "#E03131", display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }}></i> Required</div>}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label className="lbl">Customer PO</label><input className="fld" placeholder="e.g. 4500087240" value={f.customerPO} onChange={e => set({ customerPO: e.target.value })} /></div>
              <div style={{ flex: 1 }}><label className="lbl">Contract</label><input className="fld" placeholder="Contract ref" value={f.contract} onChange={e => set({ contract: e.target.value })} /></div>
            </div>
            <div style={{ fontSize: 12.5, color: "#1A5C8F", background: "#E7F5FF", border: "1px solid #BDD8F5", borderRadius: 9, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.55 }}>
              <i className="ti ti-info-circle" style={{ color: "#1971C2", flexShrink: 0, marginTop: 1, fontSize: 14 }}></i><span>In production, selecting a contract drives available products and pricing.</span>
            </div>
          </div>
        </div>

        {/* Dockets Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span className={`sec-ic ${dksDone ? "done" : ""}`}><i className={`ti ${dksDone ? "ti-circle-check-filled" : "ti-clipboard-list"}`} style={{ fontSize: 18 }}></i></span>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -.2 }}>Delivery Dockets</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5B6470", background: "#fff", border: "1px solid #E4E8ED", padding: "2px 10px", borderRadius: 100 }}>{f.dockets.length}</span>
          </div>
          <button className="btn-add" style={{ padding: "9px 15px" }} onClick={() => setF(prev => ({ ...prev, dockets: [...prev.dockets, emptyDocket()] }))}><i className="ti ti-plus"></i> Add Delivery Docket</button>
        </div>

        {/* Dockets List */}
        {f.dockets.map((dk, di) => {
          const conf = dk.vehicleId && f.date ? vehicleAssignments(dk.vehicleId, f.date, isEdit ? f._id : null) : [];
          const dkProdCount = dk.products.filter(p => p.materialId && p.plannedQty).length;
          const dkSvcCount = dk.services.length;
          const dkNumber = `${f._id}-${String(di + 1).padStart(2, "0")}`;
          const dkReady = dk.vehicleId && (dkProdCount > 0 || dkSvcCount > 0);

          const byCat = { BULK: [], "IS&PE": [] };
          dk.products.forEach((p, pi) => {
            const m = p.materialId ? PRODUCT_MAP[p.materialId] : null;
            if (m && byCat[m.cat]) byCat[m.cat].push({ p, pi });
          });
          const anyProducts = dk.products.some(p => p.materialId);

          return (
            <div key={di} className="bf-card" style={{ marginBottom: 16, overflow: "hidden", borderLeft: `3px solid ${dkReady ? "#2F9E44" : "#E8590C"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 22px", background: "linear-gradient(135deg,#FFF6F1 0%,#FFFAF8 100%)", borderBottom: "1px solid #F0E2D6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#E8590C", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{di + 1}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -.2, display: "flex", alignItems: "center", gap: 7 }}>Docket {dkNumber}
                      <span className="pill" style={{ background: "#E7F5FF", color: "#1971C2" }}>PLANNED</span>
                      {dkReady && <span className="pill" style={{ background: "#EBFBEE", color: "#2F9E44" }}>✓ Ready</span>}
                    </div>
                    {(dk.vehicleId || dkProdCount > 0 || dkSvcCount > 0) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: "#5B6470" }}>
                        {dk.vehicleId && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i className="ti ti-truck" style={{ color: "#E8590C", fontSize: 12 }}></i>{dk.vehicleId}</span>}
                        {dkProdCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i className="ti ti-package" style={{ color: "#7048E8", fontSize: 12 }}></i>{dkProdCount} product{dkProdCount !== 1 ? 's' : ''}</span>}
                        {dkSvcCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><i className="ti ti-tools" style={{ color: "#1971C2", fontSize: 12 }}></i>{dkSvcCount} service{dkSvcCount !== 1 ? 's' : ''}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {f.dockets.length > 1 && <button onClick={() => { const nd = [...f.dockets]; nd.splice(di, 1); setF(prev => ({ ...prev, dockets: nd })); }} style={{ border: "1px solid #E4E8ED", background: "#fff", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: "#E03131", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><i className="ti ti-trash"></i> Remove</button>}
              </div>

              <div style={{ padding: 22 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.65fr", gap: 24, marginBottom: 24 }}>
                  {/* Vehicle */}
                  <div><label className="lbl">Vehicle <span style={{ color: "#E8590C" }}>*</span></label>
                    <CustomSelect className={`fld ${saveAttempted && !dk.vehicleId ? "err" : ""}`} value={dk.vehicleId} onChange={val => setDocket(di, { vehicleId: val })} placeholder="Select vehicle…" options={VEHICLE_GROUPS.flatMap(g => [
                      { label: g.type, isHeader: true },
                      ...g.ids.map(id => {
                        const busy = f.date ? vehicleAssignments(id, f.date, isEdit ? f._id : null) : [];
                        const maint = id === "MH-12-BMD-03"; // Hardcoded maintenance for demo
                        const tag = maint ? " — maintenance" : (busy.length ? " — booked" : " — available");
                        return { value: id, label: `${id}${tag}`, disabled: maint };
                      })
                    ])} />
                    {saveAttempted && !dk.vehicleId && <div style={{ marginTop: 4, fontSize: 12, color: "#E03131", display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 12 }}></i> Required</div>}
                    {conf.length > 0 && <div style={{ fontSize: 12, color: "#7A4F00", background: "#FFF9DB", border: "1px solid #F4D78A", borderRadius: 8, padding: "9px 11px", marginTop: 10, display: "flex", gap: 7, alignItems: "flex-start" }}><i className="ti ti-alert-triangle" style={{ color: "#F08C00", flexShrink: 0, marginTop: 1 }}></i><span>Double-booked with <b>{conf.join(", ")}</b> on this date. Allowed — flagged on board.</span></div>}
                  </div>

                  {/* Crew */}
                  <div>
                    <div style={{ marginBottom: 16 }}><label className="lbl">BMD Operators</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {OPERATORS.map(m => {
                          const on = dk.operatorIds.includes(m.id);
                          const leave = onLeave(m.id, f.date);
                          const busy = f.date ? personAssignments(m.id, f.date, isEdit ? f._id : null) : [];
                          const dotColor = leave ? "#E03131" : (busy.length ? "#F08C00" : "#2F9E44");
                          const initl = initials(m.name);
                          const hue = avatarHue(m.name);

                          if (leave) {
                            return (
                              <span key={m.id} title="On leave today — cannot be assigned" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", border: "1px solid #F0D4D4", background: "#FFF5F5", color: "#BBA0A0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "not-allowed", textDecoration: "line-through" }}>
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: "#F5E4E4", color: "#CC9999", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initl}</span>
                                {m.name}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#E03131", fontWeight: 600, background: "#FFF0F0", border: "1px solid #FCBCBC", borderRadius: 6, padding: "3px 8px", marginLeft: -2, whiteSpace: "nowrap" }}><i className="ti ti-beach" style={{ fontSize: 11 }}></i>On leave</span>
                              </span>
                            );
                          }
                          return (
                            <button key={m.id} className={`chip ${on ? "on" : ""}`} title={busy.length ? `Currently on: ${busy.join(", ")}` : "Available today"} onClick={() => {
                              const arr = [...dk.operatorIds];
                              const idx = arr.indexOf(m.id);
                              if (idx >= 0) arr.splice(idx, 1); else arr.push(m.id);
                              setDocket(di, { operatorIds: arr });
                            }}>
                              <span style={{ width: 22, height: 22, borderRadius: 6, background: on ? "#E8590C" : `hsl(${hue},75%,94%)`, color: on ? "#fff" : `hsl(${hue},75%,38%)`, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? <i className="ti ti-check" style={{ fontSize: 11 }}></i> : initl}</span>
                              {m.name} <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }}></span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div><label className="lbl">Blaster / Shotfirer</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {SHOTFIRERS.map(m => {
                          const on = dk.shotfirerIds.includes(m.id);
                          const busy = f.date ? personAssignments(m.id, f.date, isEdit ? f._id : null) : [];
                          const dotColor = busy.length ? "#F08C00" : "#2F9E44";
                          const initl = initials(m.name);
                          const hue = avatarHue(m.name);
                          return (
                            <button key={m.id} className={`chip ${on ? "on" : ""}`} title={busy.length ? `Currently on: ${busy.join(", ")}` : "Available today"} onClick={() => {
                              const arr = [...dk.shotfirerIds];
                              const idx = arr.indexOf(m.id);
                              if (idx >= 0) arr.splice(idx, 1); else arr.push(m.id);
                              setDocket(di, { shotfirerIds: arr });
                            }}>
                              <span style={{ width: 22, height: 22, borderRadius: 6, background: on ? "#E8590C" : `hsl(${hue},75%,94%)`, color: on ? "#fff" : `hsl(${hue},75%,38%)`, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? <i className="ti ti-check" style={{ fontSize: 11 }}></i> : initl}</span>
                              {m.name} <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }}></span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11.5, color: "#5B6470" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2F9E44", display: "inline-block" }}></span>Available</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F08C00", display: "inline-block" }}></span>Booked today</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E03131", display: "inline-block" }}></span>On leave</span>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="lbl" style={{ marginBottom: 0 }}>Products</span>
                    {saveAttempted && !dk.products.some(p => p.materialId && p.plannedQty) && !dk.services.length && <span style={{ fontSize: 11, color: "#E03131", fontWeight: 600, background: "#FFF0F0", border: "1px solid #FCBCBC", borderRadius: 5, padding: "2px 7px" }}>Needs products or services</span>}
                  </div>
                  <button className="btn-add" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setDocket(di, { products: [...dk.products, { materialId: "", plannedQty: "" }] })}><i className="ti ti-plus"></i> Add product</button>
                </div>

                {!anyProducts && dk.products.length === 1 && !dk.products[0].materialId ? (
                  renderProductRow(di, dk.products[0], 0)
                ) : (
                  <>
                    {["BULK", "IS&PE"].map(cat => {
                      const rows = byCat[cat];
                      if (!rows || !rows.length) return null;
                      const open = accOpen[cat] !== false;
                      return (
                        <div key={cat} style={{ marginBottom: 10 }}>
                          <div className="acc-head" onClick={() => toggleProductCat(cat)}>
                            <i className={`ti ti-chevron-${open ? "down" : "right"}`} style={{ color: "#5B6470", fontSize: 13 }}></i>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: .4, padding: "3px 9px", borderRadius: 6, textTransform: "uppercase", background: cat === "BULK" ? "#EAF4FF" : "#F3EEFF", color: cat === "BULK" ? "#1762A8" : "#6B3FC4" }}>{cat}</span>
                            <span style={{ fontSize: 12.5, color: "#5B6470", fontWeight: 600 }}>{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
                          </div>
                          {open && <div style={{ padding: "10px 4px 4px" }}>{rows.map(r => renderProductRow(di, r.p, r.pi))}</div>}
                        </div>
                      );
                    })}
                    {dk.products.map((p, pi) => !p.materialId && renderProductRow(di, p, pi))}
                  </>
                )}

                {/* Services */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 12px" }}>
                  <span className="lbl" style={{ marginBottom: 0 }}>Services</span>
                  <button className="btn-add" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setDocket(di, { services: [...dk.services, { serviceId: "", qty: "" }] })}><i className="ti ti-plus"></i> Add service</button>
                </div>
                {!dk.services.length ? (
                  <div style={{ padding: "14px 16px", background: "#F7F8FA", borderRadius: 9, border: "1px dashed #DDE1E7", display: "flex", alignItems: "center", gap: 12 }}>
                    <i className="ti ti-tools" style={{ color: "#C8CDD4", fontSize: 22, flexShrink: 0 }}></i>
                    <div style={{ fontSize: 13, color: "#9AA0A8", lineHeight: 1.5 }}>No services added. Common services include site setup, BMD operation charges, bore tracking, and blast clearance.</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", maxWidth: 700 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E4E8ED" }}>
                        {["Service", "Qty", "UoM", ""].map((col, i) => {
                          const w = ["", "110px", "56px", "42px"][i];
                          return <th key={col} style={{ textAlign: "left", fontSize: 10.5, color: "#5B6470", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, padding: `0 8px 8px ${i === 0 ? '0' : ''}`, ...(w ? { width: w } : {}) }}>{col}</th>
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {dk.services.map((s, si) => {
                        const sv = SERVICE_MAP[s.serviceId]; const uom = sv ? sv.uom : "ea";
                        return (
                          <tr key={si}>
                            <td style={{ padding: "6px 8px 6px 0" }}>
                              <CustomSelect className="fld" value={s.serviceId} onChange={val => {
                                const ns = [...dk.services]; ns[si].serviceId = val; setDocket(di, { services: ns });
                              }} placeholder="Select service…" options={SERVICES.map(x => ({ value: x.id, label: x.name }))} />
                            </td>
                            <td style={{ padding: "6px 8px" }}><input className="fld" type="number" min="1" placeholder="1" value={s.qty || ""} onChange={e => {
                              const ns = [...dk.services]; ns[si].qty = e.target.value; setDocket(di, { services: ns });
                            }} /></td>
                            <td style={{ padding: "6px 8px", fontSize: 13, color: "#5B6470", fontWeight: 600 }}>{uom}</td>
                            <td style={{ padding: "6px 0" }}><button className="icon-btn" onClick={() => {
                              const ns = [...dk.services]; ns.splice(si, 1); setDocket(di, { services: ns });
                            }}><i className="ti ti-x" style={{ fontSize: 13 }}></i></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                <label className="lbl" style={{ marginTop: 22 }}>Docket Notes</label>
                <textarea className="fld" rows={2} placeholder="Notes for this docket…" value={dk.notes} onChange={e => setDocket(di, { notes: e.target.value })} style={{ resize: "vertical", lineHeight: 1.55, maxWidth: 700 }}></textarea>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
