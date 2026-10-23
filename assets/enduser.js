/* Package QA - end-user experience mock. Front end only: files are not read or uploaded.
   The report always uses the fictional example package (Package 1, week of Nov 2, 2026) checked by the same in-browser rules as the team demo. */
(function () {
  "use strict";
  const S = window.SAMPLES, QA = window.QA, PARSE = window.PARSE, IC = window.ICONS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ""}</svg>`;
  const hydrate = (root = document) => root.querySelectorAll("[data-i]").forEach(el => { el.innerHTML = icon(el.dataset.i); el.removeAttribute("data-i"); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- plain-language groups ----------
  const GROUPS = [
    { key: "sched", name: "Schedule", icon: "calendar-days", cats: ["missing_day", "wrong_show", "out_of_flight", "double_booked"] },
    { key: "code", name: "Promo codes", icon: "ticket-percent", cats: ["promo_code_mismatch", "duplicate_promo_code"] },
    { key: "link", name: "Links", icon: "link", cats: ["broken_link", "malformed_link"] },
    { key: "words", name: "Host preferences", icon: "message-square-warning", cats: ["do_not_say"] },
    { key: "typo", name: "Spelling and grammar", icon: "spell-check", cats: ["spelling", "grammar"] }
  ];
  const groupOf = c => GROUPS.find(g => g.cats.includes(c)) || GROUPS[4];
  const REWRITES = { // friendly rewrites for phrases a host prefers to avoid (fictional)
    "game-changer": "Freelancers tell me it saves them hours every quarter.",
    "i personally": "Dogs go wild for it every single morning.",
    "risk-free": "You can try it free for thirty days."
  };
  const SLOT = { pre: "opening ad break", mid: "middle ad break" };

  let pkg, ctx, items = [], files = [], step = "upload";
  const shows = () => pkg.shows.shows;
  const showName = id => (shows().find(s => s.show_id === id) || {}).name || id;
  const sponsorById = id => pkg.sponsors.find(s => s.sponsor_id === id) || {};
  const readById = id => pkg.reads.find(r => r.read_id === id) || {};
  const sponsorOfRead = id => sponsorById(readById(id).sponsor_id).sponsor || "the sponsor";
  const niceDate = iso => { const d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const sentenceWith = (text, find) => {
    const parts = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
    return (parts.find(p => p.includes(find)) || text).trim();
  };
  const hl = (sentence, piece, cls) => { const i = sentence.indexOf(piece); if (i < 0) return esc(sentence);
    return esc(sentence.slice(0, i)) + `<mark class="${cls}">${esc(piece)}</mark>` + esc(sentence.slice(i + piece.length)); };
  const rowLine = (r, readId) => `${esc(niceDate(r.date))} · ${esc(showName(r.show_id))} · ${SLOT[r.slot] || r.slot}`;

  // turn an engine finding into a friendly card
  function friendly(f) {
    const fx = f.fix || {}, L = f.location || {}, g = groupOf(f.category);
    const it = { id: f.fingerprint, cat: f.category, group: g.key, fix: fx, f, decision: null };
    const readWhere = id => `${sponsorOfRead(id)} script · ${showName(readById(id).show_id)}`;
    if (fx.op === "replace_text") {
      const read = readById(fx.read_id), before = sentenceWith(read.text, fx.find);
      let rep = fx.replace;
      if (f.category === "do_not_say") rep = REWRITES[String(f.evidence).toLowerCase()] || fx.find;
      it.replaceWith = rep;
      const after = fx.find === before ? rep : before.replace(fx.find, rep);
      it.before = fx.find === before ? `<mark class="del">${esc(before)}</mark>` : hl(before, fx.find, "del");
      it.after = fx.find === before ? `<mark class="ins">${esc(rep)}</mark>` : hl(after, rep, "ins");
      it.where = readWhere(fx.read_id);
    }
    const sp = sponsorById(readById(fx.read_id || L.read_id).sponsor_id);
    switch (f.category) {
      case "spelling": it.title = `“${f.evidence}” is misspelled`; it.why = `A small typo in the ${sponsorOfRead(fx.read_id)} script. The host would read it out as written.`; break;
      case "grammar": it.title = f.evidence === "the the" ? "The word “the” appears twice" : `“${f.evidence}” should be “${fx.replace}”`;
        it.why = "A small slip that's easy to miss when reading quickly."; break;
      case "promo_code_mismatch": it.title = "This promo code doesn't match the sponsor's"; it.why = `The script says ${fx.find}, but ${sp.sponsor}'s details say ${fx.replace}. Listeners would get a code that doesn't work.`; break;
      case "broken_link": it.title = "This link doesn't open";
        it.why = /domain/i.test(f.title) ? "The website name is misspelled, so the page can't be found." : "It goes to a page that doesn't exist. Here's the link from the sponsor's details."; break;
      case "malformed_link": it.title = "This link has a typo"; it.why = "The start of the web address is misspelled, so it won't open."; break;
      case "do_not_say": { const show = shows().find(s => s.show_id === readById(fx.read_id).show_id) || {};
        it.title = `${show.host} prefers not to say “${f.evidence}”`; it.why = `${show.host} hosts ${show.name} and has asked to avoid this phrase. Here's a rewrite that keeps the same idea.`; break; }
      case "duplicate_promo_code": { const s4 = sponsorById(fx.sponsor_id); const other = pkg.sponsors.find(s => s.promo_code === f.evidence && s.sponsor_id !== fx.sponsor_id) || {};
        it.title = "Two sponsors share one promo code"; it.why = `${other.sponsor} and ${s4.sponsor} both use ${f.evidence}, so listeners could end up with the wrong deal. We suggest a new code for ${s4.sponsor} and update its scripts to match.`;
        it.where = `Sponsor details · ${s4.sponsor}`;
        it.before = `${esc(s4.sponsor)} promo code: <mark class="del">${esc(f.evidence)}</mark>`;
        it.after = `${esc(s4.sponsor)} promo code: <mark class="ins">${esc(fx.value)}</mark><small>Also updated in its scripts</small>`; break; }
      case "missing_day": { const r = fx.value; it.title = `${showName(r.show_id)} has no ad on ${niceDate(r.date)}`; it.why = "The show airs that day, but nothing is booked.";
        it.where = `Schedule · ${showName(r.show_id)}`;
        it.before = `${rowLine(r)}: <mark class="del">nothing booked</mark>`; it.after = `${rowLine(r)}: <mark class="ins">${esc(sponsorOfRead(r.read_id))} ad</mark>`; break; }
      case "wrong_show": { const r = pkg.schedule[fx.row]; const written = showName(readById(r.read_id).show_id);
        it.title = `The wrong ad is booked on ${showName(r.show_id)}`; it.why = `The ${sponsorOfRead(r.read_id)} ad booked for ${niceDate(r.date)} was written for ${written}.`;
        it.where = `Schedule · ${showName(r.show_id)}`;
        it.before = `${rowLine(r)}: <mark class="del">${esc(sponsorOfRead(r.read_id))} ad</mark>`; it.after = `${rowLine(r)}: <mark class="ins">${esc(sponsorOfRead(fx.value))} ad</mark>`; break; }
      case "out_of_flight": { const r = pkg.schedule[fx.row]; const s = sponsorById(readById(r.read_id).sponsor_id);
        it.title = "An ad is booked outside its campaign dates"; it.why = `${s.sponsor}'s campaign runs ${niceDate(s.flight_start)} to ${niceDate(s.flight_end)}, but an ad is booked on ${niceDate(r.date)}.`;
        it.where = `Schedule · ${showName(r.show_id)}`;
        it.before = `${rowLine(r)}: <mark class="del">${esc(s.sponsor)} ad</mark>`; it.after = `<span class="removed">${rowLine(r)}: booking removed</span>`; break; }
      case "double_booked": { const r = pkg.schedule[fx.row];
        it.title = "Two ads are booked in the same break"; it.why = `${showName(r.show_id)} on ${niceDate(r.date)} has two ads in the ${SLOT[r.slot]}. We suggest moving one to the ${SLOT[fx.value]}.`;
        it.where = `Schedule · ${showName(r.show_id)}`;
        it.before = `${esc(sponsorOfRead(r.read_id))} ad · ${esc(niceDate(r.date))} · <mark class="del">${SLOT[r.slot]}</mark>`; it.after = `${esc(sponsorOfRead(r.read_id))} ad · ${esc(niceDate(r.date))} · <mark class="ins">${SLOT[fx.value]}</mark>`; break; }
      default: it.title = f.title; it.why = f.suggestion;
    }
    it.where = it.where || "Your package";
    return it;
  }

  // ---------- step indicator ----------
  function setStep(s) {
    step = s; const order = ["upload", "checking", "report"]; const cur = s === "done" ? 3 : order.indexOf(s);
    document.querySelectorAll("#steps li[data-step]").forEach((li, i) => { li.className = i < cur ? "done" : i === cur ? "on" : "";
      li.querySelector(".num").innerHTML = i < cur ? icon("check") : String(i + 1); if (i === cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
    document.querySelectorAll("#steps li.bar").forEach((b, i) => b.classList.toggle("fill", i < cur));
    ["upload", "checking", "report", "done"].forEach(k => { $("#stage-" + k).hidden = k !== s; });
    window.scrollTo(0, 0);
  }

  // ---------- upload ----------
  const kindOf = name => { const e = (name.split(".").pop() || "").toLowerCase();
    if (["doc", "docx", "rtf", "odt"].includes(e)) return ["Word", "file-text", "k-word"];
    if (e === "pdf") return ["PDF", "file", "k-pdf"];
    if (["xls", "xlsx", "ods"].includes(e)) return ["Excel", "file-spreadsheet", "k-xls"];
    if (e === "csv") return ["CSV", "file-spreadsheet", "k-csv"];
    if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(e)) return ["Image", "file-image", "k-img"];
    return ["Text", "file-text", "k-txt"]; };
  const size = b => b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";
  function renderChips() {
    $("#chips").innerHTML = files.map((f, i) => { const [k, ic, cls] = kindOf(f.name);
      return `<li class="chip ${cls}"><span class="c-ico">${icon(ic)}</span><span class="c-txt"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${k} · ${size(f.size)}</small></span><button class="c-x" data-rm="${i}" aria-label="Remove ${esc(f.name)}">${icon("x")}</button></li>`; }).join("");
    $("#chips").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); renderChips(); });
    updateCheck();
  }
  const updateCheck = () => { $("#checkBtn").disabled = !(files.length || $("#paste").value.trim()); };
  function addFiles(list) { for (const f of list) files.push({ name: f.name, size: f.size || 0 }); renderChips(); }
  function useSample() {
    files = [{ name: "Week of Nov 2 - Scripts.docx", size: 28400 }, { name: "Sponsor details.xlsx", size: 19100 }, { name: "Promo codes.csv", size: 820 },
      { name: "Ad schedule.xlsx", size: 23400 }, { name: "Host notes.pdf", size: 64200 }, { name: "Sponsor links.txt", size: 410 }];
    renderChips(); toast(`${icon("wand-sparkles")}Sample package added. Ready when you are.`);
  }

  // ---------- checking ----------
  const LINES = ["Opening your files…", "Looking at your schedule…", "Checking promo codes…", "Testing links…", "Reading for typos…", "Checking host preferences…"];
  async function check() {
    setStep("checking");
    const ul = $("#lines"); ul.innerHTML = ""; const bar = $("#prog i"); bar.style.width = "0%";
    const engine = ready.then(() => QA.runChecks(PARSE.build(S.web), ctx));
    const per = reduced ? 250 : 900;
    for (let i = 0; i < LINES.length; i++) {
      const li = document.createElement("li"); li.className = "run"; li.innerHTML = `<span class="ln-ico">${icon("loader-circle", "spin")}</span>${LINES[i]}`; ul.appendChild(li);
      await sleep(per);
      li.className = "ok"; li.querySelector(".ln-ico").innerHTML = icon("check");
      const pct = Math.round((i + 1) / LINES.length * 100); bar.style.width = pct + "%"; $("#prog").setAttribute("aria-valuenow", pct);
    }
    const F = await engine;
    items = F.map(friendly);
    $("#checkSub").textContent = "Done. Putting your report together…";
    await sleep(reduced ? 100 : 600);
    renderReport(); setStep("report");
  }

  // ---------- report ----------
  const open = () => items.filter(i => !i.decision);
  function renderReport() {
    const n = items.length, left = open().length, done = n - left;
    const tallies = GROUPS.map(g => ({ g, c: items.filter(i => i.group === g.key).length })).filter(x => x.c);
    const html = `
      <div class="summary">
        <div class="sum-main">
          <span class="sum-ico">${icon("lightbulb")}</span>
          <div>
            <p class="eyebrow">Your report · Week of Nov 2, 2026 (example)</p>
            <h1 id="h-report">We found ${n} things to fix before this goes out</h1>
            <p class="muted">Most take a single click. Review each one, or use all of our suggestions at once.</p>
          </div>
        </div>
        <ul class="tallies">${tallies.map(({ g, c }) => `<li class="t-${g.key}"><a href="#grp-${g.key}">${icon(g.icon)}<b>${c}</b><span>${g.name}</span></a></li>`).join("")}</ul>
        <div class="sum-foot">
          <div class="meter" aria-label="${done} of ${n} reviewed"><div class="meter-top"><span><b>${done}</b> of ${n} reviewed</span><span>${Math.round(done / n * 100)}%</span></div><div class="track"><i style="width:${done / n * 100}%"></i></div></div>
          <button class="btn-big" id="useAll" ${left ? "" : "disabled"}>${icon("check-check")}Use all suggested changes</button>
        </div>
      </div>
      ${GROUPS.map(g => { const list = items.filter(i => i.group === g.key); if (!list.length) return "";
        return `<section class="grp" id="grp-${g.key}"><h2><span class="g-ico t-${g.key}">${icon(g.icon)}</span>${g.name}<span class="g-count">${list.length}</span></h2>
          <div class="cards">${list.map(card).join("")}</div></section>`; }).join("")}
      <div class="report-end">
        <p class="muted">${left ? `${left} still to review.` : "Everything's reviewed."}</p>
        <button class="btn-big" id="finish" ${left ? "disabled" : ""}>${icon("arrow-right")}Finish up</button>
      </div>`;
    $("#stage-report").innerHTML = html;
    $("#useAll").onclick = () => { open().forEach(i => i.decision = "use"); toast(`${icon("check-check")}All suggested changes applied`); renderReport(); setTimeout(() => finish(), reduced ? 0 : 700); };
    $("#finish").onclick = finish;
    $("#stage-report").querySelectorAll("[data-use],[data-keep],[data-undo]").forEach(b => b.onclick = () => {
      const it = items.find(i => i.id === (b.dataset.use || b.dataset.keep || b.dataset.undo));
      it.decision = b.dataset.use ? "use" : b.dataset.keep ? "keep" : null;
      const y = window.scrollY; renderReport(); window.scrollTo(0, y);
      if (!open().length) { toast(`${icon("party-popper")}That's everything. Nice work!`); setTimeout(finish, reduced ? 0 : 900); }
    });
  }
  function card(it) {
    const g = GROUPS.find(x => x.key === it.group);
    if (it.decision) return `<article class="fcard decided ${it.decision}"><span class="d-ico">${icon(it.decision === "use" ? "circle-check" : "circle-dot")}</span>
      <div class="d-txt"><b>${esc(it.title)}</b><span>${it.decision === "use" ? "Change applied" : "Kept as you wrote it"} · ${esc(it.where)}</span></div>
      <button class="btn-undo" data-undo="${esc(it.id)}">${icon("undo-2")}Undo</button></article>`;
    return `<article class="fcard t-${g.key}" aria-label="${esc(it.title)}">
      <div class="fc-head"><span class="fc-ico">${icon(g.icon)}</span><div><h3>${esc(it.title)}</h3><p class="where">${icon("map-pin")}${esc(it.where)}</p></div></div>
      <p class="why">${esc(it.why)}</p>
      <div class="ba">
        <div class="ba-col before"><span class="ba-lbl">Now</span><p>${it.before}</p></div>
        <span class="ba-arrow" aria-hidden="true">${icon("arrow-right")}</span>
        <div class="ba-col after"><span class="ba-lbl">Suggested</span><p>${it.after}</p></div>
      </div>
      <div class="fc-actions"><button class="btn-use" data-use="${esc(it.id)}">${icon("check")}Use this change</button><button class="btn-keep" data-keep="${esc(it.id)}">Keep mine</button></div>
    </article>`;
  }

  // ---------- done ----------
  function finish() {
    if (open().length) return;
    const used = items.filter(i => i.decision === "use").length, kept = items.length - used;
    $("#stage-done").innerHTML = `
      <div class="done-card">
        <div class="burst" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg;--d:${(i % 3) * 60}ms"></i>`).join("")}<span class="done-ico">${icon("check")}</span></div>
        <h1 id="h-done">All set, your package is ready to send</h1>
        <p class="muted">${used} change${used === 1 ? "" : "s"} applied${kept ? `, ${kept} kept as you wrote ${kept === 1 ? "it" : "them"}` : ""}. Here's your corrected package and a report you can share.</p>
        <div class="done-actions">
          <button class="btn-big" id="dlPkg">${icon("download")}Download corrected package</button>
          <button class="btn-soft2" id="dlRep">${icon("printer")}Download report (PDF-style)</button>
        </div>
        <ul class="done-list">
          ${GROUPS.map(g => { const l = items.filter(i => i.group === g.key); if (!l.length) return ""; const u = l.filter(i => i.decision === "use").length;
            return `<li class="t-${g.key}"><span class="g-ico">${icon(g.icon)}</span><span>${g.name}</span><b>${u} of ${l.length} fixed</b></li>`; }).join("")}
        </ul>
        <div class="done-more"><button class="btn-link" id="backRep">${icon("arrow-left")}Back to the report</button><button class="btn-link" id="again">${icon("refresh-cw")}Check another package</button></div>
      </div>`;
    $("#dlPkg").onclick = downloadPackage; $("#dlRep").onclick = openSheet;
    $("#backRep").onclick = () => { renderReport(); setStep("report"); };
    $("#again").onclick = () => { files = []; items = []; $("#paste").value = ""; renderChips(); setStep("upload"); };
    setStep("done");
  }
  function corrected() {
    let p = JSON.parse(JSON.stringify(pkg));
    for (const it of items.filter(i => i.decision === "use")) {
      const fx = Object.assign({}, it.fix);
      if (fx.op === "replace_text" && fx.replace == null) fx.replace = it.replaceWith;
      if (it.cat === "duplicate_promo_code") { const old = it.f.evidence; p.reads.filter(r => r.sponsor_id === fx.sponsor_id).forEach(r => r.text = r.text.split(old).join(fx.value)); }
      p = QA.applyFix(p, fx, fx.value) || p;
    }
    p.schedule = p.schedule.filter(r => !r._deleted); return p;
  }
  function downloadPackage() {
    const p = corrected();
    const txt = ["CORRECTED SPONSOR PACKAGE · Week of Nov 2, 2026", "Demo - example data. All sponsors, shows, hosts, codes, and links are fictional.", "",
      "SCRIPTS", ...p.reads.map(r => `\n${sponsorById(r.sponsor_id).sponsor} · ${showName(r.show_id)} · ${r.length}\n${r.text}`), "",
      "SPONSORS", "Sponsor, Campaign dates, Promo code, Link", ...p.sponsors.map(s => `${s.sponsor}, ${s.flight_start} to ${s.flight_end}, ${s.promo_code}, ${s.url}`), "",
      "AD SCHEDULE", "Date, Show, Ad break, Sponsor", ...p.schedule.slice().sort((a, b) => (a.date + a.show_id + a.slot).localeCompare(b.date + b.show_id + b.slot)).map(r => `${niceDate(r.date)}, ${showName(r.show_id)}, ${SLOT[r.slot] || r.slot}, ${sponsorOfRead(r.read_id)}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = "Corrected package - week of Nov 2 (example).txt";
    document.body.appendChild(a); a.click(); a.remove(); toast(`${icon("download")}Corrected package downloaded`);
  }
  function openSheet() {
    const used = items.filter(i => i.decision === "use").length;
    const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    $("#sheet").innerHTML = `<div class="sheet">
      <div class="sheet-bar no-print"><span>${icon("printer")}Print preview</span><div><button class="btn-soft2" id="doPrint">${icon("download")}Print or save as PDF</button><button class="icon-x" id="closeSheet" aria-label="Close">${icon("x")}</button></div></div>
      <div class="paper">
        <div class="p-head"><div><p class="eyebrow">Package QA · Check report</p><h2 id="sheetTitle">Sponsor package, week of Nov 2, 2026</h2><p class="muted">Checked ${esc(when)} ET · Example data</p></div><span class="p-badge">${icon("circle-check")}Ready to send</span></div>
        <div class="p-sum"><div><b>${items.length}</b><span>things found</span></div><div><b>${used}</b><span>changes applied</span></div><div><b>${items.length - used}</b><span>kept as written</span></div></div>
        ${GROUPS.map(g => { const l = items.filter(i => i.group === g.key); if (!l.length) return "";
          return `<h3 class="p-grp">${icon(g.icon)}${g.name}</h3><table class="p-tab"><thead><tr><th>What we found</th><th>Where</th><th>Outcome</th></tr></thead><tbody>${l.map(i => `<tr><td><b>${esc(i.title)}</b><div class="p-ba"><span class="b">${i.before}</span><span class="a">${i.after}</span></div></td><td>${esc(i.where)}</td><td>${i.decision === "use" ? "Change applied" : "Kept as written"}</td></tr>`).join("")}</tbody></table>`; }).join("")}
        <p class="p-foot">Demo - example data. Prepared for Westwood One as a mock-up. All names, codes, and links are fictional.</p>
      </div></div>`;
    $("#sheet").hidden = false; document.body.classList.add("sheet-open");
    $("#doPrint").onclick = () => window.print();
    $("#closeSheet").onclick = closeSheet; $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
    $("#closeSheet").focus();
  }
  function closeSheet() { $("#sheet").hidden = true; document.body.classList.remove("sheet-open"); }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

  let tt; function toast(h) { const t = $("#toast"); t.innerHTML = h; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }

  // ---------- boot ----------
  pkg = PARSE.build(S.web);
  const ready = fetch("data/wordlist.txt").then(r => r.text()).then(t => {
    ctx = { speller: QA.makeSpeller(t.split("\n")), extraWords: new Set(S.dictionary), linkStatus: S.linkStatus }; });
  hydrate();
  const drop = $("#drop"), input = $("#files");
  input.onchange = () => { addFiles(input.files); input.value = ""; };
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  $("#paste").oninput = updateCheck;
  $("#sampleBtn").onclick = useSample;
  $("#checkBtn").onclick = check;
  setStep("upload");
  window.EU = { get items() { return items; }, get step() { return step; }, useSample, check, finish, corrected };
})();
