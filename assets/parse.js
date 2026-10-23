// Turns the six submission fields (web form or email attachments - same format) into one package for the checker.
(function (root) {
  function csv(t) {
    const lines = String(t || "").replace(/\r/g, "").split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    const h = lines[0].split(",").map(s => s.trim());
    return lines.slice(1).map(l => { const c = l.split(","); const o = {}; h.forEach((k, i) => o[k] = (c[i] || "").trim()); return o; });
  }
  function scripts(t) {
    const out = [];
    String(t || "").replace(/\r/g, "").split(/\n\s*\n/).forEach(b => {
      const lines = b.trim().split("\n"); if (!lines[0]) return;
      const h = lines[0].split("|").map(s => s.trim());
      if (h.length < 3) return;
      out.push({ read_id: h[0], sponsor_id: h[1], show_id: h[2], length: h[3] || "", text: lines.slice(1).join(" ").trim() });
    });
    return out;
  }
  function build(f) {
    const missing = [];
    const reads = scripts(f.scripts); if (!reads.length) missing.push("scripts");
    const sp = csv(f.sponsors); if (!sp.length) missing.push("sponsor info");
    const codes = csv(f.codes); if (!codes.length) missing.push("promo codes");
    const links = csv(f.links); if (!links.length) missing.push("links");
    const schedule = csv(f.schedule); if (!schedule.length) missing.push("schedule");
    const hosts = csv(f.hosts); if (!hosts.length) missing.push("host preferences");
    if (missing.length) throw new Error("Missing or unreadable: " + missing.join(", "));
    const cm = Object.fromEntries(codes.map(c => [c.sponsor_id, c.promo_code]));
    const lm = Object.fromEntries(links.map(c => [c.sponsor_id, c.url]));
    const sponsors = sp.map(s => Object.assign({}, s, { promo_code: cm[s.sponsor_id] || "", url: lm[s.sponsor_id] || "" }));
    const dates = schedule.map(r => r.date).sort();
    const shows = { week_start: dates[0], week_end: dates[dates.length - 1], shows: hosts.map(h => ({
      show_id: h.show_id, name: h.show, host: h.host, air_days: ["Mon", "Tue", "Wed", "Thu", "Fri"], slots: ["pre", "mid"],
      do_not_say: (h.do_not_say || "").split(";").map(s => s.trim()).filter(Boolean) })) };
    return { sponsors, schedule, reads, shows };
  }
  const api = { build, csv, scripts };
  if (typeof module !== "undefined") module.exports = api; else root.PARSE = api;
})(typeof window !== "undefined" ? window : globalThis);
