import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wwaogpobcnqqxzicjzon.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YW9ncG9iY25xcXh6aWNqem9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTQ5ODQsImV4cCI6MjA5NjYzMDk4NH0.eF57eCwnaHUvvAgI9yfO9auAyKTC-C17qZeh_t7GPaQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STEP1_CHECKS = [
  { id:"s1_1", text:"Do I understand what I need to do?", swmsTrigger:false },
  { id:"s1_2", text:"Do I need a SWMS for any High Risk Construction Work?", swmsTrigger:true },
  { id:"s1_3", text:"Do I need any permits? (e.g. hot work / confined space / dig)", swmsTrigger:true },
  { id:"s1_4", text:"Do I have the correct PPE in good condition for the task?", swmsTrigger:false },
  { id:"s1_5", text:"Do I have the suitable tools and equipment for the task?", swmsTrigger:false },
  { id:"s1_6", text:"Do I have my vehicle parked appropriately?", swmsTrigger:false },
  { id:"s1_7", text:"Am I trained, competent, licensed and fit to perform this task?", swmsTrigger:true },
];

const HAZARDS = [
  { id:"h_mh",   label:"Manual Handling", sub:"Lifting, awkward positions, over-exertion", weight:"medium" },
  { id:"h_gr",   label:"Gravity",         sub:"Falls, slips, trips, falling objects",       weight:"high" },
  { id:"h_mech", label:"Mechanical",      sub:"Moving parts, struck by plant or flying objects", weight:"high" },
  { id:"h_elec", label:"Electrical",      sub:"Electrocution from faulty tools or live power", weight:"high" },
  { id:"h_chem", label:"Chemical",        sub:"Inhaling, swallowing or touching acid, solvents", weight:"high" },
  { id:"h_pres", label:"Pressure",        sub:"Highly pressurised fluid, gas or air", weight:"high" },
  { id:"h_exp",  label:"Exposure",        sub:"Noise, dust, fumes, chemicals, asbestos, weather", weight:"medium" },
  { id:"h_bio",  label:"Biological",      sub:"Contracting diseases, Hepatitis, Legionella", weight:"medium" },
  { id:"h_rad",  label:"Radiation",       sub:"X-rays, sunlight, ultra-violet", weight:"medium" },
  { id:"h_psych",label:"Psychological",   sub:"Stress, violence, fatigue, depression", weight:"medium" },
  { id:"h_conf", label:"Confined Space",  sub:"Restricted area, poor ventilation, toxic atmosphere", weight:"high" },
  { id:"h_lift", label:"Lifting Operations", sub:"Crane, forklift, EWP, rigging, slinging", weight:"high" },
  { id:"h_other",label:"Other Hazards",   sub:"e.g. Silica, asphyxiation, traffic", weight:"medium" },
];

const LIKELIHOOD = [
  { value:0, label:"Rare",           short:"Rare (1)",           desc:"May occur only in exceptional circumstances", color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Unlikely",       short:"Unlikely (2)",       desc:"Could occur at some time but not expected",   color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Possible",       short:"Possible (3)",       desc:"Might occur at some time during the task",    color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Likely",         short:"Likely (4)",         desc:"Will probably occur in most circumstances",   color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Almost Certain", short:"Almost Certain (5)", desc:"Is expected to occur during the task",        color:"#B91C1C", bg:"#FEE2E2" },
];

const CONSEQUENCE = [
  { value:0, label:"Insignificant", short:"Insignificant (1)", desc:"No injury, minor first aid only",                        color:"#065F46", bg:"#D1FAE5" },
  { value:1, label:"Minor",         short:"Minor (2)",         desc:"Minor injury, limited medical treatment",                color:"#166534", bg:"#BBF7D0" },
  { value:2, label:"Moderate",      short:"Moderate (3)",      desc:"Medical treatment required, restricted duties",          color:"#78350F", bg:"#FEF3C7" },
  { value:3, label:"Major",         short:"Major (4)",         desc:"Significant injury, long term illness or disability",    color:"#92400E", bg:"#FDE68A" },
  { value:4, label:"Catastrophic",  short:"Catastrophic (5)",  desc:"Death or permanent total disability",                    color:"#7F1D1D", bg:"#7F1D1D" },
];

const RISK_LEVEL = [
  { label:"Low",     color:"#065F46", bg:"#D1FAE5", border:"#86EFAC", desc:"Manage by routine procedures" },
  { label:"Medium",  color:"#78350F", bg:"#FEF3C7", border:"#FCD34D", desc:"Manage by monitoring and specific procedures" },
  { label:"High",    color:"#B91C1C", bg:"#FEE2E2", border:"#FCA5A5", desc:"Senior management attention required" },
  { label:"Extreme", color:"#FEE2E2", bg:"#7F1D1D", border:"#991B1B", desc:"Immediate action required — stop work" },
];

function matrixRating(l, c) {
  const s = (l+1)*(c+1);
  if (s<=4) return RISK_LEVEL[0];
  if (s<=9) return RISK_LEVEL[1];
  if (s<=16) return RISK_LEVEL[2];
  return RISK_LEVEL[3];
}

const LIFT_CHECKS = [
  "Has a Lift Plan / Engineering Lift Study been completed?",
  "Is the crane / EWP / forklift pre-start inspection current?",
  "Is the operator licensed and competent for this equipment?",
  "Has the load weight been confirmed and within SWL?",
  "Are rigger/dogman tickets current and relevant?",
  "Has the exclusion zone been established and signed?",
  "Are underground services and overhead obstructions checked?",
  "Are environmental conditions (wind, visibility) acceptable?",
  "Is tag line control in place for load management?",
  "Has the lift been communicated via TBT/toolbox talk?",
];

// ── Mobile-first styles ───────────────────────────────────────────────────────
const S = {
  app:      { maxWidth:680, margin:"0 auto", padding:"12px 12px 40px", fontFamily:"system-ui,-apple-system,sans-serif", fontSize:15 },
  card:     { background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"14px 14px", marginBottom:10, boxShadow:"0 1px 4px rgba(0,0,0,.07)" },
  label:    { fontSize:12, color:"#6B7280", display:"block", marginBottom:3, fontWeight:500 },
  input:    { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"10px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none" },
  textarea: { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"10px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", resize:"vertical", minHeight:80 },
  select:   { width:"100%", border:"1px solid #D1D5DB", borderRadius:8, padding:"10px 12px", fontSize:15, color:"#111", fontFamily:"inherit", background:"#F9FAFB", WebkitAppearance:"none", appearance:"none" },
  btnPrim:  { background:"#2563EB", color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", fontSize:15, fontWeight:600, cursor:"pointer", width:"100%", marginTop:6 },
  btnSec:   { background:"#F3F4F6", color:"#374151", border:"1px solid #E5E7EB", borderRadius:10, padding:"11px 16px", fontSize:14, fontWeight:500, cursor:"pointer" },
  btnDanger:{ background:"#FEE2E2", color:"#B91C1C", border:"1px solid #FCA5A5", borderRadius:10, padding:"11px 16px", fontSize:14, fontWeight:500, cursor:"pointer" },
  btnPurple:{ background:"#7C3AED", color:"#fff", border:"none", borderRadius:10, padding:"13px 20px", fontSize:15, fontWeight:600, cursor:"pointer" },
  row:      { display:"flex", gap:8, marginTop:8 },
  grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 },
  stepLbl:  { fontSize:12, fontWeight:700, color:"#2563EB", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 },
  secTitle: { fontSize:18, fontWeight:600, marginBottom:4 },
  secSub:   { fontSize:14, color:"#6B7280", marginBottom:14, lineHeight:1.5 },
  divider:  { fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:".06em", padding:"8px 0 4px", borderBottom:"1px solid #E5E7EB", marginBottom:10, marginTop:16 },
  actionBar:{ display:"flex", gap:8, marginTop:16 },
  hdr:      { display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:12, borderBottom:"1px solid #E5E7EB" },
};

function Pips({ active, total=5 }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:14 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<active?"#22C55E":i===active?"#2563EB":"#E5E7EB", transition:"background .2s" }} />
      ))}
    </div>
  );
}

function RiskBadge({ rating, size="normal" }) {
  if (!rating) return null;
  const r = typeof rating === "string" ? RISK_LEVEL.find(x=>x.label===rating)||RISK_LEVEL[0] : rating;
  const pad = size==="large" ? "6px 14px" : "3px 10px";
  const fs = size==="large" ? 15 : 12;
  return (
    <span style={{ background:r.bg, color:r.color, border:`1px solid ${r.border||r.bg}`, padding:pad, borderRadius:6, fontSize:fs, fontWeight:700, display:"inline-block" }}>
      {r.label}
    </span>
  );
}

function RiskSelector({ label, options, value, onChange }) {
  const selected = value !== "" ? options[parseInt(value)] : null;
  return (
    <div>
      <label style={S.label}>{label}</label>
      <div style={{ position:"relative" }}>
        <select style={{ ...S.select, borderColor: selected ? selected.bg : "#D1D5DB" }}
          value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option>
          {options.map((o,i) => <option key={i} value={i}>{o.short}</option>)}
        </select>
        <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#6B7280" }}>▼</div>
      </div>
      {selected && (
        <div style={{ marginTop:5, padding:"8px 10px", borderRadius:8, background:selected.bg, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:selected.color, fontSize:13, fontWeight:500 }}>{selected.desc}</span>
        </div>
      )}
    </div>
  );
}

function LiveRiskResult({ l, c }) {
  if (l===""||c==="") return null;
  const r = matrixRating(parseInt(l), parseInt(c));
  return (
    <div style={{ marginTop:10, padding:"10px 12px", borderRadius:10, background:r.bg, border:`1px solid ${r.border||r.bg}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontSize:12, color:r.color, fontWeight:600, marginBottom:2 }}>RISK RATING</div>
        <div style={{ fontSize:13, color:r.color }}>{r.desc}</div>
      </div>
      <span style={{ fontSize:20, fontWeight:800, color:r.color }}>{r.label}</span>
    </div>
  );
}

function Header({ company, subtitle, onRecords, onAdmin, onSettings, isAdmin }) {
  return (
    <div style={S.hdr}>
      <div style={{ width:40, height:40, background:"#2563EB", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:22 }}>🛡</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:17, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Take 5 Safety</div>
        <div style={{ fontSize:12, color:"#6B7280", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{company||""}{subtitle?` — ${subtitle}`:""}</div>
      </div>
      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        {isAdmin && <button style={{ ...S.btnSec, padding:"6px 10px", fontSize:12 }} onClick={onSettings}>⚙ Settings</button>}
        {isAdmin && <button style={{ ...S.btnSec, padding:"6px 10px", fontSize:12 }} onClick={onAdmin}>Admin</button>}
        <button style={{ ...S.btnSec, padding:"6px 10px", fontSize:12 }} onClick={onRecords}>Records</button>
      </div>
    </div>
  );
}

// ── QR Code using Google Charts API ──────────────────────────────────────────
function QRCode({ url, size=200 }) {
  const src = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`;
  return <img src={src} width={size} height={size} alt="QR Code" style={{ borderRadius:8, border:"1px solid #E5E7EB" }} />;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email:"", password:"", fullName:"", companyCode:"" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text:"", ok:false });
  const set = k => e => setForm(f => ({...f, [k]:e.target.value}));

  async function handleSubmit() {
    setLoading(true); setMsg({ text:"", ok:false });
    try {
      if (mode==="login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
        if (error) throw error;
        onAuth(data.session);
      } else {
        const { data:co, error:coErr } = await supabase.from("companies").select("id,name").eq("code", form.companyCode.trim()).single();
        if (coErr||!co) throw new Error("Invalid company code — check with your supervisor.");
        const { data, error } = await supabase.auth.signUp({ email:form.email, password:form.password, options:{ data:{ full_name:form.fullName } } });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({ id:data.user.id, full_name:form.fullName, company_id:co.id }, { onConflict:"id" });
        }
        setMode("login");
        setMsg({ text:`Account created for ${co.name}. Please log in.`, ok:true });
      }
    } catch(e) { setMsg({ text:e.message, ok:false }); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ ...S.app, maxWidth:420, paddingTop:40 }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:64, height:64, background:"#2563EB", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:32 }}>🛡</div>
        <div style={{ fontSize:26, fontWeight:700 }}>Take 5 Safety</div>
        <div style={{ fontSize:14, color:"#6B7280", marginTop:4 }}>Stop · Think · Act Safely</div>
      </div>
      <div style={S.card}>
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"#F3F4F6", borderRadius:10, padding:3 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={()=>{ setMode(m); setMsg({text:"",ok:false}); }}
              style={{ flex:1, padding:"10px", border:"none", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer", background:mode===m?"#fff":"transparent", color:mode===m?"#2563EB":"#6B7280", boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.1)":"none" }}>
              {m==="login"?"Log in":"Register"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="register" && <div><label style={S.label}>Full name</label><input style={S.input} value={form.fullName} onChange={set("fullName")} placeholder="Your full name" /></div>}
          <div><label style={S.label}>Email address</label><input style={S.input} type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoCapitalize="none" /></div>
          <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={set("password")} placeholder={mode==="register"?"Min. 8 characters":"Password"} /></div>
          {mode==="register" && (
            <div>
              <label style={S.label}>Company code</label>
              <input style={S.input} value={form.companyCode} onChange={set("companyCode")} placeholder="Enter code from your supervisor" autoCapitalize="characters" />
              <div style={{ fontSize:12, color:"#9CA3AF", marginTop:4 }}>Ask your supervisor or site manager for this code</div>
            </div>
          )}
        </div>
        {msg.text && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:msg.ok?"#D1FAE5":"#FEE2E2", color:msg.ok?"#065F46":"#B91C1C", fontSize:14 }}>{msg.text}</div>}
        <button style={{ ...S.btnPrim, opacity:loading?.5:1 }} onClick={handleSubmit} disabled={loading}>
          {loading?"Please wait...":mode==="login"?"Log in":"Create account"}
        </button>
      </div>
    </div>
  );
}

// ── ADMIN SETTINGS (QR codes + company management) ───────────────────────────
function SettingsPage({ profile, onBack }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCo, setNewCo] = useState({ name:"", code:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedCo, setSelectedCo] = useState(null);
  const appUrl = "https://safety-iq.vercel.app";

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies(data||[]);
    setLoading(false);
  }

  async function addCompany() {
    if (!newCo.name||!newCo.code) return;
    setSaving(true);
    const { error } = await supabase.from("companies").insert({ name:newCo.name.trim(), code:newCo.code.trim().toUpperCase() });
    if (error) setMsg("Error: "+error.message);
    else { setMsg("Company added."); setNewCo({name:"",code:""}); loadCompanies(); }
    setSaving(false);
  }

  function printQR(co) {
    const regUrl = `${appUrl}?code=${co.code}`;
    const w = window.open("","_blank","width=800,height=700");
    w.document.write(`<html><head><style>
      body{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#fff}
      h1{font-size:28px;color:#1e3a5f;margin-bottom:4px}
      h2{font-size:20px;color:#2563EB;margin-bottom:24px}
      .qr{margin:20px auto;display:block}
      .code{font-size:22px;font-weight:bold;background:#F3F4F6;padding:12px 24px;border-radius:10px;display:inline-block;margin:16px 0;letter-spacing:2px}
      .steps{text-align:left;max-width:400px;margin:24px auto;background:#F9FAFB;border-radius:12px;padding:20px}
      .steps li{margin-bottom:10px;font-size:15px;line-height:1.5}
      .url{font-size:14px;color:#6B7280;margin-top:8px}
      @media print{button{display:none}}
    </style></head><body>
      <h1>🛡 Take 5 Safety</h1>
      <h2>${co.name}</h2>
      <img src="https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(regUrl)}&choe=UTF-8" class="qr" width="250" height="250">
      <div class="url">${appUrl}</div>
      <div class="code">Company code: ${co.code}</div>
      <div class="steps">
        <strong>How to register:</strong>
        <ol>
          <li>Scan the QR code with your phone camera</li>
          <li>Tap the link to open the app</li>
          <li>Tap <strong>Register</strong></li>
          <li>Enter your name, email, password</li>
          <li>Enter company code: <strong>${co.code}</strong></li>
          <li>Tap <strong>Create account</strong> then log in</li>
        </ol>
      </div>
      <button onclick="window.print()" style="margin-top:16px;padding:12px 28px;background:#2563EB;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer">🖨 Print this page</button>
    </body></html>`);
    w.document.close();
  }

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:700 }}>⚙ Settings</div>
          <div style={{ fontSize:12, color:"#6B7280" }}>Admin — company management & QR codes</div>
        </div>
        <button style={S.btnSec} onClick={onBack}>← Back</button>
      </div>

      <div style={S.divider}>Companies & QR codes</div>
      <div style={{ fontSize:14, color:"#6B7280", marginBottom:10 }}>Tap a company to generate its QR code poster for printing.</div>

      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}

      {companies.filter(c=>c.code!=="ADMIN_MASTER_CODE").map(co => {
        const regUrl = `${appUrl}?code=${co.code}`;
        const isOpen = selectedCo===co.id;
        return (
          <div key={co.id} style={{ ...S.card, marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }} onClick={()=>setSelectedCo(isOpen?null:co.id)}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:600 }}>{co.name}</div>
                <div style={{ fontSize:13, color:"#6B7280" }}>Code: <strong style={{ color:"#2563EB" }}>{co.code}</strong></div>
              </div>
              <span style={{ fontSize:20 }}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #E5E7EB", textAlign:"center" }}>
                <QRCode url={regUrl} size={180} />
                <div style={{ fontSize:12, color:"#6B7280", marginTop:8 }}>Scan to register with {co.name}</div>
                <div style={{ fontSize:13, marginTop:4, wordBreak:"break-all", color:"#374151" }}>{regUrl}</div>
                <button style={{ ...S.btnPrim, marginTop:12 }} onClick={()=>printQR(co)}>
                  🖨 Print QR poster
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={S.divider}>Add new company</div>
      <div style={S.card}>
        <div style={S.grid2}>
          <div><label style={S.label}>Company name</label><input style={S.input} value={newCo.name} onChange={e=>setNewCo(c=>({...c,name:e.target.value}))} placeholder="e.g. AFJV" /></div>
          <div><label style={S.label}>Company code</label><input style={S.input} value={newCo.code} onChange={e=>setNewCo(c=>({...c,code:e.target.value.toUpperCase()}))} placeholder="e.g. AFJV-2025" /></div>
        </div>
        {msg && <div style={{ marginTop:8, fontSize:13, color:msg.startsWith("Error")?"#B91C1C":"#065F46" }}>{msg}</div>}
        <button style={{ ...S.btnPrim, marginTop:10 }} onClick={addCompany} disabled={saving}>{saving?"Saving...":"Add company"}</button>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ profile, onBack }) {
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [r, c] = await Promise.all([
      supabase.from("take5_summary").select("*").order("created_at",{ascending:false}).limit(100),
      supabase.from("companies").select("*").order("name"),
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

  const filtered = filter==="all" ? records : records.filter(r=>r.result===filter);

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={{ flex:1 }}><div style={{ fontSize:18, fontWeight:700 }}>Admin Dashboard</div><div style={{ fontSize:12, color:"#6B7280" }}>All companies · All records</div></div>
        <button style={S.btnSec} onClick={onBack}>← Back</button>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:14, background:"#F3F4F6", borderRadius:10, padding:3 }}>
        {["overview","records"].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1, padding:"10px", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", background:tab===t?"#fff":"transparent", color:tab===t?"#2563EB":"#6B7280", textTransform:"capitalize", boxShadow:tab===t?"0 1px 3px rgba(0,0,0,.1)":"none" }}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}

      {!loading && tab==="overview" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {[
              { label:"Total records", value:records.length, color:"#2563EB" },
              { label:"SWMS required", value:records.filter(r=>r.result==="swms").length, color:"#DC2626" },
              { label:"Lift analyses", value:records.filter(r=>r.has_lift_analysis).length, color:"#7C3AED" },
              { label:"Companies", value:companies.length, color:"#16A34A" },
            ].map(s => (
              <div key={s.label} style={{ ...S.card, textAlign:"center", marginBottom:0, padding:"14px 10px" }}>
                <div style={{ fontSize:28, fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {records.slice(0,10).map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #F3F4F6" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.task||r.job_ref||"Untitled"}</div>
                <div style={{ fontSize:12, color:"#6B7280" }}>{r.company_name} · {r.created_at?.slice(0,10)}</div>
              </div>
              <span style={{ fontSize:12, padding:"3px 8px", borderRadius:5, fontWeight:600, flexShrink:0,
                background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5",
                color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>
                {r.result?.toUpperCase()}
              </span>
            </div>
          ))}
        </>
      )}

      {!loading && tab==="records" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {["all","safe","warning","swms"].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:"7px 14px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151", textTransform:"capitalize" }}>
                {f==="all"?"All":f.toUpperCase()} {f==="all"?`(${records.length})`:f==="swms"?`(${records.filter(r=>r.result==="swms").length})`:f==="warning"?`(${records.filter(r=>r.result==="warning").length})`:`(${records.filter(r=>r.result==="safe").length})`}
              </button>
            ))}
          </div>
          {filtered.map(r => (
            <div key={r.id} style={{ ...S.card, marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{r.task||r.job_ref||"Untitled"}</div>
                  <div style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{r.company_name} · {r.worker_name||"Unknown"} · {r.location||"No location"}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:11, padding:"3px 8px", borderRadius:5, fontWeight:700,
                    background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5",
                    color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>
                    {r.result?.toUpperCase()}
                  </span>
                  <button style={{ ...S.btnDanger, padding:"4px 10px", fontSize:12 }} onClick={()=>deleteRecord(r.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── RECORDS VIEW ──────────────────────────────────────────────────────────────
function RecordsView({ profile, onBack, onNew }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadRecords(); }, [filter]);

  async function loadRecords() {
    setLoading(true);
    let q = supabase.from("take5_summary").select("*").order("created_at",{ascending:false}).limit(50);
    if (filter!=="all") q = q.eq("result",filter);
    const { data } = await q;
    setRecords(data||[]);
    setLoading(false);
  }

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={{ flex:1 }}><div style={{ fontSize:18, fontWeight:700 }}>Records</div><div style={{ fontSize:12, color:"#6B7280" }}>{profile?.company_name||"My company"}</div></div>
        <button style={{ ...S.btnPrim, width:"auto", marginTop:0, padding:"8px 14px", fontSize:13 }} onClick={onNew}>+ New</button>
        <button style={{ ...S.btnSec, padding:"8px 12px" }} onClick={onBack}>← Back</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {["all","safe","warning","swms"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"8px 14px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", background:filter===f?"#2563EB":"#F9FAFB", color:filter===f?"#fff":"#374151", textTransform:"capitalize" }}>
            {f==="all"?"All":f.toUpperCase()}
          </button>
        ))}
      </div>
      {loading && <div style={{ textAlign:"center", padding:24, color:"#6B7280" }}>Loading...</div>}
      {!loading && records.length===0 && <div style={{ textAlign:"center", padding:40, color:"#6B7280", fontSize:14 }}>No records yet.<br/>Complete a Take 5 to get started.</div>}
      {!loading && records.map(r => (
        <div key={r.id} style={{ ...S.card, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>{r.task||r.job_ref||"Untitled task"}</div>
              <div style={{ fontSize:13, color:"#6B7280", marginTop:3 }}>{r.worker_name||"Unknown"} · {r.location||"No location"}</div>
              <div style={{ fontSize:12, color:"#9CA3AF" }}>{r.created_at?.slice(0,10)} {r.created_at?.slice(11,16)}</div>
              {r.hazards_identified && <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>Hazards: {r.hazards_identified}</div>}
            </div>
            <span style={{ fontSize:12, padding:"4px 10px", borderRadius:6, fontWeight:700, flexShrink:0,
              background:r.result==="swms"?"#FEE2E2":r.result==="warning"?"#FEF3C7":"#D1FAE5",
              color:r.result==="swms"?"#B91C1C":r.result==="warning"?"#78350F":"#065F46" }}>
              {r.result?.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN TAKE 5 APP ───────────────────────────────────────────────────────────
function Take5App({ session, profile, onLogout }) {
  const isAdmin = profile?.role==="admin";
  const [screen, setScreen] = useState("setup");
  const [form, setForm] = useState({ jobRef:"", location:"", date:new Date().toISOString().slice(0,10), time:new Date().toTimeString().slice(0,5), task:"" });
  const [step1, setStep1] = useState({});
  const [hazards, setHazards] = useState({});
  const [liftChecks, setLiftChecks] = useState({});
  const [liftDetails, setLiftDetails] = useState({ load:"", weight:"", crane:"", radius:"" });
  const [swmsHazards, setSwmsHazards] = useState([{ id:1, hazard:"", initialL:"", initialC:"", controls:"", responsible:"", residualL:"", residualC:"" }]);
  const [sigWorker, setSigWorker] = useState(profile?.full_name||"");
  const [sigSupervisor, setSigSupervisor] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [cloudMsg, setCloudMsg] = useState("");

  const setF = k => e => setForm(f => ({...f, [k]:e.target.value}));

  function calcResult() {
    const swmsTrigger1 = STEP1_CHECKS.filter(c=>c.swmsTrigger).some(c=>step1[c.id]==="yes");
    const noBasics = ["s1_4","s1_5","s1_7"].some(id=>step1[id]==="no");
    const highHaz = HAZARDS.filter(h=>h.weight==="high").some(h=>hazards[h.id]);
    const medCount = HAZARDS.filter(h=>h.weight==="medium").filter(h=>hazards[h.id]).length;
    if (swmsTrigger1||highHaz||noBasics) return "swms";
    if (medCount>=2) return "warning";
    if (medCount===1) return "warning";
    return "safe";
  }

  function needsLift() { return hazards["h_lift"]||hazards["h_gr"]||hazards["h_mech"]; }
  function step1Done() { return STEP1_CHECKS.every(c=>step1[c.id]!==undefined); }

  async function saveToCloud() {
    setSaving(true); setCloudMsg("");
    const rec = {
      job_ref:form.jobRef, task:form.task, location:form.location,
      company_id:profile?.company_id,
      result:calcResult(),
      created_by:sigWorker, supervisor:sigSupervisor,
      created_at:form.date+"T"+form.time,
      record_data:{ jobRef:form.jobRef, task:form.task, location:form.location, date:form.date, time:form.time, step1, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, swmsHazards, sigWorker, sigSupervisor },
    };
    const { data, error } = await supabase.from("take5_records").insert(rec).select().single();
    if (error) setCloudMsg("Save failed: "+error.message);
    else { setSavedId(data.id); setCloudMsg("Saved to cloud ✓"); }
    setSaving(false);
  }

  function exportPDF() {
    const rec = { jobRef:form.jobRef, task:form.task, location:form.location, date:form.date, time:form.time, step1, hazards:Object.keys(hazards).filter(k=>hazards[k]), liftChecks, liftDetails, swmsHazards, sigWorker, sigSupervisor, result:calcResult() };
    const html = buildPDFHtml(rec, profile);
    const w = window.open("","_blank","width=900,height=700");
    if(w){ w.document.write(html); w.document.close(); setTimeout(()=>w.print(),600); }
  }

  function resetAll() {
    setScreen("setup"); setStep1({}); setHazards({}); setLiftChecks({});
    setLiftDetails({load:"",weight:"",crane:"",radius:""});
    setSwmsHazards([{id:1,hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}]);
    setSavedId(null); setCloudMsg(""); setSigWorker(profile?.full_name||""); setSigSupervisor("");
    setForm({jobRef:"",location:"",date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),task:""});
  }

  function addSwmsRow() { setSwmsHazards(p=>[...p,{id:Date.now(),hazard:"",initialL:"",initialC:"",controls:"",responsible:"",residualL:"",residualC:""}]); }
  function removeSwmsRow(id) { setSwmsHazards(p=>p.length>1?p.filter(r=>r.id!==id):p); }
  function updateSwms(id,k,v) { setSwmsHazards(p=>p.map(r=>r.id===id?{...r,[k]:v}:r)); }

  const result = calcResult();
  const selectedHazards = HAZARDS.filter(h=>hazards[h.id]);

  if (screen==="records") return <RecordsView profile={profile} onBack={()=>setScreen("setup")} onNew={resetAll} />;
  if (screen==="admin"&&isAdmin) return <AdminDashboard profile={profile} onBack={()=>setScreen("setup")} />;
  if (screen==="settings"&&isAdmin) return <SettingsPage profile={profile} onBack={()=>setScreen("setup")} />;

  const hdr = <Header company={profile?.company_name} onRecords={()=>setScreen("records")} onAdmin={()=>setScreen("admin")} onSettings={()=>setScreen("settings")} isAdmin={isAdmin} />;

  // SETUP
  if (screen==="setup") return (
    <div style={S.app}>
      {hdr}
      <Pips active={0} />
      <div style={S.stepLbl}>Setup — job details</div>
      <div style={S.card}>
        <div><label style={S.label}>Task description</label><input style={S.input} value={form.task} onChange={setF("task")} placeholder="Brief description of the task" /></div>
        <div style={{ marginTop:10 }}><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} placeholder="e.g. Ring 450, TBM Level" /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Job reference</label><input style={S.input} value={form.jobRef} onChange={setF("jobRef")} placeholder="e.g. SMW-001" /></div>
          <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
        <div style={{ marginTop:10 }}><label style={S.label}>Time</label><input style={{ ...S.input, maxWidth:140 }} type="time" value={form.time} onChange={setF("time")} /></div>
      </div>
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={S.btnPrim} onClick={()=>setScreen("step1")}>Start Take 5 →</button>
        <button style={{ ...S.btnSec, textAlign:"center" }} onClick={onLogout}>Log out</button>
      </div>
    </div>
  );

  // STEP 1
  if (screen==="step1") return (
    <div style={S.app}>
      {hdr}
      <Pips active={1} />
      <div style={S.stepLbl}>Step 1 — Stop, step back and think</div>
      <div style={S.secSub}>Answer each question honestly before starting work.</div>
      <div style={S.card}>
        {STEP1_CHECKS.map(c => {
          const ans = step1[c.id];
          return (
            <div key={c.id} style={{ padding:"12px 0", borderBottom:"1px solid #F3F4F6" }}>
              <div style={{ fontSize:15, color:"#1F2937", lineHeight:1.5, marginBottom:8 }}>
                {c.text}
                {c.swmsTrigger && <span style={{ fontSize:10, color:"#DC2626", fontWeight:700, marginLeft:6, background:"#FEE2E2", padding:"2px 6px", borderRadius:4 }}>SWMS TRIGGER</span>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {["yes","no"].map(v => (
                  <button key={v} onClick={()=>setStep1(p=>({...p,[c.id]:v}))}
                    style={{ flex:1, padding:"12px", borderRadius:10, border:"2px solid", fontSize:15, fontWeight:700, cursor:"pointer",
                      background:ans===v?(v==="yes"?"#FEE2E2":"#D1FAE5"):"#F9FAFB",
                      color:ans===v?(v==="yes"?"#B91C1C":"#065F46"):"#6B7280",
                      borderColor:ans===v?(v==="yes"?"#FCA5A5":"#86EFAC"):"#E5E7EB" }}>
                    {v==="yes"?"YES":"NO"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={{ ...S.btnPrim, opacity:step1Done()?1:.4 }} disabled={!step1Done()} onClick={()=>setScreen("step2")}>Identify hazards →</button>
        <button style={S.btnSec} onClick={()=>setScreen("setup")}>← Back</button>
      </div>
    </div>
  );

  // STEP 2
  if (screen==="step2") return (
    <div style={S.app}>
      {hdr}
      <Pips active={2} />
      <div style={S.stepLbl}>Step 2 — Identify the hazard(s)</div>
      <div style={S.secSub}>Select all hazard types that apply. <strong>Bold = high risk</strong> — triggers a SWMS.</div>
      <div style={S.card}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {HAZARDS.map(h => (
            <button key={h.id} onClick={()=>setHazards(p=>({...p,nil:false,[h.id]:!p[h.id]}))}
              style={{ border:"2px solid", borderRadius:10, padding:"12px 10px", textAlign:"left", cursor:"pointer", lineHeight:1.3, transition:"all .15s", minHeight:64,
                background:hazards[h.id]?"#FEF2F2":"#F9FAFB",
                borderColor:hazards[h.id]?"#EF4444":"#E5E7EB" }}>
              <div style={{ fontSize:14, fontWeight:h.weight==="high"?700:500, color:hazards[h.id]?"#B91C1C":"#374151" }}>{h.label}</div>
              <div style={{ fontSize:11, color:hazards[h.id]?"#EF4444":"#9CA3AF", marginTop:3, lineHeight:1.3 }}>{h.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #E5E7EB" }}>
          <button onClick={()=>setHazards({nil:!hazards.nil})}
            style={{ padding:"10px 16px", border:"2px solid", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", width:"100%",
              background:hazards.nil?"#EFF6FF":"#F9FAFB", color:hazards.nil?"#2563EB":"#6B7280", borderColor:hazards.nil?"#93C5FD":"#E5E7EB" }}>
            ✓ Nil hazards — none of the above apply
          </button>
        </div>
      </div>
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={S.btnPrim} onClick={()=>setScreen("step3")}>Assess risk →</button>
        <button style={S.btnSec} onClick={()=>setScreen("step1")}>← Back</button>
      </div>
    </div>
  );

  // STEP 3
  if (screen==="step3") return (
    <div style={S.app}>
      {hdr}
      <Pips active={3} />
      <div style={S.stepLbl}>Step 3 — Assess level of risk</div>
      <div style={{ borderRadius:12, padding:"14px", marginBottom:10, border:"2px solid",
        background:result==="safe"?"#F0FDF4":result==="warning"?"#FFFBEB":"#FEF2F2",
        borderColor:result==="safe"?"#86EFAC":result==="warning"?"#FCD34D":"#FCA5A5" }}>
        <div style={{ fontSize:16, fontWeight:700, color:result==="safe"?"#15803D":result==="warning"?"#92400E":"#B91C1C" }}>
          {result==="safe"?"✓ Proceed safely — Step 5":result==="warning"?"⚠ Additional controls required":"✕ SWMS required — do not proceed"}
        </div>
        <div style={{ fontSize:14, marginTop:4, lineHeight:1.5, color:result==="safe"?"#166534":result==="warning"?"#78350F":"#991B1B" }}>
          {result==="safe"?"No high-risk hazards identified. Apply standard controls and PPE.":result==="warning"?"Medium-level hazards identified. Apply hierarchy of controls before proceeding.":"High-risk construction activity identified. Complete and sign a SWMS before work commences."}
        </div>
      </div>
      {selectedHazards.length>0 && (
        <>
          <div style={S.divider}>Identified hazards</div>
          {selectedHazards.map(h => (
            <div key={h.id} style={{ fontSize:14, padding:"8px 0", borderBottom:"1px solid #F3F4F6", color:"#374151", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:h.weight==="high"?"#EF4444":"#F59E0B", fontSize:16 }}>●</span>
              <div><strong>{h.label}</strong> — {h.sub}</div>
            </div>
          ))}
        </>
      )}
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        {needsLift() && <button style={{ ...S.btnPurple }} onClick={()=>setScreen("lift")}>🏗 Complete lift risk analysis</button>}
        {result==="swms" ? <button style={S.btnPrim} onClick={()=>setScreen("swms")}>Complete SWMS →</button>
          : <button style={S.btnPrim} onClick={()=>setScreen("complete")}>Sign off →</button>}
        <button style={S.btnSec} onClick={()=>setScreen("step2")}>← Back</button>
      </div>
    </div>
  );

  // LIFT
  if (screen==="lift") return (
    <div style={S.app}>
      {hdr}
      <Pips active={3} />
      <div style={S.stepLbl}>Lift risk analysis</div>
      <div style={S.secSub}>Complete all items before any lifting operation. A "No" stops the lift.</div>
      <div style={S.card}>
        {LIFT_CHECKS.map((lc,i) => {
          const ans = liftChecks[i];
          return (
            <div key={i} style={{ padding:"12px 0", borderBottom:"1px solid #F3F4F6" }}>
              <div style={{ fontSize:15, color:"#1F2937", lineHeight:1.5, marginBottom:8 }}>{lc}</div>
              <div style={{ display:"flex", gap:8 }}>
                {["yes","no","na"].map(v => (
                  <button key={v} onClick={()=>setLiftChecks(p=>({...p,[i]:v}))}
                    style={{ flex:1, padding:"10px", borderRadius:10, border:"2px solid", fontSize:14, fontWeight:700, cursor:"pointer",
                      background:ans===v?(v==="no"?"#FEE2E2":v==="yes"?"#D1FAE5":"#EFF6FF"):"#F9FAFB",
                      color:ans===v?(v==="no"?"#B91C1C":v==="yes"?"#065F46":"#2563EB"):"#6B7280",
                      borderColor:ans===v?(v==="no"?"#FCA5A5":v==="yes"?"#86EFAC":"#93C5FD"):"#E5E7EB" }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ ...S.card, background:"#F5F3FF", border:"2px solid #DDD6FE" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#7C3AED", marginBottom:10 }}>🏗 Load details</div>
        <div><label style={S.label}>Load description</label><input style={S.input} value={liftDetails.load} onChange={e=>setLiftDetails(p=>({...p,load:e.target.value}))} placeholder="e.g. Hydraulic pump assembly" /></div>
        <div style={S.grid2}>
          <div><label style={S.label}>Weight (tonnes)</label><input style={S.input} type="number" value={liftDetails.weight} onChange={e=>setLiftDetails(p=>({...p,weight:e.target.value}))} placeholder="e.g. 2.5" /></div>
          <div><label style={S.label}>Lift radius (m)</label><input style={S.input} type="number" value={liftDetails.radius} onChange={e=>setLiftDetails(p=>({...p,radius:e.target.value}))} placeholder="e.g. 12" /></div>
        </div>
        <div style={{ marginTop:10 }}><label style={S.label}>Crane / lifting equipment</label><input style={S.input} value={liftDetails.crane} onChange={e=>setLiftDetails(p=>({...p,crane:e.target.value}))} placeholder="e.g. 50t mobile crane, forklift" /></div>
      </div>
      {Object.values(liftChecks).some(v=>v==="no") && (
        <div style={{ borderRadius:12, padding:"12px 14px", background:"#FEF2F2", border:"2px solid #FCA5A5", marginBottom:10, fontSize:14, color:"#B91C1C", fontWeight:600 }}>
          ✕ Lift must not proceed — resolve all "No" items before continuing.
        </div>
      )}
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={S.btnPrim} onClick={()=>setScreen(result==="swms"?"swms":"complete")}>Continue →</button>
        <button style={S.btnSec} onClick={()=>setScreen("step3")}>← Back</button>
      </div>
    </div>
  );

  // SWMS
  if (screen==="swms") return (
    <div style={S.app}>
      {hdr}
      <Pips active={4} />
      <div style={S.stepLbl}>Step 4 — Safe Work Method Statement</div>
      <div style={S.secSub}>Document each hazard with risk ratings, control measures, and responsible person.</div>
      <div style={S.divider}>Job details</div>
      <div style={S.card}>
        <div><label style={S.label}>Task</label><input style={S.input} value={form.task} onChange={setF("task")} /></div>
        <div style={S.grid2}>
          <div style={{ marginTop:10 }}><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} /></div>
          <div style={{ marginTop:10 }}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
      </div>
      <div style={S.divider}>Hazards & controls</div>
      {swmsHazards.map((h,i) => {
        const ir = h.initialL!==""&&h.initialC!==""?matrixRating(parseInt(h.initialL),parseInt(h.initialC)):null;
        const rr = h.residualL!==""&&h.residualC!==""?matrixRating(parseInt(h.residualL),parseInt(h.residualC)):null;
        return (
          <div key={h.id} style={{ ...S.card, position:"relative", border:"2px solid #E5E7EB" }}>
            <button onClick={()=>removeSwmsRow(h.id)} style={{ position:"absolute", top:10, right:12, background:"none", border:"none", color:"#9CA3AF", cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
            <div style={{ fontSize:13, fontWeight:700, color:"#2563EB", marginBottom:8 }}>Hazard {i+1}</div>
            <div><label style={S.label}>Hazard description</label><input style={S.input} value={h.hazard} onChange={e=>updateSwms(h.id,"hazard",e.target.value)} placeholder="Describe the hazard..." /></div>
            <div style={{ fontSize:13, fontWeight:600, color:"#6B7280", marginTop:14, marginBottom:6 }}>Initial risk (before controls applied)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.initialL} onChange={v=>updateSwms(h.id,"initialL",v)} />
            <div style={{ marginTop:10 }}>
              <RiskSelector label="Consequence" options={CONSEQUENCE} value={h.initialC} onChange={v=>updateSwms(h.id,"initialC",v)} />
            </div>
            <LiveRiskResult l={h.initialL} c={h.initialC} />
            <div style={{ marginTop:12 }}>
              <label style={S.label}>Control measures (Eliminate → Substitute → Isolate → Engineer → Admin → PPE)</label>
              <textarea style={S.textarea} value={h.controls} onChange={e=>updateSwms(h.id,"controls",e.target.value)} placeholder="List all control measures to be applied..." />
            </div>
            <div style={{ marginTop:10 }}><label style={S.label}>Person responsible for implementation</label><input style={S.input} value={h.responsible} onChange={e=>updateSwms(h.id,"responsible",e.target.value)} placeholder="Name / role" /></div>
            <div style={{ fontSize:13, fontWeight:600, color:"#6B7280", marginTop:14, marginBottom:6 }}>Residual risk (after controls applied)</div>
            <RiskSelector label="Likelihood" options={LIKELIHOOD} value={h.residualL} onChange={v=>updateSwms(h.id,"residualL",v)} />
            <div style={{ marginTop:10 }}>
              <RiskSelector label="Consequence" options={CONSEQUENCE} value={h.residualC} onChange={v=>updateSwms(h.id,"residualC",v)} />
            </div>
            <LiveRiskResult l={h.residualL} c={h.residualC} />
          </div>
        );
      })}
      <button onClick={addSwmsRow} style={{ width:"100%", padding:"14px", border:"2px dashed #D1D5DB", borderRadius:10, background:"none", fontSize:15, color:"#2563EB", cursor:"pointer", marginBottom:4, fontWeight:600 }}>+ Add hazard</button>
      <div style={S.divider}>Sign-off</div>
      <div style={S.card}>
        <div><label style={S.label}>Worker name</label><input style={S.input} value={sigWorker} onChange={e=>setSigWorker(e.target.value)} placeholder="Worker full name" /></div>
        <div style={{ marginTop:10 }}><label style={S.label}>Supervisor / authorising person</label><input style={S.input} value={sigSupervisor} onChange={e=>setSigSupervisor(e.target.value)} placeholder="Supervisor name" /></div>
        <div style={{ marginTop:10, background:"#F9FAFB", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#6B7280" }}>Physical or digital signatures to be applied on printed form</div>
      </div>
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={S.btnPrim} onClick={()=>setScreen("complete")}>Complete SWMS →</button>
        <button style={S.btnSec} onClick={()=>setScreen("step3")}>← Back</button>
      </div>
    </div>
  );

  // COMPLETE
  if (screen==="complete") return (
    <div style={S.app}>
      {hdr}
      <Pips active={5} />
      <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
        <div style={{ width:60, height:60, background:"#D1FAE5", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:30 }}>✓</div>
        <div style={{ fontSize:20, fontWeight:700 }}>Safety check complete</div>
        <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>{form.date} {form.time} · {profile?.company_name}</div>
      </div>
      <div style={{ borderRadius:12, padding:"14px", background:"#F0FDF4", border:"2px solid #86EFAC", marginBottom:10 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#15803D" }}>✓ Safe to proceed — Step 5</div>
        <div style={{ fontSize:14, color:"#166534", marginTop:4, lineHeight:1.5 }}>
          {result==="swms"?"SWMS completed and signed. All hazards documented with control measures.":"Take 5 complete. Standard controls apply."} If conditions change — stop and reassess.
        </div>
      </div>
      <div style={{ ...S.card, background:"#F9FAFB" }}>
        <div style={S.divider}>Summary</div>
        {[["Task",form.task],["Location",form.location],["Job ref",form.jobRef],
          ["Hazards",selectedHazards.map(h=>h.label).join(", ")||"None"],
          ["SWMS required",result==="swms"?"Yes":"No"],
          result==="swms"&&["Hazards documented",swmsHazards.length],
          needsLift()&&["Lift analysis","Completed"],
          ["Worker",sigWorker],["Supervisor",sigSupervisor]
        ].filter(Boolean).map(([k,v])=>v?(
          <div key={k} style={{ fontSize:14, padding:"6px 0", borderBottom:"1px solid #F3F4F6" }}>
            <strong>{k}:</strong> {v}
          </div>
        ):null)}
      </div>
      <div style={{ ...S.card }}>
        <div style={S.divider}>Save & export</div>
        {cloudMsg && <div style={{ fontSize:14, marginBottom:10, padding:"8px 12px", borderRadius:8, background:cloudMsg.includes("✓")?"#D1FAE5":"#FEE2E2", color:cloudMsg.includes("✓")?"#065F46":"#B91C1C" }}>{cloudMsg}</div>}
        <button style={{ ...S.btnPrim, background:savedId?"#16A34A":"#2563EB", opacity:saving?.6:1 }} onClick={saveToCloud} disabled={saving||!!savedId}>
          {saving?"Saving...":savedId?"✓ Saved to cloud":"☁ Save to cloud"}
        </button>
        <button style={{ ...S.btnSec, width:"100%", textAlign:"center", marginTop:8 }} onClick={exportPDF}>📄 Export PDF</button>
      </div>
      <div style={{ ...S.actionBar, flexDirection:"column" }}>
        <button style={S.btnSec} onClick={()=>setScreen("records")}>View records</button>
        <button style={{ ...S.btnPrim, background:"#374151" }} onClick={resetAll}>Start new Take 5</button>
      </div>
    </div>
  );
  return null;
}

function buildPDFHtml(rec, profile) {
  return `<html><head><style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:800px;margin:0 auto;padding:24px}
    h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #2563EB;padding-bottom:4px;color:#1e3a5f}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    td,th{border:1px solid #ccc;padding:6px 8px;font-size:12px;vertical-align:top}th{background:#f0f4ff;font-weight:600}
    .L{background:#D1FAE5;color:#065F46;padding:2px 6px;border-radius:4px;font-weight:700}
    .M{background:#FEF3C7;color:#78350F;padding:2px 6px;border-radius:4px;font-weight:700}
    .H{background:#FEE2E2;color:#B91C1C;padding:2px 6px;border-radius:4px;font-weight:700}
    .E{background:#7F1D1D;color:#FEE2E2;padding:2px 6px;border-radius:4px;font-weight:700}
    .sig{border:1px solid #ccc;height:48px;border-radius:4px;margin-top:6px;background:#fafafa}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #2563EB}
    @media print{button{display:none}}
  </style></head><body>
  <div class="header">
    <div><h1>🛡 Take 5 Safety ${rec.result==="swms"?"& SWMS":""}</h1><div style="color:#6B7280;font-size:12px">${profile?.company_name||""}</div></div>
    <div style="text-align:right;font-size:12px;color:#6B7280">${rec.date} ${rec.time}<br>Ref: ${rec.jobRef||"—"}</div>
  </div>
  <h2>Job details</h2>
  <table><tr><th>Task</th><th>Location</th><th>Date</th><th>Time</th></tr>
  <tr><td>${rec.task||"—"}</td><td>${rec.location||"—"}</td><td>${rec.date}</td><td>${rec.time}</td></tr></table>
  <h2>Step 1 — Pre-task checklist</h2>
  <table><tr><th>Question</th><th>Answer</th></tr>
  ${STEP1_CHECKS.map(c=>`<tr><td>${c.text}</td><td style="font-weight:700;color:${rec.step1?.[c.id]==="yes"?"#B91C1C":"#065F46"}">${(rec.step1?.[c.id]||"—").toUpperCase()}</td></tr>`).join("")}</table>
  <h2>Step 2 — Hazards identified</h2>
  <p>${(rec.hazards||[]).map(id=>HAZARDS.find(h=>h.id===id)?.label||id).join(", ")||"None"}</p>
  <h2>Step 3 — Risk result</h2>
  <p><span class="${rec.result==="swms"?"H":rec.result==="warning"?"M":"L"}">${rec.result==="swms"?"SWMS Required":rec.result==="warning"?"Warning — additional controls":"Safe to proceed"}</span></p>
  ${rec.liftDetails?.load?`<h2>Lift analysis</h2>
  <table><tr><th>Load</th><th>Weight</th><th>Crane / equipment</th><th>Radius</th></tr>
  <tr><td>${rec.liftDetails.load}</td><td>${rec.liftDetails.weight}t</td><td>${rec.liftDetails.crane}</td><td>${rec.liftDetails.radius}m</td></tr></table>`:""}
  ${rec.result==="swms"?`<h2>Step 4 — SWMS</h2>
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
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_e,s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    const { data } = await supabase.from("profiles").select("*, companies(name,logo_url)").eq("id",uid).single();
    setProfile(data ? {...data, company_name:data.companies?.name, logo_url:data.companies?.logo_url} : null);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"80vh", color:"#6B7280", fontSize:16 }}>
      Loading...
    </div>
  );

  if (!session) return <AuthScreen onAuth={setSession} />;
  return <Take5App session={session} profile={profile} onLogout={handleLogout} />;
}
