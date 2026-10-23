// Sponsor Package QA - check engine (browser port of checker.py's deterministic checks).
// Runs inside review.html so the reviewer can re-check the package after every round of fixes, with no server.
(function (root) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const URL_RE = /\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s]+/g;
  const CODE_RE = /\bcode\s+([A-Z0-9]{3,})\b/g;
  const WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
  const GRAMMAR_RULES = [
    [/\b(could|would|should|must|might) of\b/gi, m => `${m[1]} have`, (x, y, w) => `'${x}' should be '${y}'`],
    [/\b(\w+) \1\b/gi, m => m[1], (x, y, w) => `the word '${w}' is repeated ('${x}')`],
    [/\byour welcome\b/gi, m => "you're welcome", (x, y) => `'${x}' should be '${y}'`],
    [/\balot\b/gi, m => "a lot", (x, y) => `'${x}' should be '${y}'`],
  ];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripUrl = u => u.replace(/[.,;:!?)"']+$/, "");
  const phraseRe = p => new RegExp("\\b" + p.trim().split(/[\s-]+/).map(esc).join("[\\s-]+") + "\\b", "gi");
  const parseD = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return null; const x = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return isNaN(x) ? null : x; };
  const wd = x => DAYS[(x.getUTCDay() + 6) % 7];
  const iso = x => x.toISOString().slice(0, 10);
  const fmtDay = d => { const x = parseD(d); return `${wd(x)} ${x.getUTCMonth() + 1}/${x.getUTCDate()}`; };
  const inFlight = (sp, d) => !!sp && sp.flight_start <= d && d <= sp.flight_end;
  function sentenceAt(text, pos) {
    let s = 0; const re = /[.!?]\s+/g; let m;
    while ((m = re.exec(text))) { if (m.index + m[0].length <= pos) s = m.index + m[0].length; else break; }
    const e = /[.!?](\s|$)/.exec(text.slice(pos));
    return e ? text.slice(s, pos + e.index + e[0].length).trim() : text.slice(s).trim();
  }
  function makeSpeller(wordlist) {
    const rank = new Map(); wordlist.forEach((w, i) => rank.set(w, i));
    const L = "abcdefghijklmnopqrstuvwxyz";
    return {
      has: w => rank.has(w),
      suggest(w) {
        const c = new Set();
        for (let i = 0; i <= w.length; i++) {
          const a = w.slice(0, i), b = w.slice(i);
          if (b) c.add(a + b.slice(1));
          if (b.length > 1) c.add(a + b[1] + b[0] + b.slice(2));
          for (const ch of L) { if (b) c.add(a + ch + b.slice(1)); c.add(a + ch + b); }
        }
        let best = null;
        for (const x of c) if (rank.has(x) && (best === null || rank.get(x) < rank.get(best))) best = x;
        return best;
      }
    };
  }

  function runChecks(pkg, ctx) {
    const F = [];
    const add = (category, severity, title, location, evidence = "", suggestion = "", fix = null, source = "rule") => {
      const loc2 = Object.assign({}, location); delete loc2.row;
      F.push({ fingerprint: category + "|" + JSON.stringify(Object.keys(loc2).sort().map(k => [k, loc2[k]])) + "|" + evidence,
        category, severity, title, location, evidence, suggestion, fix, source });
    };
    const sponsors = {}, reads = {}, shows = {};
    pkg.sponsors.forEach(s => sponsors[s.sponsor_id] = s);
    pkg.reads.forEach(r => reads[r.read_id] = r);
    pkg.shows.shows.forEach(s => shows[s.show_id] = s);

    // promo code duplicates
    const byCode = new Map();
    pkg.sponsors.forEach(s => { const c = s.promo_code.trim().toUpperCase(); if (!byCode.has(c)) byCode.set(c, []); byCode.get(c).push(s); });
    for (const [code, ss] of byCode) if (ss.length > 1) {
      const [first, ...rest] = ss;
      for (const s of rest) {
        const newcode = s.sponsor.toUpperCase().split(/\s+/)[0].replace(/[^A-Z]/g, "").slice(0, 8) + code.replace(/\D/g, "");
        add("duplicate_promo_code", "high", `Promo code ${code} is used by two sponsors: ${first.sponsor} and ${s.sponsor}.`,
          { file: "sponsors.csv", sponsor_id: s.sponsor_id, field: "promo_code" }, code,
          `Get a unique code for ${s.sponsor} (e.g. ${newcode}) and update its scripts.`,
          { op: "set_sponsor", sponsor_id: s.sponsor_id, field: "promo_code", value: newcode });
      }
    }
    const brand = new Set(), people = new Set();
    pkg.sponsors.forEach(s => (s.sponsor.match(WORD_RE) || []).forEach(w => brand.add(w.toLowerCase())));
    pkg.shows.shows.forEach(s => ((s.host + " " + s.name).match(WORD_RE) || []).forEach(w => people.add(w.toLowerCase())));

    for (const r of pkg.reads) {
      const rid = r.read_id, text = r.text, sp = sponsors[r.sponsor_id], show = shows[r.show_id];
      const loc = { file: "scripts.json", read_id: rid };
      const label = `Read ${rid}` + (sp ? ` (${sp.sponsor})` : "");
      if (!sp) { add("unknown_sponsor", "high", `${label} points to sponsor ${r.sponsor_id}, which is not on the sponsor sheet.`, loc, r.sponsor_id); continue; }
      const codes = [...text.matchAll(CODE_RE)];
      for (const m of codes) { const c = m[1]; if (c !== sp.promo_code)
        add("promo_code_mismatch", "high", `${label} says promo code ${c}, but the sponsor sheet says ${sp.promo_code}.`, loc, c,
          `Change ${c} to ${sp.promo_code}.`, { op: "replace_text", read_id: rid, find: c, replace: sp.promo_code }); }
      if (!codes.length && sp.promo_code) add("promo_code_missing", "medium", `${label} never mentions its promo code ${sp.promo_code}.`, loc, "", `Add 'use code ${sp.promo_code}'.`);
      const urls = (text.match(URL_RE) || []).map(stripUrl), sheet = sp.url;
      for (const u of urls) {
        const scheme = u.split("://")[0].toLowerCase();
        if (scheme !== "http" && scheme !== "https") {
          add("malformed_link", "high", `${label} has a malformed link: '${u}' (the web address prefix is misspelled).`, loc, u, `Use ${sheet}.`,
            { op: "replace_text", read_id: rid, find: u, replace: sheet }); continue; }
        const status = u in ctx.linkStatus ? ctx.linkStatus[u] : "UNKNOWN_IN_MOCK";
        if (status !== 200) {
          const why = status === 404 ? "does not exist (404)" : (status === "DNS_FAIL" ? "does not resolve - the domain name is wrong" : `returned ${status}`);
          const extra = u !== sheet ? ` It also differs from the sponsor sheet link ${sheet}.` : "";
          add("broken_link", "high", `${label} link ${u} is broken: it ${why}.${extra}`, loc, u, `Use ${sheet}.`, { op: "replace_text", read_id: rid, find: u, replace: sheet });
        } else if (u !== sheet) {
          add("link_mismatch", "medium", `${label} link ${u} works but does not match the sponsor sheet link ${sheet}.`, loc, u,
            `Confirm with sponsor; sheet says ${sheet}.`, { op: "replace_text", read_id: rid, find: u, replace: sheet });
        }
      }
      if (!urls.length) add("link_missing", "medium", `${label} has no link; the sponsor sheet link is ${sheet}.`, loc, "", `Add ${sheet}.`);
      if (show) for (const phrase of show.do_not_say || []) for (const m of text.matchAll(phraseRe(phrase))) {
        const sent = sentenceAt(text, m.index);
        add("do_not_say", "high", `${label} uses '${m[0]}', which ${show.host} (${show.name}) has asked never to say.`, loc, m[0],
          `Rewrite the sentence without '${phrase}': "${sent}"`, { op: "replace_text", read_id: rid, find: sent, replace: null, needs_input: true });
      }
      for (const [re, rep, tmpl] of GRAMMAR_RULES) for (const m of text.matchAll(re)) {
        const x = m[0], y = rep(m);
        add("grammar", "medium", `${label} grammar: ` + tmpl(x, y, m[1]) + ".", loc, x, `Change to '${y}'.`, { op: "replace_text", read_id: rid, find: x, replace: y });
      }
      let nourl = text.replace(URL_RE, " ").replace(/\b[A-Z0-9]*\d[A-Z0-9]*\b/g, " ");
      const seen = new Set();
      for (const m of nourl.matchAll(WORD_RE)) {
        const w = m[0], lw = w.toLowerCase(), base = lw.endsWith("'s") ? lw.slice(0, -2) : lw;
        if (ctx.speller.has(base) || ctx.extraWords.has(base) || brand.has(base) || people.has(base) || base.length < 3 || seen.has(base)) continue;
        seen.add(base);
        const sug = ctx.speller.suggest(base);
        add("spelling", "medium", `${label} misspells '${w}'` + (sug ? ` - should be '${sug}'.` : "."), loc, w,
          sug ? `Change to '${sug}'.` : "Check spelling.", sug ? { op: "replace_text", read_id: rid, find: w, replace: sug } : null, "spellcheck");
      }
    }

    // schedule
    const slots = new Map(), ep = new Map();
    pkg.schedule.forEach((row, i) => {
      const d = row.date, showId = row.show_id, slot = row.slot, rid = row.read_id;
      const loc = { file: "schedule.csv", row: i + 2, date: d, show_id: showId, slot, read_id: rid };
      const show = shows[showId], sname = show ? show.name : showId;
      const x = parseD(d);
      if (!x) { add("bad_date", "high", `Schedule row ${i + 2} has an invalid date '${d}'.`, loc, d); return; }
      const when = fmtDay(d);
      if (row.day && row.day !== wd(x)) add("date_day_mismatch", "medium", `Schedule row ${i + 2} says ${row.day} but ${d} is a ${wd(x)}.`, loc, row.day,
        `Change day to ${wd(x)}.`, { op: "set_schedule", row: i, field: "day", value: wd(x) });
      const k1 = [d, showId, slot].join("|"); if (!slots.has(k1)) slots.set(k1, []); slots.get(k1).push([i, row]);
      const k2 = [d, showId, rid].join("|"); if (!ep.has(k2)) ep.set(k2, []); ep.get(k2).push(i);
      const r = reads[rid];
      if (!r) { add("unknown_read", "high", `${sname} on ${when} is scheduled to run read ${rid}, which is not in the scripts.`, loc, rid); return; }
      const sp = sponsors[r.sponsor_id];
      if (r.show_id !== showId || (sp && !sp.approved_shows.split("|").includes(showId))) {
        const booked = new Set(pkg.schedule.filter(z => z.date === d && z.show_id === showId).map(z => z.read_id));
        const alt = pkg.reads.filter(z => z.show_id === showId && !booked.has(z.read_id) && inFlight(sponsors[z.sponsor_id], d));
        const altId = alt.length ? alt[0].read_id : null;
        add("wrong_show", "high", `${sname} on ${when} is scheduled to run the ${sp ? sp.sponsor : ""} read ${rid}, but that read was written for ${(shows[r.show_id] || {}).name || r.show_id}.`,
          loc, rid, altId ? `Swap in read ${altId} (${sponsors[alt[0].sponsor_id].sponsor}).` : "Remove this row.",
          altId ? { op: "set_schedule", row: i, field: "read_id", value: altId } : { op: "delete_schedule", row: i });
      }
      if (sp && !inFlight(sp, d)) add("out_of_flight", "high",
        `${sp.sponsor} read ${rid} is scheduled on ${sname} for ${when}, but the campaign runs ${fmtDay(sp.flight_start)} to ${fmtDay(sp.flight_end)}.`,
        loc, d, "Remove this row (outside flight dates).", { op: "delete_schedule", row: i });
    });
    for (const [k, rows] of slots) if (rows.length > 1) {
      const [d, showId, slot] = k.split("|"); const sname = (shows[showId] || {}).name || showId;
      const ids = rows.map(([, r]) => r.read_id).join(" and ");
      const used = new Set(pkg.schedule.filter(r => r.date === d && r.show_id === showId).map(r => r.slot));
      const free = ((shows[showId] || {}).slots || []).filter(s => !used.has(s));
      const [i2, r2] = rows[rows.length - 1];
      add("double_booked", "high", `${sname} on ${fmtDay(d)} has two reads (${ids}) booked in the same ${slot}-roll slot.`,
        { file: "schedule.csv", row: i2 + 2, date: d, show_id: showId, slot, read_id: r2.read_id }, ids,
        free.length ? `Move ${r2.read_id} to the ${free[0]}-roll slot.` : `Remove ${r2.read_id} from this slot.`,
        free.length ? { op: "set_schedule", row: i2, field: "slot", value: free[0] } : { op: "delete_schedule", row: i2 });
    }
    for (const [k, idx] of ep) if (idx.length > 1) {
      const [d, showId, rid] = k.split("|");
      add("repeat_in_episode", "medium", `Read ${rid} runs ${idx.length} times in the same ${(shows[showId] || {}).name || showId} episode on ${fmtDay(d)}.`,
        { file: "schedule.csv", row: idx[idx.length - 1] + 2, date: d, show_id: showId, read_id: rid }, rid, "Remove the extra row.",
        { op: "delete_schedule", row: idx[idx.length - 1] });
    }
    for (let day = parseD(pkg.shows.week_start); day <= parseD(pkg.shows.week_end); day = new Date(day.getTime() + 864e5)) {
      const d = iso(day);
      for (const s of pkg.shows.shows) if (s.air_days.includes(wd(day)) && !pkg.schedule.some(r => r.date === d && r.show_id === s.show_id)) {
        const cand = pkg.reads.filter(x => x.show_id === s.show_id && inFlight(sponsors[x.sponsor_id], d));
        add("missing_day", "high", `${s.name} has no reads scheduled on ${fmtDay(d)}, but the show airs that day.`,
          { file: "schedule.csv", date: d, show_id: s.show_id }, d, cand.length ? `Add read ${cand[0].read_id} to the pre-roll slot.` : "Add a read for this day.",
          cand.length ? { op: "add_schedule", value: { date: d, day: wd(day), show_id: s.show_id, slot: s.slots[0], read_id: cand[0].read_id } } : null);
      }
    }
    const sev = { high: 0, medium: 1, low: 2 };
    const key = f => [sev[f.severity], f.location.file || "", String(f.location.read_id ?? ""), String(f.location.date ?? "")];
    F.sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < 4; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; } return 0; });
    F.forEach((f, n) => f.id = "F" + String(n + 1).padStart(2, "0"));
    return F;
  }

  function applyFix(pkg, fix, value) {
    const v = value !== undefined ? value : fix.replace !== undefined ? fix.replace : fix.value;
    if (fix.op === "replace_text") { const r = pkg.reads.find(x => x.read_id === fix.read_id); r.text = r.text.split(fix.find).join(v); }
    else if (fix.op === "set_sponsor") pkg.sponsors.find(x => x.sponsor_id === fix.sponsor_id)[fix.field] = v;
    else if (fix.op === "set_schedule") pkg.schedule[fix.row][fix.field] = v;
    else if (fix.op === "delete_schedule") pkg.schedule[fix.row]._deleted = true;
    else if (fix.op === "add_schedule") pkg.schedule.push(Object.assign({ _added: true }, value || fix.value));
  }

  // minimal CSV + MIME helpers for the two intake channels
  function parseCSV(t) {
    const lines = t.replace(/\r/g, "").split("\n").filter(l => l.trim());
    const h = lines[0].split(",");
    return lines.slice(1).map(l => { const c = l.split(","); const o = {}; h.forEach((k, i) => o[k] = (c[i] || "").trim()); return o; });
  }
  function parseEml(raw) {
    raw = raw.replace(/\r\n/g, "\n");
    const [head] = raw.split("\n\n");
    const hdr = k => { const m = new RegExp("^" + k + ":\\s*(.*(?:\\n[ \\t].*)*)", "mi").exec(head); return m ? m[1].replace(/\n[ \t]+/g, " ").trim() : ""; };
    const b = /boundary="?([^";\n]+)"?/i.exec(head);
    const files = {};
    if (b) for (const part of raw.split("--" + b[1]).slice(1)) {
      const idx = part.indexOf("\n\n"); if (idx < 0) continue;
      const ph = part.slice(0, idx), body = part.slice(idx + 2).replace(/\n--\s*$/, "");
      const fn = /filename="?([^";\n]+)"?/i.exec(ph); if (!fn) continue;
      const enc = (/content-transfer-encoding:\s*(\S+)/i.exec(ph) || [, "7bit"])[1].toLowerCase();
      let txt = body;
      if (enc === "base64") txt = new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\s+/g, "")), c => c.charCodeAt(0)));
      else if (enc === "quoted-printable") txt = body.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
      files[fn[1]] = txt.trim() + "\n";
    }
    return { from: hdr("From"), to: hdr("To"), subject: hdr("Subject"), date: hdr("Date"), files };
  }
  function packageFromFiles(files) {
    const need = ["sponsors.csv", "schedule.csv", "scripts.json", "shows.json"];
    const missing = need.filter(f => !(f in files));
    if (missing.length) throw new Error("Package is missing: " + missing.join(", "));
    return { sponsors: parseCSV(files["sponsors.csv"]), schedule: parseCSV(files["schedule.csv"]),
      reads: JSON.parse(files["scripts.json"]).reads, shows: JSON.parse(files["shows.json"]) };
  }
  const api = { runChecks, applyFix, makeSpeller, parseEml, parseCSV, packageFromFiles, fmtDay };
  if (typeof module !== "undefined") module.exports = api; else root.QA = api;
})(this);
