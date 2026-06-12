import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wwaogpobcnqqxzicjzon.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YW9ncG9iY25xcXh6aWNqem9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTQ5ODQsImV4cCI6MjA5NjYzMDk4NH0.eF57eCwnaHUvvAgI9yfO9auAyKTC-C17qZeh_t7GPaQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load qrcode library from CDN
let QRCodeLib = null;
async function getQRLib() {
  if (QRCodeLib) return QRCodeLib;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = () => { QRCodeLib = window.QRCode; resolve(window.QRCode); };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

async function generateQRDataURL(text, size=220) {
  try {
    // Use canvas-based generation
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    // Use qrcode-generator CDN
    const QR = await new Promise((resolve) => {
      if (window.qrcode) { resolve(window.qrcode); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = () => resolve(null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return null;
  } catch(e) { return null; }
}

// ── Step 1: Pre-task checklist ────────────────────────────────────────────────
const STEP1_CHECKS = [
  { id:"s1_1", text:"Do I fully understand the task, the scope of work and the safe work procedure?", swmsTrigger:false },
  { id:"s1_2", text:"Have I reviewed the relevant risk assessment, SWMS or work instructions for this task?", swmsTrigger:true },
  { id:"s1_3", text:"Is the work area clear of unauthorised personnel and bystanders?", swmsTrigger:false },
  { id:"s1_4", text:"Have I inspected my tools and equipment — are they in good condition and fit for purpose?", swmsTrigger:false },
  { id:"s1_5", text:"Do I have the correct PPE in good condition for this specific task?", swmsTrigger:false },
  { id:"s1_6", text:"Am I trained, competent, licensed and physically fit to perform this task today?", swmsTrigger:true },
  { id:"s1_7", text:"Have conditions changed since the last shift or last time this task was performed?", swmsTrigger:false },
];

// ── Step 2: High Risk Construction Work selector ──────────────────────────────
const HRCW_TASKS = [
  {
    id:"hrcw_wah",
    label:"Working at Heights",
    sub:"Any work above 2 metres, platforms, ladders, scaffolding, elevated surfaces",
    icon:"🪜",
    permits:["Height Safety Plan / EWP pre-start must be completed"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_cs",
    label:"Confined Space Entry",
    sub:"Any enclosed or partially enclosed space with restricted egress or atmospheric risk",
    icon:"🚪",
    permits:["Confined Space Entry Permit required before entry","Atmospheric testing — O₂, CO, LEL must be conducted and recorded"],
    triggerLift:false,
    triggerConfinedSpace:true,
  },
  {
    id:"hrcw_lift",
    label:"Lifting Operations",
    sub:"Crane, EWP, forklift, chain block, come-along, rigging, slinging of loads",
    icon:"🏗",
    permits:["Lift Plan / Rigging Study required","Dogman/rigger tickets must be current"],
    triggerLift:true,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_press",
    label:"Pressurised Systems",
    sub:"Hydraulic/pneumatic systems, pressure testing, hose replacement under pressure, accumulator work",
    icon:"⚡",
    permits:["System must be depressurised and isolated before work","Pressure test cert required if post-repair test conducted"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_mech",
    label:"Mechanical Isolation / LOTO",
    sub:"Isolating rotating plant, guarded machinery, TBM drives, conveyors, pumps before maintenance",
    icon:"🔒",
    permits:["Isolation permit / LOTO procedure must be completed","Zero energy state verified before commencing work"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_demolition",
    label:"Structural / Demolition Work",
    sub:"Removing, modifying or installing structural components, machine frames, bearing housings",
    icon:"🔧",
    permits:["Engineering sign-off required for structural modifications"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_chem",
    label:"Hazardous Substances",
    sub:"Hydraulic oils, greases, epoxy, solvents, cleaning agents, welding fumes, chemical handling",
    icon:"🧪",
    permits:["SDS must be available on site","Adequate ventilation and spill containment required"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_mobileplant",
    label:"Working Near Mobile Plant",
    sub:"Cranes, forklifts, excavators, vehicles, loaders operating in or near the work area",
    icon:"🚛",
    permits:["Exclusion zones must be established and signed","Spotter/traffic controller required where visibility is limited"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_excavation",
    label:"Excavation / Ground Disturbance",
    sub:"Any digging, trenching, soil disturbance or work near existing underground services",
    icon:"⛏",
    permits:["Before You Dig (BYDA) check required","Dial Before You Dig — 1100"],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
  {
    id:"hrcw_none",
    label:"No High Risk Tasks",
    sub:"This task does not involve any of the above high risk construction work categories",
    icon:"✓",
    permits:[],
    triggerLift:false,
    triggerConfinedSpace:false,
  },
];

// ── Step 3: Hazard identification (heavy industrial/mechanical) ───────────────
const HAZARDS = [
  { id:"h_mh",    label:"Manual Handling",         sub:"Heavy lifts, awkward postures, repetitive strain, over-exertion",         weight:"medium" },
  { id:"h_fall",  label:"Falls / Slips / Trips",   sub:"Wet surfaces, uneven ground, steps, open edges, debris on walkways",       weight:"high" },
  { id:"h_mech",  label:"Mechanical Hazards",       sub:"Rotating parts, nip points, struck by components, swinging loads",         weight:"high" },
  { id:"h_press", label:"Pressure / Stored Energy", sub:"Hydraulic/pneumatic energy, springs under load, accumulators",             weight:"high" },
  { id:"h_chem",  label:"Chemical / Substance",     sub:"Hydraulic oil, grease, solvents, cleaning agents, fumes",                  weight:"medium" },
  { id:"h_noise", label:"Noise / Vibration",        sub:"Impact tools, grinders, heavy machinery, power tools",                     weight:"medium" },
  { id:"h_heat",  label:"Heat / Burns",             sub:"Hot surfaces, steam, friction, welding, cutting operations",               weight:"medium" },
  { id:"h_struct",label:"Structural Instability",   sub:"Unsecured machine frames, components overhead, inadequate support",         weight:"high" },
  { id:"h_env",   label:"Environment / Weather",    sub:"Rain, wind, heat stress, poor lighting, dust, mud",                        weight:"medium" },
  { id:"h_traffic",label:"Traffic / Mobile Plant",  sub:"Vehicles, forklifts, cranes operating near work area",                     weight:"high" },
  { id:"h_ergon", label:"Ergonomic / Fatigue",      sub:"Repetitive work, awkward access, end-of-shift fatigue, night work",        weight:"medium" },
  { id:"h_other", label:"Other Hazard",             sub:"Any hazard not captured above — describe in SWMS",                         weight:"medium" },
];

// ── Risk matrix ───────────────────────────────────────────────────────────────
const LIKELIHOOD = [
  { value:0, label:"Rare",           short:"Rare (1)",           desc:"May occur only in exceptional circumstances",   color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Unlikely",       short:"Unlikely (2)",       desc:"Could occur at some time but not expected",     color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Possible",       short:"Possible (3)",       desc:"Might occur at some time during the task",      color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Likely",         short:"Likely (4)",         desc:"Will probably occur in most circumstances",     color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Almost Certain", short:"Almost Certain (5)", desc:"Is expected to occur during this task",         color:"#B91C1C", bg:"#FEE2E2" },
];

const CONSEQUENCE = [
  { value:0, label:"Insignificant", short:"Insignificant (1)", desc:"No injury, minor first aid only",                      color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Minor",         short:"Minor (2)",         desc:"Minor injury, limited medical treatment",              color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Moderate",      short:"Moderate (3)",      desc:"Medical treatment required, restricted duties",        color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Major",         short:"Major (4)",         desc:"Significant injury, long term illness or disability",  color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Catastrophic",  short:"Catastrophic (5)",  desc:"Death or permanent total disability",                  color:"#7F1D1D", bg:"#fecaca" },
];

const RISK_LEVEL = [
  { label:"Low",     color:"#065F46", bg:"#D1FAE5", border:"#86EFAC", desc:"Manage by routine procedures" },
  { label:"Medium",  color:"#78350F", bg:"#FEF3C7", border:"#FCD34D", desc:"Manage by monitoring and specific procedures" },
  { label:"High",    color:"#B91C1C", bg:"#FEE2E2", border:"#FCA5A5", desc:"Senior management attention required" },
  { label:"Extreme", color:"#fff",    bg:"#7F1D1D", border:"#991B1B", desc:"Immediate action required — stop work" },
];

function matrixRating(l, c) {
  const s = (l+1)*(c+1);
  if (s<=4) return RISK_LEVEL[0];
  if (s<=9) return RISK_LEVEL[1];
  if (s<=16) return RISK_LEVEL[2];
  return RISK_LEVEL[3];
}

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
  "Is the rigging equipment (slings, shackles, hooks) inspected and tagged?",
  "Is the landing zone clear and prepared to receive the load?",
];

const CONFINED_SPACE_CHECKS = [
  "Has an atmospheric test been completed? (O₂ 19.5–23.5%, LEL <10%, CO <25ppm)",
  "Is a Confined Space Entry Permit in place and signed off?",
  "Is a standby person assigned and stationed at the entry point?",
  "Is rescue equipment available and workers trained in its use?",
  "Is ventilation adequate — forced air ventilation in place if required?",
  "Has the space been isolated from all energy sources and services?",
  "Do all entrants understand the emergency evacuation procedure?",
  "Is continuous atmospheric monitoring in place during the task?",
];

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:      { maxWidth:680, margin:"0 auto", padding:"12px 12px 40px", fontFamily:"system-ui,-apple-system,sans-serif" },
  card:     { background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"14px", marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  label:    { fontSize:12, color:"#6B7280", display:"block", marginBottom:3, fontWeight:500 },
  input:    { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none", outline:"none" },
  textarea: { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", resize:"vertical", minHeight:80, outline:"none" },
  select:   { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"11px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none", appearance:"none", outline:"none" },
  btnPrim:  { background:"#2563EB", color:"#fff", border:"none", borderRadius:10, padding:"14px 20px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", marginTop:6 },
  btnSec:   { background:"#F3F4F6", color:"#374151", border:"1px solid #E5E7EB", borderRadius:10, padding:"11px 16px", fontSize:14, fontWeight:500, cursor:"pointer" },
  btnDanger:{ background:"#FEE2E2", color:"#B91C1C", border:"1px solid #FCA5A5", borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },
  grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 },
  stepLbl:  { fontSize:11, fontWeight:700, color:"#2563EB", textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 },
  secSub:   { fontSize:14, color:"#6B7280", marginBottom:14, lineHeight:1.5 },
  divider:  { fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:".06em", padding:"8px 0 4px", borderBottom:"1px solid #E5E7EB", marginBottom:10, marginTop:16 },
};


// ── QR Code Component ─────────────────────────────────────────────────────────
function QRCanvas({ text, size=220 }) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || !text) return;
    ref.current.innerHTML = '';
    
    function tryMake() {
      try {
        new window.QRCode(ref.current, {
          text: text,
          width: size,
          height: size,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
        setDone(true);
      } catch(e) {
        setFailed(true);
      }
    }

    if (window.QRCode) {
      tryMake();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = () => tryMake();
      s.onerror = () => setFailed(true);
      document.head.appendChild(s);
    }
  }, [text, size]);

  if (failed) return (
    <div style={{ width:size, height:size, border:'2px dashed #E5E7EB', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:12, color:'#9CA3AF', textAlign:'center', padding:'0 12px' }}>QR unavailable offline</div>
      <div style={{ fontSize:11, color:'#2563EB', textAlign:'center', wordBreak:'break-all', padding:'0 8px' }}>{text}</div>
    </div>
  );

  return (
    <div style={{ position:'relative' }}>
      <div ref={ref} style={{ width:size, height:size, borderRadius:8, overflow:'hidden', border:'2px solid #E5E7EB' }}></div>
      {!done && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB', borderRadius:8 }}>
          <div style={{ fontSize:12, color:'#9CA3AF' }}>Generating QR...</div>
        </div>
      )}
    </div>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size=44 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-label="SafetyIQ">
      <path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/>
      <path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/>
      <path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/>
      <text x="22" y="40.5" textAnchor="middle" style={{fill:"#fff",fontSize:"6px",fontWeight:700,fontFamily:"system-ui,sans-serif",letterSpacing:1}}>IQ</text>
    </svg>
  );
}

function Pips({ active, total=6 }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:14 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ flex:1, height:5, borderRadius:3, transition:"background .2s",
          background: i<active?"#22C55E":i===active?"#2563EB":"#E5E7EB" }} />
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
      {sel && (
        <div style={{ marginTop:5, padding:"8px 10px", borderRadius:8, background:sel.bg }}>
          <span style={{ color:sel.color, fontSize:13, fontWeight:500 }}>{sel.desc}</span>
        </div>
      )}
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

// ── PIN LOGIN ─────────────────────────────────────────────────────────────────
function PinLogin({ onSuccess, onAdminClick }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePin(digit) {
    const next = pin + digit;
    setPin(next);
    setError("");
    if (next.length === 6) {
      setLoading(true);
      const { data, error } = await supabase.from("companies").select("id,name").eq("pin", next).eq("is_active", true).single();
      if (error || !data) { setError("Invalid PIN — check with your supervisor"); setPin(""); }
      else onSuccess({ company_id:data.id, company_name:data.name });
      setLoading(false);
    }
  }

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#F9FAFB", padding:16 }}>
      <button onClick={onAdminClick} style={{ position:"fixed", top:16, right:16, background:"#fff", border:"1px solid #E5E7EB", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, color:"#6B7280", cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,.08)" }}>
        Admin login
      </button>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Logo size={72} /></div>
        <div style={{ fontSize:28, fontWeight:800, color:"#1F2937" }}>Safety<span style={{color:"#2563EB"}}>IQ</span></div>
        <div style={{ fontSize:14, color:"#9CA3AF", marginTop:4 }}>Enter your site PIN to begin</div>
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:24 }}>
        {Array.from({length:6}).map((_,i) => (
          <div key={i} style={{ width:18, height:18, borderRadius:"50%", background:i<pin.length?"#2563EB":"#E5E7EB", transition:"background .15s" }} />
        ))}
      </div>
      {error && <div style={{ marginBottom:16, padding:"10px 16px", borderRadius:10, background:"#FEE2E2", color:"#B91C1C", fontSize:14, fontWeight:500, textAlign:"center", maxWidth:280 }}>{error}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 80px)", gap:12, maxWidth:280 }}>
        {digits.map((d,i) => (
          <button key={i} onClick={()=> d==="⌫" ? setPin(p=>p.slice(0,-1)) : d!==""&&!loading ? handlePin(d) : null}
            disabled={loading||(d==="")}
            style={{ height:80, borderRadius:16, border:"1px solid #E5E7EB", fontSize:d==="⌫"?22:28, fontWeight:700,
              background:d===""?"transparent":"#fff", color:d==="⌫"?"#9CA3AF":"#1F2937",
              cursor:d===""?"default":"pointer", boxShadow:d!=""?"0 1px 3px rgba(0,0,0,.08)":"none", opacity:loading?.5:1 }}>
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
        <div style={{ fontSize:22, fontWeight:800, color:"#1F2937" }}>Admin login</div>
        <div style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>SafetyIQ administration</div>
      </div>
      <div style={{ ...S.card, width:"100%", maxWidth:380 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={set("email")} placeholder="admin@example.com" autoCapitalize="none" /></div>
          <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={set("password")} placeholder="Password" /></div>
        </div>
        {error && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:"#FEE2E2", color:"#B91C1C", fontSize:13 }}>{error}</div>}
        <button style={{ ...S.btnPrim, opacity:loading?.5:1 }} onClick={handleLogin} disabled={loading}>{loading?"Logging in...":"Log in as admin"}</button>
      </div>
    </div>
  );
}

// ── SETTINGS PAGE ─────────────────────────────────────────────────────────────
function SettingsPage({ onBack }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCo, setNewCo] = useState({ name:"", pin:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState(null);
  const appUrl = "https://safety-iq.vercel.app";

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").neq("code","ADMIN_MASTER_CODE").order("name");
    setCompanies(data||[]);
    setLoading(false);
  }

  function generatePin() { return String(Math.floor(100000 + Math.random()*900000)); }

  async function addCompany() {
    if (!newCo.name) return;
    setSaving(true);
    const pin = newCo.pin || generatePin();
    const code = newCo.name.toUpperCase().replace(/\s+/g,"-")+"-"+pin;
    const { error } = await supabase.from("companies").insert({ name:newCo.name.trim(), code, pin });
    if (error) setMsg("Error: "+error.message);
    else { setMsg("Company added."); setNewCo({name:"",pin:""}); loadCompanies(); }
    setSaving(false);
  }

  async function regeneratePin(co) {
    const newPin = generatePin();
    await supabase.from("companies").update({ pin:newPin }).eq("id", co.id);
    loadCompanies();
  }

  function printQR(co) {
    const url = appUrl;
    const w = window.open("","_blank","width=850,height=900");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;background:#fff;color:#1F2937}
      .page{max-width:680px;margin:0 auto;padding:40px 32px}
      .top{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #2563EB;margin-bottom:28px}
      .brand{display:flex;align-items:center;gap:14px}
      .brand-name{font-size:32px;font-weight:900}
      .brand-tag{font-size:13px;color:#6B7280;margin-top:4px;letter-spacing:1px}
      .co-name{font-size:22px;font-weight:700;color:#2563EB;text-align:right}
      .co-sub{font-size:13px;color:#9CA3AF;text-align:right;margin-top:2px}
      .main{display:flex;gap:32px;align-items:flex-start;margin-bottom:28px}
      .qr-wrap{flex-shrink:0;text-align:center}
      .qr-wrap #qr-div{border:3px solid #E5E7EB;border-radius:12px;overflow:hidden;width:220px;height:220px;display:inline-block}
      .qr-label{font-size:12px;color:#9CA3AF;margin-top:6px}
      .right{flex:1}
      .url-box{font-size:18px;font-weight:800;background:#F3F4F6;padding:10px 14px;border-radius:8px;margin-bottom:20px;text-align:center;word-break:break-all}
      .pin-box{background:#EFF6FF;border:2px solid #BFDBFE;border-radius:16px;padding:20px 24px;text-align:center;margin-bottom:20px}
      .pin-label{font-size:13px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
      .pin{font-size:52px;font-weight:900;color:#2563EB;letter-spacing:14px;line-height:1}
      .steps{background:#F9FAFB;border-radius:12px;padding:18px 20px;margin-bottom:20px}
      .steps-title{font-size:14px;font-weight:700;margin-bottom:10px}
      .steps ol{padding-left:20px}
      .steps li{font-size:14px;line-height:1.6;margin-bottom:4px}
      .footer{border-top:1px solid #E5E7EB;padding-top:16px;display:flex;justify-content:space-between;align-items:center}
      .footer-url{font-size:14px;font-weight:700;color:#2563EB}
      .footer-note{font-size:12px;color:#9CA3AF}
      .noprint{margin-top:24px;text-align:center}
      @media print{.noprint{display:none}}
    </style></head><body>
    <div class="page">
      <div class="top">
        <div class="brand">
          <svg width="56" height="56" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/>
            <path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/>
            <path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/>
            <text x="22" y="40.5" text-anchor="middle" style="fill:#fff;font-size:6px;font-weight:700;font-family:Arial">IQ</text>
          </svg>
          <div>
            <div class="brand-name">Safety<span style="color:#2563EB">IQ</span></div>
            <div class="brand-tag">STOP &middot; THINK &middot; ACT SAFELY</div>
          </div>
        </div>
        <div>
          <div class="co-name">${co.name}</div>
          <div class="co-sub">Site access poster</div>
        </div>
      </div>
      <div class="main">
        <div class="qr-wrap">
          <div id="qr-div"></div>
          <div class="qr-label">Scan to open app</div>
        </div>
        <div class="right">
          <p style="font-size:15px;color:#374151;margin-bottom:16px">Scan the QR code or type the address into your browser:</p>
          <div class="url-box">${url}</div>
          <div class="pin-box">
            <div class="pin-label">Your site PIN</div>
            <div class="pin">${co.pin}</div>
          </div>
        </div>
      </div>
      <div class="steps">
        <div class="steps-title">How to complete your Take 5:</div>
        <ol>
          <li>Scan the QR code or go to <strong>${url}</strong></li>
          <li>Enter your 6-digit site PIN: <strong>${co.pin}</strong></li>
          <li>Complete the pre-task checklist (Step 1)</li>
          <li>Select all High Risk tasks that apply (Step 2)</li>
          <li>Identify hazards and assess risk (Step 3)</li>
          <li>Complete SWMS if required (Step 4)</li>
          <li>Sign off and proceed safely (Step 5)</li>
        </ol>
      </div>
      <div class="footer">
        <div class="footer-url">${url}</div>
        <div class="footer-note">PIN: ${co.pin} &nbsp;|&nbsp; ${co.name} &nbsp;|&nbsp; SafetyIQ</div>
      </div>
      <div class="noprint">
        <button onclick="window.print()" style="padding:14px 40px;background:#2563EB;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">&#128424; Print poster</button>
      </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
    <script>
      window.onload = function() {
        try {
          new QRCode(document.getElementById("qr-div"), {
            text: "${url}",
            width: 220,
            height: 220,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch(e) {
          document.getElementById("qr-div").innerHTML = '<div style="padding:20px;font-size:12px;color:#6B7280;text-align:center">Open browser to view QR</div>';
        }
      };
    <\/script>
    </body></html>`);
    w.document.close();
  }

  return (
    <div style={S.app}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:"1px solid #E5E7EB" }}>
        <Logo size={40} />
        <div style={{ flex:1 }}><div style={{ fontSize:17, fontWeight:700 }}>⚙ Settings</div><div style={{ fontSize:12, color:"#6B7280" }}>Company PINs & QR posters</div></div>
        <button style={S.btnSec} onClick={onBack}>← Back</button>
      </div>
      <div style={S.divider}>Company PINs</div>
      <div style={{ fontSize:13, color:"#6B7280", marginBottom:10 }}>Each company has a unique 6-digit PIN. Workers enter this to access the app — no account needed.</div>
      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}
      {companies.map(co=>(
        <div key={co.id} style={{ ...S.card, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }} onClick={()=>setOpenId(openId===co.id?null:co.id)}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{co.name}</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#2563EB", letterSpacing:4, marginTop:2 }}>{co.pin||"No PIN set"}</div>
            </div>
            <span style={{ fontSize:18, color:"#9CA3AF" }}>{openId===co.id?"▲":"▼"}</span>
          </div>
          {openId===co.id && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #E5E7EB" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:12 }}>
                <QRCanvas text={appUrl} size={180} />
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:6 }}>Scan to open {co.name} app</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#2563EB", marginTop:4, letterSpacing:2 }}>{appUrl}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...S.btnPrim, flex:1, marginTop:0 }} onClick={()=>printQR(co)}>🖨 Print PIN poster</button>
                <button style={{ ...S.btnSec, flex:1 }} onClick={()=>{ if(confirm("Generate a new PIN? Workers will need the new PIN to log in.")) regeneratePin(co); }}>🔄 New PIN</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div style={S.divider}>Add new company</div>
      <div style={S.card}>
        <div><label style={S.label}>Company name</label><input style={S.input} value={newCo.name} onChange={e=>setNewCo(c=>({...c,name:e.target.value}))} placeholder="e.g. AFJV" /></div>
        <div style={{ marginTop:10, display:"flex", alignItems:"flex-end", gap:8 }}>
          <div style={{ flex:1 }}><label style={S.label}>PIN (leave blank to auto-generate)</label><input style={S.input} value={newCo.pin} onChange={e=>setNewCo(c=>({...c,pin:e.target.value.replace(/\D/g,"").slice(0,6)}))} placeholder="Auto-generated" maxLength={6} /></div>
          <button style={{ ...S.btnSec, padding:"11px 14px" }} onClick={()=>setNewCo(c=>({...c,pin:generatePin()}))}>Generate</button>
        </div>
        {msg && <div style={{ marginTop:8, fontSize:13, padding:"8px 10px", borderRadius:8, color:msg.startsWith("Error")?"#B91C1C":"#065F46", background:msg.startsWith("Error")?"#FEE2E2":"#D1FAE5" }}>{msg}</div>}
        <button style={S.btnPrim} onClick={addCompany} disabled={saving||!newCo.name}>{saving?"Saving...":"Add company"}</button>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ onBack, onSettings, onLogout }) {
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll() {
    setLoading(true);
    const [r,c] = await Promise.all([
      supabase.from("take5_records").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("companies").select("*").neq("code","ADMIN_MASTER_CODE").order("name"),
    ]);
    setRecords(r.data||[]);
    setCompanies(c.data||[]);
    setLoading(false);
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record permanently?")) return;
    await supabase.from("take5_records").delete().eq("id",id);
    loadAll();
  }

  const filtered = filter==="all"?records:records.filter(r=>r.result===filter);

  return (
    <div style={S.app}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:"1px solid #E5E7EB" }}>
        <Logo size={40} />
        <div style={{ flex:1 }}><div style={{ fontSize:17, fontWeight:700 }}>Admin dashboard</div><div style={{ fontSize:12, color:"#6B7280" }}>All companies · All records</div></div>
        <button style={{ ...S.btnSec, padding:"7px 12px", fontSize:12 }} onClick={onSettings}>⚙</button>
        <button style={{ ...S.btnSec, padding:"7px 12px", fontSize:12 }} onClick={onLogout}>Log out</button>
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:14, background:"#F3F4F6", borderRadius:10, padding:3 }}>
        {["overview","records"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"10px", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", textTransform:"capitalize", background:tab===t?"#fff":"transparent", color:tab===t?"#2563EB":"#6B7280", boxShadow:tab===t?"0 1px 3px rgba(0,0,0,.1)":"none" }}>{t}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}
      {!loading && tab==="overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[{label:"Total records",value:records.length,color:"#2563EB"},{label:"SWMS required",value:records.filter(r=>r.result==="swms").length,color:"#DC2626"},{label:"Companies",value:companies.length,color:"#16A34A"},{label:"This week",value:records.filter(r=>new Date(r.created_at)>new Date(Date.now()-7*86400000)).length,color:"#7C3AED"}].map(s=>(
              <div key={s.label} style={{ ...S.card, textAlign:"center", marginBottom:0, padding:"16px 10px" }}>
                <div style={{ fontSize:30, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={S.divider}>Recent records</div>
          {records.slice(0,10).map(r=>{
            const rd = r.record_data||{};
            return (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #F9FAFB" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.task||rd.task||r.job_ref||"Untitled"}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)}</div>
                </div>
                <span style={{ fontSize:11, padding:"3px 8px", borderRadius:5, fontWeight:700, flexShrink:0, background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5", color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>{r.result?.toUpperCase()}</span>
              </div>
            );
          })}
        </>
      )}
      {!loading && tab==="records" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {["all","safe","warning","swms"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:"8px 14px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151", textTransform:"capitalize" }}>{f==="all"?"All":f.toUpperCase()}</button>
            ))}
          </div>
          {filtered.map(r=>{
            const rd = r.record_data||{};
            return (
              <div key={r.id} style={{ ...S.card, marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{r.task||rd.task||r.job_ref||"Untitled"}</div>
                    <div style={{ fontSize:12, color:"#6B7280" }}>{r.location||rd.location||"No location"}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0, alignItems:"flex-end" }}>
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:5, fontWeight:700, background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5", color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>{r.result?.toUpperCase()}</span>
                    <button style={S.btnDanger} onClick={()=>deleteRecord(r.id)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── RECORDS VIEW ──────────────────────────────────────────────────────────────
function RecordsView({ companyId, companyName, onBack, onNew }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(()=>{ loadRecords(); },[filter]);

  async function loadRecords() {
    setLoading(true);
    let q = supabase.from("take5_records").select("*").eq("company_id",companyId).order("created_at",{ascending:false}).limit(50);
    if (filter!=="all") q = q.eq("result",filter);
    const { data } = await q;
    setRecords(data||[]);
    setLoading(false);
  }

  return (
    <div style={S.app}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:12, borderBottom:"1px solid #E5E7EB" }}>
        <Logo size={40} />
        <div style={{ flex:1 }}><div style={{ fontSize:17, fontWeight:700 }}>Records</div><div style={{ fontSize:12, color:"#6B7280" }}>{companyName}</div></div>
        <button style={{ ...S.btnPrim, width:"auto", marginTop:0, padding:"9px 14px", fontSize:13 }} onClick={onNew}>+ New</button>
        <button style={S.btnSec} onClick={onBack}>← Back</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["all","safe","warning","swms"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"8px 14px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151" }}>{f==="all"?"All":f.toUpperCase()}</button>
        ))}
      </div>
      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}
      {!loading && records.length===0 && <div style={{ textAlign:"center", padding:40, color:"#6B7280", fontSize:14 }}>No records yet.</div>}
      {!loading && records.map(r=>{
        const rd = r.record_data||{};
        return (
          <div key={r.id} style={{ ...S.card, marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{r.task||rd.task||r.job_ref||"Untitled task"}</div>
                <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{r.location||rd.location||"No location"}</div>
                <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
              </div>
              <span style={{ fontSize:12, padding:"4px 10px", borderRadius:6, fontWeight:700, flexShrink:0, background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5", color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>{r.result?.toUpperCase()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN TAKE 5 APP ───────────────────────────────────────────────────────────
function Take5App({ company, onExit, onForgetDevice }) {
  const [screen, setScreen] = useState("setup");
  const [form, setForm] = useState({ jobRef:"", location:"", date:new Date().toISOString().slice(0,10), time:new Date().toTimeString().slice(0,5), task:"", machineEquipment:"" });
  const [step1, setStep1] = useState({});
  const [hrcwSelected, setHrcwSelected] = useState({});
  const [hazards, setHazards] = useState({});
  const [liftChecks, setLiftChecks] = useState({});
  const [liftDetails, setLiftDetails] = useState({ load:"", weight:"", crane:"", radius:"" });
  const [csChecks, setCsChecks] = useState({});
  const [swmsHazards, setSwmsHazards] = useState([{ id:1, hazard:"", initialL:"", initialC:"", controls:"", responsible:"", residualL:"", residualC:"" }]);
  const [sigWorker, setSigWorker] = useState("");
  const [sigSupervisor, setSigSupervisor] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [cloudMsg, setCloudMsg] = useState("");

  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const selectedHrcw = HRCW_TASKS.filter(t=>hrcwSelected[t.id] && t.id!=="hrcw_none");
  const needsLift = selectedHrcw.some(t=>t.triggerLift);
  const needsCS = selectedHrcw.some(t=>t.triggerConfinedSpace);
  const hrcwNone = hrcwSelected["hrcw_none"];
  const anyHrcwSelected = Object.values(hrcwSelected).some(v=>v);

  function calcResult() {
    const noBasics = ["s1_5","s1_6"].some(id=>step1[id]==="no");
    const hrcwTriggered = selectedHrcw.length > 0;
    const s1swms = STEP1_CHECKS.filter(c=>c.swmsTrigger).some(c=>step1[c.id]==="yes");
    const highHaz = HAZARDS.filter(h=>h.weight==="high").some(h=>hazards[h.id]);
    const medCount = HAZARDS.filter(h=>h.weight==="medium").filter(h=>hazards[h.id]).length;
    if (noBasics||hrcwTriggered||s1swms||highHaz) return "swms";
    if (medCount>=1) return "warning";
    return "safe";
  }

  function step1Done() { return STEP1_CHECKS.every(c=>step1[c.id]!==undefined); }

  // Determine which extra screens are needed
  function getNextAfterHrcw() {
    if (needsLift) return "lift";
    if (needsCS) return "confined";
    return "step3";
  }

  function getNextAfterLift() {
    if (needsCS) return "confined";
    return "step3";
  }

  async function saveToCloud() {
    setSaving(true); setCloudMsg("");
    const result = calcResult();
    const rec = {
      job_ref:form.jobRef, task:form.task, location:form.location,
      company_id:company.company_id, result,
      created_at:form.date+"T"+form.time,
      record_data:{ ...form, step1, hrcwSelected, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, csChecks, swmsHazards, sigWorker, sigSupervisor },
    };
    const { data, error } = await supabase.from("take5_records").insert(rec).select().single();
    if (error) setCloudMsg("Save failed: "+error.message);
    else { setSavedId(data.id); setCloudMsg("Saved ✓"); }
    setSaving(false);
  }

  function exportPDF() {
    const rec = { ...form, step1, hrcwSelected, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, csChecks, swmsHazards, sigWorker, sigSupervisor, result:calcResult() };
    const w = window.open("","_blank","width=900,height=700");
    if(w){ w.document.write(buildPDF(rec, company.company_name)); w.document.close(); setTimeout(()=>w.print(),600); }
  }

  function reset() {
    setScreen("setup"); setStep1({}); setHrcwSelected({}); setHazards({}); setLiftChecks({}); setCsChecks({});
    setLiftDetails({load:"",weight:"",crane:"",radius:""});
    setSwmsHazards([{id:1,hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}]);
    setSavedId(null); setCloudMsg(""); setSigWorker(""); setSigSupervisor("");
    setForm({jobRef:"",location:"",date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),task:"",machineEquipment:""});
  }

  const result = calcResult();
  const selectedHazards = HAZARDS.filter(h=>hazards[h.id]);

  const hdr = (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:12, borderBottom:"1px solid #E5E7EB" }}>
      <Logo size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:17, fontWeight:700 }}>Safety<span style={{color:"#2563EB"}}>IQ</span></div>
        <div style={{ fontSize:12, color:"#6B7280", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{company.company_name}</div>
      </div>
      <button style={{ ...S.btnSec, padding:"7px 10px", fontSize:12 }} onClick={()=>setScreen("records")}>Records</button>
    </div>
  );

  if (screen==="records") return <RecordsView companyId={company.company_id} companyName={company.company_name} onBack={()=>setScreen("setup")} onNew={reset} />;

  // ── SETUP
  if (screen==="setup") return (
    <div style={S.app}>
      {hdr}
      <Pips active={0} />
      <div style={S.stepLbl}>Setup — job details</div>
      <div style={S.card}>
        <div><label style={S.label}>Task / job description</label><input style={S.input} value={form.task} onChange={setF("task")} placeholder="e.g. Replace hydraulic hose on TBM thrust cylinder" /></div>
        <div style={{marginTop:10}}><label style={S.label}>Machine / equipment</label><input style={S.input} value={form.machineEquipment} onChange={setF("machineEquipment")} placeholder="e.g. TBM S-1000, Segment Feeder Crane" /></div>
        <div style={{marginTop:10}}><label style={S.label}>Location / area</label><input style={S.input} value={form.location} onChange={setF("location")} placeholder="e.g. Workshop Bay 3, Ring 450" /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Job / work order ref</label><input style={S.input} value={form.jobRef} onChange={setF("jobRef")} placeholder="e.g. WO-2025-001" /></div>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
        <div style={{marginTop:10}}><label style={S.label}>Time</label><input style={{...S.input,maxWidth:160}} type="time" value={form.time} onChange={setF("time")} /></div>
      </div>
      <button style={S.btnPrim} onClick={()=>setScreen("step1")}>Start Take 5 →</button>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button style={{...S.btnSec,flex:3,textAlign:"center"}} onClick={onExit}>← Exit</button>
        <button style={{...S.btnSec,flex:2,textAlign:"center",fontSize:12,color:"#EF4444",borderColor:"#FCA5A5"}} onClick={()=>{ if(confirm("Sign out and forget this device? You will need to enter the PIN again next time.")) onForgetDevice(); }}>🔓 Sign out</button>
      </div>
    </div>
  );

  // ── STEP 1
  if (screen==="step1") return (
    <div style={S.app}>
      {hdr}
      <Pips active={1} />
      <div style={S.stepLbl}>Step 1 — Stop, step back and think</div>
      <div style={S.secSub}>Answer all questions honestly before starting work. A YES to a trigger question requires a SWMS.</div>
      <div style={S.card}>
        {STEP1_CHECKS.map(c=>{
          const ans = step1[c.id];
          return (
            <div key={c.id} style={{padding:"12px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{fontSize:15,color:"#1F2937",lineHeight:1.5,marginBottom:8}}>
                {c.text}
                {c.swmsTrigger && <span style={{fontSize:10,color:"#DC2626",fontWeight:700,marginLeft:6,background:"#FEE2E2",padding:"2px 6px",borderRadius:4}}>SWMS TRIGGER</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                {["yes","no"].map(v=>(
                  <button key={v} onClick={()=>setStep1(p=>({...p,[c.id]:v}))}
                    style={{flex:1,padding:"13px",borderRadius:10,border:"2px solid",fontSize:16,fontWeight:700,cursor:"pointer",
                      background:ans===v?(v==="yes"?"#FEE2E2":"#D1FAE5"):"#F9FAFB",
                      color:ans===v?(v==="yes"?"#B91C1C":"#065F46"):"#6B7280",
                      borderColor:ans===v?(v==="yes"?"#FCA5A5":"#86EFAC"):"#E5E7EB"}}>
                    {v==="yes"?"YES":"NO"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button style={{...S.btnPrim,opacity:step1Done()?1:.4}} disabled={!step1Done()} onClick={()=>setScreen("step2")}>Select high risk tasks →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("setup")}>← Back</button>
    </div>
  );

  // ── STEP 2: HRCW SELECTOR
  if (screen==="step2") return (
    <div style={S.app}>
      {hdr}
      <Pips active={2} />
      <div style={S.stepLbl}>Step 2 — High risk construction work</div>
      <div style={S.secSub}>Select <strong>all</strong> high risk tasks that apply to this job. Each triggers the required permits and checks.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
        {HRCW_TASKS.map(t=>{
          const on = hrcwSelected[t.id];
          const isNone = t.id==="hrcw_none";
          return (
            <button key={t.id} onClick={()=>{
              if (isNone) setHrcwSelected({hrcw_none:!hrcwSelected.hrcw_none});
              else setHrcwSelected(p=>({...p,hrcw_none:false,[t.id]:!p[t.id]}));
            }}
              style={{ border:"2px solid", borderRadius:12, padding:"14px", textAlign:"left", cursor:"pointer",
                background:on?(isNone?"#F0FDF4":"#FEF2F2"):"#fff",
                borderColor:on?(isNone?"#86EFAC":"#EF4444"):"#E5E7EB",
                boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:24 }}>{t.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:on?(isNone?"#15803D":"#B91C1C"):"#1F2937" }}>{t.label}</div>
                  <div style={{ fontSize:12, color:on?(isNone?"#166534":"#EF4444"):"#9CA3AF", marginTop:2, lineHeight:1.4 }}>{t.sub}</div>
                </div>
                <div style={{ width:24, height:24, borderRadius:6, border:"2px solid", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  background:on?(isNone?"#22C55E":"#EF4444"):"#fff",
                  borderColor:on?(isNone?"#22C55E":"#EF4444"):"#D1D5DB" }}>
                  {on && <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>✓</span>}
                </div>
              </div>
              {on && !isNone && t.permits.length>0 && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #FEE2E2" }}>
                  {t.permits.map((p,i)=>(
                    <div key={i} style={{ fontSize:12, color:"#B91C1C", display:"flex", alignItems:"flex-start", gap:6, marginBottom:4 }}>
                      <span style={{ flexShrink:0, marginTop:1 }}>⚠</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selectedHrcw.length>0 && (
        <div style={{ padding:"12px 14px", borderRadius:10, background:"#FEF2F2", border:"1px solid #FCA5A5", marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#B91C1C", marginBottom:4 }}>SWMS required for this task</div>
          <div style={{ fontSize:12, color:"#991B1B" }}>{selectedHrcw.map(t=>t.label).join(" · ")}</div>
        </div>
      )}
      <button style={{...S.btnPrim,opacity:anyHrcwSelected?1:.4}} disabled={!anyHrcwSelected} onClick={()=>setScreen(hrcwNone?"step3":getNextAfterHrcw())}>
        {hrcwNone?"Continue to hazard identification →":needsLift?"Complete lift risk analysis →":needsCS?"Complete confined space checklist →":"Continue to hazard identification →"}
      </button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("step1")}>← Back</button>
    </div>
  );

  // ── LIFT ANALYSIS
  if (screen==="lift") return (
    <div style={S.app}>
      {hdr}
      <Pips active={3} />
      <div style={S.stepLbl}>Lift risk analysis</div>
      <div style={S.secSub}>Complete all items before any lifting operation. A "No" answer stops the lift.</div>
      <div style={S.card}>
        {LIFT_CHECKS.map((lc,i)=>{
          const ans = liftChecks[i];
          return (
            <div key={i} style={{padding:"12px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{fontSize:15,color:"#1F2937",lineHeight:1.5,marginBottom:8}}>{lc}</div>
              <div style={{display:"flex",gap:8}}>
                {["yes","no","na"].map(v=>(
                  <button key={v} onClick={()=>setLiftChecks(p=>({...p,[i]:v}))}
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
      <div style={{...S.card,background:"#F5F3FF",border:"2px solid #DDD6FE"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#7C3AED",marginBottom:10}}>🏗 Load details</div>
        <div><label style={S.label}>Load description</label><input style={S.input} value={liftDetails.load} onChange={e=>setLiftDetails(p=>({...p,load:e.target.value}))} placeholder="e.g. TBM thrust cylinder assembly" /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Weight (tonnes)</label><input style={S.input} type="number" value={liftDetails.weight} onChange={e=>setLiftDetails(p=>({...p,weight:e.target.value}))} placeholder="e.g. 2.5" /></div>
          <div><label style={S.label}>Lift radius (m)</label><input style={S.input} type="number" value={liftDetails.radius} onChange={e=>setLiftDetails(p=>({...p,radius:e.target.value}))} placeholder="e.g. 4" /></div>
        </div>
        <div style={{marginTop:10}}><label style={S.label}>Crane / lifting equipment</label><input style={S.input} value={liftDetails.crane} onChange={e=>setLiftDetails(p=>({...p,crane:e.target.value}))} placeholder="e.g. 20t overhead gantry, chain block" /></div>
      </div>
      {Object.values(liftChecks).some(v=>v==="no") && (
        <div style={{borderRadius:12,padding:"12px 14px",background:"#FEF2F2",border:"2px solid #FCA5A5",marginBottom:10,fontSize:14,color:"#B91C1C",fontWeight:700}}>✕ Lift must not proceed — resolve all "No" items first.</div>
      )}
      <button style={S.btnPrim} onClick={()=>setScreen(getNextAfterLift())}>Continue →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen("step2")}>← Back</button>
    </div>
  );

  // ── CONFINED SPACE CHECKLIST
  if (screen==="confined") return (
    <div style={S.app}>
      {hdr}
      <Pips active={3} />
      <div style={S.stepLbl}>Confined space pre-entry checklist</div>
      <div style={S.secSub}>All items must be confirmed before any person enters the confined space.</div>
      <div style={S.card}>
        {CONFINED_SPACE_CHECKS.map((cc,i)=>{
          const ans = csChecks[i];
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
      {Object.values(csChecks).some(v=>v==="no") && (
        <div style={{borderRadius:12,padding:"12px 14px",background:"#FEF2F2",border:"2px solid #FCA5A5",marginBottom:10,fontSize:14,color:"#B91C1C",fontWeight:700}}>✕ Entry must not proceed — resolve all "No" items first.</div>
      )}
      <button style={S.btnPrim} onClick={()=>setScreen("step3")}>Continue to hazard identification →</button>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen(needsLift?"lift":"step2")}>← Back</button>
    </div>
  );

  // ── STEP 3: HAZARD ID
  if (screen==="step3") return (
    <div style={S.app}>
      {hdr}
      <Pips active={4} />
      <div style={S.stepLbl}>Step 3 — Identify all hazards</div>
      <div style={S.secSub}>Select every hazard present for this task. Bold = high risk — always requires SWMS.</div>
      <div style={S.card}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {HAZARDS.map(h=>(
            <button key={h.id} onClick={()=>setHazards(p=>({...p,[h.id]:!p[h.id]}))}
              style={{border:"2px solid",borderRadius:10,padding:"12px 10px",textAlign:"left",cursor:"pointer",lineHeight:1.3,minHeight:64,
                background:hazards[h.id]?"#FEF2F2":"#F9FAFB",borderColor:hazards[h.id]?"#EF4444":"#E5E7EB"}}>
              <div style={{fontSize:14,fontWeight:h.weight==="high"?700:500,color:hazards[h.id]?"#B91C1C":"#374151"}}>{h.label}</div>
              <div style={{fontSize:11,color:hazards[h.id]?"#EF4444":"#9CA3AF",marginTop:3,lineHeight:1.3}}>{h.sub}</div>
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
        <div style={{fontSize:14,marginTop:4,lineHeight:1.5,color:result==="safe"?"#166534":result==="warning"?"#78350F":"#991B1B"}}>
          {result==="safe"?"No high-risk hazards identified. Apply standard controls and PPE.":result==="warning"?"Hazards identified. Review and apply controls before proceeding.":"High-risk activity or hazard identified. Complete SWMS before work commences."}
        </div>
      </div>
      {result==="swms"
        ? <button style={S.btnPrim} onClick={()=>setScreen("swms")}>Complete SWMS →</button>
        : <button style={S.btnPrim} onClick={()=>setScreen("complete")}>Sign off →</button>}
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={()=>setScreen(needsCS?"confined":needsLift?"lift":"step2")}>← Back</button>
    </div>
  );

  // ── SWMS
  if (screen==="swms") return (
    <div style={S.app}>
      {hdr}
      <Pips active={5} />
      <div style={S.stepLbl}>Step 4 — Safe Work Method Statement</div>
      <div style={S.secSub}>Document each hazard, risk ratings, control measures and responsible person.</div>
      <div style={S.card}>
        <div><label style={S.label}>Task</label><input style={S.input} value={form.task} onChange={setF("task")} /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} /></div>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
      </div>
      {/* Show permit reminders for selected HRCW */}
      {selectedHrcw.length>0 && (
        <div style={{...S.card,background:"#FFF7ED",border:"1px solid #FED7AA"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:8}}>⚠ Permit requirements for this task</div>
          {selectedHrcw.map(t=>t.permits.map((p,i)=>(
            <div key={t.id+i} style={{fontSize:13,color:"#92400E",padding:"4px 0",borderBottom:"1px solid #FED7AA",display:"flex",gap:8}}>
              <span style={{flexShrink:0}}>•</span><span><strong>{t.label}:</strong> {p}</span>
            </div>
          )))}
        </div>
      )}
      {swmsHazards.map((h,i)=>{
        const ir = h.initialL!==""&&h.initialC!==""?matrixRating(parseInt(h.initialL),parseInt(h.initialC)):null;
        const rr = h.residualL!==""&&h.residualC!==""?matrixRating(parseInt(h.residualL),parseInt(h.residualC)):null;
        return (
          <div key={h.id} style={{...S.card,position:"relative",border:"2px solid #E5E7EB"}}>
            <button onClick={()=>setSwmsHazards(p=>p.length>1?p.filter(r=>r.id!==h.id):p)} style={{position:"absolute",top:10,right:12,background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:22}}>×</button>
            <div style={{fontSize:13,fontWeight:700,color:"#2563EB",marginBottom:8}}>Hazard {i+1}</div>
            <div><label style={S.label}>Hazard description</label><input style={S.input} value={h.hazard} onChange={e=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,hazard:e.target.value}:r))} placeholder="Describe the specific hazard..." /></div>
            <div style={{fontSize:13,fontWeight:600,color:"#6B7280",margin:"12px 0 6px"}}>Initial risk (before controls)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.initialL} onChange={v=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,initialL:v}:r))} />
            <div style={{marginTop:10}}><RiskSelector label="Consequence" options={CONSEQUENCE} value={h.initialC} onChange={v=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,initialC:v}:r))} /></div>
            <LiveRisk l={h.initialL} c={h.initialC} />
            <div style={{marginTop:12}}>
              <label style={S.label}>Control measures (Eliminate → Substitute → Isolate → Engineer → Admin → PPE)</label>
              <textarea style={S.textarea} value={h.controls} onChange={e=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,controls:e.target.value}:r))} placeholder="List all control measures to be applied..." />
            </div>
            <div style={{marginTop:10}}><label style={S.label}>Person responsible for implementation</label><input style={S.input} value={h.responsible} onChange={e=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,responsible:e.target.value}:r))} placeholder="Name / role" /></div>
            <div style={{fontSize:13,fontWeight:600,color:"#6B7280",margin:"12px 0 6px"}}>Residual risk (after controls)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.residualL} onChange={v=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,residualL:v}:r))} />
            <div style={{marginTop:10}}><RiskSelector label="Consequence" options={CONSEQUENCE} value={h.residualC} onChange={v=>setSwmsHazards(p=>p.map(r=>r.id===h.id?{...r,residualC:v}:r))} /></div>
            <LiveRisk l={h.residualL} c={h.residualC} />
          </div>
        );
      })}
      <button onClick={()=>setSwmsHazards(p=>[...p,{id:Date.now(),hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}])}
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

  // ── COMPLETE
  if (screen==="complete") return (
    <div style={S.app}>
      {hdr}
      <Pips active={6} />
      <div style={{textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{width:60,height:60,background:"#D1FAE5",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:30}}>✓</div>
        <div style={{fontSize:20,fontWeight:700}}>Safety check complete</div>
        <div style={{fontSize:13,color:"#6B7280",marginTop:4}}>{form.date} {form.time} · {company.company_name}</div>
      </div>
      <div style={{borderRadius:12,padding:"14px",background:"#F0FDF4",border:"2px solid #86EFAC",marginBottom:10}}>
        <div style={{fontSize:16,fontWeight:700,color:"#15803D"}}>✓ Safe to proceed</div>
        <div style={{fontSize:14,color:"#166534",marginTop:4,lineHeight:1.5}}>
          {result==="swms"?"SWMS completed. All hazards documented with control measures.":"Take 5 complete. Standard controls apply."} If conditions change — stop and reassess.
        </div>
      </div>
      <div style={S.card}>
        <div style={{...S.divider,marginTop:0}}>Summary</div>
        {[
          ["Task",form.task],
          ["Machine / equipment",form.machineEquipment],
          ["Location",form.location],
          ["Job ref",form.jobRef],
          ["High risk tasks",selectedHrcw.map(t=>t.label).join(", ")||"None"],
          ["Hazards identified",selectedHazards.map(h=>h.label).join(", ")||"None"],
          ["SWMS required",result==="swms"?"Yes":"No"],
          result==="swms"&&["Hazards documented",swmsHazards.length],
          needsLift&&["Lift analysis","Completed"],
          needsCS&&["Confined space checklist","Completed"],
        ].filter(Boolean).map(([k,v])=>v?(
          <div key={k} style={{fontSize:14,padding:"5px 0",borderBottom:"1px solid #F3F4F6"}}><strong>{k}:</strong> {v}</div>
        ):null)}
      </div>
      <div style={S.card}>
        <div style={{...S.divider,marginTop:0}}>Save & export</div>
        {cloudMsg && <div style={{fontSize:14,marginBottom:10,padding:"8px 12px",borderRadius:8,background:cloudMsg.includes("✓")?"#D1FAE5":"#FEE2E2",color:cloudMsg.includes("✓")?"#065F46":"#B91C1C"}}>{cloudMsg}</div>}
        <button style={{...S.btnPrim,background:savedId?"#16A34A":"#2563EB",opacity:saving?.6:1}} onClick={saveToCloud} disabled={saving||!!savedId}>
          {saving?"Saving...":savedId?"✓ Saved to cloud":"☁ Save to cloud"}
        </button>
        <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:8}} onClick={exportPDF}>📄 Export PDF</button>
      </div>
      <button style={{...S.btnSec,width:"100%",textAlign:"center",marginTop:4}} onClick={()=>setScreen("records")}>View records</button>
      <button style={{...S.btnPrim,background:"#374151",marginTop:8}} onClick={reset}>Start new Take 5</button>
    </div>
  );

  return null;
}

// ── PDF ───────────────────────────────────────────────────────────────────────
function buildPDF(rec, companyName) {
  const logoSvg = `<svg width="52" height="52" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.5L36 3.5Q42 3.5 42 9.5L42 25Q42 39 22 43Q2 39 2 25L2 9.5Q2 3.5 8 3.5Z" fill="#2563EB"/><path d="M11 7L33 7Q38.5 7 38.5 12.5L38.5 24.5Q38.5 36 22 39.5Q5.5 36 5.5 24.5L5.5 12.5Q5.5 7 11 7Z" fill="#1D4ED8"/><path d="M13 22L19.5 29.5L31 15" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="34" width="20" height="8" rx="3" fill="#F59E0B"/><text x="22" y="40.5" text-anchor="middle" style="fill:#fff;font-size:6px;font-weight:700;font-family:Arial">IQ</text></svg>`;
  const hrcwList = HRCW_TASKS.filter(t=>rec.hrcwSelected?.[t.id]&&t.id!=="hrcw_none").map(t=>t.label).join(", ")||"None";
  return `<html><head><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:800px;margin:0 auto;padding:24px}
    h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #2563EB;padding-bottom:4px;color:#1e3a5f}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    td,th{border:1px solid #ccc;padding:6px 8px;font-size:12px;vertical-align:top}th{background:#f0f4ff;font-weight:600}
    .L{background:#D1FAE5;color:#065F46;padding:2px 6px;border-radius:4px;font-weight:700}
    .M{background:#FEF3C7;color:#78350F;padding:2px 6px;border-radius:4px;font-weight:700}
    .H{background:#FEE2E2;color:#B91C1C;padding:2px 6px;border-radius:4px;font-weight:700}
    .E{background:#7F1D1D;color:#fff;padding:2px 6px;border-radius:4px;font-weight:700}
    .sig{border:1px solid #ccc;height:48px;border-radius:4px;margin-top:6px;background:#fafafa}
    @media print{button{display:none}}
  </style></head><body>
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #2563EB">
    ${logoSvg}
    <div>
      <div style="font-size:22px;font-weight:800">Safety<span style="color:#2563EB">IQ</span> ${rec.result==="swms"?"— SWMS":""}</div>
      <div style="color:#6B7280;font-size:13px">${companyName||""} &nbsp;|&nbsp; ${rec.date} ${rec.time} &nbsp;|&nbsp; Ref: ${rec.jobRef||"—"}</div>
    </div>
  </div>
  <h2>Job details</h2>
  <table>
    <tr><th>Task</th><th>Machine / Equipment</th></tr>
    <tr><td>${rec.task||"—"}</td><td>${rec.machineEquipment||"—"}</td></tr>
    <tr><th>Location</th><th>Date / Time</th></tr>
    <tr><td>${rec.location||"—"}</td><td>${rec.date} ${rec.time}</td></tr>
  </table>
  <h2>Step 1 — Pre-task checklist</h2>
  <table><tr><th>Question</th><th>Answer</th></tr>
  ${STEP1_CHECKS.map(c=>`<tr><td>${c.text}</td><td style="font-weight:700;color:${rec.step1?.[c.id]==="yes"?"#B91C1C":"#065F46"}">${(rec.step1?.[c.id]||"—").toUpperCase()}</td></tr>`).join("")}</table>
  <h2>Step 2 — High risk construction work</h2>
  <p><strong>Selected:</strong> ${hrcwList}</p>
  ${HRCW_TASKS.filter(t=>rec.hrcwSelected?.[t.id]&&t.id!=="hrcw_none"&&t.permits.length>0).map(t=>`<p style="font-size:12px;color:#92400E"><strong>${t.label} permits required:</strong> ${t.permits.join(" | ")}</p>`).join("")}
  <h2>Step 3 — Hazards identified</h2>
  <p>${(rec.hazards||[]).map(id=>HAZARDS.find(h=>h.id===id)?.label||id).join(", ")||"None"}</p>
  <h2>Risk result</h2>
  <p><span class="${rec.result==="swms"?"H":rec.result==="warning"?"M":"L"}">${rec.result==="swms"?"SWMS Required":rec.result==="warning"?"Warning — additional controls":"Safe to proceed"}</span></p>
  ${rec.liftDetails?.load?`<h2>Lift analysis</h2><table><tr><th>Load</th><th>Weight</th><th>Equipment</th><th>Radius</th></tr><tr><td>${rec.liftDetails.load}</td><td>${rec.liftDetails.weight}t</td><td>${rec.liftDetails.crane}</td><td>${rec.liftDetails.radius}m</td></tr></table>`:""}
  ${rec.result==="swms"?`<h2>Step 4 — SWMS hazards & controls</h2>
  <table><tr><th>Hazard</th><th>Initial risk</th><th>Control measures</th><th>Responsible</th><th>Residual risk</th></tr>
  ${(rec.swmsHazards||[]).map(h=>{
    const ir=h.initialL!==""&&h.initialC!==""?matrixRating(parseInt(h.initialL),parseInt(h.initialC)):null;
    const rr=h.residualL!==""&&h.residualC!==""?matrixRating(parseInt(h.residualL),parseInt(h.residualC)):null;
    return`<tr><td>${h.hazard||"—"}</td><td>${ir?`<span class="${ir.label[0]}">${ir.label}</span>`:"—"}</td><td>${h.controls||"—"}</td><td>${h.responsible||"—"}</td><td>${rr?`<span class="${rr.label[0]}">${rr.label}</span>`:"—"}</td></tr>`;
  }).join("")}</table>`:""}
  <h2>Step 5 — Sign-off</h2>
  <table><tr><th width="50%">Worker: ${rec.sigWorker||"—"}</th><th width="50%">Supervisor: ${rec.sigSupervisor||"—"}</th></tr>
  <tr><td><div class="sig"></div></td><td><div class="sig"></div></td></tr></table>
  </body></html>`;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("loading");
  const [company, setCompany] = useState(null);
  const [adminSession, setAdminSession] = useState(null);

  useEffect(()=>{
    // Check for saved company PIN in localStorage (phone remembered)
    const saved = localStorage.getItem("safetyiq_company");
    if (saved) {
      try {
        const co = JSON.parse(saved);
        // Verify the company still exists in DB
        supabase.from("companies").select("id,name").eq("id", co.company_id).eq("is_active", true).single()
          .then(({ data }) => {
            if (data) { setCompany({ company_id:data.id, company_name:data.name }); setMode("app"); }
            else { localStorage.removeItem("safetyiq_company"); setMode("pin"); }
          });
      } catch(e) { localStorage.removeItem("safetyiq_company"); setMode("pin"); }
    } else {
      setMode("pin");
    }

    // Check for admin session
    supabase.auth.getSession().then(({data})=>{ if(data.session){ setAdminSession(data.session); setMode("admin"); } });
    const { data:{subscription} } = supabase.auth.onAuthStateChange((_e,s)=>{
      setAdminSession(s);
      if(s) setMode("admin");
      else { setAdminSession(null); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  function handlePinSuccess(co) {
    setCompany(co);
    // Save to localStorage so phone remembers
    localStorage.setItem("safetyiq_company", JSON.stringify(co));
    setMode("app");
  }

  function handleExit() {
    // Don't clear localStorage — phone stays signed in
    setMode("pin");
  }

  function handleForgetDevice() {
    localStorage.removeItem("safetyiq_company");
    setCompany(null);
    setMode("pin");
  }

  if (mode==="loading") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F9FAFB" }}>
      <div style={{ textAlign:"center" }}>
        <Logo size={64} />
        <div style={{ fontSize:14, color:"#9CA3AF", marginTop:12 }}>Loading...</div>
      </div>
    </div>
  );

  if (mode==="pin") return <PinLogin onSuccess={handlePinSuccess} onAdminClick={()=>setMode("adminLogin")} />;
  if (mode==="adminLogin") return <AdminLogin onSuccess={s=>{ setAdminSession(s); setMode("admin"); }} onBack={()=>setMode("pin")} />;
  if (mode==="admin") return <AdminDashboard onBack={()=>{ const saved=localStorage.getItem("safetyiq_company"); if(saved){try{setCompany(JSON.parse(saved));setMode("app");}catch(e){setMode("pin");}}else{setMode("pin");} }} onSettings={()=>setMode("settings")} onLogout={async()=>{ await supabase.auth.signOut(); setMode("pin"); }} />;
  if (mode==="settings") return <SettingsPage onBack={()=>setMode("admin")} />;
  if (mode==="app"&&company) return <Take5App company={company} onExit={handleExit} onForgetDevice={handleForgetDevice} />;
  return null;
}
