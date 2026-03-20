import { useState, useEffect, useRef } from "react";

const STAGES = ["New Inquiry", "Booked", "Intake Sent", "Active Client", "Follow-up"];

const STAGE_COLORS = {
  "New Inquiry":   { bg: "#FFF4E6", accent: "#F97316", dot: "#F97316", light: "#FED7AA" },
  "Booked":        { bg: "#EFF6FF", accent: "#3B82F6", dot: "#3B82F6", light: "#BFDBFE" },
  "Intake Sent":   { bg: "#F0FDF4", accent: "#16A34A", dot: "#16A34A", light: "#BBF7D0" },
  "Active Client": { bg: "#FAF5FF", accent: "#9333EA", dot: "#9333EA", light: "#E9D5FF" },
  "Follow-up":     { bg: "#FFF1F2", accent: "#E11D48", dot: "#E11D48", light: "#FECDD3" },
};

// ── Column name map: matched exactly to Taniya's Google Sheet headers ──
const COL = {
  timestamp:       "Timestamp",
  name:            "Name",
  email:           "Email Address",
  phone:           "Phone Number (preferably WhatsApp)",
  dob:             "Date of Birth",
  gender:          "Gender",
  city:            "City /Location",
  workedBefore:    "Have you worked with me before?",
  // 🌿 Returning/Referred client questions
  lastProgram:     "🌿Which program did we last work on together?",
  progress:        "🌿How has your progress been since we last worked together? ",
  referralCode:    "🌿Please enter your referral/ client code",
  serviceRet:      "🌿Which service would you like to book?",
  // 🌱 New client questions
  prevNutri:       "🌱Have you worked with a nutritionist or dietitian before? ",
  source:          "🌱How did you hear about me?",
  serviceNew:      "🌱Which service would you like to book?",
  // 🌱 New client plans
  planConsultNew:  "🌱Choose your 1:1 Nutrition Consultation plan",
  planHabitNew:    "🌱Choose your Habit Building Program plan",
  planFastNew:     "🌱Choose your Metabolic Reset plan",
  planFamilyNew:   "🌱Choose your Homemaker's Family plan",
  // 🌿 Returning/Referred client plans
  planConsultRet:  "🌿Choose your 1:1 Nutrition Consultation plan",
  planHabitRet:    "🌿Choose your Habit Building plan",
  planFastRet:     "🌿Choose your Metabolic Reset plan",
  planFamilyRet:   "🌿Choose your Homemaker's Family plan",
  // Health background (all clients)
  goal:            "What are your primary health goals or concerns?",
  conditions:      "Do you have any existing health conditions? (Select all that apply)",
  onMedication:    "Are you currently on any medication?",
  medications:     "Name of Medicines taken and its doses.",
  sessionMode:     "How would you like to attend your session?",
  prefWeekend:     "Preferred Slot [Weekend]",
  prefWeekday:     "Preferred Slot [Weekdays]",
  prefDate:        "Preferred Date",
  extraNotes:      "Anything else you'd like me to know before your session? ",
  labReports:      "Please upload your latest blood reports or doctor's prescription for reference.",
};

// Helper: pick whichever plan column has a value + detect client type from 🌱/🌿
function getSelectedPlan(row) {
  const plans = [
    { service: "1:1 Nutrition Consultation",      clientType: "🌱 New Client",              key: COL.planConsultNew },
    { service: "1:1 Nutrition Consultation",      clientType: "🌿 Returning / Referred",     key: COL.planConsultRet },
    { service: "Habit Building Program",          clientType: "🌱 New Client",              key: COL.planHabitNew },
    { service: "Habit Building Program",          clientType: "🌿 Returning / Referred",     key: COL.planHabitRet },
    { service: "Metabolic Reset & Water Fasting", clientType: "🌱 New Client",              key: COL.planFastNew },
    { service: "Metabolic Reset & Water Fasting", clientType: "🌿 Returning / Referred",     key: COL.planFastRet },
    { service: "Homemaker's Family Nutrition",    clientType: "🌱 New Client",              key: COL.planFamilyNew },
    { service: "Homemaker's Family Nutrition",    clientType: "🌿 Returning / Referred",     key: COL.planFamilyRet },
  ];
  for (const p of plans) {
    if (row[p.key]) return { plan: row[p.key], service: p.service, clientType: p.clientType };
  }
  // Fallback: detect type from which service column has a value
  const isReturning = !!row[COL.serviceRet];
  const service = row[COL.serviceNew] || row[COL.serviceRet] || "";
  return {
    plan: "",
    service,
    clientType: isReturning ? "🌿 Returning / Referred" : "🌱 New Client"
  };
}

// ── Client Code Generator ──
// Format: [YY][batch][MM][serial]
// batch = floor((totalThisMonth) / 100), serial = remainder padded to 2 digits
// e.g. 1st client March 2026 = 2600301, 100th = 2610300, 204th = 2620304
function generateClientCode(clients, appointmentDate) {
  const d = appointmentDate ? new Date(appointmentDate) : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  // Count how many clients already exist for this YY+MM
  const existing = clients.filter(c => {
    if (!c.clientCode) return false;
    return c.clientCode.startsWith(yy) && c.clientCode.slice(3, 5) === mm;
  });

  const serial = existing.length + 1; // next serial number (1-indexed)
  const batch  = Math.floor((serial - 1) / 100);       // 0 for 1-99, 1 for 100-199, etc.
  const rem    = ((serial - 1) % 100);                  // 0-99
  const remStr = batch === 0
    ? String(serial).padStart(2, "0")                   // 01–99
    : String(rem).padStart(2, "0");                     // 00–99

  return `${yy}${batch}${mm}${remStr}`;
}

function parseSheetRow(row) {
  const { plan, service, clientType } = getSelectedPlan(row);
  const detectedService = service || row[COL.service] || "";
  return {
    id:           Date.now() + Math.random(),
    name:         row[COL.name]         || "Unknown",
    email:        row[COL.email]        || "",
    phone:        row[COL.phone]        || "",
    dob:          row[COL.dob]          || "",
    gender:       row[COL.gender]       || "",
    city:         row[COL.city]         || "",
    workedBefore: row[COL.workedBefore] || "",
    lastProgram:  row[COL.lastProgram]  || "",
    progress:     row[COL.progress]     || "",
    prevNutri:    row[COL.prevNutri]    || "",
    source:       row[COL.source]       || "Form",
    referralCode: row[COL.referralCode] || "",
    service:      row[COL.serviceNew] || row[COL.serviceRet] || detectedService,
    selectedPlan: plan,
    clientType:   clientType,
    goal:         row[COL.goal]         || "",
    conditions:   row[COL.conditions]   || "",
    onMedication: row[COL.onMedication] || "",
    medications:  row[COL.medications]  || "",
    sessionMode:  row[COL.sessionMode]  || "",
    prefWeekend:  row[COL.prefWeekend]  || "",
    prefWeekday:  row[COL.prefWeekday]  || "",
    prefDate:     row[COL.prefDate]     || "",
    extraNotes:   row[COL.extraNotes]   || "",
    labReports:   row[COL.labReports]   || "",
    stage:        "New Inquiry",
    date:         row[COL.timestamp]
      ? new Date(row[COL.timestamp]).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    notes:        [row[COL.conditions], row[COL.medications]].filter(Boolean).join(" · ") || "",
    clientCode:   "", // will be assigned after insertion via assignClientCodes()
  };
}

// Assign codes to all clients that don't have one yet (run after bulk import)
function assignClientCodes(clients) {
  const sorted = [...clients].sort((a, b) => new Date(a.date) - new Date(b.date));
  const codeMap = {};
  return sorted.map(c => {
    if (c.clientCode) { codeMap[c.clientCode] = true; return c; }
    const code = generateClientCode(Object.values(codeMap).map((_,i) => ({ clientCode: Object.keys(codeMap)[i] })), c.date);
    codeMap[code] = true;
    return { ...c, clientCode: code };
  });
}

export default function ClientHub() {
  const [clients, setClients]           = useState([]);
  const [selectedClient, setSelected]   = useState(null);
  const [activeTab, setActiveTab]       = useState("pipeline");
  const [channel, setChannel]           = useState("whatsapp");
  const [copied, setCopied]             = useState("");
  const [checked, setChecked]           = useState({});
  const [showAdd, setShowAdd]           = useState(false);
  const [showSync, setShowSync]         = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiMsg, setAiMsg]               = useState("");
  const [aiPrompt, setAiPrompt]         = useState("");
  const [search, setSearch]             = useState("");
  const [filterStage, setFilterStage]   = useState("All");
  const [syncStatus, setSyncStatus]     = useState("");
  const [webhookUrl, setWebhookUrl]     = useState("");
  const [newC, setNewC]                 = useState({ name:"", stage:"New Inquiry", source:"Instagram", goal:"", phone:"", email:"", conditions:"", medications:"", notes:"" });
  const pollRef = useRef(null);

  // Load from persistent storage on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("clients");
        if (r?.value) setClients(JSON.parse(r.value));
        const ch = await window.storage.get("checked");
        if (ch?.value) setChecked(JSON.parse(ch.value));
      } catch {}
    })();
  }, []);

  // Save clients to persistent storage whenever they change
  useEffect(() => {
    if (clients.length === 0) return;
    window.storage.set("clients", JSON.stringify(clients)).catch(() => {});
  }, [clients]);

  useEffect(() => {
    window.storage.set("checked", JSON.stringify(checked)).catch(() => {});
  }, [checked]);

  // Expose webhook receiver — Google Apps Script POSTs here via a relay
  useEffect(() => {
    window.__receiveSheetData = (rows) => {
      const incoming = rows.map(parseSheetRow);
      setClients(prev => {
        const existingEmails = new Set(prev.map(c => c.email?.toLowerCase()));
        const fresh = incoming.filter(c => !existingEmails.has(c.email?.toLowerCase()));
        if (fresh.length === 0) { setSyncStatus("✓ No new clients"); return prev; }
        setSyncStatus(`✓ ${fresh.length} new client(s) added`);
        setTimeout(() => setSyncStatus(""), 4000);
        return assignClientCodes([...prev, ...fresh]);
      });
    };
    return () => { delete window.__receiveSheetData; };
  }, []);

  const filtered = clients.filter(c =>
    (filterStage === "All" || c.stage === filterStage) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     (c.goal || "").toLowerCase().includes(search.toLowerCase()))
  );

  const stageCount = s => clients.filter(c => c.stage === s).length;

  const getTemplate = (stage, ch) => {
    const t = TEMPLATES[stage];
    if (!t) return "";
    if (ch === "email") return `Subject: ${t.email.subject}\n\n${t.email.body}`;
    return t[ch] || "";
  };

  const personalise = (tpl, client) => {
    if (!client) return tpl;
    return tpl.replace(/\[Name\]/g, client.name.split(" ")[0]);
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleCheck = (clientId, item) => {
    const key = `${clientId}-${item}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const moveStage = (client, dir) => {
    const idx = STAGES.indexOf(client.stage);
    const next = STAGES[idx + dir];
    if (!next) return;
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, stage: next } : c));
    setSelected(prev => prev?.id === client.id ? { ...prev, stage: next } : prev);
  };

  const addClient = () => {
    if (!newC.name) return;
    const dateStr = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" });
    setClients(prev => {
      const code = generateClientCode(prev, new Date());
      const c = { ...newC, id: Date.now(), date: dateStr, clientCode: code };
      return [...prev, c];
    });
    setShowAdd(false);
    setNewC({ name:"", stage:"New Inquiry", source:"Instagram", goal:"", phone:"", email:"", conditions:"", medications:"", notes:"" });
  };

  const generateAi = async () => {
    if (!selectedClient || !aiPrompt.trim()) return;
    setAiLoading(true); setAiMsg("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are Taniya, a Certified Diabetes Educator and Nutritionist with an M.Sc. in Applied Nutrition and 10 years of expertise. Write warm, professional, empathetic client messages. Be concise and encouraging. Use emojis sparingly. Sign off as Taniya.`,
          messages: [{ role: "user", content: `Client: ${selectedClient.name}. Stage: ${selectedClient.stage}. Goal: ${selectedClient.goal}. Conditions: ${selectedClient.conditions}. Medications: ${selectedClient.medications}. Preferred time: ${selectedClient.prefTime}. Channel: ${channel}. Task: ${aiPrompt}` }]
        })
      });
      const data = await res.json();
      setAiMsg(data.content?.find(b => b.type === "text")?.text || "Could not generate message.");
    } catch { setAiMsg("Error generating message. Please try again."); }
    setAiLoading(false);
  };

  const sc = STAGE_COLORS;

  const appsScript = `// ═══════════════════════════════════════════════════════
// Body Bio Balance Consultancy — Google Apps Script
// Paste this into: Extensions → Apps Script in your Sheet
// Then set up a trigger: Triggers → onFormSubmit
// ═══════════════════════════════════════════════════════

const WEBHOOK_URL = "${webhookUrl || "PASTE_YOUR_WEBHOOK_URL_HERE"}";

function onFormSubmit(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const lastRow = sheet.getLastRow();
    const rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Build object from headers + row
    const clientData = {};
    headers.forEach((h, i) => { clientData[h] = rowData[i]; });

    const payload = JSON.stringify([clientData]);

    const options = {
      method: "post",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Webhook response: " + response.getContentText());
  } catch (err) {
    Logger.log("Error: " + err.toString());
  }
}

// Run this once to sync ALL existing rows (optional)
function syncAllClients() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(rows),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log("Synced " + rows.length + " clients.");
}`;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#F7F6F2", minHeight:"100vh", color:"#1C1917" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .serif{font-family:'Cormorant Garamond',serif}
        .btn{cursor:pointer;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all .18s}
        .btn:hover{filter:brightness(.92)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .card{background:white;border-radius:14px;border:1px solid #E8E5DF}
        .tag{border-radius:20px;font-size:11px;font-weight:500;padding:3px 10px;display:inline-block}
        .tab{padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all .18s;border:none;background:transparent;font-family:'DM Sans',sans-serif}
        .tab.active{background:#1C1917;color:white}
        .tab:not(.active){color:#78716C}
        .tab:not(.active):hover{background:#EFEDE8}
        input,textarea,select{font-family:'DM Sans',sans-serif;font-size:13px;border:1px solid #E8E5DF;border-radius:8px;padding:9px 12px;width:100%;outline:none;background:white;transition:border .18s;color:#1C1917}
        input:focus,textarea:focus,select:focus{border-color:#92400E}
        .crow{padding:12px 16px;border-radius:10px;cursor:pointer;transition:background .15s;border:1.5px solid transparent}
        .crow:hover{background:#F5F3EE}
        .crow.sel{background:#FFF8F0;border-color:#F59E0B}
        .scroll{overflow-y:auto}
        .scroll::-webkit-scrollbar{width:4px}
        .scroll::-webkit-scrollbar-thumb{background:#D6D3D1;border-radius:4px}
        .chbtn{padding:7px 14px;border-radius:8px;border:1.5px solid #E8E5DF;cursor:pointer;font-size:12px;font-weight:500;font-family:'DM Sans',sans-serif;transition:all .18s;background:white}
        .chbtn.active{border-color:#92400E;background:#FFF8F0;color:#92400E}
        .dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
        .aibtn{background:linear-gradient(135deg,#7C3AED,#A855F7);color:white;padding:9px 18px;border-radius:9px;border:none;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s}
        .aibtn:disabled{opacity:.6;cursor:not-allowed}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:white;border-radius:18px;padding:28px;width:560px;max-width:100%;max-height:90vh;overflow-y:auto}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn .25s ease}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .pulse{animation:pulse 1.2s infinite}
        .code{background:#1C1917;color:#FDE68A;border-radius:10px;padding:16px;font-size:11.5px;font-family:monospace;white-space:pre;overflow-x:auto;line-height:1.6}
        .stepbadge{width:26px;height:26px;border-radius:50%;background:#F59E0B;color:#1C1917;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pill{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
      `}</style>

      {/* Header */}
      <div style={{ background:"#1C1917", color:"white", padding:"18px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="serif" style={{ fontSize:26, fontWeight:600, color:"#FDE68A", letterSpacing:".01em" }}>Body Bio Balance Consultancy</h1>
          <p style={{ fontSize:12, color:"#A8A29E", marginTop:2 }}>Client Management Hub · Nutrition Practice</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {syncStatus && <span style={{ background:"#166534", color:"#BBF7D0", padding:"6px 14px", borderRadius:8, fontSize:12 }}>{syncStatus}</span>}
          <div style={{ background:"#292524", borderRadius:10, padding:"8px 14px", fontSize:12 }}>
            <span style={{ color:"#A8A29E" }}>Active: </span><span style={{ color:"#FDE68A", fontWeight:600 }}>{stageCount("Active Client")}</span>
          </div>
          <div style={{ background:"#292524", borderRadius:10, padding:"8px 14px", fontSize:12 }}>
            <span style={{ color:"#A8A29E" }}>Total: </span><span style={{ color:"#FDE68A", fontWeight:600 }}>{clients.length}</span>
          </div>
          <button className="btn" onClick={() => setShowSync(true)}
            style={{ background:"#78350F", color:"#FDE68A", padding:"9px 16px", border:"1px solid #92400E" }}>
            🔗 Google Sheets Sync
          </button>
          <button className="btn" onClick={() => setShowAdd(true)}
            style={{ background:"#F59E0B", color:"#1C1917", padding:"9px 16px", fontWeight:600 }}>
            + Add Client
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"14px 28px 0", display:"flex", gap:4, borderBottom:"1px solid #E8E5DF", background:"white" }}>
        {[["pipeline","📋 Pipeline"],["templates","✉️ Templates"],["checklist","✅ Checklist"],["ai-compose","✨ AI Compose"],["profile","👤 Full Profile"]].map(([t,l]) => (
          <button key={t} className={`tab ${activeTab===t?"active":""}`} onClick={() => setActiveTab(t)}>{l}</button>
        ))}
      </div>

      <div style={{ padding:"20px 28px", display:"flex", gap:20, alignItems:"flex-start" }}>

        {/* Client List */}
        <div className="card" style={{ width:280, flexShrink:0 }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #F5F3EE" }}>
            <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:8 }} />
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)}>
              <option>All</option>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="scroll" style={{ maxHeight:520 }}>
            {filtered.length === 0 && (
              <div style={{ padding:24, textAlign:"center" }}>
                <p style={{ color:"#A8A29E", fontSize:13 }}>No clients yet</p>
                <p style={{ color:"#D6D3D1", fontSize:11, marginTop:4 }}>Add manually or sync from Google Sheets</p>
              </div>
            )}
            {filtered.map(c => (
              <div key={c.id} className={`crow ${selectedClient?.id===c.id?"sel":""}`} onClick={() => { setSelected(c); setAiMsg(""); setAiPrompt(""); }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <p style={{ fontWeight:500, fontSize:14 }}>{c.name}</p>
                      {c.clientCode && <span style={{ fontSize:10, fontFamily:"monospace", color:"#A8A29E", background:"#F5F3EE", borderRadius:4, padding:"1px 6px" }}>#{c.clientCode}</span>}
                    </div>
                    <p style={{ fontSize:11, color:"#78716C", marginTop:2 }}>{c.goal || "No goal specified"}</p>
                  </div>
                  <span className="tag" style={{ background:sc[c.stage]?.bg, color:sc[c.stage]?.accent, fontSize:10 }}>{c.stage}</span>
                </div>
                <div style={{ display:"flex", gap:10, marginTop:6, fontSize:11, color:"#A8A29E", flexWrap:"wrap" }}>
                  <span>📥 {c.source}</span><span>📅 {c.date}</span>
                  {c.clientType && <span style={{ color: c.clientType==="New Client" ? "#16A34A" : "#9333EA" }}>
                    {c.clientType==="New Client" ? "🌱 New" : "⭐ Returning"}
                  </span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {!selectedClient && (
            <div className="card" style={{ padding:48, textAlign:"center" }}>
              <p className="serif" style={{ fontSize:24, color:"#A8A29E", fontStyle:"italic" }}>Select a client to begin</p>
              <p style={{ fontSize:13, color:"#D6D3D1", marginTop:8 }}>or sync from Google Sheets →</p>
            </div>
          )}

          {selectedClient && (() => {
            const s = selectedClient;
            const color = sc[s.stage];
            return (
              <div className="fi">
                {/* Client Banner */}
                <div className="card" style={{ padding:"16px 22px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, background:color.bg, borderColor:color.accent+"50" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <h2 className="serif" style={{ fontSize:22, fontWeight:600 }}>{s.name}</h2>
                      {s.clientCode && (
                        <span style={{ background:"#1C1917", color:"#FDE68A", borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:700, letterSpacing:".05em", fontFamily:"monospace" }}>
                          #{s.clientCode}
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:14, marginTop:5, fontSize:12, color:"#57534E", flexWrap:"wrap" }}>
                      {s.goal && <span>🎯 {s.goal}</span>}
                      {s.phone && <span>📱 {s.phone}</span>}
                      {s.email && <span>✉️ {s.email}</span>}
                      {s.prefTime && <span>🕐 {s.prefTime}</span>}
                    </div>
                    {s.selectedPlan && <p style={{ marginTop:5, fontSize:12, color:"#92400E", fontWeight:500 }}>📦 {s.selectedPlan} {s.clientType ? `(${s.clientType})` : ""}</p>}
                    {s.conditions && <p style={{ marginTop:4, fontSize:12, color:"#78716C", fontStyle:"italic" }}>⚕️ {s.conditions}</p>}
                    {s.medications && <p style={{ marginTop:3, fontSize:12, color:"#78716C", fontStyle:"italic" }}>💊 {s.medications}</p>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                    <span className="pill" style={{ background:color.accent, color:"white" }}>{s.stage}</span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="btn" onClick={() => moveStage(s,-1)} disabled={STAGES.indexOf(s.stage)===0}
                        style={{ background:"white", border:"1px solid #E8E5DF", padding:"5px 12px", fontSize:11, color:"#57534E" }}>← Back</button>
                      <button className="btn" onClick={() => moveStage(s,1)} disabled={STAGES.indexOf(s.stage)===STAGES.length-1}
                        style={{ background:color.accent, color:"white", padding:"5px 12px", fontSize:11 }}>Next Stage →</button>
                    </div>
                  </div>
                </div>

                {/* Pipeline */}
                {activeTab==="pipeline" && (
                  <div className="card" style={{ padding:20 }}>
                    <h3 className="serif" style={{ fontSize:18, marginBottom:16 }}>Journey Pipeline</h3>
                    <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:8 }}>
                      {STAGES.map((stage, i) => {
                        const isCurrent = s.stage===stage;
                        const isDone = i < STAGES.indexOf(s.stage);
                        return (
                          <div key={stage} style={{ flex:"1 0 130px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                              <span className="dot" style={{ background:sc[stage].dot, marginTop:1 }} />
                              <p style={{ fontSize:10, fontWeight:600, color:"#57534E", textTransform:"uppercase", letterSpacing:".05em", lineHeight:1.3 }}>{stage}</p>
                            </div>
                            <div style={{ padding:"10px 12px", borderRadius:10, background:sc[stage].bg, border:`1.5px solid ${isCurrent?sc[stage].accent:"transparent"}`, minHeight:56 }}>
                              {isCurrent ? (
                                <div>
                                  <p style={{ fontSize:13, fontWeight:600 }}>{s.name.split(" ")[0]}</p>
                                  <p style={{ fontSize:11, color:"#78716C", marginTop:2 }}>{s.date}</p>
                                </div>
                              ) : (
                                <p style={{ fontSize:11, color: isDone?"#22C55E":"#D6D3D1", fontStyle:"italic" }}>
                                  {isDone ? "✓ Done" : "Upcoming"}
                                </p>
                              )}
                            </div>
                            <p style={{ fontSize:10, color:"#A8A29E", textAlign:"center", marginTop:4 }}>{stageCount(stage)} total</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {activeTab==="templates" && (
                  <div className="card" style={{ padding:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                      <h3 className="serif" style={{ fontSize:18 }}>Templates — {s.stage}</h3>
                      <div style={{ display:"flex", gap:6 }}>
                        {["whatsapp","email","instagram"].map(ch => (
                          <button key={ch} className={`chbtn ${channel===ch?"active":""}`} onClick={() => setChannel(ch)}>
                            {ch==="whatsapp"?"💬 WhatsApp":ch==="email"?"✉️ Email":"📸 Instagram"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ position:"relative" }}>
                      <textarea value={personalise(getTemplate(s.stage, channel), s)} readOnly
                        rows={channel==="email"?12:7}
                        style={{ fontSize:13, lineHeight:1.75, background:"#FAFAF7", resize:"none", color:"#292524" }} />
                      <button className="btn" onClick={() => copyText(personalise(getTemplate(s.stage,channel),s),"tpl")}
                        style={{ position:"absolute", top:10, right:10, background:"#1C1917", color:"white", padding:"6px 14px" }}>
                        {copied==="tpl"?"✓ Copied!":"Copy"}
                      </button>
                    </div>
                    <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                      {channel==="whatsapp" && s.phone && (
                        <a href={`https://wa.me/${s.phone.replace(/\D/g,"")}?text=${encodeURIComponent(personalise(TEMPLATES[s.stage]?.whatsapp||"",s))}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ background:"#22C55E", color:"white", padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:500, textDecoration:"none" }}>
                          💬 Open in WhatsApp
                        </a>
                      )}
                      {channel==="email" && s.email && (
                        <a href={`mailto:${s.email}?subject=${encodeURIComponent(TEMPLATES[s.stage]?.email?.subject||"")}&body=${encodeURIComponent(personalise(TEMPLATES[s.stage]?.email?.body||"",s))}`}
                          style={{ background:"#3B82F6", color:"white", padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:500, textDecoration:"none" }}>
                          ✉️ Open in Mail
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {activeTab==="checklist" && (
                  <div className="card" style={{ padding:20 }}>
                    <h3 className="serif" style={{ fontSize:18, marginBottom:4 }}>Stage Checklist — {s.stage}</h3>
                    <p style={{ fontSize:12, color:"#A8A29E", marginBottom:16 }}>Tasks to complete before moving {s.name.split(" ")[0]} to the next stage</p>
                    {CHECKLIST[s.stage]?.map(item => {
                      const key=`${s.id}-${item}`, done=checked[key];
                      return (
                        <div key={item} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #F5F3EE" }}>
                          <div onClick={() => toggleCheck(s.id,item)}
                            style={{ width:20, height:20, borderRadius:6, border:`2px solid ${done?color.accent:"#D6D3D1"}`, background:done?color.accent:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                            {done && <span style={{ color:"white", fontSize:11, fontWeight:700 }}>✓</span>}
                          </div>
                          <p style={{ fontSize:13, textDecoration:done?"line-through":"none", color:done?"#A8A29E":"#292524" }}>{item}</p>
                        </div>
                      );
                    })}
                    <div style={{ marginTop:14, padding:"10px 14px", background:"#F5F3EE", borderRadius:10 }}>
                      <p style={{ fontSize:12, color:"#78716C" }}>
                        {CHECKLIST[s.stage]?.filter(item => checked[`${s.id}-${item}`]).length||0} / {CHECKLIST[s.stage]?.length} completed
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Compose */}
                {activeTab==="ai-compose" && (
                  <div className="card" style={{ padding:20 }}>
                    <h3 className="serif" style={{ fontSize:18, marginBottom:4 }}>✨ AI Compose</h3>
                    <p style={{ fontSize:12, color:"#A8A29E", marginBottom:14 }}>
                      Generate a personalised message for {s.name.split(" ")[0]} — using her health data, conditions & goals
                    </p>
                    <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                      {["whatsapp","email","instagram"].map(ch => (
                        <button key={ch} className={`chbtn ${channel===ch?"active":""}`} onClick={() => setChannel(ch)}>
                          {ch==="whatsapp"?"💬 WhatsApp":ch==="email"?"✉️ Email":"📸 Instagram"}
                        </button>
                      ))}
                    </div>
                    <textarea placeholder={`e.g. "She just completed her first week on the diabetes meal plan — send an encouraging check-in" or "Follow up on her lab reports and suggest booking a review session"`}
                      value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} style={{ marginBottom:10, lineHeight:1.6 }} />
                    <button className="aibtn" onClick={generateAi} disabled={aiLoading||!aiPrompt.trim()}>
                      {aiLoading ? <span className="pulse">Generating...</span> : "✨ Generate Message"}
                    </button>
                    {aiMsg && (
                      <div className="fi" style={{ marginTop:16, position:"relative" }}>
                        <div style={{ background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:10, padding:16 }}>
                          <pre style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap", color:"#292524" }}>{aiMsg}</pre>
                        </div>
                        <button className="btn" onClick={() => copyText(aiMsg,"ai")}
                          style={{ position:"absolute", top:10, right:10, background:"#7C3AED", color:"white", padding:"5px 12px", fontSize:11 }}>
                          {copied==="ai"?"✓ Copied!":"Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Profile */}
                {activeTab==="profile" && (
                  <div className="card" style={{ padding:20 }}>
                    <h3 className="serif" style={{ fontSize:18, marginBottom:16 }}>Full Client Profile</h3>

                    <p style={{ fontSize:10, fontWeight:600, color:"#A8A29E", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Personal Details</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
                      {[["Client Code",s.clientCode],["Full Name",s.name],["Email",s.email],["WhatsApp",s.phone],["Date of Birth",s.dob],["Gender",s.gender],["City / Location",s.city],["Source",s.source],["Added On",s.date]].map(([label,value]) => value ? (
                        <div key={label} style={{ background:"#FAFAF7", borderRadius:10, padding:"12px 14px", border:"1px solid #E8E5DF" }}>
                          <p style={{ fontSize:10, fontWeight:600, color:"#A8A29E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</p>
                          <p style={{ fontSize:13, color:"#1C1917", lineHeight:1.5 }}>{String(value)}</p>
                        </div>
                      ) : null)}
                    </div>

                    <p style={{ fontSize:10, fontWeight:600, color:"#A8A29E", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Booking Details</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
                      {[["Service Requested",s.service],["Client Type",s.clientType],["Selected Plan",s.selectedPlan],["Referral Code",s.referralCode],["Session Mode",s.sessionMode],["Preferred Date",s.prefDate],["Weekend Slot",s.prefWeekend],["Weekday Slot",s.prefWeekday],["Current Stage",s.stage]].map(([label,value]) => value ? (
                        <div key={label} style={{ background: label==="Selected Plan" ? "#FFF8F0" : "#FAFAF7", borderRadius:10, padding:"12px 14px", border: label==="Selected Plan" ? "1px solid #F59E0B" : "1px solid #E8E5DF" }}>
                          <p style={{ fontSize:10, fontWeight:600, color: label==="Selected Plan" ? "#92400E" : "#A8A29E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</p>
                          <p style={{ fontSize:13, color:"#1C1917", lineHeight:1.5, fontWeight: label==="Selected Plan" ? 600 : 400 }}>{String(value)}</p>
                        </div>
                      ) : null)}
                    </div>

                    <p style={{ fontSize:10, fontWeight:600, color:"#A8A29E", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Health Information</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
                      {[["Health Goals",s.goal],["Medical Conditions",s.conditions],["On Medication?",s.onMedication],["Medications & Doses",s.medications],["Lab Reports",s.labReports],["Worked with Nutritionist?",s.prevNutri]].map(([label,value]) => value ? (
                        <div key={label} style={{ background:"#FFF8F0", borderRadius:10, padding:"12px 14px", border:"1px solid #FDE68A" }}>
                          <p style={{ fontSize:10, fontWeight:600, color:"#92400E", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</p>
                          <p style={{ fontSize:13, color:"#1C1917", lineHeight:1.5 }}>{String(value)}</p>
                        </div>
                      ) : null)}
                    </div>

                    {(s.workedBefore||s.lastProgram||s.progress||s.extraNotes) && (
                      <>
                        <p style={{ fontSize:10, fontWeight:600, color:"#A8A29E", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>History & Notes</p>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          {[["Worked with Taniya Before?",s.workedBefore],["Last Program",s.lastProgram],["Progress Since",s.progress],["Extra Notes",s.extraNotes]].map(([label,value]) => value ? (
                            <div key={label} style={{ background:"#F0FDF4", borderRadius:10, padding:"12px 14px", border:"1px solid #BBF7D0" }}>
                              <p style={{ fontSize:10, fontWeight:600, color:"#166534", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{label}</p>
                              <p style={{ fontSize:13, color:"#1C1917", lineHeight:1.5 }}>{String(value)}</p>
                            </div>
                          ) : null)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="overlay" onClick={() => setShowAdd(false)}>
          <div className="modal fi" onClick={e => e.stopPropagation()}>
            <h2 className="serif" style={{ fontSize:22, marginBottom:18 }}>Add New Client</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input placeholder="Full Name *" value={newC.name} onChange={e => setNewC(p=>({...p,name:e.target.value}))} />
              <input placeholder="Health Goal" value={newC.goal} onChange={e => setNewC(p=>({...p,goal:e.target.value}))} />
              <input placeholder="WhatsApp Number" value={newC.phone} onChange={e => setNewC(p=>({...p,phone:e.target.value}))} />
              <input placeholder="Email" value={newC.email} onChange={e => setNewC(p=>({...p,email:e.target.value}))} />
              <input placeholder="Medical Conditions" value={newC.conditions} onChange={e => setNewC(p=>({...p,conditions:e.target.value}))} />
              <input placeholder="Current Medications" value={newC.medications} onChange={e => setNewC(p=>({...p,medications:e.target.value}))} />
              <input placeholder="Preferred Consultation Time" value={newC.prefTime} onChange={e => setNewC(p=>({...p,prefTime:e.target.value}))} />
              <div style={{ display:"flex", gap:10 }}>
                <select value={newC.source} onChange={e => setNewC(p=>({...p,source:e.target.value}))}>
                  {["Instagram","WhatsApp","Email","Referral","Google Form","Other"].map(s=><option key={s}>{s}</option>)}
                </select>
                <select value={newC.stage} onChange={e => setNewC(p=>({...p,stage:e.target.value}))}>
                  {STAGES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <textarea placeholder="Additional notes..." value={newC.notes} onChange={e => setNewC(p=>({...p,notes:e.target.value}))} rows={2} />
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button className="btn" onClick={addClient} style={{ background:"#1C1917", color:"white", padding:"10px 22px", flex:1 }}>Add Client</button>
              <button className="btn" onClick={() => setShowAdd(false)} style={{ background:"#F5F3EE", color:"#57534E", padding:"10px 22px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      {showSync && (
        <div className="overlay" onClick={() => setShowSync(false)}>
          <div className="modal fi" onClick={e => e.stopPropagation()}>
            <h2 className="serif" style={{ fontSize:22, marginBottom:4 }}>🔗 Google Sheets Live Sync</h2>
            <p style={{ fontSize:13, color:"#78716C", marginBottom:20, lineHeight:1.6 }}>
              Follow these steps once — every new Google Form submission will auto-appear in your hub.
            </p>

            {[
              ["Open your Google Sheet", "The one linked to your client intake Google Form. Go to Extensions → Apps Script."],
              ["Paste the script below", "Delete any existing code and paste the entire script. Update the column names at the top if needed."],
              ["Add your webhook URL", "Paste your hub's webhook URL in the WEBHOOK_URL field in the script (optional for now — the hub accepts data via window.__receiveSheetData)."],
              ["Set up a trigger", "In Apps Script: click Triggers (clock icon) → Add Trigger → choose onFormSubmit → Event type: From spreadsheet → On form submit. Save."],
              ["Test it", "Run the syncAllClients() function once manually to import all existing rows instantly."],
            ].map(([title, desc], i) => (
              <div key={i} style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
                <div className="stepbadge">{i+1}</div>
                <div>
                  <p style={{ fontWeight:500, fontSize:13 }}>{title}</p>
                  <p style={{ fontSize:12, color:"#78716C", marginTop:2, lineHeight:1.5 }}>{desc}</p>
                </div>
              </div>
            ))}

            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:12, fontWeight:500, color:"#57534E", marginBottom:6 }}>Your Apps Script (copy this):</p>
              <div style={{ position:"relative" }}>
                <div className="code">{appsScript}</div>
                <button className="btn" onClick={() => copyText(appsScript,"script")}
                  style={{ position:"absolute", top:10, right:10, background:"#F59E0B", color:"#1C1917", padding:"5px 12px", fontSize:11 }}>
                  {copied==="script"?"✓ Copied!":"Copy Script"}
                </button>
              </div>
            </div>

            <div style={{ background:"#FFF8F0", border:"1px solid #FDE68A", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
              <p style={{ fontSize:12, color:"#92400E", lineHeight:1.6 }}>
                <strong>Column names expected:</strong> Your Google Sheet must have columns named exactly: <em>Full Name, Email Address, WhatsApp Number, Health Goals, Medical History / Conditions, Current Medications, Referred by / Source, Preferred Consultation Time, Lab Reports / Test Results</em>. Edit the COL map at the top of the hub code if your names differ.
              </p>
            </div>

            <button className="btn" onClick={() => setShowSync(false)} style={{ background:"#1C1917", color:"white", padding:"10px 22px", width:"100%" }}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
