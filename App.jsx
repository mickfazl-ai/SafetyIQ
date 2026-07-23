import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wwaogpobcnqqxzicjzon.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YW9ncG9iY25xcXh6aWNqem9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTQ5ODQsImV4cCI6MjA5NjYzMDk4NH0.eF57eCwnaHUvvAgI9yfO9auAyKTC-C17qZeh_t7GPaQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APP_URL = "https://safety-iq.vercel.app";
const MASTER_EMAIL = "fazl.michael@herrenknecht.com"; // Master admin email

// ── Data constants ────────────────────────────────────────────────────────────
const STEP1_CHECKS = [
  // goodAnswer = the answer that is "safe/green". swmsTrigger = answering the BAD way triggers SWMS
  { id:"s1_1", text:"Do I fully understand the task, the scope of work and the safe work procedure?",       goodAnswer:"yes", swmsTrigger:false },
  { id:"s1_3", text:"Is the work area clear of unauthorised personnel and bystanders?",                     goodAnswer:"yes", swmsTrigger:false },
  { id:"s1_4", text:"Have I inspected my tools and equipment — are they in good condition and fit for purpose?", goodAnswer:"yes", swmsTrigger:false },
  { id:"s1_5", text:"Do I have the correct PPE in good condition for this specific task?",                  goodAnswer:"yes", swmsTrigger:false },
  { id:"s1_6", text:"Am I trained, competent, licensed and physically fit to perform this task today?",     goodAnswer:"yes", swmsTrigger:false },
  { id:"s1_7", text:"Have conditions changed since the last shift or last time this task was performed?",   goodAnswer:"no",  swmsTrigger:false },
  { id:"s1_8", text:"Does this task involve lifting using a jib crane, chain block or come-along?",         goodAnswer:"no",  swmsTrigger:true  },
];

const HRCW_TASKS = [
  { id:"hrcw_wah",    label:"Working at Heights",       sub:"Any work above 2m, platforms, ladders, scaffolding", icon:"🪜", permits:["Height Safety Plan / EWP pre-start must be completed"], triggerLift:false, triggerCS:false },
  { id:"hrcw_cs",     label:"Confined Space Entry",     sub:"Enclosed space with restricted egress or atmospheric risk", icon:"🚪", permits:["Confined Space Entry Permit required","Atmospheric testing — O₂, CO, LEL must be recorded"], triggerLift:false, triggerCS:true },
  { id:"hrcw_lift",   label:"Lifting Operations",       sub:"Crane, EWP, forklift, chain block, rigging, slinging", icon:"🏗", permits:["Lift Plan / Rigging Study required","Dogman/rigger tickets must be current"], triggerLift:true, triggerCS:false },
  { id:"hrcw_press",  label:"Pressurised Systems",      sub:"Hydraulic/pneumatic systems, pressure testing, hose replacement", icon:"⚡", permits:["System must be depressurised and isolated before work"], triggerLift:false, triggerCS:false },
  { id:"hrcw_mech",   label:"Mechanical Isolation/LOTO",sub:"Isolating rotating plant, machinery before maintenance", icon:"🔒", permits:["Isolation permit / LOTO procedure must be completed","Zero energy state verified before commencing"], triggerLift:false, triggerCS:false },
  { id:"hrcw_struct", label:"Structural / Demolition",  sub:"Removing, modifying structural components, machine frames", icon:"🔧", permits:["Engineering sign-off required for structural modifications"], triggerLift:false, triggerCS:false },
  { id:"hrcw_chem",   label:"Hazardous Substances",     sub:"Hydraulic oils, greases, epoxy, solvents, cleaning agents", icon:"🧪", permits:["SDS must be available on site","Adequate ventilation and spill containment required"], triggerLift:false, triggerCS:false },
  { id:"hrcw_plant",  label:"Working Near Mobile Plant", sub:"Cranes, forklifts, excavators, vehicles in work area", icon:"🚛", permits:["Exclusion zones must be established","Spotter/traffic controller required where visibility limited"], triggerLift:false, triggerCS:false },
  { id:"hrcw_excav",  label:"Excavation / Ground Disturbance", sub:"Digging, trenching, underground services", icon:"⛏", permits:["Dial Before You Dig — 1100","BYDA check required"], triggerLift:false, triggerCS:false },
  { id:"hrcw_hotwork",label:"Hot Works",                 sub:"Welding, cutting, grinding, brazing or any open flame work", icon:"🔥", permits:["Hot Work Permit required before commencing","Fire extinguisher must be on hand and serviceable","Fire watch required for 30 minutes after completion"], triggerLift:false, triggerCS:false },
  { id:"hrcw_elec",   label:"Electrical Works",          sub:"Live electrical work, switchboards, isolation, electrical testing", icon:"⚡", permits:["Electrical Isolation Permit required","Only a licensed electrician to perform live electrical work","Test for dead before touching any conductors"], triggerLift:false, triggerCS:false },
  { id:"hrcw_none",   label:"No High Risk Tasks",       sub:"This task does not involve any high risk construction work", icon:"✓", permits:[], triggerLift:false, triggerCS:false },
];

const HAZARDS = [
  { id:"h_mh",     icon:"💪", label:"Manual Handling",          sub:"Heavy lifts, awkward postures, repetitive strain",                   weight:"medium" },
  { id:"h_fall",   icon:"⬇️", label:"Falls / Slips / Trips",    sub:"Wet surfaces, uneven ground, open edges, debris",                   weight:"high" },
  { id:"h_mech",   icon:"⚙️", label:"Mechanical Hazards",        sub:"Rotating parts, nip points, struck by components",                  weight:"high" },
  { id:"h_press",  icon:"🔴", label:"Pressure / Stored Energy",  sub:"Hydraulic/pneumatic energy, springs, accumulators",                 weight:"high" },
  { id:"h_chem",   icon:"🧪", label:"Chemical / Substance",      sub:"Hydraulic oil, grease, solvents, cleaning agents",                  weight:"medium" },
  { id:"h_noise",  icon:"🔊", label:"Noise / Vibration",         sub:"Impact tools, grinders, heavy machinery",                           weight:"medium" },
  { id:"h_heat",   icon:"🌡️", label:"Heat / Burns",              sub:"Hot surfaces, steam, friction, welding",                            weight:"medium" },
  { id:"h_struct", icon:"🏚️", label:"Structural Instability",    sub:"Unsecured frames, components overhead, inadequate support",          weight:"high" },
  { id:"h_env",    icon:"🌧️", label:"Environment / Weather",     sub:"Rain, wind, heat stress, poor lighting, dust",                      weight:"medium" },
  { id:"h_traffic",icon:"🚛", label:"Traffic / Mobile Plant",    sub:"Vehicles, forklifts, cranes near work area",                        weight:"high" },
  { id:"h_ergon",  icon:"🧍", label:"Ergonomic / Fatigue",       sub:"Repetitive work, awkward access, shift fatigue",                    weight:"medium" },
  { id:"h_lift",   icon:"🏗️", label:"Lifting / Rigging / Crane", sub:"Crane lifts, rigging failures, dropped loads, slinging operations", weight:"high" },
  { id:"h_elec",   icon:"⚡", label:"Electrical Shock",          sub:"Contact with live conductors, faulty equipment, switchboards",       weight:"high" },
  { id:"h_wah",    icon:"🪜", label:"Working at Heights",        sub:"Any work above 2m, platforms, ladders, scaffolding",                weight:"high" },
  { id:"h_cs",     icon:"🚪", label:"Confined Space",            sub:"Enclosed space with restricted egress or atmospheric risk",          weight:"high" },
  { id:"h_hotwork",icon:"🔥", label:"Hot Works",                 sub:"Welding, cutting, grinding, brazing or any open flame work",        weight:"high" },
  { id:"h_other",  icon:"⚠️", label:"Other Hazard",              sub:"Any hazard not captured above",                                     weight:"medium" },
];

// Pre-populated hazard descriptions for SWMS auto-fill
const HAZARD_SUGGESTIONS = {
  h_mh:    { hazard:"Manual Handling — heavy lifts, awkward postures, repetitive strain, over-exertion", initialL:"2", initialC:"2" },
  h_fall:  { hazard:"Falls / Slips / Trips — wet surfaces, uneven ground, open edges, debris on walkways", initialL:"2", initialC:"3" },
  h_mech:  { hazard:"Mechanical Hazards — rotating parts, nip points, struck by moving components or tools", initialL:"2", initialC:"3" },
  h_press: { hazard:"Pressure / Stored Energy — hydraulic/pneumatic energy release, springs under load, accumulators", initialL:"1", initialC:"3" },
  h_chem:  { hazard:"Chemical / Substance — skin/eye contact with hydraulic oil, grease, solvents or cleaning agents", initialL:"2", initialC:"1" },
  h_noise: { hazard:"Noise / Vibration — exposure to impact tools, grinders, heavy machinery above safe levels", initialL:"3", initialC:"1" },
  h_heat:  { hazard:"Heat / Burns — contact with hot surfaces, steam, friction heat or welding operations", initialL:"2", initialC:"2" },
  h_struct:{ hazard:"Structural Instability — unsecured machine frames, overhead components, inadequate support during disassembly", initialL:"1", initialC:"3" },
  h_env:   { hazard:"Environment / Weather — rain, wind, heat stress, poor lighting, dust affecting work conditions", initialL:"2", initialC:"1" },
  h_traffic:{ hazard:"Traffic / Mobile Plant — vehicles, forklifts or cranes operating near the work area", initialL:"2", initialC:"3" },
  h_ergon: { hazard:"Ergonomic / Fatigue — repetitive tasks, awkward access positions, end-of-shift fatigue", initialL:"3", initialC:"1" },
  h_lift:  { hazard:"Lifting / Rigging / Crane — crane lifts, rigging failures, dropped loads, slinging operations", initialL:"1", initialC:"4" },
  h_wah:   { hazard:"Working at Heights — fall risk from platforms, ladders, scaffolding or any work above 2 metres", initialL:"2", initialC:"3" },
  h_cs:    { hazard:"Confined Space — restricted egress, atmospheric hazards, poor ventilation", initialL:"1", initialC:"4" },
  h_hotwork:{ hazard:"Hot Works — welding, cutting or grinding with risk of fire, burns or ignition of flammables", initialL:"2", initialC:"2" },
  h_elec:  { hazard:"Electrical Shock — contact with live conductors, faulty equipment or switchboards", initialL:"1", initialC:"4" },
  h_other: { hazard:"Other Hazard — ", initialL:"", initialC:"" },
};



const LIKELIHOOD = [
  { value:0, label:"Rare",           short:"Rare (1)",           desc:"May occur only in exceptional circumstances", color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Unlikely",       short:"Unlikely (2)",       desc:"Could occur at some time but not expected",   color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Possible",       short:"Possible (3)",       desc:"Might occur at some time during the task",    color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Likely",         short:"Likely (4)",         desc:"Will probably occur in most circumstances",   color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Almost Certain", short:"Almost Certain (5)", desc:"Is expected to occur during this task",       color:"#B91C1C", bg:"#FEE2E2" },
];

const CONSEQUENCE = [
  { value:0, label:"Insignificant", short:"Insignificant (1)", desc:"No injury, minor first aid only",                     color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Minor",         short:"Minor (2)",         desc:"Minor injury, limited medical treatment",             color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Moderate",      short:"Moderate (3)",      desc:"Medical treatment required, restricted duties",       color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Major",         short:"Major (4)",         desc:"Significant injury, long term illness or disability", color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Catastrophic",  short:"Catastrophic (5)",  desc:"Death or permanent total disability",                 color:"#7F1D1D", bg:"#fecaca" },
];

const RISK_LEVEL = [
  { label:"Low",     color:"#065F46", bg:"#D1FAE5", border:"#86EFAC", desc:"Manage by routine procedures" },
  { label:"Medium",  color:"#78350F", bg:"#FEF3C7", border:"#FCD34D", desc:"Manage by monitoring and specific procedures" },
  { label:"High",    color:"#B91C1C", bg:"#FEE2E2", border:"#FCA5A5", desc:"Senior management attention required" },
  { label:"Extreme", color:"#fff",    bg:"#7F1D1D", border:"#991B1B", desc:"Immediate action required — stop work" },
];

const LIFT_CHECKS = [
  "Has a Lift Plan / Rigging Study been completed and approved?",
  "Is the crane / EWP / forklift pre-start inspection current?",
  "Is the operator licensed and competent for this equipment?",
  "Has the load weight been confirmed and is it within the SWL?",
  "Are rigger/dogman tickets current and relevant to this lift?",
  "Has the exclusion zone been established, signed and communicated?",
  "Are overhead obstructions and underground services checked?",
  "Are environmental conditions (wind speed, visibility) acceptable?",
  "Is tag line control in place for load management?",
  "Has the lift been communicated via toolbox talk or pre-start?",
  "Is rigging equipment (slings, shackles, hooks) inspected and tagged?",
  "Is the landing zone clear and prepared to receive the load?",
];

const CONFINED_CHECKS = [
  "Has an atmospheric test been completed? (O₂ 19.5–23.5%, LEL <10%, CO <25ppm)",
  "Is a Confined Space Entry Permit in place and signed off?",
  "Is a standby person assigned and stationed at the entry point?",
  "Is rescue equipment available and workers trained in its use?",
  "Is ventilation adequate — forced air ventilation in place if required?",
  "Has the space been isolated from all energy sources and services?",
  "Do all entrants understand the emergency evacuation procedure?",
  "Is continuous atmospheric monitoring in place during the task?",
];

function matrixRating(l, c) {
  const s = (l+1)*(c+1);
  if (s<=4) return RISK_LEVEL[0];
  if (s<=9) return RISK_LEVEL[1];
  if (s<=16) return RISK_LEVEL[2];
  return RISK_LEVEL[3];
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:      { maxWidth:720, margin:"0 auto", padding:"12px 12px 40px", fontFamily:"system-ui,-apple-system,sans-serif" },
  card:     { background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"14px", marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  label:    { fontSize:12, color:"#6B7280", display:"block", marginBottom:3, fontWeight:500 },
  input:    { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none", outline:"none" },
  textarea: { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", resize:"vertical", minHeight:80, outline:"none" },
  select:   { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none", appearance:"none", outline:"none" },
  btnPrim:  { background:"#2563EB", color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", marginTop:6 },
  btnSec:   { background:"#F3F4F6", color:"#374151", border:"1px solid #E5E7EB", borderRadius:10, padding:"11px 16px", fontSize:14, fontWeight:500, cursor:"pointer" },
  btnDanger:{ background:"#FEE2E2", color:"#B91C1C", border:"1px solid #FCA5A5", borderRadius:10, padding:"10px 16px", fontSize:14, fontWeight:600, cursor:"pointer" },
  btnGreen: { background:"#16A34A", color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", marginTop:6 },
  grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 },
  grid3:    { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:10 },
  stepLbl:  { fontSize:11, fontWeight:700, color:"#2563EB", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 },
  secSub:   { fontSize:14, color:"#6B7280", marginBottom:14, lineHeight:1.5 },
  divider:  { fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:".06em", padding:"8px 0 4px", borderBottom:"1px solid #E5E7EB", marginBottom:10, marginTop:16 },
  hdr:      { display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:12, borderBottom:"1px solid #E5E7EB" },
};

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size=44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/>
      <path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/>
      <path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/>
      <text x="22" y="40.5" textAnchor="middle" style={{fill:"#fff",fontSize:"6px",fontWeight:700,fontFamily:"system-ui"}}>IQ</text>
    </svg>
  );
}

function Pips({ active, total=6 }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:14 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ flex:1, height:5, borderRadius:3, transition:"background .2s",
          background:i<active?"#22C55E":i===active?"#2563EB":"#E5E7EB" }} />
      ))}
    </div>
  );
}

function RiskSelector({ label, options, value, onChange }) {
  const sel = value!=="" ? options[parseInt(value)] : null;
  return (
    <div>
      <label style={S.label}>{label}</label>
      <div style={{ position:"relative" }}>
        <select style={{ ...S.select, borderColor:sel?sel.bg:"#D1D5DB" }} value={value} onChange={e=>onChange(e.target.value)}>
          <option value="">Select...</option>
          {options.map((o,i)=><option key={i} value={i}>{o.short}</option>)}
        </select>
        <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#6B7280" }}>▼</div>
      </div>
      {sel && <div style={{ marginTop:5, padding:"8px 10px", borderRadius:8, background:sel.bg }}><span style={{ color:sel.color, fontSize:13, fontWeight:500 }}>{sel.desc}</span></div>}
    </div>
  );
}

function LiveRisk({ l, c }) {
  if (l===""||c==="") return null;
  const r = matrixRating(parseInt(l), parseInt(c));
  return (
    <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:r.bg, border:`1px solid ${r.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontSize:11, color:r.color, fontWeight:700, marginBottom:2, textTransform:"uppercase", letterSpacing:".05em" }}>Risk rating</div>
        <div style={{ fontSize:13, color:r.color }}>{r.desc}</div>
      </div>
      <span style={{ fontSize:22, fontWeight:800, color:r.color }}>{r.label}</span>
    </div>
  );
}

function QRCanvas({ text, size=200 }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current||!text) return;
    ref.current.innerHTML = '';
    function tryMake() {
      try {
        new window.QRCode(ref.current, { text, width:size, height:size, colorDark:"#000000", colorLight:"#ffffff", correctLevel:window.QRCode.CorrectLevel.M });
        setDone(true);
      } catch(e) { setFailed(true); }
    }
    if (window.QRCode) tryMake();
    else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = tryMake;
      s.onerror = () => setFailed(true);
      document.head.appendChild(s);
    }
  }, [text, size]);
  if (failed) return <div style={{ width:size, height:size, border:'2px dashed #E5E7EB', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:6, background:'#F9FAFB' }}><div style={{ fontSize:11, color:'#9CA3AF' }}>QR unavailable</div><div style={{ fontSize:10, color:'#2563EB', wordBreak:'break-all', padding:'0 8px', textAlign:'center' }}>{text}</div></div>;
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <div ref={ref} style={{ borderRadius:8, overflow:'hidden', border:'2px solid #E5E7EB', width:size, height:size }}></div>
      {!done && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB', borderRadius:8, fontSize:12, color:'#9CA3AF' }}>Generating...</div>}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color="#2563EB", sub="" }) {
  return (
    <div style={{ ...S.card, textAlign:"center", marginBottom:0, padding:"16px 10px" }}>
      <div style={{ fontSize:32, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:12, color:"#6B7280", marginTop:2, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ── Result badge ──────────────────────────────────────────────────────────────
function ResultBadge({ result }) {
  const cfg = result==="swms" ? { bg:"#FEE2E2", color:"#B91C1C", label:"SWMS" }
    : result==="warning" ? { bg:"#FEF3C7", color:"#78350F", label:"WARNING" }
    : { bg:"#D1FAE5", color:"#065F46", label:"SAFE" };
  return <span style={{ fontSize:11, padding:"3px 9px", borderRadius:5, fontWeight:700, background:cfg.bg, color:cfg.color, flexShrink:0 }}>{cfg.label}</span>;
}

// ── Simple bar chart ──────────────────────────────────────────────────────────
function BarChart({ data, color="#2563EB", height=120 }) {
  if (!data||data.length===0) return <div style={{ height, display:"flex", alignItems:"center", justifyContent:"center", color:"#9CA3AF", fontSize:13 }}>No data</div>;
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height, paddingTop:8 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ fontSize:10, color:"#6B7280", fontWeight:600 }}>{d.value||""}</div>
          <div style={{ width:"100%", background:color, borderRadius:"3px 3px 0 0", transition:"height .3s", height:`${Math.max((d.value/max)*80, d.value>0?4:0)}px` }}></div>
          <div style={{ fontSize:9, color:"#9CA3AF", textAlign:"center", lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── KPI Dashboard ─────────────────────────────────────────────────────────────
function KPIDashboard({ companyId, companyName, isMaster }) {
  const [period, setPeriod] = useState("30");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, [period, companyId]);

  async function loadRecords() {
    setLoading(true);
    const since = period==="all" ? null : new Date(Date.now() - parseInt(period)*24*60*60*1000).toISOString();
    let q = supabase.from("take5_records").select("*").order("created_at", { ascending:true });
    if (companyId) q = q.eq("company_id", companyId);
    if (since) q = q.gte("created_at", since);
    const { data } = await q;
    setRecords(data||[]);
    setLoading(false);
  }

  const total = records.length;
  const swmsCount = records.filter(r=>r.result==="swms").length;
  const warningCount = records.filter(r=>r.result==="warning").length;
  const safeCount = records.filter(r=>r.result==="safe").length;
  const swmsPct = total>0 ? Math.round((swmsCount/total)*100) : 0;
  const liftCount = records.filter(r=>{const rd=r.record_data||{};return (rd.hrcwSelected||{})["hrcw_lift"]}).length;
  const heightCount = records.filter(r=>{const rd=r.record_data||{};return (rd.hrcwSelected||{})["hrcw_wah"]}).length;
  const csCount = records.filter(r=>{const rd=r.record_data||{};return (rd.hrcwSelected||{})["hrcw_cs"]}).length;

  // Hazard frequency
  const hazardCounts = {};
  records.forEach(r => {
    const rd = r.record_data||{};
    (rd.hazards||[]).forEach(h => { hazardCounts[h]=(hazardCounts[h]||0)+1; });
  });
  const topHazards = Object.entries(hazardCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([id,v])=>({ label:HAZARDS.find(h=>h.id===id)?.label||id, value:v }));

  // Trend by day/week
  const trendData = (() => {
    const days = parseInt(period)||30;
    const buckets = days<=14 ? days : days<=90 ? Math.ceil(days/7) : 12;
    const bucketSize = days<=14 ? 1 : days<=90 ? 7 : Math.ceil(days/12);
    const result = [];
    for (let i=buckets-1; i>=0; i--) {
      const end = new Date(Date.now() - i*bucketSize*24*60*60*1000);
      const start = new Date(end - bucketSize*24*60*60*1000);
      const count = records.filter(r=>{ const d=new Date(r.created_at); return d>=start&&d<=end; }).length;
      const lbl = days<=14 ? end.toLocaleDateString('en-AU',{day:'numeric',month:'short'})
        : days<=90 ? `W${buckets-i}` : end.toLocaleDateString('en-AU',{month:'short'});
      result.push({ label:lbl, value:count });
    }
    return result;
  })();

  const periods = [
    { v:"7",   l:"7 days" },
    { v:"30",  l:"30 days" },
    { v:"90",  l:"3 months" },
    { v:"365", l:"1 year" },
    { v:"all", l:"All time" },
  ];

  return (
    <div>
      {/* Period selector */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:"#F3F4F6", borderRadius:10, padding:3 }}>
        {periods.map(p => (
          <button key={p.v} onClick={()=>setPeriod(p.v)}
            style={{ flex:1, padding:"8px 4px", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
              background:period===p.v?"#fff":"transparent", color:period===p.v?"#2563EB":"#6B7280",
              boxShadow:period===p.v?"0 1px 3px rgba(0,0,0,.1)":"none" }}>
            {p.l}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:24, color:"#9CA3AF" }}>Loading...</div>}

      {!loading && <>
        {/* KPI stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          <StatCard label="Total Take 5s" value={total} color="#2563EB" />
          <StatCard label="SWMS required" value={swmsCount} color="#DC2626" sub={`${swmsPct}% of total`} />
          <StatCard label="Safe to proceed" value={safeCount} color="#16A34A" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          <StatCard label="Warnings issued" value={warningCount} color="#D97706" />
          <StatCard label="Lifting activities" value={liftCount} color="#7C3AED" />
          <StatCard label="Heights / WAH" value={heightCount} color="#0891B2" />
        </div>

        {/* Trend chart */}
        <div style={S.card}>
          <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>Take 5 activity over time</div>
          <BarChart data={trendData} color="#2563EB" height={130} />
        </div>

        {/* Result breakdown */}
        <div style={S.card}>
          <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>Result breakdown</div>
          {total===0 ? <div style={{ color:"#9CA3AF", fontSize:13 }}>No records in this period</div> :
          <div style={{ display:"flex", gap:8 }}>
            {[{l:"Safe",v:safeCount,c:"#16A34A",bg:"#D1FAE5"},{l:"Warning",v:warningCount,c:"#D97706",bg:"#FEF3C7"},{l:"SWMS",v:swmsCount,c:"#DC2626",bg:"#FEE2E2"}].map(item=>(
              <div key={item.l} style={{ flex:1, background:item.bg, borderRadius:10, padding:"12px 8px", textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color:item.c }}>{item.v}</div>
                <div style={{ fontSize:12, color:item.c, fontWeight:600, marginTop:2 }}>{item.l}</div>
                <div style={{ fontSize:11, color:item.c, marginTop:1 }}>{total>0?Math.round((item.v/total)*100):0}%</div>
              </div>
            ))}
          </div>}
        </div>

        {/* Top hazards */}
        {topHazards.length>0 && (
          <div style={S.card}>
            <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>Most common hazards identified</div>
            <BarChart data={topHazards} color="#EF4444" height={130} />
          </div>
        )}

        {/* HRCW breakdown */}
        <div style={S.card}>
          <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>High risk task breakdown</div>
          {[
            { label:"Lifting operations", count:liftCount, color:"#7C3AED" },
            { label:"Working at heights", count:heightCount, color:"#0891B2" },
            { label:"Confined space", count:csCount, color:"#D97706" },
            { label:"Pressurised systems", count:records.filter(r=>(r.record_data?.hrcwSelected||{})["hrcw_press"]).length, color:"#DC2626" },
            { label:"Mech isolation/LOTO", count:records.filter(r=>(r.record_data?.hrcwSelected||{})["hrcw_mech"]).length, color:"#059669" },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid #F9FAFB" }}>
              <div style={{ flex:1, fontSize:13, color:"#374151" }}>{item.label}</div>
              <div style={{ width:120, background:"#F3F4F6", borderRadius:4, height:8, overflow:"hidden" }}>
                <div style={{ height:8, background:item.color, borderRadius:4, width:`${total>0?Math.min((item.count/total)*100,100):0}%`, transition:"width .3s" }}></div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:item.color, width:28, textAlign:"right" }}>{item.count}</div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ── PIN LOGIN ─────────────────────────────────────────────────────────────────
function PinLogin({ onSuccess, onAdminClick }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  async function handlePin(d) {
    const next = pin + d;
    setPin(next); setError("");
    if (next.length===6) {
      setLoading(true);
      const { data, error } = await supabase.from("companies").select("id,name").eq("pin",next).eq("is_active",true).single();
      if (error||!data) { setError("Invalid PIN — check with your supervisor"); setPin(""); }
      else onSuccess({ company_id:data.id, company_name:data.name });
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#F9FAFB", padding:16 }}>
      <button onClick={onAdminClick} style={{ position:"fixed", top:16, right:16, background:"#fff", border:"1px solid #E5E7EB", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#6B7280", cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,.08)" }}>Admin login</button>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Logo size={72} /></div>
        <div style={{ fontSize:28, fontWeight:800, color:"#1F2937" }}>Safety<span style={{color:"#2563EB"}}>IQ</span></div>
        <div style={{ fontSize:14, color:"#9CA3AF", marginTop:4 }}>Enter your site PIN to begin</div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:24 }}>
        {Array.from({length:6}).map((_,i) => <div key={i} style={{ width:18, height:18, borderRadius:"50%", background:i<pin.length?"#2563EB":"#E5E7EB", transition:"background .15s" }} />)}
      </div>
      {error && <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:10, background:"#FEE2E2", color:"#B91C1C", fontSize:14, fontWeight:500, textAlign:"center", maxWidth:280 }}>{error}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 80px)", gap:12 }}>
        {digits.map((d,i) => (
          <button key={i} onClick={()=>d==="⌫"?setPin(p=>p.slice(0,-1)):d&&!loading?handlePin(d):null}
            disabled={loading||!d}
            style={{ height:80, borderRadius:16, border:"1px solid #E5E7EB", fontSize:d==="⌫"?22:28, fontWeight:700,
              background:!d?"transparent":"#fff", color:d==="⌫"?"#9CA3AF":"#1F2937",
              cursor:!d?"default":"pointer", boxShadow:d?"0 1px 3px rgba(0,0,0,.08)":"none", opacity:loading?.5:1 }}>
            {d}
          </button>
        ))}
      </div>
      {loading && <div style={{ marginTop:20, color:"#6B7280", fontSize:14 }}>Checking PIN...</div>}
    </div>
  );
}

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess, onBack }) {
  const [form, setForm] = useState({ email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  async function handleLogin() {
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
    if (error) { setError(error.message); setLoading(false); return; }
    onSuccess(data.session);
  }
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#F9FAFB", padding:16 }}>
      <button onClick={onBack} style={{ position:"fixed", top:16, left:16, background:"#fff", border:"1px solid #E5E7EB", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#6B7280", cursor:"pointer" }}>← Back</button>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><Logo size={56} /></div>
        <div style={{ fontSize:22, fontWeight:800 }}>Admin login</div>
        <div style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>SafetyIQ administration</div>
      </div>
      <div style={{ ...S.card, width:"100%", maxWidth:380 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={set("email")} placeholder="admin@example.com" autoCapitalize="none" /></div>
          <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={set("password")} /></div>
        </div>
        {error && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:"#FEE2E2", color:"#B91C1C", fontSize:13 }}>{error}</div>}
        <button style={{ ...S.btnPrim, opacity:loading?.5:1 }} onClick={handleLogin} disabled={loading}>{loading?"Logging in...":"Log in"}</button>
      </div>
    </div>
  );
}

// ── MASTER ADMIN ──────────────────────────────────────────────────────────────
function MasterAdmin({ onLogout }) {
  const [tab, setTab] = useState("companies");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCo, setNewCo] = useState({ name:"", adminEmail:"", pin:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState(null);
  const [allRecords, setAllRecords] = useState([]);

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll() {
    setLoading(true);
    const [c, r] = await Promise.all([
      supabase.from("companies").select("*").neq("code","ADMIN_MASTER_CODE").order("name"),
      supabase.from("take5_records").select("*").order("created_at",{ascending:false}).limit(200),
    ]);
    setCompanies(c.data||[]);
    setAllRecords(r.data||[]);
    setLoading(false);
  }

  function generatePin() { return String(Math.floor(100000+Math.random()*900000)); }

  async function addCompany() {
    if (!newCo.name||!newCo.adminEmail) { setMsg("Company name and admin email are required."); return; }
    setSaving(true);
    const pin = newCo.pin||generatePin();
    const code = newCo.name.toUpperCase().replace(/\s+/g,"-")+"-"+Date.now();
    const { error } = await supabase.from("companies").insert({ name:newCo.name.trim(), code, pin, admin_email:newCo.adminEmail.trim(), is_active:true });
    if (error) setMsg("Error: "+error.message);
    else { setMsg("Company added successfully."); setNewCo({name:"",adminEmail:"",pin:""}); loadAll(); }
    setSaving(false);
  }

  async function deleteCompany(co) {
    const c1 = confirm(`Are you sure you want to delete "${co.name}"?\n\nBefore deletion, all records will be exported as a PDF for your records.\n\nWorkers will no longer be able to log in with this PIN.`);
    if (!c1) return;
    const c2 = confirm(`FINAL CONFIRMATION\n\nDelete "${co.name}" permanently?\n\nThis will:\n• Export all ${allRecords.filter(r=>r.company_id===co.id).length} records to PDF\n• Permanently delete the company\n\nThis cannot be undone.`);
    if (!c2) return;

    // Step 1: Export all records first
    const recs = allRecords.filter(r=>r.company_id===co.id);
    if (recs.length > 0) {
      setMsg(`Exporting ${recs.length} records before deletion...`);
      const w = window.open("","_blank","width=900,height=700");
      if (w) {
        w.document.write(buildBulkPDF(recs, co.name + " — FINAL EXPORT BEFORE DELETION"));
        w.document.close();
        setTimeout(()=>w.print(), 600);
      }
      // Wait a moment to let export open
      await new Promise(r => setTimeout(r, 1500));
    }

    // Step 2: Delete the company
    setMsg(`Deleting "${co.name}"...`);
    const { error } = await supabase.from("companies").delete().eq("id", co.id);
    if (error) {
      setMsg("Error deleting company: " + error.message);
    } else {
      setMsg(`"${co.name}" deleted successfully. ${recs.length} records were exported.`);
      setOpenId(null);
      loadAll();
    }
  }

  async function toggleActive(co) {
    await supabase.from("companies").update({ is_active:!co.is_active }).eq("id",co.id);
    loadAll();
  }

  async function regenPin(co) {
    const p = generatePin();
    await supabase.from("companies").update({ pin:p }).eq("id",co.id);
    loadAll();
  }

  function printQR(co) {
    const w = window.open("","_blank","width=850,height=900");
    w.document.write(buildPoster(co));
    w.document.close();
  }

  function exportAllPDF(recs, label) {
    if (!recs || recs.length === 0) return;
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(buildBulkPDF(recs, label||"Records"));
    w.document.close();
    setTimeout(()=>w.print(),800);
  }

  const tabs = [
    { id:"companies", label:"Companies" },
    { id:"kpi", label:"KPI Dashboard" },
    { id:"records", label:"All Records" },
  ];

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <Logo size={40} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>Safety<span style={{color:"#2563EB"}}>IQ</span> <span style={{ fontSize:12, background:"#FEF3C7", color:"#92400E", padding:"2px 7px", borderRadius:4, fontWeight:600 }}>MASTER</span></div>
          <div style={{ fontSize:12, color:"#6B7280" }}>Master administration</div>
        </div>
        <button style={{ ...S.btnSec, padding:"7px 12px", fontSize:12 }} onClick={onLogout}>Log out</button>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:14, background:"#F3F4F6", borderRadius:10, padding:3 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:"10px 6px", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
              background:tab===t.id?"#fff":"transparent", color:tab===t.id?"#2563EB":"#6B7280",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,.1)":"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:24, color:"#9CA3AF" }}>Loading...</div>}

      {/* ── COMPANIES TAB ── */}
      {!loading && tab==="companies" && (
        <>
          {msg && <div style={{ marginBottom:10, padding:"10px 12px", borderRadius:8, background:msg.startsWith("Error")?"#FEE2E2":"#D1FAE5", color:msg.startsWith("Error")?"#B91C1C":"#065F46", fontSize:13 }}>{msg}</div>}
          <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Active companies ({companies.length})</div>
          {companies.map(co=>(
            <div key={co.id} style={{ ...S.card, marginBottom:8, opacity:co.is_active?1:.6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setOpenId(openId===co.id?null:co.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>{co.name}</div>
                    {!co.is_active && <span style={{ fontSize:10, background:"#F3F4F6", color:"#9CA3AF", padding:"2px 6px", borderRadius:4, fontWeight:600 }}>INACTIVE</span>}
                  </div>
                  <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>Admin: {co.admin_email||"Not set"}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:"#2563EB", letterSpacing:4, marginTop:2 }}>{co.pin||"No PIN"}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>{allRecords.filter(r=>r.company_id===co.id).length} records</div>
                  <span style={{ fontSize:18, color:"#9CA3AF" }}>{openId===co.id?"▲":"▼"}</span>
                </div>
              </div>
              {openId===co.id && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #E5E7EB" }}>
                  <div style={{ marginBottom:10, textAlign:"center" }}>
                    <QRCanvas text={APP_URL} size={160} />
                    <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>PIN: {co.pin}</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <button style={{ ...S.btnPrim, marginTop:0 }} onClick={()=>printQR(co)}>🖨 Print poster</button>
                    <button style={{ ...S.btnSec }} onClick={()=>regenPin(co)}>🔄 New PIN</button>
                    <button style={{ ...S.btnSec, fontSize:13 }} onClick={()=>toggleActive(co)}>{co.is_active?"⏸ Deactivate":"▶ Activate"}</button>
                    <button style={{ ...S.btnDanger }} onClick={()=>deleteCompany(co)}>🗑 Delete</button>
                  </div>
                  {allRecords.filter(r=>r.company_id===co.id).length>0 && (
                    <button style={{ ...S.btnSec, width:"100%", textAlign:"center", marginTop:8, fontSize:13 }}
                      onClick={()=>exportAllPDF(allRecords.filter(r=>r.company_id===co.id), co.name)}>
                      📄 Export all records PDF ({allRecords.filter(r=>r.company_id===co.id).length})
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add company form */}
          <div style={S.divider}>Add new company</div>
          <div style={S.card}>
            <div><label style={S.label}>Company name *</label><input style={S.input} value={newCo.name} onChange={e=>setNewCo(c=>({...c,name:e.target.value}))} placeholder="e.g. AFJV" /></div>
            <div style={{marginTop:10}}><label style={S.label}>Company admin email *</label><input style={S.input} type="email" value={newCo.adminEmail} onChange={e=>setNewCo(c=>({...c,adminEmail:e.target.value}))} placeholder="admin@company.com" autoCapitalize="none" /></div>
            <div style={{marginTop:10}}>
              <label style={S.label}>Worker PIN (leave blank to auto-generate)</label>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...S.input, flex:1 }} value={newCo.pin} onChange={e=>setNewCo(c=>({...c,pin:e.target.value.replace(/\D/g,"").slice(0,6)}))} placeholder="Auto-generated" maxLength={6} />
                <button style={{ ...S.btnSec, padding:"11px 14px", whiteSpace:"nowrap" }} onClick={()=>setNewCo(c=>({...c,pin:generatePin()}))}>Generate</button>
              </div>
            </div>
            {msg && <div style={{ marginTop:8, fontSize:13, padding:"8px 10px", borderRadius:8, color:msg.startsWith("Error")?"#B91C1C":"#065F46", background:msg.startsWith("Error")?"#FEE2E2":"#D1FAE5" }}>{msg}</div>}
            <button style={S.btnPrim} onClick={addCompany} disabled={saving||!newCo.name||!newCo.adminEmail}>{saving?"Adding...":"Add company"}</button>
          </div>
        </>
      )}

      {/* ── KPI TAB ── */}
      {!loading && tab==="kpi" && (
        <KPIDashboard companyId={null} companyName="All Companies" isMaster={true} />
      )}

      {/* ── RECORDS TAB ── */}
      {!loading && tab==="records" && (
        <RecordsView records={allRecords} companyName="All Companies" showCompany={true}
          onExportAll={(recs,label)=>exportAllPDF(recs, label||"All Companies")}
          onExportSingle={r=>exportAllPDF([r],"Single Record")} />
      )}
    </div>
  );
}

// ── COMPANY ADMIN ─────────────────────────────────────────────────────────────
function CompanyAdmin({ session, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [company, setCompany] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(()=>{ loadData(); },[]);

  async function loadData() {
    setLoading(true);
    // Find company by admin email
    const { data:co } = await supabase.from("companies").select("*").eq("admin_email", session.user.email).single();
    if (co) {
      setCompany(co);
      const { data:recs } = await supabase.from("take5_records").select("*").eq("company_id",co.id).order("created_at",{ascending:false}).limit(200);
      setRecords(recs||[]);
    }
    setLoading(false);
  }

  async function updatePin() {
    if (newPin.length!==6) { setPinMsg("PIN must be exactly 6 digits"); return; }
    const { error } = await supabase.from("companies").update({ pin:newPin }).eq("id",company.id);
    if (error) setPinMsg("Error: "+error.message);
    else { setPinMsg("PIN updated successfully."); setCompany(c=>({...c,pin:newPin})); setNewPin(""); }
  }

  function exportAllPDF() {
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(buildBulkPDF(records, company?.name));
    w.document.close();
    setTimeout(()=>w.print(),800);
  }

  function exportSinglePDF(r) {
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(buildBulkPDF([r], company?.name));
    w.document.close();
    setTimeout(()=>w.print(),800);
  }

  const tabs = [
    { id:"dashboard", label:"Dashboard" },
    { id:"records",   label:"Records" },
    { id:"settings",  label:"Settings" },
  ];

  if (loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><Logo size={56} /></div>;

  if (!company) return (
    <div style={{ ...S.app, textAlign:"center", paddingTop:60 }}>
      <Logo size={56} />
      <div style={{ fontSize:16, marginTop:16, color:"#6B7280" }}>No company found for {session.user.email}</div>
      <div style={{ fontSize:13, color:"#9CA3AF", marginTop:8 }}>Contact the master admin to set up your company account.</div>
      <button style={{ ...S.btnSec, marginTop:20 }} onClick={onLogout}>Log out</button>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <Logo size={40} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{company.name}</div>
          <div style={{ fontSize:12, color:"#6B7280" }}>Company admin · {session.user.email}</div>
        </div>
        <button style={{ ...S.btnSec, padding:"7px 12px", fontSize:12 }} onClick={onLogout}>Log out</button>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:14, background:"#F3F4F6", borderRadius:10, padding:3 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ flex:1, padding:"10px 6px", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer",
              background:tab===t.id?"#fff":"transparent", color:tab===t.id?"#2563EB":"#6B7280",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,.1)":"none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="dashboard" && <KPIDashboard companyId={company.id} companyName={company.name} isMaster={false} />}

      {tab==="records" && (
        <RecordsView records={records} companyName={company.name} showCompany={false}
          onExportAll={(recs,label)=>{ const w=window.open("","_blank","width=900,height=700"); w.document.write(buildBulkPDF(recs,label||company?.name)); w.document.close(); setTimeout(()=>w.print(),800); }}
          onExportSingle={exportSinglePDF} />
      )}

      {tab==="settings" && (
        <>
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:600, color:"#374151", marginBottom:10 }}>Company details</div>
            <div style={{ fontSize:13, color:"#6B7280" }}>Company: <strong style={{color:"#1F2937"}}>{company.name}</strong></div>
            <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>Admin email: <strong style={{color:"#1F2937"}}>{company.admin_email}</strong></div>
            <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>Total records: <strong style={{color:"#1F2937"}}>{records.length}</strong></div>
          </div>

          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:600, color:"#374151", marginBottom:4 }}>Worker PIN</div>
            <div style={{ fontSize:13, color:"#6B7280", marginBottom:10 }}>Current PIN: <span style={{ fontSize:24, fontWeight:900, color:"#2563EB", letterSpacing:4 }}>{company.pin}</span></div>
            <div style={{ marginBottom:10, textAlign:"center" }}>
              <QRCanvas text={APP_URL} size={160} />
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Workers scan this to open the app</div>
            </div>
            <label style={S.label}>New PIN (6 digits)</label>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...S.input, flex:1 }} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="Enter 6-digit PIN" maxLength={6} />
              <button style={{ ...S.btnSec }} onClick={updatePin}>Update</button>
            </div>
            {pinMsg && <div style={{ marginTop:8, fontSize:13, padding:"8px 10px", borderRadius:8, color:pinMsg.startsWith("Error")||pinMsg.includes("must")?"#B91C1C":"#065F46", background:pinMsg.startsWith("Error")||pinMsg.includes("must")?"#FEE2E2":"#D1FAE5" }}>{pinMsg}</div>}
          </div>

          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:600, color:"#374151", marginBottom:10 }}>Export records</div>
            <button style={S.btnPrim} onClick={exportAllPDF}>📄 Export all {records.length} records as PDF</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── RECORDS VIEW (shared) ─────────────────────────────────────────────────────
function RecordsView({ records, companyName, showCompany, onExportAll, onExportSingle }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});

  const filtered = records.filter(r=>{
    if (filter!=="all"&&r.result!==filter) return false;
    if (search) {
      const rd = r.record_data||{};
      const text = `${r.task||rd.task||""} ${r.location||rd.location||""} ${r.job_ref||""}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const selectedIds = Object.keys(selected).filter(id=>selected[id]);
  const selectedRecords = filtered.filter(r=>selected[r.id]);
  const allFilteredSelected = filtered.length>0 && filtered.every(r=>selected[r.id]);

  function toggleAll() {
    if (allFilteredSelected) setSelected({});
    else { const s={}; filtered.forEach(r=>s[r.id]=true); setSelected(s); }
  }

  function Checkbox({ checked }) {
    return (
      <div style={{ width:20, height:20, border:"2px solid", borderColor:checked?"#2563EB":"#D1D5DB", borderRadius:4, background:checked?"#2563EB":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {checked && <span style={{ color:"#fff", fontSize:12, fontWeight:800, lineHeight:1 }}>✓</span>}
      </div>
    );
  }

  return (
    <div>
      <input style={{ ...S.input, marginBottom:10 }} placeholder="Search task, location, ref..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
        {["all","safe","warning","swms"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151" }}>{f==="all"?"All":f.toUpperCase()}</button>
        ))}
      </div>
      {/* Bulk action bar */}
      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={toggleAll} style={{ ...S.btnSec, padding:"7px 12px", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
          <Checkbox checked={allFilteredSelected} />
          {allFilteredSelected ? "Deselect all" : "Select all"}
        </button>
        {selectedIds.length > 0 ? (
          <>
            <button onClick={()=>onExportAll(selectedRecords, `${selectedIds.length} selected records`)}
              style={{ ...S.btnPrim, width:"auto", marginTop:0, padding:"7px 16px", fontSize:13 }}>
              📄 Export {selectedIds.length} selected
            </button>
            <button onClick={()=>setSelected({})} style={{ ...S.btnSec, padding:"7px 10px", fontSize:12, color:"#9CA3AF" }}>Clear</button>
          </>
        ) : records.length > 0 && (
          <button onClick={()=>onExportAll(records, companyName||"All records")}
            style={{ ...S.btnSec, padding:"7px 12px", fontSize:13 }}>
            📄 Export all ({records.length})
          </button>
        )}
      </div>
      {filtered.length===0 && <div style={{ textAlign:"center", padding:40, color:"#9CA3AF", fontSize:14 }}>No records found.</div>}
      {filtered.map(r=>{
        const rd = r.record_data||{};
        const isSelected = !!selected[r.id];
        return (
          <div key={r.id}
            style={{ ...S.card, marginBottom:8, border:isSelected?"2px solid #2563EB":"1px solid #E5E7EB", cursor:"pointer" }}
            onClick={()=>setSelected(p=>({...p,[r.id]:!p[r.id]}))}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ paddingTop:2 }}><Checkbox checked={isSelected} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{r.task||rd.task||r.job_ref||"Untitled task"}</div>
                <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{r.location||rd.location||"No location"}{showCompany&&r.company_id?" · "+companies_cache[r.company_id]:""}</div>
                <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
                {(rd.hazards||[]).length>0 && (
                  <div style={{ fontSize:11, color:"#7C3AED", marginTop:3 }}>
                    {(rd.hazards||[]).map(id=>HAZARDS.find(h=>h.id===id)?.label||id).join(" · ")}
                  </div>
                )}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end", flexShrink:0 }}>
                <ResultBadge result={r.result} />
                <button style={{ ...S.btnSec, padding:"5px 10px", fontSize:12 }}
                  onClick={e=>{e.stopPropagation(); onExportSingle(r);}}>📄 PDF</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Keep a simple cache for company names in records view
const companies_cache = {};

// ── TAKE 5 APP (worker flow) ──────────────────────────────────────────────────

// Suggested control measures per hazard type
const SUGGESTED_CONTROLS = {
  h_mh: [
    "Use mechanical lifting aids (hoist, forklift, crane) for loads >20kg",
    "Team lift — minimum 2 persons for heavy/awkward loads",
    "Plan lift route before moving — clear path of obstructions",
    "Use correct lifting technique — bend knees, straight back",
    "Take breaks to reduce fatigue during repetitive tasks",
  ],
  h_fall: [
    "Install physical barriers / guardrails at all open edges",
    "Wear appropriate footwear with slip-resistant soles",
    "Keep work area clear of debris, hoses and tools",
    "Use three points of contact when climbing ladders",
    "Inspect work area for slip/trip hazards before starting",
    "Use non-slip matting on wet surfaces",
  ],
  h_mech: [
    "Ensure all guards are in place before operating machinery",
    "Isolate and de-energise plant before any maintenance (LOTO)",
    "Maintain safe distance from rotating/moving parts",
    "Use correct PPE — safety glasses, gloves, steel-cap boots",
    "Never reach into machinery while in motion",
  ],
  h_press: [
    "Depressurise system fully before disconnecting any lines",
    "Verify zero pressure using gauge before work commences",
    "Use correct rated fittings and hoses for the pressure involved",
    "Wear face shield and heavy gloves when working near pressurised lines",
    "Stand to the side — never in line with potential discharge path",
    "Check for trapped pressure in accumulators before work",
  ],
  h_chem: [
    "Read and follow the Safety Data Sheet (SDS) before use",
    "Wear appropriate PPE — gloves, eye protection, apron",
    "Ensure adequate ventilation in the work area",
    "Use spill containment trays under equipment",
    "Have spill kit accessible on site",
    "Avoid skin contact — wash immediately if contact occurs",
  ],
  h_noise: [
    "Wear hearing protection (earmuffs/earplugs) when using noisy tools",
    "Limit exposure time to high-noise tasks where possible",
    "Use quieter alternative tools or methods if available",
    "Maintain tools to reduce excessive vibration/noise",
  ],
  h_heat: [
    "Allow hot surfaces to cool before handling",
    "Use insulated gloves when handling hot components",
    "Wear long sleeves and appropriate PPE for welding/cutting",
    "Keep flammable materials clear of heat sources",
    "Fire extinguisher to be on hand during hot work",
  ],
  h_struct: [
    "Use engineered lifting and support points only",
    "Install temporary supports/props before removing structural components",
    "Never work under unsupported loads or structures",
    "Obtain engineering sign-off before modifying structural elements",
    "Establish exclusion zone under overhead work",
  ],
  h_env: [
    "Monitor weather forecast — cease outdoor work in dangerous conditions",
    "Ensure adequate lighting in the work area",
    "Provide sun protection (shade, sunscreen, hat) for outdoor work",
    "Take regular hydration breaks in heat",
    "Secure loose items if working in wind",
  ],
  h_traffic: [
    "Establish and sign exclusion zone around work area",
    "Use spotter/traffic controller when visibility is limited",
    "Wear high-visibility PPE at all times",
    "Communicate with plant operators before commencing work",
    "Park vehicles clear of work area",
  ],
  h_ergon: [
    "Rotate tasks to avoid prolonged repetitive movements",
    "Use ergonomic tools and equipment where available",
    "Take regular breaks during physically demanding tasks",
    "Adjust work height to reduce bending/stretching",
    "Report fatigue to supervisor — do not work impaired",
  ],
  h_lift: [
    "Ensure Lift Plan / Rigging Study is completed and approved before lift",
    "Confirm load weight and verify it is within crane/equipment SWL",
    "Inspect all rigging equipment — slings, shackles, hooks — before use",
    "Establish and sign exclusion zone — no persons under suspended load",
    "Ensure dogman/rigger holds current and relevant licence",
    "Use tag lines to control load swing — never use hands",
    "Communicate lift plan to all involved via pre-start/toolbox talk",
    "Check overhead obstructions and ground conditions before lift",
  ],
  h_elec: [
    "Isolate and lock out electrical supply before commencing work (LOTO)",
    "Test for dead using approved voltage tester before touching conductors",
    "Only licensed electricians to perform electrical work",
    "Use insulated tools rated for the voltage involved",
    "Keep water and conductive materials away from electrical equipment",
    "Wear appropriate PPE — insulated gloves, safety glasses",
    "Inspect leads, tools and equipment for damage before use",
    "Do not work alone on live electrical tasks",
  ],
  h_wah: [
    "Use fall arrest system / harness when working above 2 metres",
    "Inspect all height safety equipment before use",
    "Complete EWP / elevated platform pre-start inspection",
    "Ensure platform is on stable, level ground",
    "Maintain three points of contact on ladders at all times",
    "Establish exclusion zone below work at heights area",
    "Never overreach — reposition ladder/platform instead",
  ],
  h_cs: [
    "Obtain Confined Space Entry Permit before entry",
    "Test atmosphere — O₂ 19.5–23.5%, LEL <10%, CO <25ppm",
    "Assign standby person at entry point at all times",
    "Ensure rescue equipment is available and workers trained",
    "Provide forced air ventilation if required",
    "Isolate all energy sources before entry",
    "Continuous atmospheric monitoring during task",
  ],
  h_hotwork: [
    "Obtain Hot Work Permit before commencing",
    "Clear area of all flammable/combustible materials within 10m",
    "Have serviceable fire extinguisher within arm's reach",
    "Assign fire watch — must remain for 30 minutes after completion",
    "Protect surfaces with fire blankets where needed",
    "Ensure adequate ventilation to remove fumes",
    "Check for hidden combustibles behind walls/surfaces",
  ],
};

function SuggestedControls({ hazardId, onAdd }) {
  const [open, setOpen] = useState(false);
  const controls = SUGGESTED_CONTROLS[hazardId];
  if (!controls || controls.length === 0) return null;
  return (
    <div style={{ marginTop:6 }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ background:"none", border:"none", color:"#2563EB", fontSize:12, fontWeight:600, cursor:"pointer", padding:"4px 0", display:"flex", alignItems:"center", gap:4 }}>
        💡 {open?"Hide":"Show"} suggested controls ({controls.length})
      </button>
      {open && (
        <div style={{ background:"#F0F7FF", border:"1px solid #BFDBFE", borderRadius:8, padding:"8px 10px", marginTop:4 }}>
          <div style={{ fontSize:11, color:"#6B7280", marginBottom:6, fontWeight:600 }}>Tap to add to control measures:</div>
          {controls.map((c,i) => (
            <button key={i} type="button" onClick={()=>onAdd(c)}
              style={{ display:"block", width:"100%", textAlign:"left", background:"#fff", border:"1px solid #BFDBFE", borderRadius:6, padding:"6px 10px", marginBottom:4, fontSize:13, color:"#1e3a5f", cursor:"pointer", lineHeight:1.4 }}>
              + {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Take5App({ company, onExit, onForgetDevice }) {
  const [screen, setScreen] = useState("setup");
  const [form, setForm] = useState({ jobRef:"", location:"", date:new Date().toISOString().slice(0,10), time:new Date().toTimeString().slice(0,5), task:"", machine:"" });
  const [step1, setStep1] = useState({});
  const [hazards, setHazards] = useState({});
  const [liftChecks, setLiftChecks] = useState({});
  const [liftDetails, setLiftDetails] = useState({ load:"", weight:"", crane:"", radius:"" });
  const [csChecks, setCsChecks] = useState({});
  const [swmsRows, setSwmsRows] = useState([{ id:1, hazard:"", initialL:"", initialC:"", controls:"", responsible:"", residualL:"", residualC:"" }]);
  const [sigWorker, setSigWorker] = useState("");
  const [sigSupervisor, setSigSupervisor] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [cloudMsg, setCloudMsg] = useState("");

  // Auto-save when worker reaches complete screen
  useEffect(() => {
    if (screen === "complete" && !savedId && !saving) {
      saveToCloud();
    }
  }, [screen]);

  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const needsCS = !!hazards['h_cs'];

  function calcResult() {
    const badAnswers = STEP1_CHECKS.filter(c => step1[c.id] && step1[c.id] !== c.goodAnswer);
    const swmsTriggers = badAnswers.filter(c => c.swmsTrigger);
    const criticalBad = badAnswers.some(c => ["s1_5","s1_6","s1_7","s1_8"].includes(c.id));
    const highHaz = HAZARDS.filter(h=>h.weight==="high").some(h=>hazards[h.id]);
    const medCount = HAZARDS.filter(h=>h.weight==="medium").filter(h=>hazards[h.id]).length;
    if (criticalBad||swmsTriggers.length>0||highHaz) return "swms";
    if (medCount>=1) return "warning";
    return "safe";
  }

  function step1Done() { return STEP1_CHECKS.every(c=>step1[c.id]!==undefined); }

  async function saveToCloud() {
    setSaving(true); setCloudMsg("");
    const result = calcResult();
    const { data, error } = await supabase.from("take5_records").insert({
      job_ref:form.jobRef, task:form.task, location:form.location,
      company_id:company.company_id, result,
      created_at:form.date+"T"+form.time,
      record_data:{ ...form, step1, hrcwSelected:hrcw, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, csChecks, swmsHazards:swmsRows, sigWorker, sigSupervisor },
    }).select().single();
    if (error) setCloudMsg("Save failed: "+error.message);
    else { setSavedId(data.id); setCloudMsg("Saved ✓"); }
    setSaving(false);
  }

  function exportPDF() {
    const rec = { ...form, step1, hrcwSelected:hrcw, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, csChecks, swmsHazards:swmsRows, sigWorker, sigSupervisor, result:calcResult() };
    const w = window.open("","_blank","width=900,height=700");
    if(w){ w.document.write(buildBulkPDF([{record_data:rec,result:rec.result,task:rec.task,location:rec.location,job_ref:rec.jobRef,created_at:rec.date+"T"+rec.time}], company.company_name)); w.document.close(); setTimeout(()=>w.print(),600); }
  }

  function reset() {
    setScreen("setup"); setStep1({}); setHrcw({}); setHazards({}); setLiftChecks({}); setCsChecks({});
    setLiftDetails({load:"",weight:"",crane:"",radius:""});
    setSwmsRows([{id:1,hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}]);
    setSavedId(null); setCloudMsg(""); setSigWorker(""); setSigSupervisor("");
    setForm({jobRef:"",location:"",date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),task:"",machine:""});
  }

  const result = calcResult();
  const selectedHazards = HAZARDS.filter(h=>hazards[h.id]);

  const hdr = (
    <div style={S.hdr}>
      <Logo size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:17, fontWeight:700 }}>Safety<span style={{color:"#2563EB"}}>IQ</span></div>
        <div style={{ fontSize:12, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{company.company_name}</div>
      </div>
      <button style={{ ...S.btnSec, padding:"7px 10px", fontSize:12 }} onClick={()=>setScreen("records")}>Records</button>
    </div>
  );

  if (screen==="records") return (
    <div style={S.app}>
      {hdr}
      <WorkerRecords companyId={company.company_id} companyName={company.company_name} onBack={()=>setScreen("setup")} onNew={reset} />
    </div>
  );

  if (screen==="setup") return (
    <div style={S.app}>
      {hdr}<Pips active={0} />
      <div style={S.stepLbl}>Setup — job details</div>
      <div style={S.card}>
        <div><label style={S.label}>Task / job description</label><input style={S.input} value={form.task} onChange={setF("task")} placeholder="e.g. Replace hydraulic hose on TBM thrust cylinder" /></div>
        <div style={{marginTop:10}}><label style={S.label}>Machine / equipment</label><input style={S.input} value={form.machine} onChange={setF("machine")} placeholder="e.g. TBM S-1000, Segment Feeder Crane" /></div>
        <div style={{marginTop:10}}><label style={S.label}>Location / area</label><input style={S.input} value={form.location} onChange={setF("location")} placeholder="e.g. Workshop Bay 3, Ring 450" /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Work order ref</label><input style={S.input} value={form.jobRef} onChange={setF("jobRef")} placeholder="e.g. WO-001" /></div>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
        <div style={{marginTop:10}}><label style={S.label}>Time</label><input style={{...S.input,maxWidth:160}} type="time" value={form.time} onChange={setF("time")} /></div>
      </div>
      <button style={S.btnPrim} onClick={()=>setScreen("step1")}>Start Take 5 →</button>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button style={{ ...S.btnSec, flex:3, textAlign:"center" }} onClick={onExit}>← Exit</button>
        <button style={{ ...S.btnSec, flex:2, textAlign:"center", fontSize:12, color:"#EF4444", borderColor:"#FCA5A5" }} onClick={()=>{ if(confirm("Sign out and forget this device?\n\nYou will need to enter the PIN again next time.")) onForgetDevice(); }}>🔓 Sign out</button>
      </div>
    </div>
  );

  if (screen==="step1") return (
    <div style={S.app}>
      {hdr}<Pips active={1} />
      <div style={S.stepLbl}>Step 1 — Stop, step back and think</div>
      <div style={S.secSub}>Answer all questions honestly before starting work.</div>
      <div style={S.card}>
        {STEP1_CHECKS.map(c=>{
          const ans = step1[c.id];
          return (
            <div key={c.id} style={{padding:"12px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{fontSize:15,color:"#1F2937",lineHeight:1.5,marginBottom:8}}>
                {c.text}
                {c.swmsTrigger&&<span style={{fontSize:10,color:"#DC2626",fontWeight:700,marginLeft:6,background:"#FEE2E2",padding:"2px 6px",borderRadius:4}}>SWMS</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                {["yes","no"].map(v=>{
                  const isGood = v === c.goodAnswer;
                  const isSelected = ans === v;
                  let bg = "#F9FAFB", color = "#6B7280", border = "#E5E7EB";
                  if (isSelected) {
                    if (isGood) { bg="#D1FAE5"; color="#065F46"; border="#86EFAC"; }
                    else        { bg="#FEE2E2"; color="#B91C1C"; border="#FCA5A5"; }
                  }
                  return (
                    <button key={v} onClick={()=>setStep1(p=>({...p,[c.id]:v}))}
                      style={{flex:1,padding:"13px",borderRadius:10,border:`2px solid ${border}`,fontSize:16,fontWeight:700,cursor:"pointer",background:bg,color:color}}>
                      {v==="yes"?"YES":"NO"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button style={{...S.btnPrim,opacity:step1Done()?1:.4}} disabled={!step1Done()} onClick={()=>setScreen("step3")}>Identify hazards →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("setup")}>← Back</button>
    </div>
  );


  if (screen==="confined")  if (screen==="confined") return (
    <div style={S.app}>
      {hdr}<Pips active={2} />
      <div style={S.stepLbl}>Confined space pre-entry checklist</div>
      <div style={S.secSub}>All items must be confirmed before any person enters the confined space.</div>
      <div style={S.card}>
        {CONFINED_CHECKS.map((cc,i)=>{
          const ans=csChecks[i];
          return (
            <div key={i} style={{padding:"12px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{fontSize:15,color:"#1F2937",lineHeight:1.5,marginBottom:8}}>{cc}</div>
              <div style={{display:"flex",gap:8}}>
                {["yes","no","na"].map(v=>(
                  <button key={v} onClick={()=>setCsChecks(p=>({...p,[i]:v}))}
                    style={{flex:1,padding:"11px",borderRadius:10,border:"2px solid",fontSize:14,fontWeight:700,cursor:"pointer",
                      background:ans===v?(v==="no"?"#FEE2E2":v==="yes"?"#D1FAE5":"#EFF6FF"):"#F9FAFB",
                      color:ans===v?(v==="no"?"#B91C1C":v==="yes"?"#065F46":"#2563EB"):"#6B7280",
                      borderColor:ans===v?(v==="no"?"#FCA5A5":v==="yes"?"#86EFAC":"#93C5FD"):"#E5E7EB"}}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {Object.values(csChecks).some(v=>v==="no")&&<div style={{borderRadius:12,padding:"12px 14px",background:"#FEF2F2",border:"2px solid #FCA5A5",marginBottom:10,fontSize:14,color:"#B91C1C",fontWeight:700}}>✕ Entry must not proceed — resolve all "No" items first.</div>}
      <button style={S.btnPrim} onClick={()=>setScreen("step3")}>Continue to hazard identification →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("step1")}>← Back</button>
    </div>
  );

  if (screen==="step3") return (
    <div style={S.app}>
      {hdr}<Pips active={4} />
      <div style={S.stepLbl}>Step 3 — Identify all hazards</div>
      <div style={S.secSub}>Select every hazard present. <strong>Bold = high risk.</strong></div>
      <div style={S.card}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {HAZARDS.map(h=>(
            <button key={h.id} onClick={()=>setHazards(p=>({...p,[h.id]:!p[h.id]}))}
              style={{border:"2px solid",borderRadius:10,padding:"10px",textAlign:"left",cursor:"pointer",lineHeight:1.3,minHeight:64,
                background:hazards[h.id]?"#FEF2F2":"#F9FAFB",borderColor:hazards[h.id]?"#EF4444":"#E5E7EB"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:18,flexShrink:0}}>{h.icon}</span>
                <div style={{fontSize:13,fontWeight:h.weight==="high"?700:500,color:hazards[h.id]?"#B91C1C":"#374151",lineHeight:1.2}}>{h.label}</div>
              </div>
              <div style={{fontSize:11,color:hazards[h.id]?"#EF4444":"#9CA3AF",lineHeight:1.3,paddingLeft:24}}>{h.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{borderRadius:12,padding:"14px",marginBottom:10,border:"2px solid",
        background:result==="safe"?"#F0FDF4":result==="warning"?"#FFFBEB":"#FEF2F2",
        borderColor:result==="safe"?"#86EFAC":result==="warning"?"#FCD34D":"#FCA5A5"}}>
        <div style={{fontSize:16,fontWeight:700,color:result==="safe"?"#15803D":result==="warning"?"#92400E":"#B91C1C"}}>
          {result==="safe"?"✓ Proceed safely":result==="warning"?"⚠ Additional controls required":"✕ SWMS required — do not proceed"}
        </div>
      </div>
      {result==="swms"
        ?<button style={S.btnPrim} onClick={()=>{
            const haz = Object.keys(hazards).filter(k=>hazards[k]);
            if (haz.length > 0) {
              const rows = haz.map((id,i) => {
                const sug = HAZARD_SUGGESTIONS[id];
                return {
                  id: Date.now()+i,
                  sourceHazardId: id,
                  hazard: sug ? sug.hazard : "",
                  initialL: sug ? sug.initialL : "",
                  initialC: sug ? sug.initialC : "",
                  controls: "",
                  responsible: "",
                  residualL: "",
                  residualC: ""
                };
              });
              setSwmsRows(rows);
            }
            setScreen(needsCS ? "confined" : "swms");
          }}>Complete SWMS →</button>
        :<button style={S.btnPrim} onClick={()=>setScreen("complete")}>Sign off →</button>}
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen(needsCS?"confined":"step1")}>← Back</button>
    </div>
  );

  if (screen==="swms") return (
    <div style={S.app}>
      {hdr}<Pips active={5} />
      <div style={S.stepLbl}>Step 4 — Safe Work Method Statement</div>
      <div style={S.secSub}>Document each hazard, risk ratings, controls and responsible person.</div>
      <div style={S.card}>
        <div><label style={S.label}>Task</label><input style={S.input} value={form.task} onChange={setF("task")} /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} /></div>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
      </div>
      {/* Permit requirements based on selected hazards */}
      {(hazards.h_wah||hazards.h_cs||hazards.h_lift||hazards.h_elec||hazards.h_hotwork) && (
        <div style={{...S.card,background:"#FFF7ED",border:"1px solid #FED7AA"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:8}}>⚠ Permit requirements for selected hazards</div>
          {hazards.h_wah && <div style={{fontSize:13,color:"#92400E",padding:"4px 0",borderBottom:"1px solid #FED7AA",display:"flex",gap:8}}><span>•</span><span><strong>Working at Heights:</strong> Height Safety Plan / EWP pre-start must be completed</span></div>}
          {hazards.h_cs && <div style={{fontSize:13,color:"#92400E",padding:"4px 0",borderBottom:"1px solid #FED7AA",display:"flex",gap:8}}><span>•</span><span><strong>Confined Space:</strong> Entry Permit required + atmospheric testing O₂, CO, LEL</span></div>}
          {hazards.h_lift && <div style={{fontSize:13,color:"#92400E",padding:"4px 0",borderBottom:"1px solid #FED7AA",display:"flex",gap:8}}><span>•</span><span><strong>Lifting Operations:</strong> Lift Plan / Rigging Study required + dogman/rigger tickets current</span></div>}
          {hazards.h_elec && <div style={{fontSize:13,color:"#92400E",padding:"4px 0",borderBottom:"1px solid #FED7AA",display:"flex",gap:8}}><span>•</span><span><strong>Electrical Works:</strong> Electrical Isolation Permit required + licensed electrician only</span></div>}
          {hazards.h_hotwork && <div style={{fontSize:13,color:"#92400E",padding:"4px 0",display:"flex",gap:8}}><span>•</span><span><strong>Hot Works:</strong> Hot Work Permit required + fire extinguisher on hand + 30-min fire watch</span></div>}
        </div>
      )}
      {swmsRows.map((h,i)=>{
        const ir = h.initialL!==""&&h.initialC!==""?matrixRating(parseInt(h.initialL),parseInt(h.initialC)):null;
        const rr = h.residualL!==""&&h.residualC!==""?matrixRating(parseInt(h.residualL),parseInt(h.residualC)):null;
        return (
          <div key={h.id} style={{...S.card,position:"relative",border:"2px solid #E5E7EB"}}>
            <button onClick={()=>setSwmsRows(p=>p.length>1?p.filter(r=>r.id!==h.id):p)} style={{position:"absolute",top:10,right:12,background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:22}}>×</button>
            <div style={{fontSize:13,fontWeight:700,color:"#2563EB",marginBottom:8}}>Hazard {i+1}</div>
            <div>
              <label style={S.label}>Hazard description</label>
              <textarea style={{...S.textarea, minHeight:54}} value={h.hazard} onChange={e=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,hazard:e.target.value}:r))} placeholder="Describe the hazard..." />
            </div>
            <div style={{fontSize:13,fontWeight:600,color:"#6B7280",margin:"12px 0 6px"}}>Initial risk (before controls)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.initialL} onChange={v=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,initialL:v}:r))} />
            <div style={{marginTop:10}}><RiskSelector label="Consequence" options={CONSEQUENCE} value={h.initialC} onChange={v=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,initialC:v}:r))} /></div>
            <LiveRisk l={h.initialL} c={h.initialC} />
            <div style={{marginTop:12}}>
              <label style={S.label}>Control measures (Eliminate → Substitute → Isolate → Engineer → Admin → PPE)</label>
              <textarea style={S.textarea} value={h.controls} onChange={e=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,controls:e.target.value}:r))} placeholder="List all control measures to be applied..." />
              <SuggestedControls hazardId={h.sourceHazardId} onAdd={text=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,controls:r.controls?(r.controls+"\n"+text):text}:r))} />
            </div>
            <div style={{marginTop:10}}><label style={S.label}>Person responsible</label><input style={S.input} value={h.responsible} onChange={e=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,responsible:e.target.value}:r))} placeholder="Name / role" /></div>
            <div style={{fontSize:13,fontWeight:600,color:"#6B7280",margin:"12px 0 6px"}}>Residual risk (after controls)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.residualL} onChange={v=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,residualL:v}:r))} />
            <div style={{marginTop:10}}><RiskSelector label="Consequence" options={CONSEQUENCE} value={h.residualC} onChange={v=>setSwmsRows(p=>p.map(r=>r.id===h.id?{...r,residualC:v}:r))} /></div>
            <LiveRisk l={h.residualL} c={h.residualC} />
          </div>
        );
      })}
      <button onClick={()=>setSwmsRows(p=>[...p,{id:Date.now(),hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}])}
        style={{width:"100%",padding:"14px",border:"2px dashed #D1D5DB",borderRadius:10,background:"none",fontSize:15,color:"#2563EB",cursor:"pointer",marginBottom:4,fontWeight:600}}>
        + Add hazard
      </button>
      <div style={S.card}>
        <div style={S.divider}>Sign-off</div>
        <div><label style={S.label}>Worker name</label><input style={S.input} value={sigWorker} onChange={e=>setSigWorker(e.target.value)} placeholder="Worker full name" /></div>
        <div style={{marginTop:10}}><label style={S.label}>Supervisor / authorising person</label><input style={S.input} value={sigSupervisor} onChange={e=>setSigSupervisor(e.target.value)} placeholder="Supervisor name" /></div>
      </div>
      <button style={S.btnPrim} onClick={()=>setScreen("complete")}>Complete SWMS →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("step3")}>← Back</button>
    </div>
  );

  if (screen==="complete") return (
    <div style={S.app}>
      {hdr}<Pips active={6} />
      <div style={{textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{width:60,height:60,background:"#D1FAE5",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:30}}>✓</div>
        <div style={{fontSize:20,fontWeight:700}}>Safety check complete</div>
        <div style={{fontSize:13,color:"#6B7280",marginTop:4}}>{form.date} {form.time} · {company.company_name}</div>
      </div>
      <div style={{borderRadius:12,padding:"14px",background:"#F0FDF4",border:"2px solid #86EFAC",marginBottom:10}}>
        <div style={{fontSize:16,fontWeight:700,color:"#15803D"}}>✓ Safe to proceed</div>
        <div style={{fontSize:14,color:"#166534",marginTop:4,lineHeight:1.5}}>
          {result==="swms"?"SWMS completed. All hazards documented.":"Take 5 complete. Standard controls apply."} If conditions change — stop and reassess.
        </div>
      </div>
      <div style={S.card}>
        <div style={{...S.divider,marginTop:0}}>Summary</div>
        {[["Task",form.task],["Machine",form.machine],["Location",form.location],["Job ref",form.jobRef],
          ["High risk tasks",selectedHrcw.map(t=>t.label).join(", ")||"None"],
          ["Hazards",selectedHazards.map(h=>h.label).join(", ")||"None"],
          ["SWMS required",result==="swms"?"Yes":"No"],
          result==="swms"&&["Hazards documented",swmsRows.length],
          needsLift&&["Lift analysis","Completed"],
          needsCS&&["Confined space checklist","Completed"],
        ].filter(Boolean).map(([k,v])=>v?<div key={k} style={{fontSize:14,padding:"5px 0",borderBottom:"1px solid #F3F4F6"}}><strong>{k}:</strong> {v}</div>:null)}
      </div>
      <div style={S.card}>
        <div style={{...S.divider,marginTop:0}}>Record saved</div>
        <div style={{fontSize:14,padding:"10px 12px",borderRadius:8,
          background:savedId?"#D1FAE5":saving?"#EFF6FF":"#FEE2E2",
          color:savedId?"#065F46":saving?"#1D4ED8":"#B91C1C"}}>
          {saving?"☁ Saving to cloud...":savedId?"✓ Saved to cloud successfully":"⚠ Save failed — "+cloudMsg}
        </div>
      </div>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:4}} onClick={()=>setScreen("records")}>View records</button>
      <button style={{...S.btnPrim,background:"#374151",marginTop:8}} onClick={reset}>Start new Take 5</button>
    </div>
  );
  return null;
}

// ── WORKER RECORDS ────────────────────────────────────────────────────────────
function WorkerRecords({ companyId, companyName, onBack, onNew }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(()=>{ load(); },[filter]);

  async function load() {
    setLoading(true);
    let q = supabase.from("take5_records").select("*").eq("company_id",companyId).order("created_at",{ascending:false}).limit(50);
    if (filter!=="all") q = q.eq("result",filter);
    const { data } = await q;
    setRecords(data||[]);
    setLoading(false);
  }

  function exportSingle(r) {
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(buildBulkPDF([r], companyName));
    w.document.close();
    setTimeout(()=>w.print(),600);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <button style={{ ...S.btnPrim, width:"auto", marginTop:0, padding:"9px 14px", fontSize:13 }} onClick={onNew}>+ New Take 5</button>
        <button style={S.btnSec} onClick={onBack}>← Back</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["all","safe","warning","swms"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151" }}>{f==="all"?"All":f.toUpperCase()}</button>
        ))}
      </div>
      {loading&&<div style={{textAlign:"center",padding:24,color:"#9CA3AF"}}>Loading...</div>}
      {!loading&&records.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",fontSize:14}}>No records yet.</div>}
      {!loading&&records.map(r=>{
        const rd=r.record_data||{};
        return (
          <div key={r.id} style={{...S.card,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600}}>{r.task||rd.task||"Untitled"}</div>
                <div style={{fontSize:13,color:"#6B7280",marginTop:2}}>{r.location||rd.location||"No location"}</div>
                <div style={{fontSize:12,color:"#9CA3AF"}}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
                <ResultBadge result={r.result} />
                <button style={{...S.btnSec,padding:"5px 10px",fontSize:12}} onClick={()=>exportSingle(r)}>📄 PDF</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PDF builder ───────────────────────────────────────────────────────────────
function buildBulkPDF(records, companyName) {
  const logoSvg = `<svg width="48" height="48" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/><path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/><path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/><text x="22" y="40.5" text-anchor="middle" style="fill:#fff;font-size:6px;font-weight:700;font-family:Arial">IQ</text></svg>`;

  const pages = records.map((r, idx) => {
    const rd = r.record_data||{};
    const hrcwList = (rd.hazards||[]).map(id=>HAZARDS.find(h=>h.id===id)?.label||id).join(", ")||"None";
    const hazardList = (rd.hazards||[]).map(id=>HAZARDS.find(h=>h.id===id)?.label||id).join(", ")||"None";

    return `<div class="${idx<records.length-1?'page-break':''}">
      <div class="header">
        ${logoSvg}
        <div>
          <div style="font-size:22px;font-weight:800">Safety<span style="color:#2563EB">IQ</span> ${r.result==="swms"?"— SWMS":""}</div>
          <div style="color:#6B7280;font-size:12px">${companyName||""} | ${r.created_at?.slice(0,10)||""} ${r.created_at?.slice(11,16)||""} | Ref: ${r.job_ref||rd.jobRef||"—"}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <span class="badge ${r.result==="swms"?"badge-H":r.result==="warning"?"badge-M":"badge-L"}">${r.result==="swms"?"SWMS Required":r.result==="warning"?"Warning":"Safe"}</span>
        </div>
      </div>
      <h2>Job details</h2>
      <table><tr><th>Task</th><th>Machine / Equipment</th></tr>
      <tr><td>${r.task||rd.task||"—"}</td><td>${rd.machine||"—"}</td></tr>
      <tr><th>Location</th><th>Date / Time</th></tr>
      <tr><td>${r.location||rd.location||"—"}</td><td>${r.created_at?.slice(0,10)||""} ${r.created_at?.slice(11,16)||""}</td></tr></table>
      <h2>Step 1 — Pre-task checklist</h2>
      <table><tr><th>Question</th><th>Answer</th></tr>
      ${STEP1_CHECKS.map(c=>`<tr><td>${c.text}</td><td style="font-weight:700;color:${rd.step1?.[c.id]==="yes"?"#B91C1C":"#065F46"}">${(rd.step1?.[c.id]||"—").toUpperCase()}</td></tr>`).join("")}</table>
      <h2>Step 2 — High risk tasks selected</h2>
      <p>${hrcwList}</p>

      <h2>Step 3 — Hazards identified</h2>
      <p>${hazardList}</p>
      ${rd.liftDetails?.load?`<h2>Lift analysis</h2><table><tr><th>Load</th><th>Weight</th><th>Equipment</th><th>Radius</th></tr><tr><td>${rd.liftDetails.load}</td><td>${rd.liftDetails.weight}t</td><td>${rd.liftDetails.crane}</td><td>${rd.liftDetails.radius}m</td></tr></table>`:""}
      ${r.result==="swms"&&(rd.swmsHazards||[]).length>0?`<h2>Step 4 — SWMS</h2>
      <table><tr><th>Hazard</th><th>Initial risk</th><th>Control measures</th><th>Responsible</th><th>Residual risk</th></tr>
      ${(rd.swmsHazards||[]).map(h=>{
        const ir=h.initialL!==""&&h.initialC!==""?matrixRating(parseInt(h.initialL),parseInt(h.initialC)):null;
        const rr=h.residualL!==""&&h.residualC!==""?matrixRating(parseInt(h.residualL),parseInt(h.residualC)):null;
        return`<tr><td>${h.hazard||"—"}</td><td>${ir?`<span class="badge badge-${ir.label[0]}">${ir.label}</span>`:"—"}</td><td>${h.controls||"—"}</td><td>${h.responsible||"—"}</td><td>${rr?`<span class="badge badge-${rr.label[0]}">${rr.label}</span>`:"—"}</td></tr>`;
      }).join("")}</table>`:""}
      <h2>Step 5 — Sign-off</h2>
      <table><tr><th width="50%">Worker: ${rd.sigWorker||"—"}</th><th width="50%">Supervisor: ${rd.sigSupervisor||"—"}</th></tr>
      <tr><td><div class="sig"></div></td><td><div class="sig"></div></td></tr></table>
    </div>`;
  });

  return `<html><head><style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;max-width:800px;margin:0 auto;padding:24px}
    .header{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #2563EB}
    h2{font-size:13px;margin:14px 0 5px;border-bottom:2px solid #2563EB;padding-bottom:3px;color:#1e3a5f}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    td,th{border:1px solid #ccc;padding:5px 7px;font-size:11px;vertical-align:top}th{background:#f0f4ff;font-weight:600}
    .badge{padding:2px 6px;border-radius:4px;font-weight:700;font-size:11px}
    .badge-L,.badge-S{background:#D1FAE5;color:#065F46}.badge-M,.badge-W{background:#FEF3C7;color:#78350F}
    .badge-H,.badge-E{background:#FEE2E2;color:#B91C1C}
    .sig{border:1px solid #ccc;height:44px;border-radius:4px;margin-top:4px;background:#fafafa}
    .page-break{page-break-after:always;margin-bottom:40px}
    p{font-size:12px;margin-bottom:6px}
    @media print{button{display:none}}
  </style></head><body>
  ${pages.join("")}
  <div style="text-align:center;margin-top:20px;color:#9CA3AF;font-size:11px">Generated by SafetyIQ · ${new Date().toLocaleDateString('en-AU')} · ${companyName||""} · ${records.length} record${records.length!==1?'s':''}</div>
  </body></html>`;
}

// ── QR Poster ─────────────────────────────────────────────────────────────────
function buildPoster(co) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#fff}
    .page{max-width:680px;margin:0 auto;padding:40px 32px}
    .top{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #2563EB;margin-bottom:28px}
    .brand{display:flex;align-items:center;gap:14px}
    .brand-name{font-size:32px;font-weight:900}.brand-tag{font-size:13px;color:#6B7280;letter-spacing:1px;margin-top:4px}
    .main{display:flex;gap:32px;align-items:flex-start;margin-bottom:28px}
    .qr-box{flex-shrink:0;text-align:center}#qrd{border:3px solid #E5E7EB;border-radius:12px;overflow:hidden;width:220px;height:220px}
    .qr-label{font-size:12px;color:#9CA3AF;margin-top:6px}
    .right{flex:1}.url-box{font-size:18px;font-weight:800;background:#F3F4F6;padding:10px 14px;border-radius:8px;margin-bottom:20px;text-align:center}
    .pin-box{background:#EFF6FF;border:2px solid #BFDBFE;border-radius:16px;padding:20px 24px;text-align:center;margin-bottom:20px}
    .pin-label{font-size:13px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    .pin{font-size:52px;font-weight:900;color:#2563EB;letter-spacing:14px}
    .steps{background:#F9FAFB;border-radius:12px;padding:18px 20px;margin-bottom:20px}
    .steps-title{font-size:14px;font-weight:700;margin-bottom:10px}
    .steps ol{padding-left:20px}.steps li{font-size:14px;line-height:1.6;margin-bottom:4px}
    .footer{border-top:1px solid #E5E7EB;padding-top:16px;display:flex;justify-content:space-between}
    .noprint{margin-top:24px;text-align:center}
    @media print{.noprint{display:none}}
  </style></head><body>
  <div class="page">
    <div class="top">
      <div class="brand">
        <svg width="56" height="56" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/><path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/><path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/><text x="22" y="40.5" text-anchor="middle" style="fill:#fff;font-size:6px;font-weight:700;font-family:Arial">IQ</text></svg>
        <div><div class="brand-name">Safety<span style="color:#2563EB">IQ</span></div><div class="brand-tag">STOP · THINK · ACT SAFELY</div></div>
      </div>
      <div><div style="font-size:22px;font-weight:700;color:#2563EB;text-align:right">${co.name}</div><div style="font-size:13px;color:#9CA3AF;text-align:right;margin-top:2px">Site access poster</div></div>
    </div>
    <div class="main">
      <div class="qr-box"><div id="qrd"></div><div class="qr-label">Scan to open app</div></div>
      <div class="right">
        <p style="font-size:15px;color:#374151;margin-bottom:16px">Scan the QR code or type the address into your browser:</p>
        <div class="url-box">${APP_URL}</div>
        <div class="pin-box"><div class="pin-label">Your site PIN</div><div class="pin">${co.pin}</div></div>
      </div>
    </div>
    <div class="steps">
      <div class="steps-title">How to complete your Take 5:</div>
      <ol>
        <li>Scan the QR code or go to <strong>${APP_URL}</strong></li>
        <li>Enter your 6-digit site PIN: <strong>${co.pin}</strong></li>
        <li>Complete the pre-task checklist (Step 1)</li>
        <li>Select all High Risk tasks that apply (Step 2)</li>
        <li>Identify hazards and assess risk (Step 3)</li>
        <li>Complete SWMS if required (Step 4)</li>
        <li>Sign off and proceed safely (Step 5)</li>
      </ol>
    </div>
    <div class="footer">
      <div style="font-size:14px;font-weight:700;color:#2563EB">${APP_URL}</div>
      <div style="font-size:12px;color:#9CA3AF">PIN: ${co.pin} | ${co.name} | SafetyIQ</div>
    </div>
    <div class="noprint"><button onclick="window.print()" style="padding:14px 40px;background:#2563EB;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:20px">🖨 Print poster</button></div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <script>window.onload=function(){try{new QRCode(document.getElementById("qrd"),{text:"${APP_URL}",width:220,height:220,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.M})}catch(e){}}<\/script>
  </body></html>`;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("loading");
  const [company, setCompany] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [isMaster, setIsMaster] = useState(false);

  useEffect(()=>{
    // Check saved company PIN
    const saved = localStorage.getItem("safetyiq_company");
    if (saved) {
      try {
        const co = JSON.parse(saved);
        supabase.from("companies").select("id,name").eq("id",co.company_id).eq("is_active",true).single()
          .then(({data})=>{
            if (data) { setCompany({company_id:data.id,company_name:data.name}); setMode("app"); }
            else { localStorage.removeItem("safetyiq_company"); setMode("pin"); }
          });
      } catch(e) { localStorage.removeItem("safetyiq_company"); setMode("pin"); }
    } else { setMode("pin"); }

    supabase.auth.getSession().then(({data})=>{
      if (data.session) {
        const email = data.session.user.email;
        setAdminSession(data.session);
        setIsMaster(email===MASTER_EMAIL);
        setMode("admin");
      }
    });
    const { data:{subscription} } = supabase.auth.onAuthStateChange((_e,s)=>{
      setAdminSession(s);
      if (s) {
        setIsMaster(s.user.email===MASTER_EMAIL);
        setMode("admin");
      } else { setAdminSession(null); setIsMaster(false); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  function handlePinSuccess(co) {
    setCompany(co);
    localStorage.setItem("safetyiq_company", JSON.stringify(co));
    setMode("app");
  }

  function handleExit() { setMode("pin"); }

  function handleForgetDevice() {
    localStorage.removeItem("safetyiq_company");
    setCompany(null);
    setMode("pin");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAdminSession(null);
    setIsMaster(false);
    setMode("pin");
  }

  if (mode==="loading") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F9FAFB" }}>
      <div style={{ textAlign:"center" }}><Logo size={64} /><div style={{ fontSize:14, color:"#9CA3AF", marginTop:12 }}>Loading...</div></div>
    </div>
  );

  if (mode==="pin") return <PinLogin onSuccess={handlePinSuccess} onAdminClick={()=>setMode("adminLogin")} />;
  if (mode==="adminLogin") return <AdminLogin onSuccess={s=>{ setAdminSession(s); setIsMaster(s.user.email===MASTER_EMAIL); setMode("admin"); }} onBack={()=>setMode("pin")} />;
  if (mode==="admin") {
    if (isMaster) return <MasterAdmin onLogout={handleLogout} />;
    return <CompanyAdmin session={adminSession} onLogout={handleLogout} />;
  }
  if (mode==="app"&&company) return <Take5App company={company} onExit={handleExit} onForgetDevice={handleForgetDevice} />;
  return null;
}
