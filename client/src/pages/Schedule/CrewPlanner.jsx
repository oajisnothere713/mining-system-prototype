import React, { useState, useMemo } from "react";
import { Users, HardHat, Lock, MessageSquare, X } from "lucide-react";

/* ============================================================
   CREW PLANNER — set crew availability across the week
   States: Available / Assigned (locked, from schedule) /
   Unavailable / On Long Leave / Off-shift (locked, from ERP)
   Whole-week person-day counters. Multi-day range + comments.
   ============================================================ */

const ORANGE="#E8590C",ORANGE_SOFT="#FFF1E8";
const INK="#1A1D21",SLATE="#5B6470",LINE="#E6E9ED",BG="#F7F8FA",COLHEAD="#EEF1F5",FLEETCOL="#F4F6F9";
const GREEN="#2F9E44",GREEN_SOFT="#EBFBEE",BLUE="#1971C2",BLUE_SOFT="#E7F5FF",RED="#E03131",RED_SOFT="#FFF0F0";

const ST={
  Available:{fg:GREEN,bg:GREEN_SOFT,dot:GREEN},
  Assigned:{fg:BLUE,bg:BLUE_SOFT,dot:BLUE},
  Unavailable:{fg:RED,bg:RED_SOFT,dot:RED},
  "On Long Leave":{fg:"#7048E8",bg:"#F3F0FF",dot:"#7048E8"},
  "Off-shift":{fg:SLATE,bg:"#EEF0F2",dot:"#AEB4BC"},
};
const EDITABLE=["Available","Unavailable","On Long Leave"];
const PLANTS=[{code:"2010",name:"Nimbahera"},{code:"2025",name:"Panna"},{code:"2040",name:"Muddapur"}];

const GROUPS_BY_PLANT={
  "2025":[
    {type:"BMD Operators",hint:"Operate the bulk delivery trucks",members:["Ramesh Patil","Suresh Yadav","Blair Huntingdon","Cas Davide"]},
    {type:"Blasters / Shotfirers",hint:"Licensed to charge & fire",members:["Mike Sullivan","Dan Brooks"]},
    {type:"Surveyors",hint:"Survey & mark-out",members:["James Lee","Priya Sharma"]},
  ],
  "2010":[
    {type:"BMD Operators",hint:"Operate the bulk delivery trucks",members:["Vikram Singh","Arjun Mehta"]},
    {type:"Blasters / Shotfirers",hint:"Licensed to charge & fire",members:["Rahul Verma"]},
  ],
  "2040":[
    {type:"BMD Operators",hint:"Operate the bulk delivery trucks",members:["Karthik Rao","Deepak Nair"]},
    {type:"Surveyors",hint:"Survey & mark-out",members:["Anjali Reddy"]},
  ],
};

const ASSIGN={
  "2025":{
    "Ramesh Patil":{"2026-06-02":"BL-2025-041","2026-06-03":"BL-2025-043","2026-06-04":"BL-2025-045","2026-06-05":"BL-2025-045"},
    "Suresh Yadav":{"2026-06-02":"BL-2025-041","2026-06-04":"BL-2025-045"},
    "Blair Huntingdon":{"2026-06-02":"BL-2025-042","2026-06-04":"BL-2025-046"},
    "Cas Davide":{"2026-06-03":"BL-2025-044","2026-06-05":"BL-2025-048"},
    "Mike Sullivan":{"2026-06-02":"BL-2025-041","2026-06-03":"BL-2025-043","2026-06-04":"BL-2025-045","2026-06-05":"BL-2025-045"},
    "Dan Brooks":{"2026-06-02":"BL-2025-042","2026-06-03":"BL-2025-044","2026-06-04":"BL-2025-046"},
    "James Lee":{"2026-06-04":"BL-2025-052"},"Priya Sharma":{},
  },
  "2010":{"Vikram Singh":{"2026-06-03":"BL-2010-012"},"Arjun Mehta":{},"Rahul Verma":{"2026-06-03":"BL-2010-012"}},
  "2040":{"Karthik Rao":{"2026-06-02":"BL-2040-008","2026-06-04":"BL-2040-009"},"Deepak Nair":{},"Anjali Reddy":{"2026-06-04":"BL-2040-009"}},
};
const OFFSHIFT={
  "2025":{"Ramesh Patil":["2026-06-07","2026-06-08"],"Suresh Yadav":["2026-06-07","2026-06-08"],"Blair Huntingdon":["2026-06-03","2026-06-08"],"Cas Davide":["2026-06-02","2026-06-08"],"Mike Sullivan":["2026-06-07","2026-06-08"],"Dan Brooks":["2026-06-06","2026-06-07"],"James Lee":["2026-06-07","2026-06-08"],"Priya Sharma":["2026-06-07","2026-06-08"]},
  "2010":{"Vikram Singh":["2026-06-07","2026-06-08"],"Arjun Mehta":["2026-06-07","2026-06-08"],"Rahul Verma":["2026-06-06","2026-06-07"]},
  "2040":{"Karthik Rao":["2026-06-07","2026-06-08"],"Deepak Nair":["2026-06-07","2026-06-08"],"Anjali Reddy":["2026-06-07","2026-06-08"]},
};
const INITIAL_OVR={
  "2025":{
    "Cas Davide":{"2026-06-04":{status:"Unavailable",comment:"Medical appointment — back by noon"}},
    "Priya Sharma":Object.fromEntries(["2026-06-02","2026-06-03","2026-06-04","2026-06-05","2026-06-06"].map(d=>[d,{status:"On Long Leave",comment:"Maternity leave — returns Aug 2026"}])),
  },
  "2010":{},"2040":{"Deepak Nair":{"2026-06-05":{status:"Unavailable",comment:"Training day"}}},
};

const initials=(n)=>n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

export default function CrewPlanner({plant="2025",workingWeek=true,fullWeek}){
  const[ovr,setOvr]=useState(INITIAL_OVR);
  const[pop,setPop]=useState(null); // {person, dateKey}

  const WEEK=workingWeek?fullWeek.filter(d=>!d.we):fullWeek;
  const groups=GROUPS_BY_PLANT[plant];
  const cellState=(person,dk)=>{
    if(ASSIGN[plant][person]&&ASSIGN[plant][person][dk])return{status:"Assigned",ref:ASSIGN[plant][person][dk],locked:true};
    if(ovr[plant]?.[person]?.[dk])return{status:ovr[plant][person][dk].status,comment:ovr[plant][person][dk].comment,locked:false};
    if(OFFSHIFT[plant][person]&&OFFSHIFT[plant][person].includes(dk))return{status:"Off-shift",locked:true};
    return{status:"Available",locked:false};
  };
  const summary=useMemo(()=>{
    const c={Available:0,Assigned:0,Unavailable:0,"On Long Leave":0,"Off-shift":0};
    groups.forEach(g=>g.members.forEach(p=>WEEK.forEach(d=>{c[cellState(p,d.k).status]++;})));
    return c;
  },[plant,ovr,workingWeek]);

  const setRange=(person,fromKey,toKey,status,comment)=>{
    let fi=WEEK.findIndex(d=>d.k===fromKey),ti=WEEK.findIndex(d=>d.k===toKey);
    if(fi<0||ti<0)return;if(ti<fi){[fi,ti]=[ti,fi];}
    setOvr(prev=>{
      const next={...prev,[plant]:{...prev[plant],[person]:{...(prev[plant]?.[person]||{})}}};
      for(let i=fi;i<=ti;i++){
        const dk=WEEK[i].k;const cs=cellState(person,dk);if(cs.locked)continue;
        if(status==="Available")delete next[plant][person][dk];
        else next[plant][person][dk]={status,comment:comment||""};
      }
      return next;
    });
  };

  return(
    <div style={{fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif",color:INK}}>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        {["Available","Assigned","Unavailable","On Long Leave","Off-shift"].map(k=>(
          <div key={k} style={{display:"flex",flexDirection:"column",gap:8,background:"#fff",border:`1px solid ${LINE}`,borderRadius:10,padding:"10px 14px",minWidth:140}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{width:11,height:11,borderRadius:"50%",background:ST[k].dot}}/>
              <span style={{fontSize:20,fontWeight:700}}>{summary[k]}</span>
              <span style={{fontSize:12.5,color:SLATE,fontWeight:500,lineHeight:1.2}}>{k}<br/><span style={{fontSize:10.5}}>this week</span></span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:6,borderTop:`1px solid ${LINE}`,fontSize:12,color:SLATE}}>
              <span style={{width:11,height:11,borderRadius:3,background:ST[k].dot}}/>{k}
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",border:`1px solid ${LINE}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <div style={{minWidth:workingWeek?720:900}}>
            <div style={{display:"grid",gridTemplateColumns:`230px repeat(${WEEK.length},1fr)`,borderBottom:"2px solid #D6DBE2"}}>
              <div style={{padding:"14px 16px",fontSize:12.5,fontWeight:800,textTransform:"uppercase",letterSpacing:.6,background:COLHEAD,borderRight:`3px solid ${LINE}`,display:"flex",alignItems:"center",gap:8}}><Users size={16} style={{color:ORANGE}}/> Crew</div>
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
                  <HardHat size={16} style={{color:ORANGE}}/><span style={{fontSize:13.5,fontWeight:700,color:"#fff"}}>{g.type}</span><span style={{fontSize:11.5,color:"#A8AEB8"}}>{g.hint}</span>
                </div>
                {g.members.map(p=>(
                  <div key={p} style={{display:"grid",gridTemplateColumns:`230px repeat(${WEEK.length},1fr)`,borderBottom:`1px solid ${LINE}`,minHeight:58}}>
                    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderRight:`3px solid ${LINE}`,background:FLEETCOL}}>
                      <span style={{width:32,height:32,borderRadius:"50%",background:"#C7CFDA",color:"#3A4350",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{initials(p)}</span>
                      <span style={{fontSize:13,fontWeight:600}}>{p}</span>
                    </div>
                    {WEEK.map(d=>{
                      const cs=cellState(p,d.k);const s=ST[cs.status];
                      return(
                        <div key={d.k} onClick={()=>setPop({person:p,dateKey:d.k})} style={{borderLeft:`1px solid ${LINE}`,padding:6,cursor:cs.locked?"default":"pointer",background:d.today?"#FFFBF7":"transparent",display:"flex"}}>
                          <div style={{flex:1,borderRadius:7,background:s.bg,border:`1px solid ${s.dot}33`,padding:"6px 8px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{width:7,height:7,borderRadius:"50%",background:s.dot}}/>
                              <span style={{fontSize:11,fontWeight:700,color:s.fg}}>{cs.status==="Assigned"?cs.ref:cs.status}</span>
                              {cs.locked&&<Lock size={10} style={{color:s.fg,marginLeft:"auto",opacity:.6}}/>}
                            </div>
                            {cs.comment&&<div title={cs.comment} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:s.fg,opacity:.85}}><MessageSquare size={11}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:80}}>{cs.comment}</span></div>}
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
      <div style={{marginTop:12,fontSize:12.5,color:SLATE}}>Counters tally the whole visible week (person-days). Click any unlocked cell to set status for a day or range. Assigned is derived from the schedule; Off-shift comes from the ERP shift roster.</div>

      {pop&&<CellPopover week={WEEK} pop={pop} cellState={cellState} onClose={()=>setPop(null)} onSave={(status,toKey,comment)=>{setRange(pop.person,pop.dateKey,toKey,status,comment);setPop(null);}}/>}
    </div>
  );
}

function CellPopover({week,pop,cellState,onClose,onSave}){
  const cs=cellState(pop.person,pop.dateKey);
  const day=week.find(d=>d.k===pop.dateKey);
  const[sel,setSel]=useState(EDITABLE.includes(cs.status)?cs.status:"Available");
  const[toKey,setToKey]=useState(pop.dateKey);
  const[comment,setComment]=useState(cs.comment||"");

  if(cs.locked){
    const msg=cs.status==="Assigned"?`This day is committed to ${cs.ref}. Edit the booking to release it.`:"Off-shift comes from the ERP shift roster and can't be changed here.";
    return(<Overlay onClose={onClose}><div style={popStyle(300)}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><Lock size={16} style={{color:SLATE}}/><span style={{fontWeight:700,fontSize:14}}>{cs.status}</span></div>
      <div style={{fontSize:13,color:SLATE,lineHeight:1.5}}>{msg}</div>
      <button onClick={onClose} style={{marginTop:14,width:"100%",padding:9,border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
    </div></Overlay>);
  }
  return(<Overlay onClose={onClose}><div style={popStyle(340)}>
    <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{pop.person}</div>
    <div style={{fontSize:12.5,color:SLATE,marginBottom:14}}>Set availability from {day.dow} {day.d} Jun</div>
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
      {week.map(d=><option key={d.k} value={d.k}>{d.dow} {d.d} Jun</option>)}
    </select>
    <Lbl>Comment</Lbl>
    <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Reason / note (visible on the roster)" style={{width:"100%",padding:"9px 11px",border:`1px solid ${LINE}`,borderRadius:8,fontSize:13,resize:"none",marginBottom:14,fontFamily:"inherit"}}/>
    <div style={{display:"flex",gap:8}}>
      <button onClick={onClose} style={{flex:1,padding:10,border:`1px solid ${LINE}`,background:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      <button onClick={()=>onSave(sel,toKey,comment)} style={{flex:1,padding:10,border:"none",background:ORANGE,color:"#fff",borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
    </div>
  </div></Overlay>);
}
function Overlay({children,onClose}){return<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(20,24,30,.25)",zIndex:1400,display:"flex",alignItems:"flex-start",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{marginTop:"12vh"}}>{children}</div></div>;}
function Lbl({children}){return<div style={{fontSize:11,fontWeight:700,color:SLATE,textTransform:"uppercase",letterSpacing:.4,marginBottom:7}}>{children}</div>;}
const popStyle=(w)=>({background:"#fff",border:`1px solid ${LINE}`,borderRadius:12,boxShadow:"0 20px 50px rgba(0,0,0,.22)",width:w,padding:18,fontFamily:"'DM Sans',system-ui,sans-serif"});
