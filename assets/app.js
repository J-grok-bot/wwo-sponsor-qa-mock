/* Package QA - front-end mock. Simulated AI + simulated storage (localStorage). All data fictional. */
(function () {
  "use strict";
  const S = window.SAMPLES, QA = window.QA, PARSE = window.PARSE, IC = window.ICONS;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ""}</svg>`;
  const hydrate = (root = document) => root.querySelectorAll("[data-i]").forEach(el => { el.innerHTML = icon(el.dataset.i); el.removeAttribute("data-i"); });
  const nowET = () => new Date().toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- bots + categories ----------
  const BOTS = [
    { k: "pm", name: "Project Manager Bot", short: "Project Manager", icon: "workflow", role: "Routes the job and tracks status" },
    { k: "ui", name: "Interface Bot", short: "Interface", icon: "layers", role: "Maps contents, checks completeness" },
    { k: "schedule", name: "Schedule Bot", short: "Schedule", icon: "calendar-clock", role: "Flights, slots, days, shows" },
    { k: "dup", name: "Duplicate Promo Code Bot", short: "Duplicate code", icon: "copy", role: "Same code, two sponsors" },
    { k: "code", name: "Wrong Promo Code Bot", short: "Wrong code", icon: "ticket-x", role: "Script vs sponsor sheet" },
    { k: "link", name: "Link Bot", short: "Links", icon: "link", role: "Dead, malformed, mismatched" },
    { k: "grammar", name: "Grammar Bot", short: "Grammar", icon: "whole-word", role: "Reads it like a host would" },
    { k: "spelling", name: "Spelling Bot", short: "Spelling", icon: "spell-check", role: "With a brand-name dictionary" },
    { k: "host", name: "Host Rules Bot", short: "Banned wording", icon: "ban", role: "Each host's do-not-say list" },
    { k: "verify", name: "Verification Bot", short: "Verification", icon: "shield-check", role: "Double-checks the checkers" }
  ];
  const CHECKERS = BOTS.slice(2, 9);
  const CAT = {
    missing_day: "schedule", wrong_show: "schedule", out_of_flight: "schedule", double_booked: "schedule", repeat_in_episode: "schedule",
    date_day_mismatch: "schedule", bad_date: "schedule", unknown_read: "schedule", unknown_sponsor: "schedule",
    duplicate_promo_code: "dup", promo_code_mismatch: "code", promo_code_missing: "code",
    broken_link: "link", malformed_link: "link", link_mismatch: "link", link_missing: "link",
    grammar: "grammar", spelling: "spelling", do_not_say: "host", show_path: "verify"
  };
  const TYPE_LABEL = { schedule: "Schedule", dup: "Duplicate promo code", code: "Wrong promo code", link: "Link", grammar: "Grammar", spelling: "Spelling", host: "Banned host wording", verify: "Verification catch" };
  const botOf = k => BOTS.find(b => b.k === k);
  const FIELDS = [
    ["scripts", "Scripts", "file-text"], ["sponsors", "Sponsor info", "building-2"], ["codes", "Promo codes", "tag"],
    ["links", "Links", "link"], ["schedule", "Schedule", "calendar-days"], ["hosts", "Host preferences", "users"], ["none", "Not used", "x"]
  ];
  const fieldLabel = f => (FIELDS.find(x => x[0] === f) || [, "Unassigned"])[1];
  const STUDIOS = { MF: "Lantern Street Audio", GS: "Bench Ten Media", LL: "Quarter Hour Studios" }; // fictional
  const DRAFTS = { // reviewer's rewrite drafts for banned-wording edits (fictional)
    "game-changer": "Freelancers tell me it saves them hours every quarter.",
    "i personally": "Dogs go wild for it every single morning.",
    "risk-free": "You can try it free for thirty days."
  };
  const DISMISS_REASONS = ["Confirmed with sponsor, this is intended", "False alarm", "Sponsor-required wording", "Will fix outside this package"];

  // ---------- storage (simulated) ----------
  const KEY = "packageqa-mock-v1";
  let st = load();
  function fresh() { return { user: null, seq: { W: 0, E: 0 }, jobs: [], draft: { files: [], paste: "" }, inbox: [], view: "intake", openJob: null, emailSent: 0 }; }
  function load() { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return fresh(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
  const jobById = id => st.jobs.find(j => j.id === id);

  // ---------- speller ----------
  let ctx = null;
  const ready = fetch("data/wordlist.txt").then(r => r.text()).then(t => {
    ctx = { speller: QA.makeSpeller(t.split("\n")), extraWords: new Set(S.dictionary), linkStatus: S.linkStatus };
  });

  // ---------- "AI" content detection (simulated: rules on readable text, filename cues for binaries) ----------
  const KIND = n => { const e = (n.split(".").pop() || "").toLowerCase();
    return ({ docx: "Word", doc: "Word", pdf: "PDF", xlsx: "Excel", xls: "Excel", csv: "CSV", json: "JSON", txt: "Text", md: "Text", tsv: "CSV", png: "Image", jpg: "Image", jpeg: "Image", heic: "Image", eml: "Email" })[e] || "File"; };
  const KIND_ICON = { Word: "file-text", PDF: "file", Excel: "file-spreadsheet", CSV: "file-spreadsheet", JSON: "file-json", Text: "file-text", Image: "image", Pasted: "clipboard-paste", File: "file", Email: "mail" };
  function jsonToCanon(t) {
    const o = JSON.parse(t);
    if (o.reads) return ["scripts", o.reads.map(r => `${r.read_id} | ${r.sponsor_id} | ${r.show_id} | ${r.length || ""}\n${r.text}`).join("\n\n")];
    if (o.shows) return ["hosts", "show_id,show,host,do_not_say\n" + o.shows.map(s => [s.show_id, s.name, s.host, (s.do_not_say || []).join("; ")].join(",")).join("\n")];
    return [null, t];
  }
  function detectText(text, name = "") {
    const t = String(text || "").trim(); const first = (t.split("\n")[0] || "").toLowerCase();
    try { if (/^[\[{]/.test(t)) { const [f, c] = jsonToCanon(t); if (f) return { field: f, conf: 97, norm: c }; } } catch (e) { }
    if (/^r\d+\s*\|/i.test(t)) return { field: "scripts", conf: 96, norm: t };
    if (first.includes("promo_code") && !first.includes("sponsor,")) return { field: "codes", conf: 98, norm: t };
    if (first.includes("url") && !first.includes("sponsor,")) return { field: "links", conf: 98, norm: t };
    if (first.startsWith("sponsor_id,sponsor")) return { field: "sponsors", conf: 97, norm: t };
    if (first.startsWith("date,") && first.includes("read_id")) return { field: "schedule", conf: 97, norm: t };
    if (first.startsWith("show_id") && first.includes("host")) return { field: "hosts", conf: 97, norm: t };
    const linkLines = t.split("\n").map(l => /^(S\d+)[\s,:|-]+(\S+:\/\/\S+)\s*$/i.exec(l.trim())).filter(Boolean);
    if (linkLines.length && linkLines.length === t.split("\n").filter(l => l.trim()).length)
      return { field: "links", conf: 93, norm: "sponsor_id,url\n" + linkLines.map(m => m[1].toUpperCase() + "," + m[2]).join("\n") };
    return { field: "none", conf: 35, norm: t, flags: ["Extra parsing: layout not recognized"] };
  }
  function guessByName(n) {
    n = n.toLowerCase();
    if (/script|read/.test(n)) return "scripts"; if (/promo|code/.test(n)) return "codes"; if (/link|url/.test(n)) return "links";
    if (/sched|grid|log/.test(n)) return "schedule"; if (/host|pref/.test(n)) return "hosts"; if (/sponsor/.test(n)) return "sponsors"; return "none";
  }
  function fileFromUpload(f, text) {
    const kind = KIND(f.name); const base = { name: f.name, kind, size: f.size, flags: [] };
    if (text != null) { const d = detectText(text, f.name); return Object.assign(base, d, { flags: d.flags || [] }); }
    const flags = [];
    if (kind === "Image" || (kind === "PDF" && /scan/i.test(f.name))) flags.push(kind === "Image" ? "Extra parsing: image, needs text recognition" : "Extra parsing: scanned PDF, no text layer");
    flags.push("Mock: contents of this file type aren't read in the demo");
    return Object.assign(base, { field: guessByName(f.name), conf: 60, norm: "", flags });
  }
  const fileSize = n => n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB";

  function sampleFiles(which) {
    const P = S[which]; const hostJson = JSON.stringify({ shows: PARSE.csv(P.hosts).map(h => ({ show_id: h.show_id, name: h.show, host: h.host, do_not_say: h.do_not_say.split(";").map(s => s.trim()) })) }, null, 1);
    if (which === "web") return [
      { name: "Week_of_Nov2_Scripts.docx", kind: "Word", size: 28400, field: "scripts", conf: 95, norm: P.scripts, flags: [] },
      { name: "Sponsor_Sheet_Nov2.xlsx", kind: "Excel", size: 19100, field: "sponsors", conf: 94, norm: P.sponsors, flags: [] },
      { name: "promo_codes.csv", kind: "CSV", size: 300, field: "codes", conf: 98, norm: P.codes, flags: [] },
      { name: "Schedule_Grid_Nov2.xlsx", kind: "Excel", size: 22800, field: "schedule", conf: 78, norm: P.schedule, flags: ["Extra parsing: unusual schedule grid (days across, shows down). AI mapped it to date, show, slot, read. Please confirm."] },
      { name: "host_preferences.json", kind: "JSON", size: hostJson.length, field: "hosts", conf: 97, norm: P.hosts, flags: [] },
      { name: "Pasted links", kind: "Pasted", size: 260, field: "links", conf: 93, norm: P.links, flags: [] }
    ];
    return [
      { name: "Scripts_Nov9.pdf", kind: "PDF", size: 64200, field: "scripts", conf: 94, norm: P.scripts, flags: [] },
      { name: "Sponsor_info_Nov9.csv", kind: "CSV", size: 420, field: "sponsors", conf: 97, norm: P.sponsors, flags: [] },
      { name: "promo_codes_nov9.txt", kind: "Text", size: 110, field: "codes", conf: 96, norm: P.codes, flags: [] },
      { name: "links_nov9.txt", kind: "Text", size: 230, field: "links", conf: 96, norm: P.links, flags: [] },
      { name: "schedule_nov9.csv", kind: "CSV", size: 560, field: "schedule", conf: 97, norm: P.schedule, flags: [] },
      { name: "Host_prefs.docx", kind: "Word", size: 15800, field: "hosts", conf: 92, norm: P.hosts, flags: [] },
      { name: "insertion_order_scan.pdf", kind: "PDF", size: 812000, field: "none", conf: 40, norm: "", flags: ["Extra parsing: scanned PDF, no text layer. Not used in this check; a person can assign it."] }
    ];
  }
  function fieldsFromFiles(files) {
    const out = {};
    for (const [k] of FIELDS.slice(0, 6)) {
      const parts = files.filter(f => f.field === k && f.norm).map(f => f.norm.trim());
      out[k] = k === "scripts" ? parts.join("\n\n") : parts.length ? parts[0] + (parts.length > 1 ? "\n" + parts.slice(1).map(p => p.split("\n").slice(1).join("\n")).join("\n") : "") : "";
    }
    return out;
  }
  function completeness(files) {
    const have = new Set(files.filter(f => f.norm || f.kind !== "Pasted").map(f => f.field));
    return FIELDS.slice(0, 6).map(([k, l]) => ({ k, l, ok: have.has(k) }));
  }

  // ---------- checks ----------
  function verificationPass(pkg) { // cross-check: link path names a different show than the read airs on
    const F = []; const slugs = {}; pkg.shows.shows.forEach(s => slugs[s.show_id] = s.name.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== "the"));
    const showName = id => (pkg.shows.shows.find(s => s.show_id === id) || {}).name || id;
    for (const r of pkg.reads) for (const u of (r.text.match(/\bhttps?:\/\/[^\s]+/g) || [])) {
      const seg = u.replace(/[.,;]+$/, "").split("/").pop().toLowerCase();
      if ((slugs[r.show_id] || []).includes(seg)) continue;
      const other = Object.keys(slugs).find(k => k !== r.show_id && slugs[k].includes(seg));
      if (other) F.push({ fingerprint: "show_path|" + r.read_id + "|" + u, category: "show_path", severity: "low", source: "verify",
        title: `Read ${r.read_id} airs on ${showName(r.show_id)}, but its link ${u} uses the /${seg} path, which looks like ${showName(other)}'s vanity URL. Every checker passed it because it matches the sponsor sheet.`,
        location: { file: "scripts", read_id: r.read_id }, evidence: u, suggestion: `Confirm with the sponsor whether ${showName(r.show_id)} should have its own link.`, fix: null });
    }
    return F;
  }
  function compact(pkg) { const p = clone(pkg); p.schedule = p.schedule.filter(r => !r._deleted).map(r => { delete r._added; return r; }); return p; }
  function runAll(pkg) {
    const F = QA.runChecks(compact(pkg), ctx).concat(verificationPass(compact(pkg)));
    for (const f of F) { // enrich duplicate-code findings with the reads that use the code
      if (f.category === "duplicate_promo_code") { const uses = pkg.reads.filter(r => r.text.includes(f.evidence)).map(r => r.read_id); if (uses.length) f.title = f.title.replace(/\.$/, "") + ` (used in Reads ${uses.join(", ")}).`; }
      f.bot = CAT[f.category] || "verify"; if (f.source !== "verify") f.source = f.bot;
    }
    return F;
  }

  // ---------- jobs ----------
  const STATUS = { received: ["Received", "inbox"], checking: ["Checking", "loader-circle"], review: ["In review", "list-checks"], rechecking: ["Re-checking", "refresh-cw"],
    clear: ["All clear", "circle-check"], approved: ["Approved", "badge-check"], shipped: ["Shipped", "truck"], rejected: ["Rejected", "octagon-x"] };
  const statusBadge = s => `<span class="status s-${s}">${icon(STATUS[s][1], s === "checking" || s === "rechecking" ? "spin" : "")}${STATUS[s][0]}</span>`;
  const subBadge = j => j.source === "web" ? `<span class="sub-badge web">${icon("user")}Submitted by <b>${esc(j.submitter)}</b> (Web)</span>` : `<span class="sub-badge email">${icon("mail")}From <b>${esc(j.submitter)}</b> (Email)</span>`;
  const srcBadge = j => j.source === "web" ? `<span class="src-badge web sm">${icon("globe")}Web</span>` : `<span class="src-badge email sm">${icon("mail")}Email</span>`;
  function audit(j, actor, text, kind = "info") { j.audit.push({ at: nowET(), t: Date.now(), actor, text, kind }); }
  function drive(j, name, kind) { j.drive.push({ at: nowET(), name, kind }); }

  async function createJob(source, files, submitter, label, extra = {}) {
    await ready;
    const L = source === "web" ? "W" : "E"; st.seq[L]++;
    const id = `QA-${L}-${String(st.seq[L]).padStart(4, "0")}`;
    const letter = String.fromCharCode(65 + st.jobs.length % 26);
    const j = { id, letter, source, submitter, label, createdAt: nowET(), status: "received", files: clone(files), pkg: null, rounds: [], findings: [],
      decisions: {}, bots: {}, audit: [], drive: [], approval: null, ship: null, reject: null, runs: 0, err: null, ...extra };
    j.folder = `Package QA / ${label.split("·")[1]?.trim() || label} / ${id}`;
    audit(j, source === "web" ? submitter : "Project Manager Bot", source === "web" ? `Submitted ${files.length} file(s) through the web form` : `Picked up email from ${submitter} in bot inbox packages@[TBD] with ${files.length} attachment(s)`, "submit");
    files.forEach(f => drive(j, (f.kind === "Pasted" ? "pasted_links.txt" : f.name), "original"));
    audit(j, "Project Manager Bot", `Opened job ${id} (${source === "web" ? "Web" : "Email"}). Created Drive folder.`);
    st.jobs.unshift(j); save(); renderAll();
    run(j.id, true);
    return j;
  }

  const running = new Set();
  async function run(id, first) {
    if (running.has(id)) return; running.add(id);
    await ready;
    let j = jobById(id); if (!j) return;
    j.status = first ? "checking" : "rechecking"; j.err = null; j.bots = {}; BOTS.forEach(b => j.bots[b.k] = { state: "wait", count: null });
    save(); renderAll();
    const set = (k, state, count = null) => { j = jobById(id); j.bots[k] = { state, count }; save(); renderJobLive(id); };
    set("pm", "run"); await sleep(500);
    set("ui", "run"); await sleep(600);
    if (first) {
      try { j.pkg = PARSE.build(fieldsFromFiles(j.files)); }
      catch (e) { j.err = e.message; set("ui", "fail"); set("pm", "done"); j.status = "received"; audit(j, "Interface Bot", "Could not start checks. " + e.message + ". Waiting for a person to fix the mapping in Detected contents.", "warn"); running.delete(id); save(); renderAll(); return; }
      const flagged = j.files.filter(f => f.flags.some(x => x.startsWith("Extra parsing")));
      audit(j, "Interface Bot", `Mapped ${j.files.length} file(s) to fields. All six parts found.` + (flagged.length ? ` ${flagged.length} flagged for extra parsing: ${flagged.map(f => f.name).join(", ")}.` : ""));
    }
    set("ui", "done"); set("pm", "route");
    j = jobById(id); j.runs++;
    const F = runAll(j.pkg);
    const dismissed = new Set(Object.entries(j.decisions).filter(([, d]) => d.action === "dismissed").map(([fp]) => fp));
    const open = F.filter(f => !dismissed.has(f.fingerprint));
    const prev = new Set((j.rounds[j.rounds.length - 1] || { fps: [] }).fps);
    CHECKERS.forEach(b => set(b.k, "run"));
    const order = CHECKERS.map((b, i) => ({ b, t: 700 + ((i * 397) % 1300) + (first ? 400 : 0) })).sort((a, b) => a.t - b.t);
    let t0 = 0; for (const o of order) { await sleep(o.t - t0); t0 = o.t; set(o.b.k, "done", open.filter(f => f.bot === o.b.k).length); }
    set("verify", "run"); await sleep(900);
    const vcount = open.filter(f => f.bot === "verify").length;
    set("verify", "done", vcount);
    j = jobById(id);
    const round = { n: j.rounds.length + 1, at: nowET(), total: open.length, fps: open.map(f => f.fingerprint), newFps: j.rounds.length ? open.filter(f => !prev.has(f.fingerprint)).map(f => f.fingerprint) : [] };
    j.rounds.push(round);
    open.forEach(f => f.isNew = round.newFps.includes(f.fingerprint));
    j.findings = open; open.forEach(f => logOnce(j, f));
    // clear previous accept/edit decisions (they've been applied); keep dismissals
    for (const [fp, d] of Object.entries(j.decisions)) if (d.action !== "dismissed") delete j.decisions[fp];
    const byBot = CHECKERS.map(b => `${b.short} ${open.filter(f => f.bot === b.k).length}`).join(", ");
    audit(j, "Package QA bot network", `Check round ${round.n} finished: ${open.length} open finding(s). ${byBot}. Verification ${vcount}.` + (round.newFps.length ? ` ${round.newFps.length} new since last round.` : ""), open.length ? "warn" : "ok");
    drive(j, `findings_round${round.n}.json`, "findings");
    set("pm", "done");
    j.status = open.length ? "review" : "clear";
    audit(j, "Project Manager Bot", open.length ? "Routed to human review." : "No open findings. Routed to sign-off.");
    running.delete(id); save(); renderAll();
    if (round.newFps.length && st.openJob === id) toast(`${icon("triangle-alert")} Re-check caught ${round.newFps.length} new issue(s) introduced by a fix`);
    else if (!open.length && round.n > 1 && st.openJob === id) toast(`${icon("circle-check")} All clear. Ready for sign-off.`);
  }

  // ---------- intake actions ----------
  function setUser(u) { st.user = u; save(); renderAll(); }
  $("#signin").addEventListener("submit", e => { e.preventDefault(); setUser(($("#uName").value || "demo.user").trim()); });
  $("#signOut").addEventListener("click", () => setUser(null));
  $("#loadSample").addEventListener("click", () => { st.draft.files = sampleFiles("web"); save(); renderIntake(); msg(""); });
  $("#fileInput").addEventListener("change", e => addFiles([...e.target.files]));
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));
  $("#pasteBox").addEventListener("change", e => { const t = e.target.value.trim(); if (!t) return;
    const d = detectText(t); st.draft.files.push({ name: "Pasted text", kind: "Pasted", size: t.length, flags: d.flags || [], ...d }); e.target.value = ""; save(); renderIntake(); });
  async function addFiles(list) {
    for (const f of list) {
      const textLike = /\.(csv|tsv|json|txt|md)$/i.test(f.name);
      st.draft.files.push(fileFromUpload(f, textLike ? await f.text() : null));
    }
    save(); renderIntake();
  }
  const msg = (t, bad) => { const m = $("#formMsg"); m.innerHTML = t; m.className = "form-msg" + (bad ? " bad" : ""); };
  function submitWeb() {
    if (!st.user) { msg(icon("lock") + " Sign in first.", true); return false; }
    if (!st.draft.files.length) { msg(icon("circle-alert") + " Interface Bot: add files or load the sample package first.", true); return false; }
    const miss = completeness(st.draft.files).filter(c => !c.ok).map(c => c.l);
    if (miss.length) { msg(icon("circle-alert") + " Interface Bot: still missing " + miss.join(", ") + ". Add them or change a file's detected field.", true); return false; }
    const files = st.draft.files; st.draft.files = [];
    const isSample = files.some(f => f.name === "Week_of_Nov2_Scripts.docx");
    createJob("web", files, st.user, isSample ? S.web.label : "Web package · " + new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" }));
    msg(icon("circle-check") + " Sent to the bot network. Watch the job below.");
    return true;
  }
  $("#submitWeb").addEventListener("click", submitWeb);
  function simulateEmail() {
    st.emailSent++;
    const m = { id: "m" + Date.now(), from: S.email.from, fromAddr: S.email.fromAddr, subject: S.email.subject, at: nowET(), body: S.email.body, files: sampleFiles("email"), state: "new" };
    st.inbox.unshift(m); save(); renderIntake();
    setTimeout(() => { // bot picks it up from its own inbox: no import step
      const mm = st.inbox.find(x => x.id === m.id); if (!mm) return; mm.state = "picked"; save();
      createJob("email", mm.files, mm.fromAddr, S.email.label, { subject: mm.subject }).then(j => { mm.job = j.id; save(); renderIntake(); });
    }, 1400);
  }
  $("#simEmail").addEventListener("click", simulateEmail);
  $("#runBoth").addEventListener("click", () => {
    if (!st.user) setUser("jordan.lee");
    st.draft.files = sampleFiles("web"); submitWeb(); simulateEmail();
  });
  $("#resetAll").addEventListener("click", () => { if (!confirm("Reset the demo? This clears the mock storage in this browser only.")) return; localStorage.removeItem(KEY); location.hash = ""; location.reload(); });
  $$("#tabs button").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
  function go(v, jobId) { st.view = v; if (jobId) st.openJob = jobId; save(); renderAll(); window.scrollTo(0, 0); }

  // ---------- render: intake ----------
  function flowline(src, j) {
    const steps = src === "web" ? [["globe", "Web form"], ["bot", "Checks"], ["list-checks", "Results"]] : [["mail", "Email"], ["inbox", "Bot inbox"], ["bot", "Checks"], ["list-checks", "Results"]];
    let active = -1;
    if (j) active = { received: 0, checking: steps.length - 2, rechecking: steps.length - 2 }[j.status] ?? steps.length - 1;
    return steps.map((s, i) => `<span class="fstep ${i < active ? "done" : i === active ? "on" : ""}">${icon(s[0])}${s[1]}</span>${i < steps.length - 1 ? `<span class="fconn ${i < active ? "done" : i === active - 1 || (i === active && j && /checking/.test(j.status)) ? "live" : ""}"><i></i></span>` : ""}`).join("");
  }
  function detectedTable(files, editable, jobId) {
    if (!files.length) return "";
    const comp = completeness(files);
    return `<div class="det-head">${icon("sparkles")}<b>Detected contents</b><span class="muted">AI mapped each file's layout to a field${editable ? ". Change any mapping below." : ""}</span></div>
    <ul class="det-list">${files.map((f, i) => `<li class="${f.flags.some(x => x.startsWith("Extra")) ? "xp" : ""}">
      <span class="det-file">${icon(KIND_ICON[f.kind] || "file")}<span><b>${esc(f.name)}</b><small>${f.kind}${f.size ? " · " + fileSize(f.size) : ""}</small></span></span>
      <span class="det-map">${icon("arrow-right", "muted")}${editable ? `<select data-ov="${i}" data-job="${jobId || ""}" aria-label="Detected field for ${esc(f.name)}">${FIELDS.map(([k, l]) => `<option value="${k}" ${k === f.field ? "selected" : ""}>${l}</option>`).join("")}</select>` : `<b>${fieldLabel(f.field)}</b>`}
      <span class="conf ${f.conf >= 90 ? "hi" : f.conf >= 70 ? "mid" : "lo"}">${f.conf}%</span>${f.overridden ? `<span class="ov">${icon("pencil")}override</span>` : ""}</span>
      ${f.flags.length ? `<span class="det-flags">${f.flags.map(x => `<span class="flag ${x.startsWith("Extra") ? "xp" : ""}">${icon(x.startsWith("Extra") ? "scan-line" : "info")}${esc(x)}</span>`).join("")}</span>` : ""}
      ${editable && !jobId ? `<button class="icon-btn" data-rm="${i}" title="Remove file" aria-label="Remove ${esc(f.name)}">${icon("x")}</button>` : ""}
    </li>`).join("")}</ul>
    <div class="checklist">${comp.map(c => `<span class="${c.ok ? "ok" : ""}">${icon(c.ok ? "circle-check" : "circle-dot")}${c.l}</span>`).join("")}</div>`;
  }
  function renderIntake() {
    const u = st.user;
    $("#signin").hidden = !!u; $("#webForm").hidden = !u; if (u) $("#signedName").textContent = u;
    $("#userChip").innerHTML = u ? `${icon("user")}<span>${esc(u)}</span>` : `${icon("user")}<span class="muted">Not signed in</span>`;
    const lastWeb = st.jobs.find(j => j.source === "web"), lastEm = st.jobs.find(j => j.source === "email");
    $("#flowWeb").innerHTML = flowline("web", lastWeb); $("#flowEmail").innerHTML = flowline("email", lastEm);
    $("#webDetected").innerHTML = detectedTable(st.draft.files, true);
    $("#inboxList").innerHTML = st.inbox.length ? st.inbox.slice(0, 3).map(m => `<div class="mail ${m.state}">
        <div class="mail-top"><span class="avatar">${icon("mail")}</span><div class="mail-meta"><b>${esc(m.subject)}</b><span>${esc(m.from)} · ${esc(m.at)} ET</span></div>
        <span class="mail-state">${m.state === "new" ? `${icon("radio")}New` : `${icon("bot")}Picked up by bot${m.job ? " · " + m.job : ""}`}</span></div>
        <p>${esc(m.body)}</p>
        <div class="attach">${m.files.map(f => `<span class="chip ${f.flags.length ? "xp" : ""}">${icon("paperclip")}${esc(f.name)}</span>`).join("")}</div>
        <div class="sub-line">${icon("user-check")}Submitter logged from sender: <b>${esc(m.fromAddr)}</b></div></div>`).join("")
      : `<div class="inbox-empty">${icon("mail")}<p>No new messages. Click <b>Simulate email arriving</b> to send a fictional package with 7 attachments.</p></div>`;
    $$("#webDetected [data-ov]").forEach(s => s.addEventListener("change", () => { const f = st.draft.files[+s.dataset.ov]; f.field = s.value; f.overridden = true; save(); renderIntake(); }));
    $$("#webDetected [data-rm]").forEach(b => b.addEventListener("click", () => { st.draft.files.splice(+b.dataset.rm, 1); save(); renderIntake(); }));
    // indicator
    const act = st.jobs.slice(0, 4).sort((a, b) => a.letter.localeCompare(b.letter));
    $("#indicator").innerHTML = act.length ? `${icon("git-merge")}<span class="ind-lbl">Parallel jobs</span>` + act.map(j => `<span class="ind-job ${j.source}">${j.source === "web" ? icon("globe") : icon("mail")}<b>Job ${j.letter}</b> ${j.source === "web" ? "Web" : "Email"}, ${esc(j.label.split("·")[0].trim())} · ${statusBadge(j.status)}</span>`).join("") + `<span class="ind-note">${icon("check")}Each checked once, no shared or duplicated work</span>`
      : `${icon("git-merge")}<span class="ind-lbl">Parallel jobs</span><span class="muted">Web and email submissions run as separate jobs, each checked once. Try <b>Run both at once</b>.</span>`;
    const busy = st.jobs.filter(j => /checking/.test(j.status)).length;
    $("#botState").innerHTML = busy ? `<span class="dot live"></span>Running ${busy} job${busy > 1 ? "s" : ""}` : `<span class="dot"></span>Idle, watching inbox`;
    $("#legend").innerHTML = BOTS.map(b => `<div class="legend-bot ${b.k}">${icon(b.icon)}<div><b>${b.name}</b><span>${b.role}</span></div></div>`).join("");
    renderJobs();
  }
  function botGrid(j) {
    return `<div class="bot-grid">${BOTS.map(b => { const s = j.bots[b.k] || { state: "wait" }; const c = s.count;
      const lbl = { wait: "Queued", run: b.k === "pm" ? "Routing" : "Running", route: "Routing", done: c == null ? "Done" : c ? `${c} found` : "Clear", fail: "Blocked" }[s.state];
      return `<div class="bchip ${s.state} ${s.state === "done" && c ? "has" : ""} ${b.k}">${icon(b.icon)}<span class="bn">${b.short}</span><span class="bs">${s.state === "run" || s.state === "route" ? icon("loader-circle", "spin") : ""}${lbl}</span></div>`; }).join("")}</div>`;
  }
  function jobCard(j) {
    const open = j.findings.length, r = j.rounds.length;
    const payload = { job_id: j.id, source: j.source, submitter: j.submitter, package: j.label, files: j.files.map(f => ({ name: f.name, type: f.kind, mapped_to: f.field })), checks: BOTS.map(b => b.k), run: r || 1 };
    return `<article class="card job ${j.source}" data-job="${j.id}">
      <div class="job-head"><div class="job-id"><span class="job-letter">${j.letter}</span><div><b>Job ${j.letter} · ${j.id}</b><span>${esc(j.label)}</span></div></div>${srcBadge(j)}</div>
      <div class="job-meta">${subBadge(j)}${statusBadge(j.status)}</div>
      ${botGrid(j)}
      ${j.err ? `<p class="form-msg bad">${icon("circle-alert")}Interface Bot: ${esc(j.err)}</p>` : ""}
      <details class="payload"><summary>${icon("send")}Payload sent to the bot network</summary><pre>${esc(JSON.stringify(payload, null, 2))}</pre></details>
      <div class="job-foot"><span class="muted">${r ? `Round ${r} · ${open} open finding${open === 1 ? "" : "s"}` : "Checking…"} · ${j.runs} check run${j.runs === 1 ? "" : "s"}, this package only</span>
      <button class="btn ${/review|clear|approved/.test(j.status) || j.err ? "primary" : ""}" data-open="${j.id}">${icon("eye")}Open review</button></div>
    </article>`;
  }
  function renderJobs() {
    const live = st.jobs.slice(0, 4).sort((a, b) => a.letter.localeCompare(b.letter));
    $("#jobs").innerHTML = live.length ? `<div class="sec-head">${icon("layers")}<h2>Jobs</h2><span class="muted">Each job has its own ID, source, submitter, progress, and results</span></div><div class="job-grid">${live.map(jobCard).join("")}</div>` : "";
    $$("#jobs [data-open]").forEach(b => b.addEventListener("click", () => go("review", b.dataset.open)));
  }
  function renderJobLive(id) {
    const j = jobById(id); const el = document.querySelector(`#jobs [data-job="${id}"]`);
    if (el && st.view === "intake") { const d = el.querySelector("details")?.open; el.outerHTML = jobCard(j); const n = document.querySelector(`#jobs [data-job="${id}"]`); if (d) n.querySelector("details").open = true; n.querySelector("[data-open]").addEventListener("click", () => go("review", id)); }
    if (st.view === "review" && st.openJob === id) { const g = $("#reviewBots"); if (g) g.innerHTML = botGrid(j); }
  }

  // ---------- render: review ----------
  function readText(pkg, rid) { const r = pkg.reads.find(x => x.read_id === rid); return r ? r.text : ""; }
  function highlight(text, ev) {
    if (!ev || !text.includes(ev)) return esc(text);
    const i = text.indexOf(ev); return esc(text.slice(0, i)) + `<mark>${esc(ev)}</mark>` + esc(text.slice(i + ev.length));
  }
  function context(j, f) {
    const L = f.location || {};
    if (L.read_id && (L.file || "").startsWith("script")) {
      const r = j.pkg.reads.find(x => x.read_id === L.read_id); const show = j.pkg.shows.shows.find(s => s.show_id === r?.show_id);
      return `<div class="ctx"><div class="ctx-h">${icon("file-text")}Read ${L.read_id}${show ? ` · ${esc(show.name)} · host ${esc(show.host)}` : ""}${r?.length ? " · " + esc(r.length) : ""}</div><p>${highlight(readText(j.pkg, L.read_id), f.evidence)}</p></div>`;
    }
    if ((L.file || "").startsWith("schedule")) {
      const rows = compact(j.pkg).schedule.filter(r => r.date === L.date && r.show_id === L.show_id);
      const sname = (j.pkg.shows.shows.find(s => s.show_id === L.show_id) || {}).name || L.show_id;
      return `<div class="ctx"><div class="ctx-h">${icon("calendar-days")}Schedule · ${esc(sname)} · ${QA.fmtDay(L.date)}</div>${rows.length ? `<table class="mini"><tr><th>Slot</th><th>Read</th><th>Sponsor</th></tr>${rows.map(r => { const rd = j.pkg.reads.find(x => x.read_id === r.read_id); const sp = rd && j.pkg.sponsors.find(s => s.sponsor_id === rd.sponsor_id);
        const hit = (L.read_id && r.read_id === L.read_id) || (L.slot && r.slot === L.slot); return `<tr class="${hit ? "hit" : ""}"><td>${r.slot}-roll</td><td>${r.read_id}</td><td>${esc(sp ? sp.sponsor : "")}</td></tr>`; }).join("")}</table>` : `<p class="muted">No reads scheduled for this show on this day.</p>`}</div>`;
    }
    if ((L.file || "").startsWith("sponsor")) {
      return `<div class="ctx"><div class="ctx-h">${icon("building-2")}Sponsor sheet · promo codes</div><table class="mini"><tr><th>Sponsor</th><th>Code</th></tr>${j.pkg.sponsors.map(s => `<tr class="${s.promo_code === f.evidence ? "hit" : ""}"><td>${esc(s.sponsor)}</td><td><code>${esc(s.promo_code)}</code></td></tr>`).join("")}</table></div>`;
    }
    return "";
  }
  function findingCard(j, f) {
    const d = j.decisions[f.fingerprint]; const b = botOf(f.bot); const locked = /approved|shipped|rejected/.test(j.status) || /checking/.test(j.status);
    const canAccept = f.fix && !f.fix.needs_input;
    return `<li class="finding sev-${f.severity} ${d ? "decided " + d.action : ""}" data-fp="${esc(f.fingerprint)}">
      <div class="f-top"><span class="f-type ${f.bot}">${icon(b.icon)}${TYPE_LABEL[f.bot]}</span><span class="sev">${f.severity}</span>${f.isNew ? `<span class="new">${icon("sparkles")}New this round</span>` : ""}${f.bot === "verify" ? `<span class="credit">${icon("shield-check")}Extra catch by Verification Bot</span>` : `<span class="credit muted">${b.name}</span>`}</div>
      <h4>${esc(f.title)}</h4>
      ${context(j, f)}
      <div class="fix-line">${icon("sparkles")}<span><b>Suggested fix:</b> ${esc(f.suggestion || "Review manually.")}</span></div>
      ${d ? `<div class="decision">${icon(d.action === "dismissed" ? "circle-x" : "circle-check")}<span><b>${{ accepted: "Fix accepted", edited: "Edited", dismissed: "Dismissed" }[d.action]}</b> by ${esc(d.by)}${d.reason ? ` · reason: ${esc(d.reason)}` : ""}${d.value && d.action === "edited" ? ` · “${esc(d.value)}”` : ""}${d.action !== "dismissed" ? " · applies on re-run" : ""}</span>${!locked && d.action !== "dismissed" ? `<button class="link-btn" data-undo>${icon("rotate-ccw")}Undo</button>` : ""}</div>`
        : locked ? "" : `<div class="actions"><button class="btn sm primary" data-accept ${canAccept ? "" : "disabled title='Needs a rewrite. Use Edit.'"}>${icon("check")}Accept fix</button><button class="btn sm" data-edit ${f.fix ? "" : "disabled"}>${icon("pencil")}Edit</button><button class="btn sm ghost" data-dismiss>${icon("x")}Dismiss with reason</button></div>`}
    </li>`;
  }
  function renderReview() {
    const v = $("#view-review");
    if (!st.jobs.length) { v.innerHTML = `<div class="card empty-state">${icon("list-checks")}<h2>No jobs yet</h2><p>Submit a package through the web form or simulate an email on the Intake tab.</p><button class="btn primary" id="goIntake">${icon("inbox")}Go to Intake</button></div>`; $("#goIntake").onclick = () => go("intake"); return; }
    let j = jobById(st.openJob) || st.jobs[0]; st.openJob = j.id;
    const picker = `<div class="picker">${st.jobs.slice(0, 6).sort((a, b) => a.letter.localeCompare(b.letter)).map(x => `<button class="pick ${x.id === j.id ? "on" : ""}" data-pick="${x.id}">${x.source === "web" ? icon("globe") : icon("mail")}<b>Job ${x.letter}</b><span>${x.id}</span>${statusBadge(x.status)}</button>`).join("")}</div>`;
    const open = j.findings, undecided = open.filter(f => !j.decisions[f.fingerprint]).length, decided = open.length - undecided;
    const checking = /checking/.test(j.status);
    const pending = Object.values(j.decisions).filter(d => d.action !== "dismissed").length;
    const groups = CHECKERS.concat([botOf("verify")]).map(b => ({ b, items: open.filter(f => f.bot === b.k) })).filter(g => g.items.length);
    const hist = histByType(j);
    const canSign = j.status === "clear" || (j.status === "review" && open.length && open.every(f => j.decisions[f.fingerprint]?.action === "dismissed"));
    v.innerHTML = `${picker}
    <section class="card rv-head">
      <div class="job-head"><div class="job-id"><span class="job-letter">${j.letter}</span><div><b>Job ${j.letter} · ${j.id}</b><span>${esc(j.label)}${j.subject ? " · " + esc(j.subject) : ""}</span></div></div>${srcBadge(j)}</div>
      <div class="job-meta">${subBadge(j)}${statusBadge(j.status)}<span class="muted">Submitted ${esc(j.createdAt)} ET · Round ${j.rounds.length || "–"}</span></div>
      <div id="reviewBots">${botGrid(j)}</div>
      <div class="ui-say">${icon("layers")}<span><b>Interface Bot:</b> ${checking ? "Checks are running. Findings will appear here." : j.err ? esc(j.err) : open.length ? `${open.length} open finding${open.length > 1 ? "s" : ""} (${open.filter(f => f.severity === "high").length} high). ${decided} decided, ${undecided} to go. Decide each one, then re-run checks.` : j.status === "clear" ? "All clear. Every checker and the Verification Bot passed this package. Ready for sign-off." : "Package closed."}</span></div>
    </section>
    <div class="rv-grid">
      <div class="rv-main">
        <section class="card">
          <div class="sec-head">${icon("list-checks")}<h2>Findings</h2><span class="muted">Named in plain words, grouped by error type</span>
            <button class="btn primary rerun" id="rerun" ${checking || !open.length || /approved|shipped|rejected/.test(j.status) || !pending ? "disabled" : ""}>${icon("refresh-cw", checking ? "spin" : "")}Re-run checks${pending ? ` (${pending} fix${pending > 1 ? "es" : ""})` : ""}</button></div>
          ${checking ? `<div class="checking-note">${icon("loader-circle", "spin")}The bot network is checking this package…</div>` : ""}
          ${!checking && !open.length && j.rounds.length ? `<div class="all-clear">${icon("circle-check")}<div><b>All clear after ${j.rounds.length} round${j.rounds.length > 1 ? "s" : ""}.</b><span>No open findings. Sign off below to unlock shipping.</span></div></div>` : ""}
          ${!checking ? groups.map(g => `<div class="fgroup"><div class="fg-h">${icon(g.b.icon)}<b>${TYPE_LABEL[g.b.k]}</b><span class="count">${g.items.length}</span></div><ul class="flist">${g.items.map(f => findingCard(j, f)).join("")}</ul></div>`).join("") : ""}
          ${j.rounds.length ? `<div class="rounds">${j.rounds.map(r => `<span class="round">${icon("refresh-cw")}Round ${r.n}: ${r.total} open${r.newFps.length ? `, <b>${r.newFps.length} new</b>` : ""} <small>${esc(r.at)} ET</small></span>`).join("")}</div>` : ""}
        </section>
        ${j.files ? `<section class="card"><div class="detected">${detectedTable(j.files, !/approved|shipped|rejected/.test(j.status) && !j.rounds.length, j.id)}</div>${j.rounds.length ? `<p class="muted small">${icon("lock")}Mapping is locked once checks have run. ${j.err ? "" : ""}</p>` : `<button class="btn" id="retryMap">${icon("play")}Start checks with this mapping</button>`}</section>` : ""}
        ${signoff(j, canSign, hist)}
        ${shipping(j)}
      </div>
      <aside class="rv-side">
        ${driveCard(j)}
        ${auditCard(j)}
      </aside>
    </div>`;
    wireReview(j);
  }
  function histByType(j) {
    const t = {}; CHECKERS.concat([botOf("verify")]).forEach(b => t[b.k] = { found: 0, fixed: 0, dismissed: 0 });
    const seen = new Set();
    (j.log || []).forEach(e => { if (!t[e.bot]) return; if (e.type === "found" && !seen.has(e.fp)) { seen.add(e.fp); t[e.bot].found++; } if (e.type === "fixed") t[e.bot].fixed++; if (e.type === "dismissed") t[e.bot].dismissed++; });
    return t;
  }
  function signoff(j, canSign, hist) {
    const done = j.approval; const locked = !canSign && !done;
    return `<section class="card signoff ${locked ? "locked" : ""}">
      <div class="sec-head">${icon("signature")}<h2>Human sign-off</h2>${done ? `<span class="status s-approved">${icon("badge-check")}Approved</span>` : locked ? `<span class="lock-note">${icon("lock")}Unlocks when the package is all clear</span>` : ""}</div>
      <table class="sumtable"><tr><th>Error type</th><th>Found</th><th>Fixed</th><th>Dismissed</th></tr>${Object.entries(hist).map(([k, x]) => `<tr><td>${icon(botOf(k).icon)}${TYPE_LABEL[k]}</td><td>${x.found}</td><td>${x.fixed}</td><td>${x.dismissed}</td></tr>`).join("")}
      <tr class="tot"><td>Total</td><td>${Object.values(hist).reduce((a, x) => a + x.found, 0)}</td><td>${Object.values(hist).reduce((a, x) => a + x.fixed, 0)}</td><td>${Object.values(hist).reduce((a, x) => a + x.dismissed, 0)}</td></tr></table>
      ${done ? `<div class="signed-box">${icon("badge-check")}<div><b>Approved by ${esc(done.name)}</b><span>Signature: <i class="sig">${esc(done.sig)}</i> · ${esc(done.at)} ET</span></div></div>`
        : `<div class="sign-form">
        <label class="chk"><input type="checkbox" id="sgChk" ${locked ? "disabled" : ""}><span>I reviewed every finding in this package and approve it to ship to studios.</span></label>
        <div class="sign-row"><label><span>Approver name</span><input id="sgName" value="${esc(st.user || "")}" placeholder="Full name" ${locked ? "disabled" : ""}></label>
        <label><span>Signature (type your name)</span><input id="sgSig" class="sig" placeholder="Type to sign" ${locked ? "disabled" : ""}></label></div>
        <div class="sign-actions"><button class="btn primary" id="approve" ${locked ? "disabled" : ""}>${icon("badge-check")}Approve package</button><button class="btn ghost danger" id="reject" ${/shipped|rejected/.test(j.status) ? "disabled" : ""}>${icon("octagon-x")}Reject with reason</button></div></div>`}
    </section>`;
  }
  function shipping(j) {
    const shows = j.pkg ? j.pkg.shows.shows : [];
    const unlocked = j.status === "approved";
    if (j.status === "rejected") return `<section class="card ship rejected">${icon("octagon-x")}<div><b>Rejected by ${esc(j.reject.by)}</b><span>Reason: ${esc(j.reject.reason)} · ${esc(j.reject.at)} ET. Sent back to ${esc(j.submitter)}. Nothing was shipped.</span></div></section>`;
    return `<section class="card ship ${unlocked || j.ship ? "" : "locked"}">
      <div class="sec-head">${icon("truck")}<h2>Ship to studios</h2>${j.ship ? `<span class="status s-shipped">${icon("truck")}Shipped</span>` : unlocked ? `<span class="unlock">${icon("lock-open")}Unlocked by approval</span>` : `<span class="lock-note">${icon("lock")}Locked until a named approver signs off</span>`}</div>
      <ul class="studios">${shows.map(s => { const n = j.pkg ? compact(j.pkg).schedule.filter(r => r.show_id === s.show_id).length : 0; const del = j.ship && j.ship.done.includes(s.show_id);
        return `<li class="${del ? "del" : ""}">${icon("radio")}<div><b>${esc(s.name)}</b><span>${esc(STUDIOS[s.show_id] || "Studio")} (fictional) · ${n} read${n === 1 ? "" : "s"} this week</span></div><span class="dstate">${del ? `${icon("circle-check")}Delivered` : j.ship ? `${icon("loader-circle", "spin")}Sending` : "Waiting"}</span></li>`; }).join("")}</ul>
      ${j.ship ? "" : `<button class="btn primary" id="ship" ${unlocked ? "" : "disabled"}>${icon("send")}Ship to studios</button>`}
    </section>`;
  }
  function driveCard(j) {
    const ic = { original: "paperclip", findings: "file-json", approval: "badge-check", package: "archive", receipt: "truck", audit: "list", reject: "octagon-x" };
    return `<section class="card drive"><div class="sec-head">${icon("hard-drive")}<h2>Google Drive folder</h2><span class="mock">Mock</span></div>
      <div class="path">${icon("folder")}${esc(j.folder)}</div>
      <ul class="dfiles">${j.drive.map(d => `<li>${icon(ic[d.kind] || "file")}<span>${esc(d.name)}</span><small>${esc(d.at)} ET</small></li>`).join("")}</ul>
      <p class="muted small">Simulated storage. Each version is saved as a new file; nothing is overwritten.</p></section>`;
  }
  function auditCard(j) {
    const ki = { submit: "send", warn: "triangle-alert", ok: "circle-check", decide: "pencil", approve: "badge-check", ship: "truck", reject: "octagon-x", info: "circle-dot" };
    return `<section class="card audit"><div class="sec-head">${icon("list")}<h2>Audit trail</h2><span class="addonly">${icon("lock")}Add-only</span></div>
      <ol class="alog">${j.audit.slice().reverse().map(a => `<li class="k-${a.kind}">${icon(ki[a.kind] || "circle-dot")}<div><span class="a-who">${esc(a.actor)}</span><span class="a-what">${esc(a.text)}</span><small>${esc(a.at)} ET</small></div></li>`).join("")}</ol>
      <p class="muted small">Entries can't be edited or removed. ${j.audit.length} entries.</p></section>`;
  }
  function logF(j, type, f) { j.log = j.log || []; j.log.push({ type, fp: f.fingerprint, bot: f.bot }); }
  function wireReview(j) {
    $$("[data-pick]").forEach(b => b.onclick = () => { st.openJob = b.dataset.pick; save(); renderReview(); });
    (j.findings || []).forEach(f => logOnce(j, f));
    const byFp = fp => j.findings.find(f => f.fingerprint === fp);
    $$(".finding").forEach(li => {
      const f = byFp(li.dataset.fp); if (!f) return;
      li.querySelector("[data-accept]")?.addEventListener("click", () => decide(j, f, "accepted"));
      li.querySelector("[data-edit]")?.addEventListener("click", () => editModal(j, f));
      li.querySelector("[data-dismiss]")?.addEventListener("click", () => dismissModal(j, f));
      li.querySelector("[data-undo]")?.addEventListener("click", () => { delete j.decisions[f.fingerprint]; const li2 = (j.log || []).map(e => e.fp === f.fingerprint && e.type !== "found").lastIndexOf(true); if (li2 >= 0) j.log.splice(li2, 1); audit(j, st.user || "Reviewer", `Undid decision on: ${f.title}`, "decide"); save(); renderReview(); });
    });
    $("#rerun")?.addEventListener("click", () => rerun(j));
    $$("#view-review [data-ov]").forEach(s => s.addEventListener("change", () => { const f = j.files[+s.dataset.ov]; f.field = s.value; f.overridden = true; audit(j, st.user || "Reviewer", `Changed detected field for ${f.name} to ${fieldLabel(s.value)}`, "decide"); save(); renderReview(); }));
    $("#retryMap")?.addEventListener("click", () => run(j.id, true));
    $("#approve")?.addEventListener("click", () => {
      const ok = $("#sgChk").checked, name = $("#sgName").value.trim(), sig = $("#sgSig").value.trim();
      if (!ok || !name || !sig) { toast(`${icon("circle-alert")} Tick the box, add the approver's name, and sign.`); return; }
      j.approval = { name, sig, at: nowET() }; j.status = "approved";
      audit(j, name, `Approved the package after ${j.rounds.length} check round(s). Signed "${sig}". Shipping unlocked.`, "approve");
      drive(j, `approval_${j.id}.pdf`, "approval"); drive(j, `approved_package_${j.id}_v${j.rounds.length}.zip`, "package");
      save(); renderAll();
    });
    $("#reject")?.addEventListener("click", () => rejectModal(j));
    $("#ship")?.addEventListener("click", () => shipIt(j));
  }
  function logOnce(j, f) { j.log = j.log || []; if (!j.log.some(e => e.type === "found" && e.fp === f.fingerprint)) j.log.push({ type: "found", fp: f.fingerprint, bot: f.bot }); }
  function decide(j, f, action, value, reason) {
    j.decisions[f.fingerprint] = { action, value, reason, by: st.user || "Reviewer", at: nowET() };
    logF(j, action === "dismissed" ? "dismissed" : "fixed", f);
    audit(j, st.user || "Reviewer", `${{ accepted: "Accepted fix", edited: "Edited", dismissed: "Dismissed" }[action]}: ${f.title}${reason ? ` Reason: ${reason}.` : ""}${value ? ` New text: "${value}".` : ""}`, "decide");
    save(); renderReview();
  }
  function rerun(j) {
    for (const f of j.findings) { const d = j.decisions[f.fingerprint]; if (!d || d.action === "dismissed" || !f.fix) continue;
      try { QA.applyFix(j.pkg, f.fix, d.action === "edited" ? d.value : undefined); } catch (e) { } }
    audit(j, st.user || "Reviewer", `Re-ran checks with ${Object.values(j.decisions).filter(d => d.action !== "dismissed").length} fix(es) applied.`, "decide");
    drive(j, `package_${j.id}_v${j.rounds.length + 1}.zip`, "package");
    save(); run(j.id, false);
  }
  async function shipIt(j) {
    j.ship = { at: nowET(), done: [] }; j.status = "approved"; audit(j, "Project Manager Bot", `Approval confirmed (${j.approval.name}). Shipping to ${j.pkg.shows.shows.length} studios.`, "ship"); save(); renderReview();
    for (const s of j.pkg.shows.shows) { await sleep(700); j.ship.done.push(s.show_id); audit(j, "Project Manager Bot", `Delivered to ${STUDIOS[s.show_id] || "studio"} (${s.name}).`, "ship"); save(); renderReview(); }
    j.status = "shipped"; drive(j, `delivery_receipts_${j.id}.csv`, "receipt"); drive(j, `audit_log_${j.id}.csv`, "audit");
    audit(j, "Project Manager Bot", "All studios delivered. Package archived.", "ok"); save(); renderAll();
  }

  // ---------- modals ----------
  function modal(html, onOk) {
    const m = $("#modal"); $("#modalCard").innerHTML = html; m.hidden = false;
    const close = () => { m.hidden = true; }; $("#mCancel").onclick = close; m.onclick = e => { if (e.target === m) close(); };
    $("#mOk").onclick = () => { if (onOk() !== false) close(); };
    setTimeout(() => $("#modalCard").querySelector("textarea,input,select")?.focus(), 30);
  }
  function editModal(j, f) {
    const fx = f.fix; let draft = fx.replace ?? fx.value ?? "";
    if (f.category === "do_not_say") draft = DRAFTS[f.evidence.toLowerCase()] || fx.find;
    if (typeof draft === "object") draft = JSON.stringify(draft);
    modal(`<h3>${icon("pencil")}Edit fix</h3><p class="muted">${esc(f.title)}</p>
      ${fx.find ? `<label class="fld"><span>Current text</span><div class="cur">${esc(fx.find)}</div></label>` : ""}
      <label class="fld"><span>Replace with</span><textarea id="mVal" rows="3">${esc(draft)}</textarea></label>
      <p class="muted small">${icon("refresh-cw")}Edits are checked again on the next re-run.</p>
      <div class="m-actions"><button class="btn ghost" id="mCancel">Cancel</button><button class="btn primary" id="mOk">${icon("check")}Save edit</button></div>`,
      () => { const v = $("#mVal").value.trim(); if (!v) return false; let val = v; if (typeof fx.value === "object" && fx.value) { try { val = JSON.parse(v); } catch (e) { return false; } } decide(j, f, "edited", val); });
  }
  function dismissModal(j, f) {
    modal(`<h3>${icon("x")}Dismiss finding</h3><p class="muted">${esc(f.title)}</p>
      <label class="fld"><span>Reason (required, saved to the audit trail)</span><select id="mSel">${DISMISS_REASONS.map(r => `<option>${r}</option>`).join("")}<option value="">Other…</option></select></label>
      <label class="fld"><span>Note</span><input id="mNote" placeholder="Optional detail"></label>
      <div class="m-actions"><button class="btn ghost" id="mCancel">Cancel</button><button class="btn primary" id="mOk">${icon("x")}Dismiss</button></div>`,
      () => { const r = [$("#mSel").value, $("#mNote").value.trim()].filter(Boolean).join(": "); if (!r) return false; decide(j, f, "dismissed", null, r); });
  }
  function rejectModal(j) {
    modal(`<h3>${icon("octagon-x")}Reject package</h3><p class="muted">The package goes back to ${esc(j.submitter)} and nothing ships.</p>
      <label class="fld"><span>Reason (required)</span><textarea id="mVal" rows="3" placeholder="e.g. Sponsor needs to supply corrected promo codes"></textarea></label>
      <div class="m-actions"><button class="btn ghost" id="mCancel">Cancel</button><button class="btn danger" id="mOk">${icon("octagon-x")}Reject</button></div>`,
      () => { const v = $("#mVal").value.trim(); if (!v) return false; j.reject = { by: st.user || "Reviewer", reason: v, at: nowET() }; j.status = "rejected";
        audit(j, j.reject.by, `Rejected the package. Reason: ${v}. Returned to ${j.submitter}.`, "reject"); drive(j, `rejection_note_${j.id}.txt`, "reject"); save(); renderAll(); });
  }
  let tt; function toast(h) { const t = $("#toast"); t.innerHTML = h; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 4200); }

  // ---------- render: history ----------
  function renderHistory() {
    const v = $("#view-history");
    const rows = st.jobs.slice().sort((a, b) => a.letter.localeCompare(b.letter)).map(j => { const h = histByType(j); const tot = Object.values(h).reduce((a, x) => ({ f: a.f + x.found, x: a.x + x.fixed, d: a.d + x.dismissed }), { f: 0, x: 0, d: 0 });
      return `<tr data-h="${j.id}"><td><b>${j.id}</b><small>Job ${j.letter}</small></td><td>${srcBadge(j)}</td><td>${j.source === "web" ? icon("user") : icon("mail")}${esc(j.submitter)}</td><td>${esc(j.label)}</td><td>${esc(j.createdAt)}</td><td>${j.rounds.length}</td><td>${tot.f} / ${tot.x} / ${tot.d}</td><td>${statusBadge(j.status)}</td><td>${j.approval ? esc(j.approval.name) : "–"}</td><td>${icon("chevron-right", "muted")}</td></tr>`; }).join("");
    const all = st.jobs.flatMap(j => j.audit.map(a => ({ ...a, id: j.id, src: j.source }))).reverse().slice(0, 40);
    v.innerHTML = `<section class="card"><div class="sec-head">${icon("history")}<h2>History</h2><span class="muted">Every submission, who sent it, and what happened. Saved in this browser (simulated storage).</span></div>
      ${st.jobs.length ? `<div class="log-scroll"><table class="log"><thead><tr><th>Job ID</th><th>Source</th><th>Submitter</th><th>Package</th><th>Submitted (ET)</th><th>Rounds</th><th>Found / fixed / dismissed</th><th>Status</th><th>Approver</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">No submissions yet.</p>`}
    </section>
    ${st.jobs.length ? `<section class="card audit"><div class="sec-head">${icon("list")}<h2>Activity across all jobs</h2><span class="addonly">${icon("lock")}Add-only</span></div><ol class="alog">${st.jobs.flatMap(j => j.audit.map(a => ({ a, j }))).sort((x, y) => (x.a.t || 0) - (y.a.t || 0)).slice(-60).reverse().map(({ a, j }) => `<li class="k-${a.kind}">${icon(j.source === "web" ? "globe" : "mail")}<div><span class="a-who">${j.id} · ${esc(a.actor)}</span><span class="a-what">${esc(a.text)}</span><small>${esc(a.at)} ET</small></div></li>`).join("")}</ol></section>` : ""}`;
    $$("[data-h]").forEach(r => r.onclick = () => go("review", r.dataset.h));
  }

  // ---------- master render ----------
  function renderAll() {
    $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.view === st.view));
    ["intake", "review", "history"].forEach(k => $("#view-" + k).hidden = st.view !== k);
    const n = st.jobs.filter(j => j.status === "review" || j.status === "clear").length; $("#reviewCount").textContent = n || "";
    renderIntake();
    if (st.view === "review") renderReview();
    if (st.view === "history") renderHistory();
  }
  hydrate(); renderAll();
  // resume any job that was mid-check when the page was closed
  st.jobs.filter(j => /checking/.test(j.status)).forEach(j => run(j.id, j.status === "checking" && !j.rounds.length));
  // deep links for screenshots/demo: #view=review&job=QA-W-0001
  const h = new URLSearchParams(location.hash.slice(1)); if (h.get("view")) go(h.get("view"), h.get("job"));
  window.PQA = { st, go, sampleFiles, simulateEmail, submitWeb };
})();
