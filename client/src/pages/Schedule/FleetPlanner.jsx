import React, { useState, useMemo, useEffect } from "react";
import { Truck, Lock, MessageSquare, AlertTriangle } from "lucide-react";
import { vehicleAssignments } from './bookingStore';

/* ============================================================
   FLEET PLANNER — set vehicle status & maintenance across week
   States: Available / Assigned (locked, from schedule) / Maintenance
   Whole-week vehicle-day counters. Multi-day range + comments.
   ============================================================ */

const ORANGE="#E8590C",ORANGE_SOFT="#FFF1E8";
const INK="#1A1D21",SLATE="#5B6470",LINE="#E6E9ED",COLHEAD="#EEF1F5",FLEETCOL="#F4F6F9";
const GREEN="#2F9E44",GREEN_SOFT="#EBFBEE",BLUE="#1971C2",BLUE_SOFT="#E7F5FF",AMBER="#F08C00",AMBER_SOFT="#FFF9DB";

const ST={
  Available:{fg:GREEN,bg:GREEN_SOFT,dot:GREEN},
  Assigned:{fg:BLUE,bg:BLUE_SOFT,dot:BLUE},
  Maintenance:{fg:"#9C6B00",bg:AMBER_SOFT,dot:AMBER},
};
const EDITABLE=["Available","Maintenance"];
const PLANTS=[{code:"2010",name:"Nimbahera"},{code:"2025",name:"Panna"},{code:"2040",name:"Muddapur"}];

const GROUPS_BY_PLANT={
  "2025":[
    {type:"BMD Trucks",hint:"Bulk Mixing & Delivery",img:"/images/bmd_truck.png",members:["MH-12-BMD-01","MH-12-BMD-02","MH-12-BMD-03"]},
    {type:"Blast Crew Vehicles",hint:"Carries blaster / shotfirer crew",img:"/images/crew_vehicle.png",members:["MH-12-BCV-01","MH-12-BCV-02"]},
    {type:"Support Trucks",hint:"Survey, mark-out & ancillary support",img:"/images/support_truck.png",members:["MH-12-SVY-01","MH-12-SPT-01"]},
  ],
  "2010":[
    {type:"BMD Trucks",hint:"Bulk Mixing & Delivery",img:"/images/bmd_truck.png",members:["MH-14-BMD-01","MH-14-BMD-02"]},
    {type:"Support Trucks",hint:"Survey, mark-out & ancillary support",img:"/images/support_truck.png",members:["MH-14-SPT-01"]},
  ],
  "2040":[
    {type:"BMD Trucks",hint:"Bulk Mixing & Delivery",img:"/images/bmd_truck.png",members:["KA-25-BMD-01","KA-25-BMD-02"]},
    {type:"Blast Crew Vehicles",hint:"Carries blaster / shotfirer crew",img:"/images/crew_vehicle.png",members:["KA-25-BCV-01"]},
  ],
};

// ASSIGN logic is now computed dynamically via vehicleAssignments
const INITIAL_OVR={
  "2025":{"MH-12-BMD-03":Object.fromEntries(["2026-06-02","2026-06-03","2026-06-04","2026-06-05"].map(d=>[d,{status:"Maintenance",comment:"Pump seal replacement"}]))},
  "2010":{},"2040":{"KA-25-BMD-02":{"2026-06-03":{status:"Maintenance",comment:"Scheduled service"}}},
};

export default function FleetPlanner({plant="2025",workingWeek=true,fullWeek}){
  const[ovr,setOvr]=useState(INITIAL_OVR);
  const[pop,setPop]=useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/schedule/fleet/${plant}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.status && Object.keys(data.status).length > 0) {
          let loadedStatus = data.status;
          if (loadedStatus[plant]) loadedStatus = loadedStatus[plant];
          setOvr(prev => ({ ...prev, [plant]: loadedStatus }));
        }
      })
      .catch(err => console.error("Error fetching fleet status:", err));
  }, [plant]);

  const WEEK=workingWeek?fullWeek.filter(d=>!d.we):fullWeek;
  const groups=GROUPS_BY_PLANT[plant];
  const cellState=(v,dk)=>{
    const assignedBlast = vehicleAssignments(v, dk)[0];
    if (assignedBlast) return { status: "Assigned", ref: assignedBlast, locked: true };
    if(ovr[plant]?.[v]?.[dk])return{status:ovr[plant][v][dk].status,comment:ovr[plant][v][dk].comment,locked:false};
    return{status:"Available",locked:false};
  };
  const summary=useMemo(()=>{
    const c={Available:0,Assigned:0,Maintenance:0};
    groups.forEach(g=>g.members.forEach(v=>WEEK.forEach(d=>{c[cellState(v,d.k).status]++;})));
    return c;
  },[plant,ovr,workingWeek,fullWeek]);
  const setRange=(v,fromKey,toKey,status,comment)=>{
    let fi=WEEK.findIndex(d=>d.k===fromKey),ti=WEEK.findIndex(d=>d.k===toKey);
    if(fi<0||ti<0)return;if(ti<fi){[fi,ti]=[ti,fi];}
    setOvr(prev=>{
      const next={...prev,[plant]:{...prev[plant],[v]:{...(prev[plant]?.[v]||{})}}};
      for(let i=fi;i<=ti;i++){const dk=WEEK[i].k;const cs=cellState(v,dk);if(cs.locked)continue;if(status==="Available")delete next[plant][v][dk];else next[plant][v][dk]={status,comment:comment||""};}
      
      fetch(`http://localhost:5000/api/schedule/fleet/${plant}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next[plant] })
      }).catch(err => console.error("Error saving fleet status:", err));

      return next;
    });
  };

  return(
    <div style={{fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif",color:INK}}>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        {["Available","Assigned","Maintenance"].map(k=>(
          <div key={k} style={{display:"flex",flexDirection:"column",gap:8,background:"#fff",border:`1px solid ${LINE}`,borderRadius:10,padding:"10px 14px",minWidth:140}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{width:11,height:11,borderRadius:"50%",background:ST[k].dot}}/>
              <span style={{fontSize:20,fontWeight:700}}>{summary[k]}</span>
              <span style={{fontSize:12.5,color:SLATE,fontWeight:500,lineHeight:1.2}}>{k}<br/><span style={{fontSize:10.5}}>vehicle-days this week</span></span>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",border:`1px solid ${LINE}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <div style={{minWidth:workingWeek?720:900}}>
            <div style={{display:"grid",gridTemplateColumns:`230px repeat(${WEEK.length},1fr)`,borderBottom:"2px solid #D6DBE2"}}>
              <div style={{padding:"14px 16px",fontSize:12.5,fontWeight:800,textTransform:"uppercase",letterSpacing:.6,background:COLHEAD,borderRight:`3px solid ${LINE}`,display:"flex",alignItems:"center",gap:8}}><img src="/images/bmd_truck.png" style={{height: 16, width: 24, objectFit: 'contain'}} alt="Fleet" /> Fleet</div>
              {WEEK.map(d=>(
                <div key={d.k} style={{padding:"11px 8px",textAlign:"center",borderLeft:`1px solid ${LINE}`,background:d.today?ORANGE_SOFT:COLHEAD}}>
                  <div style={{fontSize:11,color:d.today?ORANGE:SLATE,fontWeight:700,textTransform:"uppercase"}}>{d.dow}</div>
                  <div style={{fontSize:18,fontWeight:700,color:d.today?ORANGE:INK,marginTop:1}}>{d.d}</div>
                </div>
              ))}
            </div>
            {groups.map(g=>(
              <div key={g.type}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#2B2F36",borderLeft:`4px solid ${ORANGE}`}}>
                  {g.img ? <img src={g.img} style={{height: 18, width: 28, objectFit: 'contain'}} alt={g.type} /> : <Truck size={16} style={{color:ORANGE}}/>}<span style={{fontSize:13.5,fontWeight:700,color:"#fff"}}>{g.type}</span><span style={{fontSize:11.5,color:"#A8AEB8"}}>{g.hint}</span>
                </div>
                {g.members.map(v=>(
                  <div key={v} style={{display:"grid",gridTemplateColumns:`230px repeat(${WEEK.length},1fr)`,borderBottom:`1px solid ${LINE}`,minHeight:58}}>
                    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderRight:`3px solid ${LINE}`,background:FLEETCOL}}>
                      <div style={{width:40,height:28,borderRadius:6,background:ORANGE_SOFT,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden",border:`1px solid ${ORANGE}44`}}>
                        {g.img ? <img src={g.img} style={{width:"90%",height:"90%",objectFit:"contain"}} alt={g.type} /> : <Truck size={17} style={{color:ORANGE}}/>}
                      </div>
                      <span style={{fontSize:13,fontWeight:700}}>{v}</span>
                    </div>
                    {WEEK.map(d=>{
                      const cs=cellState(v,d.k);const s=ST[cs.status];
                      const allAssignments = vehicleAssignments(v, d.k);
                      const isDoubleBooked = cs.status==="Assigned" && new Set(allAssignments).size > 1;
                      const tooltipText = isDoubleBooked ? `⚠ Double-booked!\nAssigned to: ${[...new Set(allAssignments)].join(', ')}` : '';
                      return(
                        <div key={d.k} title={isDoubleBooked ? tooltipText : ""} onClick={()=>setPop({vehicle:v,dateKey:d.k})} style={{borderLeft:`1px solid ${LINE}`,padding:6,cursor:cs.locked?"default":"pointer",background:d.today?"#FFFBF7":"transparent",display:"flex"}}>
                          <div style={{flex:1,borderRadius:7,background:isDoubleBooked?"#FFF0F0":s.bg,border:`1px solid ${isDoubleBooked?"#E03131":s.dot}33`,padding:"6px 8px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{width:7,height:7,borderRadius:"50%",background:isDoubleBooked?"#E03131":s.dot}}/>
                              <span style={{fontSize:11,fontWeight:700,color:isDoubleBooked?"#E03131":s.fg}}>{cs.status==="Assigned"?cs.ref:cs.status}</span>
                              {isDoubleBooked&&<span title={tooltipText} style={{marginLeft:"auto",cursor:"help",display:"flex",alignItems:"center"}}><AlertTriangle size={13} style={{color:"#E03131"}}/></span>}
                              {!isDoubleBooked&&cs.locked&&<Lock size={10} style={{color:s.fg,marginLeft:"auto",opacity:.6}}/>}
                            </div>
                            {isDoubleBooked&&<div style={{fontSize:9.5,color:"#E03131",fontWeight:600}}>Double-booked</div>}
                            {cs.comment&&!isDoubleBooked&&<div title={cs.comment} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:s.fg,opacity:.85}}><MessageSquare size={11}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:80}}>{cs.comment}</span></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{marginTop:12,fontSize:12.5,color:SLATE}}>Counters tally vehicle-days across the visible week. Click any unlocked cell to set Available or Maintenance for a day or range. Assigned is derived from the schedule and locked.</div>

      {pop&&<CellPopover week={WEEK} pop={pop} cellState={cellState} onClose={()=>setPop(null)} onSave={(status,toKey,comment)=>{setRange(pop.vehicle,pop.dateKey,toKey,status,comment);setPop(null);}}/>}
    </div>
  );
}

function CellPopover({week,pop,cellState,onClose,onSave}){
  const cs=cellState(pop.vehicle,pop.dateKey);
  const day=week.find(d=>d.k===pop.dateKey);
  const[sel,setSel]=useState(EDITABLE.includes(cs.status)?cs.status:"Available");
  const[toKey,setToKey]=useState(pop.dateKey);
  const[comment,setComment]=useState(cs.comment||"");
  if(cs.locked){
    const allAssignments = vehicleAssignments(pop.vehicle, pop.dateKey);
    const isDoubleBooked = cs.status==="Assigned" && new Set(allAssignments).size > 1;

    return(<Overlay onClose={onClose}><div style={popStyle(300)}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Lock size={16} style={{color:SLATE}}/><span style={{fontWeight:700,fontSize:14}}>Assigned</span></div>
      {isDoubleBooked ? (
        <div style={{fontSize:13,color:"#E03131",lineHeight:1.5,fontWeight:600}}>
          {Array.from(new Set(allAssignments)).join(" and ")} are double booked on this date.
        </div>
      ) : (
        <div style={{fontSize:13,color:SLATE,lineHeight:1.5}}>This vehicle is committed to {cs.ref}. Edit the booking to release it.</div>
      )}
      <button onClick={onClose} style={{marginTop:14,width:"100%",padding:9,border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
    </div></Overlay>);
  }
  return(<Overlay onClose={onClose}><div style={popStyle(340)}>
    <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{pop.vehicle}</div>
    <div style={{fontSize:12.5,color:SLATE,marginBottom:14}}>Set status from {day.dow} {day.d}</div>
    <Lbl>Status</Lbl>
    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
      {EDITABLE.map(s=>(
        <button key={s} onClick={()=>setSel(s)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 11px",border:`1.5px solid ${sel===s?ST[s].dot:LINE}`,background:sel===s?ST[s].bg:"#fff",borderRadius:8,fontSize:13,fontWeight:600,color:sel===s?ST[s].fg:INK,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
          <span style={{width:9,height:9,borderRadius:"50%",background:ST[s].dot}}/>{s}
        </button>
      ))}
    </div>
    <Lbl>Apply through (optional)</Lbl>
    <select value={toKey} onChange={e=>setToKey(e.target.value)} style={{width:"100%",padding:"9px 11px",border:`1px solid ${LINE}`,borderRadius:8,fontSize:13,marginBottom:14,cursor:"pointer",fontFamily:"inherit"}}>
      {week.map(d=><option key={d.k} value={d.k}>{d.dow} {d.d}</option>)}
    </select>
    <Lbl>Comment</Lbl>
    <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Reason / note (visible on the planner)" style={{width:"100%",padding:"9px 11px",border:`1px solid ${LINE}`,borderRadius:8,fontSize:13,resize:"none",marginBottom:14,fontFamily:"inherit"}}/>
    <div style={{display:"flex",gap:8}}>
      <button onClick={onClose} style={{flex:1,padding:10,border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      <button onClick={()=>onSave(sel,toKey,comment)} style={{flex:1,padding:10,border:"none",background:ORANGE,color:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
    </div>
  </div></Overlay>);
}
function Overlay({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,24,30,.25)",zIndex:1400,display:"flex",alignItems:"flex-start",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{marginTop:"12vh"}}>{children}</div></div>;}
function Lbl({children}){return<div style={{fontSize:11,fontWeight:700,color:SLATE,textTransform:"uppercase",letterSpacing:.4,marginBottom:7}}>{children}</div>;}
const popStyle=(w)=>({background:"#fff",border:`1px solid ${LINE}`,borderRadius:12,boxShadow:"0 20px 50px rgba(0,0,0,.22)",width:w,padding:18,fontFamily:"'DM Sans',system-ui,sans-serif"});
