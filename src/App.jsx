import { useState, useEffect } from "react";

// ─── Config ───────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { name: "Euan Macleod",  email: "euan@voqa.com" },
  { name: "Nick Pointon",  email: "nick@voqa.com" },
  { name: "Brandon Tarr",   email: "brandon@voqa.com" },
];
const NAMES = TEAM_MEMBERS.map(m => m.name);
const MEMBER_COLORS = ["#005C80","#2E86AB","#1A6B52","#B85C00","#C0392B","#5B6DAE","#1A7A6E","#7B4A8C"];
const memberColor = (name) => MEMBER_COLORS[NAMES.indexOf(name) % MEMBER_COLORS.length];

const WEEK_LABEL = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - offset * 7);
  return d.toISOString().slice(0, 10);
};

// ─── Seed data ────────────────────────────────────────────────
const SEED = (() => {
  const entries = [];
  const successPool = ["Shipped the new onboarding flow","Closed a key client deal","Resolved production incident","Delivered sprint retrospective","Mentored two junior engineers","Launched A/B test","Reduced build time by 30%","Presented roadmap to stakeholders","Completed API migration","Fixed critical bug in payments","Onboarded new partner","Automated weekly report"];
  const focusPool = ["Performance optimisation","Customer interviews","Q2 planning","Code review backlog","Data pipeline refactor","Documentation update","Hiring panel prep","Security audit","Cross-team alignment","Feature flagging rollout"];
  const blockerPool = ["Waiting on design sign-off","Blocked by third-party API limits","Need access to prod logs","Unclear requirements from product","Dependency on another team's PR","No blockers","Pending legal review","Waiting on infra provisioning","No blockers","No blockers","Unclear prioritisation","No blockers"];
  const skipMap = { 1: ["Grace Liu"], 2: ["Ben Torres","Hugo Reyes"], 3: [], 4: ["Eva Müller"] };
  NAMES.forEach((name, mi) => {
    for (let w = 4; w >= 1; w--) {
      if ((skipMap[w] || []).includes(name)) continue;
      entries.push({ id: `${name}-w${w}`, name, week: WEEK_LABEL(w), success: successPool[(mi + w * 3) % successPool.length], focus: focusPool[(mi * 2 + w) % focusPool.length], blocker: blockerPool[(mi + w) % blockerPool.length], submittedAt: new Date(Date.now() - w * 7 * 86400000).toISOString() });
    }
  });
  return entries;
})();

// ─── Storage ──────────────────────────────────────────────────
async function loadData(key, fallback) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; } catch { return fallback; }
}
async function saveData(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ─── Script generator ─────────────────────────────────────────
function generateScript(members, formUrl, managerName) {
  const lines = members.map(m => `  { name: "${m.name.split(" ")[0]}", email: "${m.email}" },`).join("\n");
  return `function sendWeeklyReminders() {
  const FORM_URL = "${formUrl}";
  const MANAGER_NAME = "${managerName || "Your Name"}";

  const team = [
${lines}
  ];

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekLabel = weekStart.toISOString().slice(0, 10);

  team.forEach(({ name, email }) => {
    const subject = \`📋 Weekly check-in — week of \${weekLabel}\`;
    const body = \`Hi \${name},

Hope you're having a good start to the week! This is your reminder to complete your weekly check-in.

It only takes 2–3 minutes:
👉 \${FORM_URL}

You'll be asked for:
• 🏆 Last week's biggest win
• 🎯 Your main focus this week
• 🚧 Any blockers you need help with

Thanks — your update goes straight into the team dashboard and helps us make our 1:1s more productive.

See you soon,
\${MANAGER_NAME}\`;

    GmailApp.sendEmail(email, subject, body);
  });
}`;
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [entries, setEntries] = useState([]);
  const [emailConfig, setEmailConfig] = useState({ formUrl: "https://your-app-url.vercel.app", managerName: "" });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", success: "", focus: "", blocker: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("completion");
  const [selectedMember, setSelectedMember] = useState("All");
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    Promise.all([
      loadData("checkin-entries", SEED),
      loadData("checkin-email-config", { formUrl: "https://your-app-url.vercel.app", managerName: "" })
    ]).then(([e, cfg]) => { setEntries(e); setEmailConfig(cfg); setLoading(false); });
  }, []);

  const submitForm = async () => {
    if (!formData.name || !formData.success || !formData.focus) return;
    const entry = { id: `${formData.name}-${Date.now()}`, ...formData, blocker: formData.blocker || "No blockers", week: WEEK_LABEL(0), submittedAt: new Date().toISOString() };
    const updated = [entry, ...entries];
    setEntries(updated);
    await saveData("checkin-entries", updated);
    setSubmitted(true);
  };

  const saveEmailConfig = async (cfg) => { setEmailConfig(cfg); await saveData("checkin-email-config", cfg); };

  const copyEmail = (name) => {
    const week = WEEK_LABEL(0);
    const subject = `📋 Weekly check-in — week of ${week}`;
    const firstName = name.split(" ")[0];
    const body = `Subject: ${subject}\n\nHi ${firstName},\n\nHope you're having a good start to the week! This is your reminder to complete your weekly check-in.\n\nIt only takes 2–3 minutes:\n👉 ${emailConfig.formUrl}\n\nYou'll be asked for:\n• 🏆 Last week's biggest win\n• 🎯 Your main focus this week\n• 🚧 Any blockers you need help with\n\nThanks — your update goes straight into the team dashboard and helps us make our 1:1s more productive.\n\nSee you soon,\n${emailConfig.managerName || "[Your name]"}`;
    navigator.clipboard.writeText(body).catch(() => {});
    setCopiedIdx(name);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = () => {
    const week = WEEK_LABEL(0);
    const all = thisWeekPending.map(name => {
      const m = TEAM_MEMBERS.find(t => t.name === name);
      return `To: ${m.email}\nSubject: 📋 Weekly check-in — week of ${week}\n\nHi ${name.split(" ")[0]},\n\nThis is your reminder to complete your weekly check-in:\n👉 ${emailConfig.formUrl}\n\nSee you soon,\n${emailConfig.managerName || "[Your name]"}`;
    }).join("\n\n" + "─".repeat(50) + "\n\n");
    navigator.clipboard.writeText(all).catch(() => {});
    setCopiedIdx("__all__");
    setTimeout(() => setCopiedIdx(null), 2500);
  };

  // Derived
  const currentWeek = WEEK_LABEL(0);
  const weeks = [...new Set(entries.map(e => e.week))].sort().reverse();
  const filteredEntries = selectedMember === "All" ? entries : entries.filter(e => e.name === selectedMember);
  const thisWeekDone = NAMES.filter(n => entries.some(e => e.name === n && e.week === currentWeek));
  const thisWeekPending = NAMES.filter(n => !entries.some(e => e.name === n && e.week === currentWeek));
  const weekCompletion = weeks.slice(0, 6).map(w => {
    const done = NAMES.filter(n => entries.some(e => e.name === n && e.week === w));
    const pending = NAMES.filter(n => !entries.some(e => e.name === n && e.week === w));
    return { week: w, done, pending, rate: Math.round((done.length / NAMES.length) * 100) };
  });
  const blockerFreq = (() => {
    const map = {};
    filteredEntries.forEach(e => { if (e.blocker && e.blocker !== "No blockers") map[e.blocker] = (map[e.blocker] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();
  const maxBlocker = blockerFreq[0]?.[1] || 1;

  if (loading) return <div style={st.loadWrap}><div style={st.spinner} /></div>;

  return (
    <div style={st.root}>
      <div style={st.noise} />

      <header style={st.header}>
        <div style={st.headerInner}>
          <div>
            <div style={st.logoRow}><span style={st.logoMark}>⬡</span><span style={st.logoText}>Pulse</span></div>
            <p style={st.logoSub}>Weekly team check-ins</p>
          </div>
          <nav style={st.nav}>
            {[["dashboard","Dashboard"],["email","✉ Email Setup"],["form","Submit Update"]].map(([v, label]) => (
              <button key={v} style={view === v ? st.navBtnActive : st.navBtn} onClick={() => { setView(v); if (v === "form") setSubmitted(false); }}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      {/* ══ FORM ══ */}
      {view === "form" && (
        <main style={st.main}>
          {submitted ? (
            <div style={st.successCard}>
              <div style={st.successIcon}>✓</div>
              <h2 style={st.successTitle}>Update received</h2>
              <p style={st.successSub}>Your manager can see your update in the dashboard.</p>
              <button style={st.primaryBtn} onClick={() => { setSubmitted(false); setFormData({ name:"", success:"", focus:"", blocker:"" }); }}>Submit another</button>
            </div>
          ) : (
            <div style={st.formCard}>
              <h2 style={st.formTitle}>Weekly Check-in</h2>
              <p style={st.formSub}>Week of {currentWeek}</p>
              <label style={st.label}>Your name</label>
              <select style={st.input} value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}>
                <option value="">Select your name…</option>
                {NAMES.map(m => <option key={m}>{m}</option>)}
              </select>
              <label style={st.label}>🏆 Last week's win</label>
              <textarea style={st.textarea} rows={3} placeholder="What are you most proud of from last week?" value={formData.success} onChange={e => setFormData(f => ({ ...f, success: e.target.value }))} />
              <label style={st.label}>🎯 This week's focus</label>
              <textarea style={st.textarea} rows={3} placeholder="What are the 1–2 things you're prioritising this week?" value={formData.focus} onChange={e => setFormData(f => ({ ...f, focus: e.target.value }))} />
              <label style={st.label}>🚧 Any blockers? <span style={st.optional}>(optional)</span></label>
              <textarea style={st.textarea} rows={2} placeholder="Anything slowing you down? Leave blank if none." value={formData.blocker} onChange={e => setFormData(f => ({ ...f, blocker: e.target.value }))} />
              <button style={{ ...st.primaryBtn, marginTop: 24, width: "100%", opacity: (!formData.name || !formData.success || !formData.focus) ? 0.4 : 1 }} onClick={submitForm} disabled={!formData.name || !formData.success || !formData.focus}>Submit update →</button>
            </div>
          )}
        </main>
      )}

      {/* ══ EMAIL SETUP ══ */}
      {view === "email" && (
        <main style={st.main}>
          <div style={st.section}>
            <h3 style={st.sectionTitle}>Email reminder setup</h3>
            <p style={st.sectionSub}>Configure once, then the script runs automatically every Monday morning.</p>
            <div style={st.configGrid}>
              <div>
                <label style={st.label}>Your form URL</label>
                <input style={st.input} value={emailConfig.formUrl} onChange={e => saveEmailConfig({ ...emailConfig, formUrl: e.target.value })} placeholder="https://your-app.vercel.app" />
              </div>
              <div>
                <label style={st.label}>Your name <span style={st.optional}>(for email sign-off)</span></label>
                <input style={st.input} value={emailConfig.managerName} onChange={e => saveEmailConfig({ ...emailConfig, managerName: e.target.value })} placeholder="e.g. Sarah" />
              </div>
            </div>

            <div style={st.divider} />
            <h4 style={st.subTitle}>How to automate with Gmail — 4 steps</h4>
            <p style={st.bodyText}>Uses <strong style={{ color:"#C084FC" }}>Google Apps Script</strong> — free, no extra tools, runs automatically every Monday at 9am.</p>
            <div style={st.steps}>
              {[
                ["1", "Open Google Apps Script", <>Go to <span style={st.code}>script.google.com</span> → click <em>New project</em></>],
                ["2", "Paste the script below", "Copy the generated script and replace all existing code in the editor."],
                ["3", "Add a trigger", <>Click the clock icon (Triggers) → Add trigger → select <span style={st.code}>sendWeeklyReminders</span> → Time-driven → Week timer → Monday → 9am</>],
                ["4", "Save and authorise", "Run the function once manually to grant Gmail permissions. It will fire automatically every Monday from then on."],
              ].map(([n, title, body]) => (
                <div key={n} style={st.step}>
                  <div style={st.stepNum}>{n}</div>
                  <div><div style={st.stepTitle}>{title}</div><div style={st.stepBody}>{body}</div></div>
                </div>
              ))}
            </div>

            <div style={st.divider} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
              <h4 style={{ ...st.subTitle, margin: 0 }}>Generated script</h4>
              <button style={st.copyBtn} onClick={() => { navigator.clipboard.writeText(generateScript(TEAM_MEMBERS, emailConfig.formUrl, emailConfig.managerName)).catch(()=>{}); setCopiedIdx("__script__"); setTimeout(()=>setCopiedIdx(null),2000); }}>
                {copiedIdx === "__script__" ? "✓ Copied!" : "Copy script"}
              </button>
            </div>
            <pre style={st.codeBlock}>{generateScript(TEAM_MEMBERS, emailConfig.formUrl, emailConfig.managerName)}</pre>

            <div style={st.infoBox}>
              <strong>Using Outlook instead?</strong> Use <strong>Power Automate</strong> (free with Microsoft 365). Set a recurring Monday trigger → "Send an email (V2)" action → paste the team list. Same logic, different interface.
            </div>
          </div>
        </main>
      )}

      {/* ══ DASHBOARD ══ */}
      {view === "dashboard" && (
        <main style={st.main}>

          {/* This week banner */}
          <div style={st.banner}>
            <div style={st.bannerLeft}>
              <div style={st.bannerTitle}>This week — {currentWeek}</div>
              <div style={st.bannerMeta}>{thisWeekDone.length} of {NAMES.length} submitted</div>
            </div>
            <div style={st.progressTrack}><div style={{ ...st.progressFill, width:`${(thisWeekDone.length/NAMES.length)*100}%` }} /></div>
            <div style={st.bannerPct}>{Math.round((thisWeekDone.length/NAMES.length)*100)}%</div>
          </div>

          {/* Member cards */}
          <div style={st.memberGrid}>
            {NAMES.map(name => {
              const done = thisWeekDone.includes(name);
              const entry = entries.find(e => e.name === name && e.week === currentWeek);
              const col = memberColor(name);
              return (
                <div key={name} style={{ ...st.memberCard, borderColor: done ? col + "55" : "#1E293B" }}>
                  <div style={st.mcTop}>
                    <div style={{ ...st.avatar, background: done ? col : "#EAF4F8", color: done ? "#FFFFFF" : "#5A8FA3" }}>{name.split(" ").map(n=>n[0]).join("")}</div>
                    <div>
                      <div style={st.mcName}>{name}</div>
                      <div style={{ ...st.mcStatus, color: done ? "#1A6B52" : "#B85C00" }}>{done ? "✓ submitted" : "⏳ pending"}</div>
                    </div>
                  </div>
                  {done && entry && (
                    <div style={st.mcPreview}>
                      <div style={st.mcLine}><span>🏆</span><span>{entry.success}</span></div>
                      {entry.blocker !== "No blockers" && <div style={{ ...st.mcLine, color:"#C0392B" }}><span>🚧</span><span>{entry.blocker}</span></div>}
                    </div>
                  )}
                  {!done && (
                    <button style={st.nudgeBtn} onClick={() => copyEmail(name)}>
                      {copiedIdx === name ? "✓ Copied!" : "Copy reminder email"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {thisWeekPending.length > 0 && (
            <div style={st.bulkRow}>
              <button style={st.primaryBtn} onClick={copyAll}>{copiedIdx === "__all__" ? "✓ All emails copied!" : `Copy all ${thisWeekPending.length} reminder emails`}</button>
              <span style={st.bulkHint}>Ready-to-paste emails for everyone still pending this week</span>
            </div>
          )}

          <div style={st.divider} />

          <div style={st.controls}>
            <div style={st.tabGroup}>
              {[["completion","📅 Completion history"],["blockers","🚧 Blockers"],["feed","👥 Team feed"]].map(([t,label]) => (
                <button key={t} style={activeTab === t ? st.tabActive : st.tab} onClick={() => setActiveTab(t)}>{label}</button>
              ))}
            </div>
            <select style={st.filterSelect} value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
              <option value="All">All members</option>
              {NAMES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {/* Completion history */}
          {activeTab === "completion" && (
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Submission rate — week by week</h3>
              <p style={st.sectionSub}>Green chips = submitted · grey chips = did not submit</p>
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {weekCompletion.map(({ week, done, pending, rate }) => (
                  <div key={week}>
                    <div style={st.whRow}>
                      <span style={st.whWeek}>{week}</span>
                      <div style={st.whTrack}><div style={{ ...st.whFill, width:`${rate}%` }} /></div>
                      <span style={st.whPct}>{rate}%</span>
                    </div>
                    <div style={st.chipRow}>
                      {done.map(n => <span key={n} style={{ ...st.chip, background:memberColor(n)+"22", color:memberColor(n), borderColor:memberColor(n)+"55" }}>{n.split(" ")[0]} ✓</span>)}
                      {pending.map(n => <span key={n} style={{ ...st.chip, background:"#FEF4EE", color:"#B85C00", borderColor:"#F7D7BC" }}>{n.split(" ")[0]}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers */}
          {activeTab === "blockers" && (
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Recurring blockers</h3>
              <p style={st.sectionSub}>Most frequently reported{selectedMember !== "All" ? ` by ${selectedMember}` : " across the team"}</p>
              {blockerFreq.length === 0 ? <div style={st.emptyState}>No blockers reported 🎉</div> : (
                <div style={st.barList}>
                  {blockerFreq.map(([text, count]) => (
                    <div key={text} style={st.barRow}>
                      <div style={st.barLabel}>{text}</div>
                      <div style={st.barTrack}><div style={{ ...st.barFill, width:`${(count/maxBlocker)*100}%` }} /></div>
                      <div style={st.barCount}>{count}×</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feed */}
          {activeTab === "feed" && (
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Latest updates</h3>
              <div style={st.feedList}>
                {(selectedMember === "All" ? entries : filteredEntries).slice(0, 24).map(e => (
                  <div key={e.id} style={st.feedCard}>
                    <div style={{ ...st.avatar, background:memberColor(e.name), color:"#FFFFFF", flexShrink:0 }}>{e.name.split(" ").map(n=>n[0]).join("")}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={st.feedHeader}><span style={st.feedName}>{e.name}</span><span style={st.feedWeek}>w/c {e.week}</span></div>
                      <div style={st.feedRow}><span>🏆</span><span style={st.feedText}>{e.success}</span></div>
                      <div style={st.feedRow}><span>🎯</span><span style={st.feedText}>{e.focus}</span></div>
                      {e.blocker !== "No blockers" && <div style={st.feedRow}><span>🚧</span><span style={{ ...st.feedText, color:"#C0392B" }}>{e.blocker}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────
// Brand palette:
//   Primary:    #005C80  (teal-navy — text, buttons, borders)
//   Secondary:  #F7D7BC  (warm peach — accents, hovers, chips)
//   Background: #FFFFFF
//   Surface:    #F9FAFB  (very light grey for cards)
//   Subtle:     #EAF4F8  (light primary tint for active states)
//   Border:     #C8DFE8  (muted primary tint)
//   Body text:  #005C80
//   Muted:      #5A8FA3  (lighter tint of primary for secondary text)

const st = {
  root: { minHeight:"100vh", background:"#FFFFFF", color:"#005C80", fontFamily:"'Georgia','Times New Roman',serif", position:"relative", overflowX:"hidden" },
  noise: { display:"none" }, // not needed on white
  loadWrap: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" },
  spinner: { width:32, height:32, border:"2px solid #C8DFE8", borderTopColor:"#005C80", borderRadius:"50%" },

  // Header — white with bottom border
  header: { position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(10px)", borderBottom:"1px solid #C8DFE8" },
  headerInner: { maxWidth:980, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  logoRow: { display:"flex", alignItems:"center", gap:10 },
  logoMark: { fontSize:22, color:"#005C80" },
  logoText: { fontSize:20, fontWeight:700, letterSpacing:"0.05em", color:"#005C80" },
  logoSub: { fontSize:11, color:"#5A8FA3", margin:"2px 0 0 32px", letterSpacing:"0.08em", textTransform:"uppercase" },
  nav: { display:"flex", gap:8 },
  navBtn: { background:"transparent", border:"1px solid #C8DFE8", color:"#5A8FA3", padding:"6px 16px", borderRadius:6, cursor:"pointer", fontSize:13, fontFamily:"inherit" },
  navBtnActive: { background:"#EAF4F8", border:"1px solid #005C80", color:"#005C80", padding:"6px 16px", borderRadius:6, cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 },

  main: { maxWidth:980, margin:"0 auto", padding:"28px 24px", position:"relative", zIndex:1 },

  // Primary button — solid brand blue with white text
  primaryBtn: { background:"#005C80", border:"none", color:"#fff", padding:"10px 22px", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" },

  // Form inputs — white with brand border
  label: { display:"block", fontSize:13, color:"#005C80", fontWeight:600, marginBottom:8, marginTop:18 },
  optional: { color:"#5A8FA3", fontSize:11, fontWeight:400 },
  input: { width:"100%", background:"#FFFFFF", border:"1px solid #C8DFE8", borderRadius:8, color:"#005C80", padding:"10px 14px", fontSize:14, fontFamily:"inherit", boxSizing:"border-box", outline:"none" },
  textarea: { width:"100%", background:"#FFFFFF", border:"1px solid #C8DFE8", borderRadius:8, color:"#005C80", padding:"10px 14px", fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", outline:"none" },

  // Form card
  formCard: { maxWidth:560, margin:"0 auto", background:"#FFFFFF", border:"1px solid #C8DFE8", borderRadius:16, padding:40, boxShadow:"0 2px 16px rgba(0,92,128,0.07)" },
  formTitle: { fontSize:26, fontWeight:700, margin:"0 0 4px", color:"#005C80" },
  formSub: { fontSize:13, color:"#5A8FA3", margin:"0 0 28px" },

  // Success state
  successCard: { maxWidth:420, margin:"60px auto", textAlign:"center", background:"#FFFFFF", border:"1px solid #C8DFE8", borderRadius:16, padding:48, boxShadow:"0 2px 16px rgba(0,92,128,0.07)" },
  successIcon: { width:56, height:56, borderRadius:"50%", background:"#EAF4F8", border:"2px solid #005C80", color:"#005C80", fontSize:24, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" },
  successTitle: { fontSize:22, fontWeight:700, color:"#005C80", margin:"0 0 8px" },
  successSub: { fontSize:14, color:"#5A8FA3", margin:"0 0 28px" },

  // Email setup
  configGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  subTitle: { fontSize:15, fontWeight:700, color:"#005C80", margin:"0 0 10px" },
  bodyText: { fontSize:13, color:"#5A8FA3", lineHeight:1.7, marginBottom:18 },
  steps: { display:"flex", flexDirection:"column", gap:14 },
  step: { display:"flex", gap:14 },
  stepNum: { width:26, height:26, borderRadius:"50%", background:"#005C80", color:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 },
  stepTitle: { fontSize:13, fontWeight:700, color:"#005C80", marginBottom:3 },
  stepBody: { fontSize:12, color:"#5A8FA3", lineHeight:1.6 },
  code: { fontFamily:"monospace", background:"#EAF4F8", padding:"1px 5px", borderRadius:4, fontSize:11, color:"#005C80" },
  copyBtn: { background:"#EAF4F8", border:"1px solid #C8DFE8", color:"#005C80", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"inherit" },
  codeBlock: { background:"#F9FAFB", border:"1px solid #C8DFE8", borderRadius:10, padding:20, fontSize:11, color:"#5A8FA3", overflowX:"auto", lineHeight:1.7, fontFamily:"monospace", whiteSpace:"pre", marginBottom:4 },
  infoBox: { background:"#FEF4EE", border:"1px solid #F7D7BC", borderRadius:10, padding:"14px 18px", fontSize:13, color:"#005C80", lineHeight:1.6, marginTop:16 },

  // Dashboard: banner
  banner: { background:"#EAF4F8", border:"1px solid #C8DFE8", borderRadius:14, padding:"18px 24px", display:"flex", alignItems:"center", gap:20, marginBottom:18 },
  bannerLeft: { flexShrink:0, width:155 },
  bannerTitle: { fontSize:14, fontWeight:700, color:"#005C80" },
  bannerMeta: { fontSize:12, color:"#5A8FA3", marginTop:2 },
  progressTrack: { flex:1, height:7, background:"#C8DFE8", borderRadius:4, overflow:"hidden" },
  progressFill: { height:"100%", background:"linear-gradient(90deg,#005C80,#F7D7BC)", borderRadius:4, transition:"width 0.6s ease" },
  bannerPct: { fontSize:22, fontWeight:700, color:"#005C80", width:46, textAlign:"right" },

  // Member grid
  memberGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:11, marginBottom:14 },
  memberCard: { background:"#FFFFFF", border:"1px solid", borderRadius:12, padding:14, transition:"border-color 0.2s", boxShadow:"0 1px 4px rgba(0,92,128,0.06)" },
  mcTop: { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
  avatar: { width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, color:"#FFFFFF" },
  mcName: { fontSize:13, fontWeight:600, color:"#005C80" },
  mcStatus: { fontSize:11, marginTop:1 },
  mcPreview: { borderTop:"1px solid #EAF4F8", paddingTop:8, display:"flex", flexDirection:"column", gap:4 },
  mcLine: { display:"flex", gap:6, fontSize:11, color:"#5A8FA3", lineHeight:1.4 },
  nudgeBtn: { marginTop:8, width:"100%", background:"transparent", border:"1px solid #C8DFE8", color:"#5A8FA3", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11, fontFamily:"inherit" },
  bulkRow: { display:"flex", alignItems:"center", gap:14, marginBottom:6 },
  bulkHint: { fontSize:12, color:"#5A8FA3" },

  // Shared layout
  divider: { height:1, background:"#C8DFE8", margin:"18px 0" },
  controls: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 },
  tabGroup: { display:"flex", gap:6 },
  tab: { background:"transparent", border:"1px solid #C8DFE8", color:"#5A8FA3", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"inherit" },
  tabActive: { background:"#005C80", border:"1px solid #005C80", color:"#FFFFFF", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:13, fontFamily:"inherit", fontWeight:600 },
  filterSelect: { background:"#FFFFFF", border:"1px solid #C8DFE8", color:"#005C80", padding:"7px 14px", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none" },

  // Section cards
  section: { background:"#FFFFFF", border:"1px solid #C8DFE8", borderRadius:16, padding:28, boxShadow:"0 1px 6px rgba(0,92,128,0.05)" },
  sectionTitle: { fontSize:17, fontWeight:700, color:"#005C80", margin:"0 0 4px" },
  sectionSub: { fontSize:13, color:"#5A8FA3", margin:"0 0 22px" },
  emptyState: { textAlign:"center", padding:"40px 0", color:"#5A8FA3" },

  // Week-history rows
  whRow: { display:"flex", alignItems:"center", gap:14, marginBottom:7 },
  whWeek: { width:88, fontSize:12, color:"#5A8FA3", flexShrink:0 },
  whTrack: { flex:1, height:6, background:"#EAF4F8", borderRadius:3, overflow:"hidden" },
  whFill: { height:"100%", background:"linear-gradient(90deg,#005C80,#5A8FA3)", borderRadius:3 },
  whPct: { width:34, fontSize:12, color:"#5A8FA3", textAlign:"right" },
  chipRow: { display:"flex", flexWrap:"wrap", gap:5, marginBottom:4 },
  // chips use inline colour per member; pending chips use secondary colour
  chip: { fontSize:10, padding:"2px 8px", borderRadius:99, border:"1px solid", fontWeight:600 },

  // Blocker bars
  barList: { display:"flex", flexDirection:"column", gap:14 },
  barRow: { display:"flex", alignItems:"center", gap:12 },
  barLabel: { width:260, fontSize:13, color:"#005C80", flexShrink:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  barTrack: { flex:1, height:8, background:"#EAF4F8", borderRadius:4, overflow:"hidden" },
  barFill: { height:"100%", background:"linear-gradient(90deg,#005C80,#F7D7BC)", borderRadius:4 },
  barCount: { width:28, fontSize:12, color:"#5A8FA3", textAlign:"right" },

  // Team feed
  feedList: { display:"flex", flexDirection:"column", gap:12 },
  feedCard: { display:"flex", gap:14, background:"#F9FAFB", border:"1px solid #C8DFE8", borderRadius:12, padding:15 },
  feedHeader: { display:"flex", justifyContent:"space-between", marginBottom:7 },
  feedName: { fontSize:13, fontWeight:700, color:"#005C80" },
  feedWeek: { fontSize:11, color:"#5A8FA3" },
  feedRow: { display:"flex", gap:7, marginBottom:4, alignItems:"flex-start", fontSize:12 },
  feedText: { color:"#5A8FA3", lineHeight:1.5 },
};
