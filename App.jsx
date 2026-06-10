import { useState, useEffect, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CONFIG — swap these for your real values ─────────────────────────────────
const SUPABASE_URL = "https://wwaogpobcnqqxzicjzon.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YW9ncG9iY25xcXh6aWNqem9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTQ5ODQsImV4cCI6MjA5NjYzMDk4NH0.eF57eCwnaHUvvAgI9yfO9auAyKTC-C17qZeh_t7GPaQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Data ─────────────────────────────────────────────────────────────────────
const STEP1_CHECKS = [
  { id: "s1_1", text: "Do I understand what I need to do?",                               swmsTrigger: false },
  { id: "s1_2", text: "Do I need a SWMS for any High Risk Construction Work?",            swmsTrigger: true  },
  { id: "s1_3", text: "Do I need any permits? (e.g. hot work / confined space / dig)",   swmsTrigger: true  },
  { id: "s1_4", text: "Do I have the correct PPE in good condition for the task?",        swmsTrigger: false },
  { id: "s1_5", text: "Do I have the suitable tools and equipment for the task?",         swmsTrigger: false },
  { id: "s1_6", text: "Do I have my vehicle parked appropriately?",                       swmsTrigger: false },
  { id: "s1_7", text: "Am I trained, competent, licensed and fit to perform this task?",  swmsTrigger: true  },
];

const HAZARDS = [
  { id: "h_mh",   label: "Manual Handling", sub: "Lifting, awkward positions, over-exertion",          weight: "medium" },
  { id: "h_gr",   label: "Gravity",         sub: "Falls, slips, trips, falling objects",               weight: "high"   },
  { id: "h_mech", label: "Mechanical",      sub: "Moving parts, struck by plant or flying objects",    weight: "high"   },
  { id: "h_elec", label: "Electrical",      sub: "Electrocution from faulty tools or live power",      weight: "high"   },
  { id: "h_chem", label: "Chemical",        sub: "Inhaling, swallowing or touching acid, solvents",    weight: "high"   },
  { id: "h_pres", label: "Pressure",        sub: "Highly pressurised fluid, gas or air",               weight: "high"   },
  { id: "h_exp",  label: "Exposure",        sub: "Noise, dust, fumes, chemicals, asbestos, weather",   weight: "medium" },
  { id: "h_bio",  label: "Biological",      sub: "Contracting diseases, Hepatitis, Legionella",        weight: "medium" },
  { id: "h_rad",  label: "Radiation",       sub: "X-rays, sunlight, ultra-violet",                     weight: "medium" },
  { id: "h_psych",label: "Psychological",   sub: "Stress, violence, fatigue, depression",              weight: "medium" },
  { id: "h_conf", label: "Confined Space",  sub: "Restricted area, poor ventilation, toxic atmosphere",weight: "high"   },
  { id: "h_other",label: "Other Hazards",   sub: "e.g. Silica, asphyxiation, traffic",                weight: "medium" },
];

const LIKELIHOOD  = ["Rare (1)", "Unlikely (2)", "Possible (3)", "Likely (4)", "Almost Certain (5)"];
const CONSEQUENCE = ["Insignificant (1)", "Minor (2)", "Moderate (3)", "Major (4)", "Catastrophic (5)"];

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

function matrixRating(l, c) {
  const s = (l + 1) * (c + 1);
  if (s <= 4) return "Low";
  if (s <= 9) return "Medium";
  if (s <= 16) return "High";
  return "Extreme";
}

const RISK_COLORS = {
  Low:     { bg: "#D1FAE5", color: "#065F46", border: "#86EFAC" },
  Medium:  { bg: "#FEF3C7", color: "#78350F", border: "#FCD34D" },
  High:    { bg: "#FEE2E2", color: "#B91C1C", border: "#FCA5A5" },
  Extreme: { bg: "#7F1D1D", color: "#FEE2E2", border: "#991B1B" },
};

function RiskBadge({ rating }) {
  if (!rating) return null;
  const c = RISK_COLORS[rating] || {};
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
      {rating}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:       { maxWidth: 700, margin: "0 auto", padding: "1rem", fontFamily: "system-ui,sans-serif" },
  card:      { background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: ".6rem", boxShadow: "0 1px 3px rgba(0,0,0,.06)" },
  label:     { fontSize: 11, color: "#6B7280", display: "block", marginBottom: 2 },
  input:     { width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 7, padding: "7px 10px", fontSize: 13, color: "#111", fontFamily: "inherit", background: "#F9FAFB", outline: "none" },
  textarea:  { width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 7, padding: "7px 10px", fontSize: 13, color: "#111", fontFamily: "inherit", background: "#F9FAFB", resize: "vertical", minHeight: 54 },
  btnPrim:   { background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnSec:    { background: "#F9FAFB", color: "#374151", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnDanger: { background: "#FEE2E2", color: "#B91C1C", border: "0.5px solid #FCA5A5", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnPurple: { background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  row:       { display: "flex", gap: 8 },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  grid3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  stepLabel: { fontSize: 11, fontWeight: 600, color: "#2563EB", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 },
  secTitle:  { fontSize: 16, fontWeight: 500, marginBottom: 4 },
  secSub:    { fontSize: 13, color: "#6B7280", marginBottom: "1rem", lineHeight: 1.5 },
  divider:   { fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", padding: "6px 0", borderBottom: "0.5px solid #E5E7EB", marginBottom: 8, marginTop: 12 },
  actionBar: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1.25rem" },
};

function Pips({ active, total = 5 }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < active ? "#22C55E" : i === active ? "#2563EB" : "#E5E7EB", transition: "background .2s" }} />
      ))}
    </div>
  );
}

function Header({ logo, company, subtitle, onRecords, onAdmin, isAdmin }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "0.5px solid #E5E7EB" }}>
      {logo
        ? <img src={logo} style={{ height: 42, maxWidth: 110, objectFit: "contain", borderRadius: 8 }} alt="logo" />
        : <div style={{ width: 42, height: 42, background: "#2563EB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 20 }}>🛡</span>
          </div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 500 }}>Take 5 Safety</div>
        <div style={{ fontSize: 12, color: "#6B7280" }}>{company || ""}{subtitle ? ` — ${subtitle}` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {isAdmin && <button style={{ ...S.btnSec, fontSize: 12, padding: "5px 10px" }} onClick={onAdmin}>Admin</button>}
        <button style={{ ...S.btnSec, fontSize: 12, padding: "5px 10px" }} onClick={onRecords}>Records</button>
      </div>
    </div>
  );
}

// ── AUTH SCREENS ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", companyCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        onAuth(data.session);
      } else {
        // Validate company code first
        const { data: co, error: coErr } = await supabase
          .from("companies").select("id,name").eq("code", form.companyCode.trim()).single();
        if (coErr || !co) throw new Error("Invalid company code. Check with your supervisor.");

        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { full_name: form.fullName } },
        });
        if (error) throw error;

        // Attach company to profile
        await supabase.from("profiles").update({ company_id: co.id, full_name: form.fullName }).eq("id", data.user.id);
        setMode("login");
        setError(`Account created for ${co.name}. Please log in.`);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ ...S.app, maxWidth: 420, paddingTop: "3rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ width: 56, height: 56, background: "#2563EB", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <span style={{ fontSize: 28, color: "#fff" }}>🛡</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Take 5 Safety</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Stop · Think · Act Safely</div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, padding: "7px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#2563EB" : "#6B7280", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
              {m === "login" ? "Log in" : "Register"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <div><label style={S.label}>Full name</label><input style={S.input} value={form.fullName} onChange={set("fullName")} placeholder="Your full name" /></div>
          )}
          <div><label style={S.label}>Email address</label><input style={S.input} type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" /></div>
          <div><label style={S.label}>Password</label><input style={S.input} type="password" value={form.password} onChange={set("password")} placeholder={mode === "register" ? "Min. 8 characters" : "Your password"} /></div>
          {mode === "register" && (
            <div>
              <label style={S.label}>Company code</label>
              <input style={S.input} value={form.companyCode} onChange={set("companyCode")} placeholder="Enter the code from your supervisor" />
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>Ask your supervisor or site manager for this code</div>
            </div>
          )}
        </div>

        {error && <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 7, background: error.includes("created") ? "#D1FAE5" : "#FEE2E2", color: error.includes("created") ? "#065F46" : "#B91C1C", fontSize: 12 }}>{error}</div>}

        <button style={{ ...S.btnPrim, width: "100%", marginTop: "1rem", opacity: loading ? .5 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ profile, onBack }) {
  const [records, setRecords] = useState([]);
  const [stats, setStats]     = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");
  const [newCo, setNewCo]     = useState({ name: "", code: "" });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [r, s, c] = await Promise.all([
      supabase.from("take5_summary").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("take5_stats").select("*").limit(30),
      supabase.from("companies").select("*").order("name"),
    ]);
    setRecords(r.data || []);
    setStats(s.data || []);
    setCompanies(c.data || []);
    setLoading(false);
  }

  async function addCompany() {
    if (!newCo.name || !newCo.code) return;
    setSaving(true);
    const { error } = await supabase.from("companies").insert({ name: newCo.name.trim(), code: newCo.code.trim().toUpperCase() });
    if (error) setMsg("Error: " + error.message);
    else { setMsg("Company added."); setNewCo({ name: "", code: "" }); loadAll(); }
    setSaving(false);
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record permanently?")) return;
    await supabase.from("take5_records").delete().eq("id", id);
    loadAll();
  }

  const totalRecords = records.length;
  const swmsCount    = records.filter((r) => r.result === "swms").length;
  const liftCount    = records.filter((r) => r.has_lift_analysis).length;

  return (
    <div style={S.app}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "0.5px solid #E5E7EB" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>Admin Dashboard</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>All companies · All records</div>
        </div>
        <button style={{ ...S.btnSec, fontSize: 12, padding: "5px 12px" }} onClick={onBack}>Back to app</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1rem", background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
        {["overview", "records", "companies"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "7px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#2563EB" : "#6B7280", textTransform: "capitalize", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,.1)" : "none" }}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "2rem", color: "#6B7280", fontSize: 13 }}>Loading...</div>}

      {!loading && tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: "1rem" }}>
            {[
              { label: "Total records", value: totalRecords, color: "#2563EB" },
              { label: "SWMS required", value: swmsCount,    color: "#DC2626" },
              { label: "Lift analyses", value: liftCount,    color: "#7C3AED" },
              { label: "Companies",     value: companies.length, color: "#16A34A" },
            ].map((s) => (
              <div key={s.label} style={{ ...S.card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={S.divider}>Recent activity</div>
          {records.slice(0, 10).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #F3F4F6", fontSize: 13 }}>
              <div style={{ flex: 1 }}>
                <div>{r.task || r.job_ref || "Untitled"}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{r.company_name} · {r.location || "—"} · {r.created_at?.slice(0, 10)}</div>
              </div>
              <RiskBadge rating={r.result === "swms" ? "High" : r.result === "warning" ? "Medium" : "Low"} />
              <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: r.result === "swms" ? "#FEE2E2" : r.result === "warning" ? "#FEF3C7" : "#D1FAE5", color: r.result === "swms" ? "#B91C1C" : r.result === "warning" ? "#78350F" : "#065F46", fontWeight: 500 }}>
                {r.result?.toUpperCase()}
              </span>
            </div>
          ))}
        </>
      )}

      {!loading && tab === "records" && (
        <>
          <div style={S.divider}>All records ({records.length})</div>
          {records.map((r) => (
            <div key={r.id} style={{ ...S.card, marginBottom: 6, padding: "10px 1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.task || r.job_ref || "Untitled task"}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {r.company_name} · {r.worker_name || "Unknown"} · {r.location || "No location"} · {r.created_at?.slice(0, 10)}
                  </div>
                  {r.hazards_identified && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Hazards: {r.hazards_identified}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: r.result === "swms" ? "#FEE2E2" : r.result === "warning" ? "#FEF3C7" : "#D1FAE5", color: r.result === "swms" ? "#B91C1C" : r.result === "warning" ? "#78350F" : "#065F46", fontWeight: 500 }}>
                    {r.result?.toUpperCase()}
                  </span>
                  <button style={{ ...S.btnDanger, fontSize: 11, padding: "3px 8px" }} onClick={() => deleteRecord(r.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && tab === "companies" && (
        <>
          <div style={S.divider}>Companies ({companies.length})</div>
          {companies.map((c) => (
            <div key={c.id} style={{ ...S.card, padding: "10px 1rem", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>Code: <strong>{c.code}</strong> · Workers: {records.filter((r) => r.company_id === c.id).length > 0 ? records.filter((r) => r.company_id === c.id).length + " records" : "No records yet"}</div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: c.is_active ? "#D1FAE5" : "#F3F4F6", color: c.is_active ? "#065F46" : "#6B7280" }}>{c.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
          ))}

          <div style={S.divider}>Add new company</div>
          <div style={S.card}>
            <div style={S.grid2}>
              <div><label style={S.label}>Company name</label><input style={S.input} value={newCo.name} onChange={(e) => setNewCo((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. AFJV" /></div>
              <div>
                <label style={S.label}>Company code (workers enter this)</label>
                <input style={S.input} value={newCo.code} onChange={(e) => setNewCo((c) => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="e.g. AFJV-2025" />
              </div>
            </div>
            {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith("Error") ? "#B91C1C" : "#065F46" }}>{msg}</div>}
            <div style={S.actionBar}>
              <button style={S.btnPrim} onClick={addCompany} disabled={saving}>{saving ? "Saving..." : "Add company"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── RECORDS VIEW ──────────────────────────────────────────────────────────────
function RecordsView({ profile, onBack, onNew }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => { loadRecords(); }, [filter]);

  async function loadRecords() {
    setLoading(true);
    let q = supabase.from("take5_summary").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("result", filter);
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  }

  return (
    <div style={S.app}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "0.5px solid #E5E7EB" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 500 }}>Records</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{profile?.company_name || "My company"}</div>
        </div>
        <button style={{ ...S.btnPrim, fontSize: 12, padding: "5px 12px" }} onClick={onNew}>+ New Take 5</button>
        <button style={{ ...S.btnSec, fontSize: 12, padding: "5px 12px" }} onClick={onBack}>Back</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1rem" }}>
        {["all", "safe", "warning", "swms"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 12px", border: "0.5px solid #E5E7EB", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: filter === f ? "#2563EB" : "#F9FAFB", color: filter === f ? "#fff" : "#374151", textTransform: "capitalize" }}>
            {f === "all" ? "All" : f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "2rem", color: "#6B7280", fontSize: 13 }}>Loading...</div>}
      {!loading && records.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6B7280", fontSize: 13 }}>
          No records yet.<br />Complete a Take 5 to get started.
        </div>
      )}
      {!loading && records.map((r) => (
        <div key={r.id} style={{ ...S.card, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.task || r.job_ref || "Untitled task"}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>
                {r.worker_name || "Unknown"} · {r.location || "No location"} · {r.created_at?.slice(0, 10)} {r.created_at?.slice(11, 16)}
              </div>
              {r.hazards_identified && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Hazards: {r.hazards_identified}</div>}
            </div>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 500,
              background: r.result === "swms" ? "#FEE2E2" : r.result === "warning" ? "#FEF3C7" : "#D1FAE5",
              color: r.result === "swms" ? "#B91C1C" : r.result === "warning" ? "#78350F" : "#065F46" }}>
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
  const isAdmin = profile?.role === "admin";
  const [screen, setScreen] = useState("setup");
  const [form, setForm]     = useState({
    jobRef: "", location: "", date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5), task: "",
  });
  const [step1, setStep1]   = useState({});
  const [hazards, setHazards] = useState({});
  const [liftChecks, setLiftChecks] = useState({});
  const [liftDetails, setLiftDetails] = useState({ load: "", weight: "", crane: "", radius: "" });
  const [swmsHazards, setSwmsHazards] = useState([{ id: 1, hazard: "", initialL: "", initialC: "", controls: "", responsible: "", residualL: "", residualC: "" }]);
  const [sigWorker, setSigWorker]         = useState(profile?.full_name || "");
  const [sigSupervisor, setSigSupervisor] = useState("");
  const [saving, setSaving]     = useState(false);
  const [savedId, setSavedId]   = useState(null);
  const [cloudMsg, setCloudMsg] = useState("");

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function calcResult() {
    const swmsTrigger1 = STEP1_CHECKS.filter((c) => c.swmsTrigger).some((c) => step1[c.id] === "yes");
    const noBasics     = ["s1_4", "s1_5", "s1_7"].some((id) => step1[id] === "no");
    const highHaz      = HAZARDS.filter((h) => h.weight === "high").some((h) => hazards[h.id]);
    const medCount     = HAZARDS.filter((h) => h.weight === "medium").filter((h) => hazards[h.id]).length;
    if (swmsTrigger1 || highHaz || noBasics) return "swms";
    if (medCount >= 2) return "warning";
    if (medCount === 1) return "warning";
    return "safe";
  }

  function needsLift() { return hazards["h_gr"] || hazards["h_mech"]; }
  function step1Done() { return STEP1_CHECKS.every((c) => step1[c.id] !== undefined); }

  function buildRecord() {
    return {
      job_ref: form.jobRef, task: form.task, location: form.location,
      company_id: profile?.company_id,
      result: calcResult(),
      created_by: sigWorker, supervisor: sigSupervisor,
      created_at: form.date + "T" + form.time,
      record_data: {
        jobRef: form.jobRef, task: form.task, location: form.location,
        date: form.date, time: form.time,
        step1, hazards: Object.keys(hazards).filter((k) => hazards[k]),
        liftChecks, liftDetails, swmsHazards,
        sigWorker, sigSupervisor,
      },
    };
  }

  async function saveToCloud() {
    setSaving(true); setCloudMsg("");
    const rec = buildRecord();
    const { data, error } = await supabase.from("take5_records").insert(rec).select().single();
    if (error) setCloudMsg("Save failed: " + error.message);
    else { setSavedId(data.id); setCloudMsg("Saved to cloud ✓"); }
    setSaving(false);
  }

  function exportPDF() {
    const rec = { ...buildRecord().record_data, result: calcResult() };
    const html = buildPDFHtml(rec, profile);
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
  }

  function resetAll() {
    setScreen("setup"); setStep1({}); setHazards({}); setLiftChecks({});
    setLiftDetails({ load: "", weight: "", crane: "", radius: "" });
    setSwmsHazards([{ id: 1, hazard: "", initialL: "", initialC: "", controls: "", responsible: "", residualL: "", residualC: "" }]);
    setSavedId(null); setCloudMsg(""); setSigWorker(profile?.full_name || ""); setSigSupervisor("");
    setForm({ jobRef: "", location: "", date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), task: "" });
  }

  function addSwmsRow() { setSwmsHazards((p) => [...p, { id: Date.now(), hazard: "", initialL: "", initialC: "", controls: "", responsible: "", residualL: "", residualC: "" }]); }
  function removeSwmsRow(id) { setSwmsHazards((p) => p.length > 1 ? p.filter((r) => r.id !== id) : p); }
  function updateSwms(id, k, v) { setSwmsHazards((p) => p.map((r) => r.id === id ? { ...r, [k]: v } : r)); }

  const result = calcResult();
  const selectedHazards = HAZARDS.filter((h) => hazards[h.id]);

  if (screen === "records") return <RecordsView profile={profile} onBack={() => setScreen("setup")} onNew={resetAll} />;
  if (screen === "admin" && isAdmin) return <AdminDashboard profile={profile} onBack={() => setScreen("setup")} />;

  const commonHeader = (
    <Header
      logo={null} company={profile?.company_name} subtitle={screen === "complete" ? "Step 5 — Proceed safely" : null}
      onRecords={() => setScreen("records")} onAdmin={() => setScreen("admin")} isAdmin={isAdmin}
    />
  );

  // ── SETUP ──
  if (screen === "setup") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={0} />
      <div style={S.stepLabel}>Setup — job details</div>
      <div style={S.card}>
        <div style={S.grid3}>
          <div><label style={S.label}>Job reference</label><input style={S.input} value={form.jobRef} onChange={setF("jobRef")} placeholder="e.g. SMW-001" /></div>
          <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} placeholder="e.g. Ring 450" /></div>
          <div><label style={S.label}>Date</label><input style={{ ...S.input }} type="date" value={form.date} onChange={setF("date")} /></div>
        </div>
        <div style={{ ...S.grid2, marginTop: 8 }}>
          <div><label style={S.label}>Time</label><input style={S.input} type="time" value={form.time} onChange={setF("time")} /></div>
          <div><label style={S.label}>Task description</label><input style={S.input} value={form.task} onChange={setF("task")} placeholder="Brief task description" /></div>
        </div>
      </div>
      <div style={S.actionBar}>
        <button style={{ ...S.btnSec, fontSize: 12, padding: "6px 12px" }} onClick={onLogout}>Log out</button>
        <button style={S.btnPrim} onClick={() => setScreen("step1")}>Start Take 5 →</button>
      </div>
    </div>
  );

  // ── STEP 1 ──
  if (screen === "step1") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={1} />
      <div style={S.stepLabel}>Step 1 — Stop, step back and think</div>
      <div style={S.secSub}>Answer each question honestly before starting work.</div>
      <div style={S.card}>
        {STEP1_CHECKS.map((c) => {
          const ans = step1[c.id];
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #F3F4F6" }}>
              <span style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 1.4 }}>
                {c.text}
                {c.swmsTrigger && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 600, marginLeft: 6, background: "#FEE2E2", padding: "1px 5px", borderRadius: 3 }}>SWMS TRIGGER</span>}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {["yes", "no"].map((v) => (
                  <button key={v} onClick={() => setStep1((p) => ({ ...p, [c.id]: v }))}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: ans === v ? (v === "yes" ? "#FEE2E2" : "#D1FAE5") : "#F9FAFB",
                      color: ans === v ? (v === "yes" ? "#B91C1C" : "#065F46") : "#6B7280",
                      borderColor: ans === v ? (v === "yes" ? "#FCA5A5" : "#86EFAC") : "#E5E7EB" }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={S.actionBar}>
        <button style={S.btnSec} onClick={() => setScreen("setup")}>← Back</button>
        <button style={{ ...S.btnPrim, opacity: step1Done() ? 1 : .4 }} disabled={!step1Done()} onClick={() => setScreen("step2")}>Identify hazards →</button>
      </div>
    </div>
  );

  // ── STEP 2 ──
  if (screen === "step2") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={2} />
      <div style={S.stepLabel}>Step 2 — Identify the hazard(s)</div>
      <div style={S.secSub}>Select all hazard types that apply. <strong>Bold = high risk</strong> — will trigger a SWMS.</div>
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {HAZARDS.map((h) => (
            <button key={h.id} onClick={() => { setHazards((p) => ({ ...p, nil: false, [h.id]: !p[h.id] })); }}
              style={{ border: "0.5px solid", borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: "pointer", lineHeight: 1.3, transition: "all .15s",
                background: hazards[h.id] ? "#FEF2F2" : "#F9FAFB",
                borderColor: hazards[h.id] ? "#FCA5A5" : "#E5E7EB" }}>
              <div style={{ fontSize: 12, fontWeight: h.weight === "high" ? 600 : 400, color: hazards[h.id] ? "#B91C1C" : "#374151" }}>{h.label}</div>
              <div style={{ fontSize: 11, color: hazards[h.id] ? "#EF4444" : "#9CA3AF", marginTop: 2 }}>{h.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => { setHazards({ nil: !hazards.nil }); }}
            style={{ padding: "5px 12px", border: "0.5px solid", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: hazards.nil ? "#EFF6FF" : "#F9FAFB", color: hazards.nil ? "#2563EB" : "#6B7280", borderColor: hazards.nil ? "#93C5FD" : "#E5E7EB" }}>
            Nil hazards
          </button>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>Tick only if no hazards present</span>
        </div>
      </div>
      <div style={S.actionBar}>
        <button style={S.btnSec} onClick={() => setScreen("step1")}>← Back</button>
        <button style={S.btnPrim} onClick={() => setScreen("step3")}>Assess risk →</button>
      </div>
    </div>
  );

  // ── STEP 3 ──
  if (screen === "step3") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={3} />
      <div style={S.stepLabel}>Step 3 — Assess level of risk</div>
      <div style={{ borderRadius: 10, padding: "1rem 1.1rem", marginBottom: ".75rem", border: "0.5px solid",
        background: result === "safe" ? "#F0FDF4" : result === "warning" ? "#FFFBEB" : "#FEF2F2",
        borderColor: result === "safe" ? "#86EFAC" : result === "warning" ? "#FCD34D" : "#FCA5A5" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: result === "safe" ? "#15803D" : result === "warning" ? "#92400E" : "#B91C1C" }}>
          {result === "safe" ? "✓ Proceed safely — Step 5" : result === "warning" ? "⚠ Additional controls required" : "✕ SWMS required — do not proceed"}
        </div>
        <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4, color: result === "safe" ? "#166534" : result === "warning" ? "#78350F" : "#991B1B" }}>
          {result === "safe" ? "No high-risk hazards identified. Apply standard controls and PPE." : result === "warning" ? "Medium-level hazards identified. Apply hierarchy of controls before proceeding." : "High-risk construction activity identified. Complete and sign a SWMS before work commences."}
        </div>
      </div>

      {selectedHazards.length > 0 && (
        <>
          <div style={S.divider}>Identified hazards</div>
          {selectedHazards.map((h) => (
            <div key={h.id} style={{ fontSize: 13, padding: "5px 0", borderBottom: "0.5px solid #F3F4F6", color: "#6B7280" }}>
              <span style={{ color: h.weight === "high" ? "#EF4444" : "#F59E0B", fontSize: 11 }}>●</span> {h.label} — {h.sub}
            </div>
          ))}
        </>
      )}

      <div style={S.divider}>Risk matrix</div>
      <div style={{ overflowX: "auto", marginBottom: ".75rem" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "0.5px solid #E5E7EB", padding: "5px 6px", background: "#F9FAFB", textAlign: "center" }}>L \ C</th>
              {CONSEQUENCE.map((c) => <th key={c} style={{ border: "0.5px solid #E5E7EB", padding: "5px 6px", background: "#F9FAFB", whiteSpace: "nowrap" }}>{c.split("(")[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {LIKELIHOOD.map((l, li) => (
              <tr key={l}>
                <th style={{ border: "0.5px solid #E5E7EB", padding: "5px 6px", background: "#F9FAFB", whiteSpace: "nowrap", textAlign: "left" }}>{l.split("(")[0]}</th>
                {CONSEQUENCE.map((_, ci) => {
                  const r = matrixRating(li, ci);
                  const c = RISK_COLORS[r] || {};
                  return <td key={ci} style={{ border: "0.5px solid #E5E7EB", padding: "5px 6px", background: c.bg, color: c.color, textAlign: "center", fontWeight: 500 }}>{r}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.actionBar}>
        <button style={S.btnSec} onClick={() => setScreen("step2")}>← Back</button>
        {needsLift() && <button style={S.btnPurple} onClick={() => setScreen("lift")}>🏗 Lift analysis</button>}
        {result === "swms" ? <button style={S.btnPrim} onClick={() => setScreen("swms")}>Complete SWMS →</button>
          : <button style={S.btnPrim} onClick={() => setScreen("complete")}>Sign off →</button>}
      </div>
    </div>
  );

  // ── LIFT ──
  if (screen === "lift") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={3} />
      <div style={S.stepLabel}>Lift risk analysis</div>
      <div style={S.secSub}>Complete all items before any lifting operation. A "No" stops the lift.</div>
      <div style={S.card}>
        {LIFT_CHECKS.map((lc, i) => {
          const ans = liftChecks[i];
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: "0.5px solid #F3F4F6" }}>
              <span style={{ flex: 1, fontSize: 13, color: "#374151", lineHeight: 1.4 }}>{lc}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["yes", "no", "na"].map((v) => (
                  <button key={v} onClick={() => setLiftChecks((p) => ({ ...p, [i]: v }))}
                    style={{ padding: "3px 8px", borderRadius: 5, border: "0.5px solid", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: ans === v ? (v === "no" ? "#FEE2E2" : v === "yes" ? "#D1FAE5" : "#EFF6FF") : "#F9FAFB",
                      color: ans === v ? (v === "no" ? "#B91C1C" : v === "yes" ? "#065F46" : "#2563EB") : "#6B7280",
                      borderColor: ans === v ? (v === "no" ? "#FCA5A5" : v === "yes" ? "#86EFAC" : "#93C5FD") : "#E5E7EB" }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ ...S.card, background: "#F5F3FF", border: "0.5px solid #DDD6FE" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", marginBottom: 8 }}>🏗 Load details</div>
        <div style={S.grid2}>
          <div><label style={S.label}>Load description</label><input style={S.input} value={liftDetails.load} onChange={(e) => setLiftDetails((p) => ({ ...p, load: e.target.value }))} placeholder="e.g. Hydraulic pump" /></div>
          <div><label style={S.label}>Weight (t)</label><input style={S.input} type="number" value={liftDetails.weight} onChange={(e) => setLiftDetails((p) => ({ ...p, weight: e.target.value }))} placeholder="e.g. 2.5" /></div>
          <div><label style={S.label}>Crane / equipment</label><input style={S.input} value={liftDetails.crane} onChange={(e) => setLiftDetails((p) => ({ ...p, crane: e.target.value }))} placeholder="e.g. 50t mobile crane" /></div>
          <div><label style={S.label}>Lift radius (m)</label><input style={S.input} type="number" value={liftDetails.radius} onChange={(e) => setLiftDetails((p) => ({ ...p, radius: e.target.value }))} placeholder="e.g. 12" /></div>
        </div>
      </div>
      {Object.values(liftChecks).some((v) => v === "no") && (
        <div style={{ borderRadius: 10, padding: "10px 1rem", background: "#FEF2F2", border: "0.5px solid #FCA5A5", marginBottom: ".75rem", fontSize: 13, color: "#B91C1C", fontWeight: 500 }}>
          ✕ Lift must not proceed — resolve all "No" items first.
        </div>
      )}
      <div style={S.actionBar}>
        <button style={S.btnSec} onClick={() => setScreen("step3")}>← Back</button>
        <button style={S.btnPrim} onClick={() => setScreen(result === "swms" ? "swms" : "complete")}>Continue →</button>
      </div>
    </div>
  );

  // ── SWMS ──
  if (screen === "swms") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={4} />
      <div style={S.stepLabel}>Step 4 — Safe Work Method Statement</div>
      <div style={S.secSub}>Document each hazard with risk ratings, control measures, and responsible person.</div>

      <div style={S.divider}>Job details</div>
      <div style={S.grid3}>
        <div><label style={S.label}>Task</label><input style={S.input} value={form.task} onChange={setF("task")} placeholder="Task description" /></div>
        <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={setF("location")} placeholder="Location" /></div>
        <div><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={setF("date")} /></div>
      </div>

      <div style={S.divider}>Hazards & controls</div>
      {swmsHazards.map((h, i) => {
        const ir = h.initialL !== "" && h.initialC !== "" ? matrixRating(parseInt(h.initialL), parseInt(h.initialC)) : null;
        const rr = h.residualL !== "" && h.residualC !== "" ? matrixRating(parseInt(h.residualL), parseInt(h.residualC)) : null;
        return (
          <div key={h.id} style={{ ...S.card, position: "relative" }}>
            <button onClick={() => removeSwmsRow(h.id)} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 18 }}>×</button>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", marginBottom: 6 }}>Hazard {i + 1}</div>
            <div><label style={S.label}>Hazard description</label><input style={S.input} value={h.hazard} onChange={(e) => updateSwms(h.id, "hazard", e.target.value)} placeholder="Describe the hazard..." /></div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", margin: "10px 0 4px" }}>Initial risk (before controls)</div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Likelihood</label>
                <select style={S.input} value={h.initialL} onChange={(e) => updateSwms(h.id, "initialL", e.target.value)}>
                  <option value="">Select...</option>
                  {LIKELIHOOD.map((l, li) => <option key={li} value={li}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Consequence</label>
                <select style={S.input} value={h.initialC} onChange={(e) => updateSwms(h.id, "initialC", e.target.value)}>
                  <option value="">Select...</option>
                  {CONSEQUENCE.map((c, ci) => <option key={ci} value={ci}>{c}</option>)}
                </select>
              </div>
            </div>
            {ir && <div style={{ marginTop: 4 }}>Initial risk: <RiskBadge rating={ir} /></div>}
            <div style={{ marginTop: 8 }}>
              <label style={S.label}>Control measures (hierarchy: Eliminate → Substitute → Isolate → Engineer → Admin → PPE)</label>
              <textarea style={S.textarea} value={h.controls} onChange={(e) => updateSwms(h.id, "controls", e.target.value)} placeholder="List control measures..." />
            </div>
            <div style={{ marginTop: 6 }}><label style={S.label}>Person responsible for implementation</label><input style={S.input} value={h.responsible} onChange={(e) => updateSwms(h.id, "responsible", e.target.value)} placeholder="Name / role" /></div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", margin: "10px 0 4px" }}>Residual risk (after controls)</div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Likelihood</label>
                <select style={S.input} value={h.residualL} onChange={(e) => updateSwms(h.id, "residualL", e.target.value)}>
                  <option value="">Select...</option>
                  {LIKELIHOOD.map((l, li) => <option key={li} value={li}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Consequence</label>
                <select style={S.input} value={h.residualC} onChange={(e) => updateSwms(h.id, "residualC", e.target.value)}>
                  <option value="">Select...</option>
                  {CONSEQUENCE.map((c, ci) => <option key={ci} value={ci}>{c}</option>)}
                </select>
              </div>
            </div>
            {rr && <div style={{ marginTop: 4 }}>Residual risk: <RiskBadge rating={rr} /></div>}
          </div>
        );
      })}
      <button onClick={addSwmsRow} style={{ width: "100%", padding: "8px", border: "0.5px dashed #D1D5DB", borderRadius: 8, background: "none", fontSize: 13, color: "#2563EB", cursor: "pointer", marginBottom: ".75rem" }}>+ Add hazard</button>

      <div style={S.divider}>Sign-off</div>
      <div style={S.grid2}>
        <div><label style={S.label}>Worker name</label><input style={S.input} value={sigWorker} onChange={(e) => setSigWorker(e.target.value)} placeholder="Worker full name" /></div>
        <div><label style={S.label}>Supervisor / authorising person</label><input style={S.input} value={sigSupervisor} onChange={(e) => setSigSupervisor(e.target.value)} placeholder="Supervisor name" /></div>
      </div>
      <div style={{ ...S.actionBar }}>
        <button style={S.btnSec} onClick={() => setScreen("step3")}>← Back</button>
        <button style={S.btnPrim} onClick={() => setScreen("complete")}>Complete SWMS →</button>
      </div>
    </div>
  );

  // ── COMPLETE ──
  if (screen === "complete") return (
    <div style={S.app}>
      {commonHeader}
      <Pips active={5} />
      <div style={{ textAlign: "center", padding: ".5rem 0 1rem" }}>
        <div style={{ width: 56, height: 56, background: "#D1FAE5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 28 }}>✓</div>
        <div style={{ fontSize: 17, fontWeight: 500 }}>Safety check complete</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{form.date} {form.time} · {profile?.company_name}</div>
      </div>

      <div style={{ borderRadius: 10, padding: "1rem 1.1rem", background: "#F0FDF4", border: "0.5px solid #86EFAC", marginBottom: ".75rem" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#15803D" }}>Safe to proceed — Step 5</div>
        <div style={{ fontSize: 13, color: "#166534", marginTop: 4, lineHeight: 1.4 }}>
          {result === "swms" ? "SWMS completed and signed. All hazards documented with control measures." : "Take 5 complete. Standard controls apply."} If conditions change — stop and reassess.
        </div>
      </div>

      <div style={{ ...S.card, background: "#F9FAFB" }}>
        <div style={S.divider}>Summary</div>
        {[
          ["Task", form.task], ["Location", form.location], ["Job ref", form.jobRef],
          ["Hazards", selectedHazards.map((h) => h.label).join(", ") || "None"],
          ["SWMS required", result === "swms" ? "Yes" : "No"],
          result === "swms" && ["Hazards documented", swmsHazards.length],
          needsLift() && ["Lift analysis", "Completed"],
          ["Worker", sigWorker], ["Supervisor", sigSupervisor],
        ].filter(Boolean).map(([k, v]) => v ? (
          <div key={k} style={{ fontSize: 13, padding: "4px 0", borderBottom: "0.5px solid #F3F4F6", color: "#374151" }}>
            <strong>{k}:</strong> {v}
          </div>
        ) : null)}
      </div>

      <div style={{ ...S.card }}>
        <div style={S.divider}>Save & export</div>
        {cloudMsg && <div style={{ fontSize: 12, marginBottom: 8, color: cloudMsg.includes("✓") ? "#065F46" : "#B91C1C" }}>{cloudMsg}</div>}
        <div style={S.grid2}>
          <button style={{ ...S.btnPrim, opacity: saving ? .5 : 1 }} onClick={saveToCloud} disabled={saving || !!savedId}>
            {saving ? "Saving..." : savedId ? "Saved ✓" : "Save to cloud"}
          </button>
          <button style={S.btnSec} onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div style={S.actionBar}>
        <button style={S.btnSec} onClick={() => setScreen("records")}>View records</button>
        <button style={S.btnPrim} onClick={resetAll}>New Take 5</button>
      </div>
    </div>
  );

  return null;
}

// ── PDF builder ───────────────────────────────────────────────────────────────
function buildPDFHtml(rec, profile) {
  return `<html><head><style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;max-width:800px;margin:0 auto;padding:20px}
    h1{font-size:18px}h2{font-size:13px;margin:14px 0 5px;border-bottom:1px solid #ddd;padding-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    td,th{border:1px solid #ccc;padding:5px 7px;font-size:11px}th{background:#f5f5f5;font-weight:600}
    .L{background:#D1FAE5;color:#065F46;padding:1px 5px;border-radius:3px}
    .M{background:#FEF3C7;color:#78350F;padding:1px 5px;border-radius:3px}
    .H{background:#FEE2E2;color:#B91C1C;padding:1px 5px;border-radius:3px}
    .E{background:#7F1D1D;color:#FEE2E2;padding:1px 5px;border-radius:3px}
    .sig{border:1px solid #ccc;height:36px;border-radius:3px;margin-top:4px}
  </style></head><body>
  <h1>Take 5 Safety ${rec.result === "swms" ? "& SWMS" : ""}</h1>
  <div style="font-size:11px;color:#555;margin-bottom:12px">${profile?.company_name || ""} &nbsp;|&nbsp; ${rec.date} ${rec.time} &nbsp;|&nbsp; Ref: ${rec.jobRef || "—"}</div>
  <h2>Job details</h2>
  <table><tr><th>Task</th><th>Location</th><th>Date</th><th>Time</th></tr>
  <tr><td>${rec.task || "—"}</td><td>${rec.location || "—"}</td><td>${rec.date}</td><td>${rec.time}</td></tr></table>
  <h2>Step 1 — Pre-task checklist</h2>
  <table><tr><th>Question</th><th>Answer</th></tr>
  ${STEP1_CHECKS.map((c) => `<tr><td>${c.text}</td><td>${rec.step1?.[c.id] || "—"}</td></tr>`).join("")}</table>
  <h2>Step 2 — Hazards identified</h2>
  <p>${(rec.hazards || []).map((id) => HAZARDS.find((h) => h.id === id)?.label || id).join(", ") || "None"}</p>
  <h2>Step 3 — Risk result</h2>
  <p><span class="${rec.result === "swms" ? "H" : rec.result === "warning" ? "M" : "L"}">${rec.result === "swms" ? "SWMS Required" : rec.result === "warning" ? "Warning" : "Safe to proceed"}</span></p>
  ${rec.liftDetails?.load ? `<h2>Lift analysis</h2>
  <table><tr><th>Load</th><th>Weight</th><th>Crane</th><th>Radius</th></tr>
  <tr><td>${rec.liftDetails.load}</td><td>${rec.liftDetails.weight}t</td><td>${rec.liftDetails.crane}</td><td>${rec.liftDetails.radius}m</td></tr></table>` : ""}
  ${rec.result === "swms" ? `<h2>Step 4 — SWMS</h2>
  <table><tr><th>Hazard</th><th>Initial risk</th><th>Control measures</th><th>Responsible</th><th>Residual risk</th></tr>
  ${(rec.swmsHazards || []).map((h) => {
    const ir = h.initialL !== "" && h.initialC !== "" ? matrixRating(parseInt(h.initialL), parseInt(h.initialC)) : null;
    const rr = h.residualL !== "" && h.residualC !== "" ? matrixRating(parseInt(h.residualL), parseInt(h.residualC)) : null;
    return `<tr><td>${h.hazard || "—"}</td><td>${ir ? `<span class="${ir[0]}">${ir}</span>` : "—"}</td><td>${h.controls || "—"}</td><td>${h.responsible || "—"}</td><td>${rr ? `<span class="${rr[0]}">${rr}</span>` : "—"}</td></tr>`;
  }).join("")}
  </table>` : ""}
  <h2>Step 5 — Sign-off</h2>
  <table><tr><th>Worker</th><th>Supervisor</th></tr>
  <tr><td>${rec.sigWorker || "—"}<div class="sig"></div></td><td>${rec.sigSupervisor || "—"}<div class="sig"></div></td></tr></table>
  </body></html>`;
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid) {
    const { data } = await supabase
      .from("profiles")
      .select("*, companies(name, logo_url)")
      .eq("id", uid)
      .single();
    setProfile(data ? { ...data, company_name: data.companies?.name, logo_url: data.companies?.logo_url } : null);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#6B7280", fontSize: 14 }}>
      Loading...
    </div>
  );

  if (!session) return <AuthScreen onAuth={setSession} />;
  return <Take5App session={session} profile={profile} onLogout={handleLogout} />;
}
