import React, { useState, useMemo } from "react";
import {
  ArrowLeft, CalendarRange, Building2, ClipboardList, Plus, Trash2, X,
  Check, AlertTriangle, Info, Repeat, ChevronDown, ChevronRight
} from "lucide-react";
import {
  PLANTS, CUSTOMERS, VEHICLE_GROUPS_BY_PLANT, CREW_GROUPS_BY_PLANT,
  PRODUCT_CATS, PRODUCT_MAP, SERVICES, SERVICE_MAP,
  getBookingById, addBooking, replaceBooking, nextBlastNumber,
  vehicleAssignments, personAssignments,
} from "./bookingStore";

/* ============================================================
   BookingForm.jsx — full-page Create / Edit Booking
   Blast -> one or more Delivery Dockets (vehicle + operators
   + shotfirers + products + services + notes).
   Reads master data + conflict helpers from bookingStore.
   Props:
     plant       : {code,name,region}  (from app shell)
     editBlastId : string | null       (null = create mode)
     expandDocket: number | null       (docket index to expand in edit)
     onClose()   : return to board without saving
     onSaved(doc): called after save (board refreshes)
   ============================================================ */

const ORANGE="#E8590C",ORANGE_SOFT="#FFF1E8",ORANGE_LINE="#F6C9AC";
const INK="#1A1D21",SLATE="#5B6470",LINE="#E6E9ED",BG="#F7F8FA";
const GREEN="#2F9E44",AMBER="#F08C00",AMBER_SOFT="#FFF9DB",RED="#E03131",RED_SOFT="#FFF0F0",BLUE="#1971C2",BLUE_SOFT="#E7F5FF";

/* demo: crew on leave (would come from planner/HR store) */
const ON_LEAVE = { "Cas Davide": ["2026-06-05"] };
const onLeave = (n, d) => (ON_LEAVE[n] || []).includes(d);

const lbl={fontSize:12,color:SLATE,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:.4,display:"block"};
const fld={width:"100%",padding:"10px 12px",border:`1px solid ${LINE}`,borderRadius:9,fontSize:14,fontWeight:500,color:INK,background:"#fff",outline:"none",fontFamily:"inherit"};
const selFld={...fld,appearance:"none",WebkitAppearance:"none",backgroundImage:"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235B6470' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 11px center",paddingRight:34,cursor:"pointer"};
const secIc={width:36,height:36,borderRadius:9,background:ORANGE_SOFT,display:"flex",alignItems:"center",justifyContent:"center",color:ORANGE,flexShrink:0};
const card={background:"#fff",border:`1px solid ${LINE}`,borderRadius:14};
const chipBase={padding:"7px 12px",border:`1px solid ${LINE}`,background:"#fff",color:INK,borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,whiteSpace:"nowrap"};
const btnAdd={display:"inline-flex",alignItems:"center",gap:6,padding:"8px 13px",border:`1px dashed ${ORANGE_LINE}`,background:ORANGE_SOFT,color:ORANGE,borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"};
const iconBtn={width:34,height:36,border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,cursor:"pointer",color:RED,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"};
const pill=(bg,fg)=>({fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:100,letterSpacing:.3,background:bg,color:fg});

const fmtDate=(s)=>!s?"—":new Date(s+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const dowName=(s)=>["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(s+"T00:00:00").getDay()];

function emptyDocket(){return{vehicleId:"",operatorIds:[],shotfirerIds:[],products:[{materialId:"",plannedQty:""}],services:[],notes:""};}

/* convert a stored booking doc -> editable form state */
function docToForm(doc){
  return {
    _id: doc._id, blastNumber: doc.blastNumber, date: doc.date, startTime: doc.startTime||"04:30",
    bookingType: doc.bookingType||"single", endDate: doc.endDate||"",
    recFreq: doc.recurrence ? (doc.recurrence.frequency==="weekly"?"Weekly":"Daily") : "Daily",
    recEnd: doc.recurrence ? doc.recurrence.endDate : "",
    recWorkingOnly: doc.recurrence ? !!doc.recurrence.workingDaysOnly : true,
    customerId: doc.customerId||"", shipToSite: doc.shipToSite||"", customerPO: doc.customerPO||"", contract: doc.contractId||"",
    dockets: (doc.deliveryDockets||[]).map(dk=>({
      vehicleId: dk.vehicleId||"", operatorIds:[...(dk.operatorIds||[])], shotfirerIds:[...(dk.shotfirerIds||[])],
      products: (dk.products&&dk.products.length?dk.products.map(p=>({materialId:p.materialId,plannedQty:p.plannedQty})):[{materialId:"",plannedQty:""}]),
      services: (dk.services||[]).map(s=>({serviceId:s.serviceId,qty:s.qty})),
      notes: dk.notes||"",
    })),
  };
}

export default function BookingForm({ plant, editBlastId=null, expandDocket=null, onClose, onSaved }){
  const plantCode = plant?.code || "2025";
  const plantName = plant?.name || "Panna";

  const isEdit = !!editBlastId;
  const [f, setF] = useState(() => {
    if (isEdit) {
      const doc = getBookingById(editBlastId);
      if (doc) return docToForm(doc);
    }
    return {
      _id: nextBlastNumber(plantCode), blastNumber: nextBlastNumber(plantCode),
      date:"2026-06-05", startTime:"04:30", bookingType:"single", endDate:"",
      recFreq:"Daily", recEnd:"2026-07-31", recWorkingOnly:true,
      customerId:"", shipToSite:"", customerPO:"", contract:"",
      dockets:[emptyDocket()],
    };
  });
  // which category accordions are open (per docket index -> {BULK,IS&PE})
  const [accClosed, setAccClosed] = useState({});
  // which dockets are expanded; in edit mode default to the clicked one
  const [openDockets, setOpenDockets] = useState(() => {
    if (isEdit && expandDocket != null) {
      const o = {}; o[expandDocket] = true; return o;
    }
    return { 0: true };
  });

  const VEHICLE_GROUPS = VEHICLE_GROUPS_BY_PLANT[plantCode] || [];
  const CREW_GROUPS = CREW_GROUPS_BY_PLANT[plantCode] || [];
  const OPERATORS = (CREW_GROUPS.find(g=>/operator/i.test(g.role))||{members:[]}).members;
  const SHOTFIRERS = (CREW_GROUPS.find(g=>/blaster|shotfirer/i.test(g.role))||{members:[]}).members;

  const set = (patch) => setF(prev => ({ ...prev, ...patch }));
  const setDocket = (di, patch) => setF(prev => {
    const dockets = prev.dockets.map((d,i)=> i===di ? {...d, ...patch} : d);
    return { ...prev, dockets };
  });
  const customer = () => CUSTOMERS.find(c=>c.id===f.customerId);

  /* recurring occurrence count + summary */
  const occ = useMemo(()=>{
    if (f.bookingType!=="recurring" || !f.date || !f.recEnd) return 0;
    const s=new Date(f.date+"T00:00:00"), e=new Date(f.recEnd+"T00:00:00");
    if (e<s) return 0; let n=0;
    if (f.recFreq==="Daily"){ for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)){ const w=d.getDay(); if(f.recWorkingOnly&&(w===0||w===6))continue; n++; } }
    else { for(let d=new Date(s); d<=e; d.setDate(d.getDate()+7)) n++; }
    return n;
  },[f.bookingType,f.date,f.recEnd,f.recFreq,f.recWorkingOnly]);

  const recSummary = () => {
    if (!f.date || !f.recEnd) return "Set a start and end date to preview the schedule.";
    if (f.recFreq==="Daily") return `Repeats daily at ${f.startTime}, ${f.recWorkingOnly?"Monday to Friday":"every day"}, from ${fmtDate(f.date)} until ${fmtDate(f.recEnd)} — creates ${occ} separate booking${occ!==1?"s":""}.`;
    return `Repeats weekly on ${dowName(f.date)} at ${f.startTime}, from ${fmtDate(f.date)} until ${fmtDate(f.recEnd)} — creates ${occ} separate booking${occ!==1?"s":""}.`;
  };

  const validationOk = () => {
    if (!(f.date && f.customerId && f.shipToSite)) return false;
    if (f.bookingType==="multi" && !f.endDate) return false;
    if (f.bookingType==="recurring" && (!f.recEnd || occ<1)) return false;
    return f.dockets.length>0 && f.dockets.every(dk =>
      dk.vehicleId && (dk.products.some(p=>p.materialId&&p.plannedQty) || dk.services.length>0));
  };

  const buildDoc = () => {
    const c = customer(); const now = new Date().toISOString();
    return {
      _id: f._id, blastNumber: f.blastNumber, plantCode,
      date: f.date, startTime: f.startTime,
      bookingType: f.bookingType,
      endDate: f.bookingType==="multi" ? f.endDate : null,
      recurrence: f.bookingType==="recurring" ? { frequency: f.recFreq.toLowerCase(), endDate: f.recEnd, workingDaysOnly: f.recWorkingOnly, occurrences: occ } : null,
      customerId: f.customerId, customerName: c?c.name:"", shipToSite: f.shipToSite,
      customerPO: f.customerPO, contractId: f.contract||null,
      deliveryDockets: f.dockets.map((dk,i)=>({
        docketNumber: `${f.blastNumber}-${String(i+1).padStart(2,"0")}`,
        status: "Planned",
        vehicleId: dk.vehicleId,
        operatorIds: dk.operatorIds, shotfirerIds: dk.shotfirerIds,
        products: dk.products.filter(p=>p.materialId&&p.plannedQty).map(p=>{
          const m = PRODUCT_MAP[p.materialId];
          return { materialId:p.materialId, name:m?m.name:p.materialId, category:m?m.cat:null, plannedQty:Number(p.plannedQty), uom:m?m.uom:null, actualQty:null };
        }),
        services: dk.services.map(s=>{
          const sv = SERVICE_MAP[s.serviceId];
          return { serviceId:s.serviceId, name:sv?sv.name:s.serviceId, qty:Number(s.qty)||1, uom:sv?sv.uom:"ea" };
        }),
        notes: dk.notes||"", signature:null,
      })),
      status: "Planned",
      createdAt: now, updatedAt: now,
    };
  };

  const save = () => {
    if (!validationOk()) return;
    const doc = buildDoc();
    if (isEdit) replaceBooking(doc); else addBooking(doc);
    onSaved && onSaved(doc);
  };

  const cust = customer();
  const ok = validationOk();

  return (
    <div style={{fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif",color:INK}}>
      {/* sticky top bar */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(247,248,250,.92)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${LINE}`,margin:"-28px -28px 0",padding:"16px 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={onClose} style={{...chipBase,padding:"9px 14px"}}><ArrowLeft size={16}/> Board</button>
          <div style={{flex:1}}>
            <h1 style={{fontSize:26,fontWeight:700,letterSpacing:-.5,margin:0}}>{isEdit?"Edit Booking":"Create Booking"}</h1>
            <div style={{color:SLATE,fontSize:14,marginTop:5,display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontWeight:700,color:ORANGE}}>{f.blastNumber}</span>
              <span style={pill(BLUE_SOFT,BLUE)}>PLANNED</span>
              <span>· {plantName} ({plantCode})</span>
            </div>
          </div>
          <button onClick={onClose} style={{...chipBase,padding:"10px 16px"}}>Cancel</button>
          <button onClick={save} disabled={!ok} style={{padding:"11px 22px",border:"none",background:ok?ORANGE:"#EBC3A6",color:"#fff",borderRadius:10,fontSize:14,fontWeight:700,cursor:ok?"pointer":"not-allowed",fontFamily:"inherit"}}>{isEdit?"Save Changes":"Save Booking"}</button>
        </div>
      </div>

      <div style={{paddingTop:24}}>
        {/* upper grid: Schedule | Customer */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
          {/* SCHEDULE */}
          <div style={{...card,padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:20}}><span style={secIc}><CalendarRange size={19}/></span><span style={{fontSize:16,fontWeight:700,letterSpacing:-.2}}>Schedule</span></div>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              <div style={{flex:1.3}}><label style={lbl}>Delivery date <span style={{color:ORANGE}}>*</span></label><input type="date" value={f.date} onChange={e=>set({date:e.target.value})} style={fld}/></div>
              <div style={{flex:1}}><label style={lbl}>Start time</label><input type="time" value={f.startTime} onChange={e=>set({startTime:e.target.value})} style={fld}/></div>
            </div>
            <label style={lbl}>Booking type</label>
            <div style={{display:"flex",gap:6}}>
              {[["single","Single day"],["multi","Multi-day"],["recurring","Recurring"]].map(([v,t])=>(
                <button key={v} onClick={()=>set({bookingType:v})} style={{flex:1,padding:10,border:`1px solid ${f.bookingType===v?ORANGE:LINE}`,background:f.bookingType===v?ORANGE_SOFT:"#fff",color:f.bookingType===v?ORANGE:INK,borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
              ))}
            </div>
            {f.bookingType==="multi" && (
              <div style={{marginTop:16}}><label style={lbl}>End date <span style={{color:ORANGE}}>*</span></label><input type="date" value={f.endDate} min={f.date} onChange={e=>set({endDate:e.target.value})} style={fld}/></div>
            )}
            {f.bookingType==="recurring" && (
              <>
                <div style={{display:"flex",gap:12,margin:"16px 0 12px"}}>
                  <div style={{flex:1}}><label style={lbl}>Frequency</label>
                    <select value={f.recFreq} onChange={e=>set({recFreq:e.target.value})} style={selFld}><option>Daily</option><option>Weekly</option></select>
                  </div>
                  <div style={{flex:1}}><label style={lbl}>Repeat until <span style={{color:ORANGE}}>*</span></label><input type="date" value={f.recEnd} min={f.date} onChange={e=>set({recEnd:e.target.value})} style={fld}/></div>
                </div>
                {f.recFreq==="Daily" && (
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:INK,marginBottom:12,cursor:"pointer",fontWeight:500}}>
                    <input type="checkbox" checked={f.recWorkingOnly} onChange={e=>set({recWorkingOnly:e.target.checked})} style={{width:15,height:15,accentColor:ORANGE}}/> Working days only (Mon–Fri)
                  </label>
                )}
                <div style={{fontSize:13,color:"#1A5C8F",background:BLUE_SOFT,border:"1px solid #BBDCF5",borderRadius:10,padding:"12px 14px",display:"flex",gap:9,alignItems:"flex-start",lineHeight:1.55}}>
                  <Repeat size={16} style={{color:BLUE,marginTop:2,flexShrink:0}}/><span>{recSummary()}</span>
                </div>
              </>
            )}
          </div>

          {/* CUSTOMER */}
          <div style={{...card,padding:22}}>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:20}}><span style={secIc}><Building2 size={19}/></span><span style={{fontSize:16,fontWeight:700,letterSpacing:-.2}}>Customer</span></div>
            <div style={{marginBottom:16}}><label style={lbl}>Customer <span style={{color:ORANGE}}>*</span></label>
              <select value={f.customerId} onChange={e=>set({customerId:e.target.value,shipToSite:""})} style={selFld}>
                <option value="">Select customer…</option>
                {CUSTOMERS.map(c=><option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
              </select>
            </div>
            <div style={{marginBottom:16}}><label style={lbl}>Ship-to site <span style={{color:ORANGE}}>*</span></label>
              <select value={f.shipToSite} onChange={e=>set({shipToSite:e.target.value})} disabled={!cust} style={selFld}>
                <option value="">{cust?"Select site…":"Select a customer first"}</option>
                {cust && cust.sites.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:12,marginBottom:14}}>
              <div style={{flex:1}}><label style={lbl}>Customer PO</label><input value={f.customerPO} onChange={e=>set({customerPO:e.target.value})} placeholder="e.g. 4500087240" style={fld}/></div>
              <div style={{flex:1}}><label style={lbl}>Contract</label><input value={f.contract} onChange={e=>set({contract:e.target.value})} placeholder="Contract ref" style={fld}/></div>
            </div>
            <div style={{fontSize:12,color:SLATE,lineHeight:1.5,display:"flex",gap:7,alignItems:"flex-start"}}><Info size={14} style={{marginTop:1,color:ORANGE,flexShrink:0}}/> In production the contract is selected, and it drives which products and prices are available.</div>
          </div>
        </div>

        {/* DOCKETS header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <span style={secIc}><ClipboardList size={19}/></span>
            <span style={{fontSize:16,fontWeight:700,letterSpacing:-.2}}>Delivery Dockets</span>
            <span style={{fontSize:12.5,fontWeight:700,color:SLATE,background:"#fff",border:`1px solid ${LINE}`,padding:"2px 10px",borderRadius:100}}>{f.dockets.length}</span>
          </div>
          <button onClick={()=>{ setF(prev=>({...prev,dockets:[...prev.dockets,emptyDocket()]})); setOpenDockets(o=>({...o,[f.dockets.length]:true})); }} style={{...btnAdd,padding:"9px 15px"}}><Plus size={15}/> Add Delivery Docket</button>
        </div>

        {f.dockets.map((dk,di)=>(
          <DocketCard key={di} di={di} dk={dk} f={f} plantCode={plantCode}
            VEHICLE_GROUPS={VEHICLE_GROUPS} OPERATORS={OPERATORS} SHOTFIRERS={SHOTFIRERS}
            open={!!openDockets[di]} onToggleOpen={()=>setOpenDockets(o=>({...o,[di]:!o[di]}))}
            accClosed={accClosed[di]||{}} setAccClosed={(cat)=>setAccClosed(prev=>({...prev,[di]:{...(prev[di]||{}),[cat]:!((prev[di]||{})[cat])}}))}
            canRemove={f.dockets.length>1}
            onRemove={()=>setF(prev=>({...prev,dockets:prev.dockets.filter((_,i)=>i!==di)}))}
            setDocket={(patch)=>setDocket(di,patch)} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Docket card ---------- */
function DocketCard({ di, dk, f, plantCode, VEHICLE_GROUPS, OPERATORS, SHOTFIRERS, open, onToggleOpen, accClosed, setAccClosed, canRemove, onRemove, setDocket }){
  const conf = dk.vehicleId ? Array.from(new Set(vehicleAssignments(dk.vehicleId, f.date, f._id))) : [];
  const docketNumber = `${f.blastNumber}-${String(di+1).padStart(2,"0")}`;

  const toggleOp = (o) => setDocket({ operatorIds: dk.operatorIds.includes(o) ? dk.operatorIds.filter(x=>x!==o) : [...dk.operatorIds,o] });
  const toggleSf = (o) => setDocket({ shotfirerIds: dk.shotfirerIds.includes(o) ? dk.shotfirerIds.filter(x=>x!==o) : [...dk.shotfirerIds,o] });
  const setProd = (pi,patch)=>setDocket({ products: dk.products.map((p,i)=>i===pi?{...p,...patch}:p) });
  const addProd = ()=>setDocket({ products:[...dk.products,{materialId:"",plannedQty:""}] });
  const rmProd = (pi)=>{ const next=dk.products.filter((_,i)=>i!==pi); setDocket({ products: next.length?next:[{materialId:"",plannedQty:""}] }); };
  const setSvc = (si,patch)=>setDocket({ services: dk.services.map((s,i)=>i===si?{...s,...patch}:s) });
  const addSvc = ()=>setDocket({ services:[...dk.services,{serviceId:"SVC-SETUP",qty:1}] });
  const rmSvc = (si)=>setDocket({ services: dk.services.filter((_,i)=>i!==si) });

  /* group completed products by category; incomplete rows render after */
  const byCat = { BULK:[], "IS&PE":[] };
  dk.products.forEach((p,pi)=>{ const m=p.materialId?PRODUCT_MAP[p.materialId]:null; if(m) byCat[m.cat].push({p,pi}); });
  const incomplete = dk.products.map((p,pi)=>({p,pi})).filter(({p})=>!p.materialId);

  const ProductRow = ({p,pi}) => {
    const m = p.materialId?PRODUCT_MAP[p.materialId]:null; const uom=m?m.uom:"—";
    return (
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,maxWidth:760}}>
        <select value={p.materialId} onChange={e=>setProd(pi,{materialId:e.target.value})} style={{...selFld,flex:2.6}}>
          <option value="">Select product…</option>
          {PRODUCT_CATS.map(c=>(<optgroup key={c.cat} label={c.cat}>{c.items.map(pp=><option key={pp.id} value={pp.id}>{pp.name}</option>)}</optgroup>))}
        </select>
        <input type="number" min="0" placeholder="Qty" value={p.plannedQty} onChange={e=>setProd(pi,{plannedQty:e.target.value})} style={{...fld,width:90}}/>
        <span style={{width:34,textAlign:"center",fontSize:13,color:SLATE,fontWeight:600}}>{uom}</span>
        <button onClick={()=>rmProd(pi)} style={iconBtn}><X size={15}/></button>
      </div>
    );
  };

  return (
    <div style={{...card,marginBottom:16,overflow:"hidden",borderLeft:`3px solid ${ORANGE}`}}>
      {/* docket header (click to expand/collapse) */}
      <div onClick={onToggleOpen} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 22px",background:ORANGE_SOFT,borderBottom:open?`1px solid ${LINE}`:"none",cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          {open?<ChevronDown size={18} style={{color:SLATE}}/>:<ChevronRight size={18} style={{color:SLATE}}/>}
          <span style={{width:28,height:28,borderRadius:8,background:ORANGE,color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{di+1}</span>
          <span style={{fontSize:15,fontWeight:700,letterSpacing:-.2}}>Docket {docketNumber}</span>
          <span style={pill(BLUE_SOFT,BLUE)}>PLANNED</span>
          {dk.vehicleId && <span style={{fontSize:12.5,color:SLATE,fontWeight:600}}>· {dk.vehicleId}</span>}
          {conf.length>0 && <AlertTriangle size={15} style={{color:AMBER}} title={"Double-booked with "+conf.join(", ")}/>}
        </div>
        {canRemove && <button onClick={(e)=>{e.stopPropagation();onRemove();}} style={{border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:RED,fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}><Trash2 size={14}/> Remove</button>}
      </div>

      {open && (
      <div style={{padding:22}}>
        {/* vehicle + crew */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:24,marginBottom:22}}>
          <div>
            <label style={lbl}>Vehicle <span style={{color:ORANGE}}>*</span></label>
            <select value={dk.vehicleId} onChange={e=>setDocket({vehicleId:e.target.value})} style={selFld}>
              <option value="">Select vehicle…</option>
              {VEHICLE_GROUPS.map(g=>(
                <optgroup key={g.type} label={g.type}>
                  {g.ids.map(id=>{
                    const busy=vehicleAssignments(id,f.date,f._id);
                    const maint=id==="MH-12-BMD-03";
                    const tag=maint?" — maintenance":(busy.length?" — booked":" — available");
                    return <option key={id} value={id} disabled={maint}>{id}{tag}</option>;
                  })}
                </optgroup>
              ))}
            </select>
            {conf.length>0 && (
              <div style={{fontSize:12,color:"#8A5A00",background:AMBER_SOFT,border:"1px solid #F4D78A",borderRadius:8,padding:"9px 11px",marginTop:9,display:"flex",gap:7,alignItems:"flex-start"}}>
                <AlertTriangle size={14} style={{color:AMBER,marginTop:1,flexShrink:0}}/><span>Double-booked with <b>{conf.join(", ")}</b> on this date. Allowed — flagged on the board.</span>
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>BMD Operators</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
              {OPERATORS.map(o=>{
                const on=dk.operatorIds.includes(o); const leave=onLeave(o,f.date); const busy=personAssignments(o,f.date,f._id);
                if(leave) return <span key={o} style={{...chipBase,background:BG,color:"#A4ABB4",cursor:"not-allowed"}} title="On leave">{o} <span style={{width:7,height:7,borderRadius:"50%",background:RED,display:"inline-block"}}/></span>;
                const dotc=busy.length?AMBER:GREEN;
                return <button key={o} onClick={()=>toggleOp(o)} title={busy.length?"Already on "+busy.join(", "):"Available"} style={{...chipBase,border:`1px solid ${on?ORANGE:LINE}`,background:on?ORANGE_SOFT:"#fff",color:on?ORANGE:INK}}>{on&&<Check size={13}/>}{o} <span style={{width:7,height:7,borderRadius:"50%",background:dotc,display:"inline-block"}}/></button>;
              })}
            </div>
            <label style={lbl}>Blaster / Shotfirer</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {SHOTFIRERS.map(o=>{
                const on=dk.shotfirerIds.includes(o); const busy=personAssignments(o,f.date,f._id); const dotc=busy.length?AMBER:GREEN;
                return <button key={o} onClick={()=>toggleSf(o)} style={{...chipBase,border:`1px solid ${on?ORANGE:LINE}`,background:on?ORANGE_SOFT:"#fff",color:on?ORANGE:INK}}>{on&&<Check size={13}/>}{o} <span style={{width:7,height:7,borderRadius:"50%",background:dotc,display:"inline-block"}}/></button>;
              })}
            </div>
            <div style={{display:"flex",gap:16,marginTop:11,fontSize:11,color:SLATE}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:GREEN}}/> Available</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:AMBER}}/> Booked</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:RED}}/> On leave</span>
            </div>
          </div>
        </div>

        {/* PRODUCTS — single label + category accordions */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:11.5,color:SLATE,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Products</span>
          <button onClick={addProd} style={{...btnAdd,padding:"6px 11px",fontSize:12.5}}><Plus size={14}/> Add product</button>
        </div>
        {["BULK","IS&PE"].map(cat=>{
          const rows=byCat[cat]; if(!rows.length) return null;
          const closed=!!accClosed[cat];
          return (
            <div key={cat} style={{marginBottom:10}}>
              <div onClick={()=>setAccClosed(cat)} style={{display:"flex",alignItems:"center",gap:9,padding:"11px 14px",cursor:"pointer",background:"#FCFCFD",borderRadius:10,border:`1px solid ${LINE}`,userSelect:"none"}}>
                {closed?<ChevronRight size={16} style={{color:SLATE}}/>:<ChevronDown size={16} style={{color:SLATE}}/>}
                <span style={{fontSize:10,fontWeight:700,letterSpacing:.4,padding:"3px 9px",borderRadius:6,textTransform:"uppercase",background:cat==="BULK"?"#EAF4FF":"#F3EEFF",color:cat==="BULK"?"#1762A8":"#6B3FC4"}}>{cat}</span>
                <span style={{fontSize:12.5,color:SLATE,fontWeight:600}}>{rows.length} item{rows.length!==1?"s":""}</span>
              </div>
              {!closed && <div style={{padding:"12px 6px 4px"}}>{rows.map(({p,pi})=><ProductRow key={pi} p={p} pi={pi}/>)}</div>}
            </div>
          );
        })}
        {incomplete.map(({p,pi})=><ProductRow key={"inc"+pi} p={p} pi={pi}/>)}

        {/* SERVICES — single label + table with UoM */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"20px 0 12px"}}>
          <span style={{fontSize:11.5,color:SLATE,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Services</span>
          <button onClick={addSvc} style={{...btnAdd,padding:"6px 11px",fontSize:12.5}}><Plus size={14}/> Add service</button>
        </div>
        {dk.services.length===0 ? <div style={{fontSize:13,color:SLATE,padding:"2px 0 4px"}}>No services added.</div> : (
          <table style={{width:"100%",borderCollapse:"collapse",maxWidth:680}}>
            <thead><tr style={{borderBottom:`1px solid ${LINE}`}}>
              <th style={{textAlign:"left",fontSize:10.5,color:SLATE,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,padding:"0 8px 8px 0"}}>Service</th>
              <th style={{width:110,textAlign:"left",fontSize:10.5,color:SLATE,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,padding:"0 8px 8px"}}>Qty</th>
              <th style={{width:56,textAlign:"left",fontSize:10.5,color:SLATE,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,padding:"0 8px 8px"}}>UoM</th>
              <th style={{width:42}}></th>
            </tr></thead>
            <tbody>
              {dk.services.map((s,si)=>{ const sv=SERVICE_MAP[s.serviceId]; const uom=sv?sv.uom:"ea";
                return (
                  <tr key={si}>
                    <td style={{padding:"6px 8px 6px 0"}}><select value={s.serviceId} onChange={e=>setSvc(si,{serviceId:e.target.value})} style={selFld}>{SERVICES.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
                    <td style={{padding:"6px 8px"}}><input type="number" min="1" placeholder="1" value={s.qty} onChange={e=>setSvc(si,{qty:e.target.value})} style={fld}/></td>
                    <td style={{padding:"6px 8px",fontSize:13,color:SLATE,fontWeight:600}}>{uom}</td>
                    <td style={{padding:"6px 0"}}><button onClick={()=>rmSvc(si)} style={iconBtn}><X size={15}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* notes */}
        <label style={{...lbl,marginTop:20}}>Docket notes</label>
        <textarea value={dk.notes} onChange={e=>setDocket({notes:e.target.value})} rows={2} placeholder="Notes for this docket…" style={{...fld,maxWidth:680,resize:"vertical"}}/>
      </div>
      )}
    </div>
  );
}
