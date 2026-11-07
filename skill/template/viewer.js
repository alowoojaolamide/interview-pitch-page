(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var payload = JSON.parse($("#payload").textContent);
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- crypto: must match build.mjs ---------- */
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function normalise(p) { return p.normalize("NFKC").trim().toLowerCase(); }
  async function decrypt(password) {
    var enc = new TextEncoder();
    var base = await crypto.subtle.importKey("raw", enc.encode(normalise(password)), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(payload.salt), iterations: payload.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(payload.iv) }, key, unb64(payload.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---------- tiny safe markup ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function md(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function paras(a) { return (Array.isArray(a) ? a : [a]).filter(Boolean).map(function (t) { return "<p>" + md(t) + "</p>"; }).join(""); }
  var TAGS = { public: "Public", measured: "Measured", design: "Design-level", judgement: "Judgement", mine: "My approach", gap: "Honest gap" };
  function tag(k) { return k && TAGS[k] ? '<span class="tag ' + (k === "mine" ? "mine" : k === "gap" ? "gap" : "") + '">' + TAGS[k] + "</span>" : ""; }
  function hd(t) { return esc(t).replace(/\*([^*]+)\*/g, "<em>$1</em>"); }
  function splitWords(t) {
    return String(t).split(/(\*[^*]+\*)/).filter(Boolean).map(function (part) {
      var it = part.charAt(0) === "*", words = esc(it ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean);
      return words.map(function (w) { return '<span class="w"><span' + (it ? ' class="serif"' : "") + ">" + w + "</span></span>"; }).join(" ");
    }).join(" ");
  }
  function okSrc(u) { return typeof u === "string" && (/^https:\/\//.test(u) || /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(u)); }
  function img(i, cls) {
    if (!i || !okSrc(i.src)) return "";
    return '<figure class="shot ' + (cls || "") + '"><img src="' + esc(i.src) + '" alt="' + esc(i.alt || "") + '" loading="lazy" decoding="async"' + (i.w ? ' width="' + +i.w + '" height="' + +i.h + '"' : "") + ">" + (i.caption ? "<figcaption>" + md(i.caption) + "</figcaption>" : "") + "</figure>";
  }
  function head(label, title, lead) {
    return '<div class="rule" aria-hidden="true"></div><p class="label" data-r>' + esc(label) + '</p><h2 class="h-lg" data-r>' + hd(title) + "</h2>" + (lead ? '<p class="lead" data-r>' + md(lead) + "</p>" : "");
  }

  /* ---------- sections ---------- */
  var NAV = [];
  function hero(c) {
    var h = c.hero, m = c.meta || {};
    var pt = m.portrait && /^https:\/\//.test(m.portrait) ? '<div class="hero-portrait" aria-hidden="true"><img src="' + esc(m.portrait) + '" alt="" decoding="async"></div>' : "";
    return '<section class="hero" id="top">' + pt + '<div class="wrap"><div class="eyebrow"><span class="dot" aria-hidden="true"></span>' +
      (h.eyebrow ? '<span class="label">' + esc(h.eyebrow) + "</span>" : "") + (m.for ? '<span class="label">For ' + esc(m.for) + "</span>" : "") +
      '</div><h1 class="h-xl" id="hero-h">' + splitWords(h.headline) + "</h1>" +
      (h.sub ? '<p class="sub" data-r>' + md(h.sub) + "</p>" : "") +
      '<div class="row"><span class="cue" aria-hidden="true"><i></i>Scroll</span>' + (h.cta ? '<a class="btn" href="#' + esc(h.cta.to || "close") + '" data-r>' + esc(h.cta.label) + " &darr;</a>" : "") + "</div></div></section>";
  }
  function marquee(c) {
    var w = c.marquee; if (!w || !w.length) return "";
    var one = w.map(function (x) { return "<span>" + esc(x) + "</span><i>/</i>"; }).join("");
    return '<div class="marquee" aria-hidden="true"><div>' + one + one + "</div></div>";
  }
  function heard(c) {
    var s = c.heard; if (!s) return ""; NAV.push(["heard", s.nav || "What I heard"]);
    return '<section id="heard"><div class="wrap">' + head(s.label || "01 What I heard", s.title, s.intro) +
      '<div class="heard-list">' + (s.items || []).map(function (i) {
        if (i.headline) return '<div class="heard-item" data-r><h3 class="heard-h">' + hd(i.headline) + "</h3><div>" + (i.theme ? '<span class="label">' + esc(i.theme) + "</span>" : "") + "<p>" + md(i.note) + "</p>" + (i.quote ? '<p class="epi">&ldquo;' + esc(i.quote) + "&rdquo;</p>" : "") + "</div></div>";
        return '<div class="heard-item" data-r><q>' + esc(i.quote) + "</q><div>" + (i.theme ? '<span class="label">' + esc(i.theme) + "</span>" : "") + "<p>" + md(i.note) + "</p></div></div>";
      }).join("") + "</div>" + (s.foot ? '<p class="fine" data-r>' + md(s.foot) + "</p>" : "") + "</div></section>";
  }
  function story(c) {
    var s = c.story; if (!s) return ""; NAV.push(["story", s.nav || "The proof"]);
    var ch = s.chapters || [];
    return '<section class="story" id="story"><div class="wrap">' + head(s.label || "02 The proof", s.title, s.intro) +
      '<div class="story-grid"><aside class="story-side"><div class="big" aria-hidden="true">' + esc(s.big || "") + '</div><p class="h-md">' + esc(s.project || "") + "</p>" +
      (s.meta ? '<p class="lead" style="margin-top:.6rem">' + md(s.meta) + "</p>" : "") +
      '<ol class="chap-list" aria-label="Chapters">' + ch.map(function (x, i) { return '<li><a href="#chap-' + i + '"><b>0' + (i + 1) + "</b>" + esc(x.nav || x.title) + "</a></li>"; }).join("") + "</ol></aside>" +
      '<div class="chapters">' + ch.map(function (x, i) {
        return '<article class="chap" id="chap-' + i + '" data-r><p class="label">' + esc(x.label || "") + "</p><h3>" + esc(x.title) + "</h3>" + paras(x.body) + (x.bullets ? "<ul>" + x.bullets.map(function (b) { return "<li>" + md(b) + "</li>"; }).join("") + "</ul>" : "") +
          (x.stat ? '<div class="stat"><b data-count="' + esc(x.stat.value) + '">' + esc(x.stat.value) + "</b><span>" + esc(x.stat.label) + "</span></div>" : "") +
          (x.image ? img(x.image, "par") : "") + (x.images ? '<div class="phones" data-lenis-prevent>' + x.images.map(function (i) { return img(i, "phone"); }).join("") + "</div>" : "") + '<div class="tags">' + (x.tags || []).map(tag).join("") + "</div></article>";
      }).join("") + "</div></div></div></section>";
  }
  function ledgerTable(s, cols) {
    var themes = []; (s.rows || []).forEach(function (r) { if (r.theme && themes.indexOf(r.theme) < 0) themes.push(r.theme); });
    return '<div class="filters" role="group" aria-label="Filter by theme"><button type="button" aria-pressed="true" data-f="">All</button>' + themes.map(function (t) { return '<button type="button" aria-pressed="false" data-f="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>" +
      '<div class="led-head label" aria-hidden="true"><span>' + esc(cols[0]) + "</span><span>" + esc(cols[1]) + "</span><span>" + esc(cols[2]) + "</span></div>" +
      (s.rows || []).map(function (r) {
        var gap = r.gap;
        return '<article class="led-row" data-theme="' + esc(r.theme || "") + '"><div><div class="led-col-label">' + esc(cols[0]) + '</div><p class="ask">' + md(r.ask) + "</p></div>" +
          '<div><div class="led-col-label">' + esc(cols[1]) + '</div><div class="who">' + (r.project ? '<span class="tag">' + esc(r.project) + "</span>" : "") + tag(gap ? "gap" : r.label) + "</div>" + paras(r.did) + "</div>" +
          '<div class="will"><div class="led-col-label">' + esc(cols[2]) + "</div>" + paras(r.will) + "</div></article>";
      }).join("");
  }
  var ST = { done: "Done", partial: "Partly", gap: "Honest gap" };
  function ledger(c) {
    var s = c.ledger; if (!s) return ""; NAV.push(["ledger", s.nav || "How I'd work"]);
    var cols = s.cols && s.cols.length === 3 ? s.cols : ["The need", "What I have done", "What I would do"];
    var rows = s.rows || [], mapped = rows.some(function (r) { return r.strength; });
    if (!mapped) return '<section id="ledger"><div class="wrap">' + head(s.label || "03 — How I would work", s.title, s.intro) + ledgerTable(s, cols) + "</div></section>";
    var n = { done: 0, partial: 0, gap: 0 };
    rows.forEach(function (r) { n[r.strength === "gap" || r.gap ? "gap" : r.strength === "partial" ? "partial" : "done"]++; });
    function st(r) { return r.strength === "gap" || r.gap ? "gap" : r.strength === "partial" ? "partial" : "done"; }
    return '<section id="ledger"><div class="wrap">' + head(s.label || "03 — How I would work", s.title, s.intro) +
      '<div class="map" data-map><div class="map-sum"><div class="map-bar" aria-hidden="true"><i class="s-done" style="flex:' + n.done + '"></i><i class="s-partial" style="flex:' + n.partial + '"></i><i class="s-gap" style="flex:' + n.gap + '"></i></div>' +
      '<div class="map-legend" role="group" aria-label="Highlight by status"><button type="button" data-s="" aria-pressed="true">All ' + rows.length + "</button>" +
      ["done", "partial", "gap"].map(function (k) { return n[k] ? '<button type="button" data-s="' + k + '" aria-pressed="false"><span class="dot s-' + k + '" aria-hidden="true"></span><b>' + n[k] + "</b> " + (k === "partial" ? "partly" : k === "gap" ? "honest gap" : "done") + "</button>" : ""; }).join("") + "</div></div>" +
      '<div class="map-body"><div class="map-grid" role="group" aria-label="Role needs">' + rows.map(function (r, i) {
        return '<button type="button" class="tile" data-i="' + i + '" data-s="' + st(r) + '" aria-pressed="' + (i === 0) + '"><span class="dot s-' + st(r) + '" aria-hidden="true"></span><span class="t">' + esc(r.ask) + '</span><span class="stt">' + ST[st(r)] + "</span></button>";
      }).join("") + '</div><aside class="map-panel" aria-live="polite">' + rows.map(function (r, i) {
        var k = st(r);
        return '<article class="mp"' + (i ? " hidden" : "") + ' data-p="' + i + '"><div class="mp-top"><span class="label">' + ("0" + (i + 1)).slice(-2) + " / " + ("0" + rows.length).slice(-2) + '</span><span class="chip s-' + k + '"><span class="dot s-' + k + '" aria-hidden="true"></span>' + ST[k] + "</span></div><h3>" + esc(r.ask) + "</h3>" +
          (r.project ? '<div class="who"><span class="tag">' + esc(r.project) + "</span></div>" : "") +
          (r.statusNote ? '<p class="mp-note">' + md(r.statusNote) + "</p>" : "") +
          '<div class="mp-blk"><span class="label">' + esc(cols[1]) + "</span><p>" + md(r.didShort || r.did) + '</p></div><div class="mp-blk will"><span class="label">' + esc(cols[2]) + "</span><p>" + md(r.willShort || r.will) + "</p></div></article>";
      }).join("") + '<div class="mp-nav"><button type="button" data-d="-1" aria-label="Previous need">&larr;</button><button type="button" data-d="1" aria-label="Next need">&rarr;</button></div></aside></div></div>' +
      '<details class="led-full"><summary>Full detail</summary>' + ledgerTable(s, cols) + "</details></div></section>";
  }

  /* ---------- plan: either static phases or an interactive timeline ---------- */
  var HRS = [["listen", "Listening and defining"], ["design", "Design"], ["eng", "With engineering"], ["mkt", "Marketing and launch"]];
  function ul(a) { return "<ul>" + (a || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ul>"; }
  function dl(rows) {
    return '<dl class="tl-meta">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + md(r[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  function bandRow(list, kind) {
    var top = 0; list.forEach(function (b) { if (b.to > top) top = b.to; });
    return '<div class="tl-bands ' + kind + '" aria-hidden="true">' + list.map(function (b) {
      return '<div class="tl-band" data-from="' + +b.from + '" data-to="' + +b.to + '" style="flex:' + (+b.to - +b.from + 1) + '"><span class="long">' + esc(b.label) + '</span><span class="short">' + esc(b.short || b.label) + "</span></div>";
    }).join("") + "</div>";
  }
  function timeline(t) {
    var segs = t.segments || [], tot = { listen: 0, design: 0, eng: 0, mkt: 0 }, all = 0;
    segs.forEach(function (g) { HRS.forEach(function (h) { var v = +((g.hours || {})[h[0]] || 0); tot[h[0]] += v; all += v; }); });
    var pct = all ? Math.round((tot.design / all) * 100) : 0;
    var total = all ? all + " hours in all, about " + pct + "% design" : "";
    var nx = t.next, hz = nx ? (nx.horizons || []) : [];
    function rail(items, label, mk) { return '<div class="tl-rail" role="group" aria-label="' + esc(label) + '" data-lenis-prevent>' + items.map(mk).join("") + "</div>"; }
    var ctlFirst = '<div class="tl-ctl" data-view="first">' + (t.phases ? bandRow(t.phases, "pace") : "") + (t.months ? bandRow(t.months, "months") : "") +
      rail(segs, "Choose a stretch of weeks", function (g, i) { return '<button type="button" class="tl-seg" data-i="' + i + '" data-from="' + +g.from + '" data-to="' + +g.to + '" aria-pressed="' + (i === 0) + '"><b>' + esc(g.weeks) + "</b><span>" + esc(g.short || g.title) + "</span></button>"; }) + "</div>";
    var ctlNext = nx ? '<div class="tl-ctl" data-view="next" hidden>' +
      rail(hz, "Choose a stretch of days", function (g, i) { return '<button type="button" class="tl-seg" data-i="' + i + '" aria-pressed="' + (i === 0) + '"><b>' + esc(g.days) + "</b><span>" + esc(g.short || g.title) + "</span></button>"; }) + "</div>" : "";
    var panFirst = '<div class="tl-pan" data-view="first" id="tl-first" role="tabpanel" aria-labelledby="tl-tab-first"><div class="tl-panels" aria-live="polite">' + segs.map(function (g, i) {
      var max = 0; HRS.forEach(function (h) { max += +((g.hours || {})[h[0]] || 0); });
      return '<article class="tl-panel"' + (i ? " hidden" : "") + ' data-panel="' + i + '"><p class="label">' + esc(g.weeks) + (g.phase ? " — " + esc(g.phase) : "") + "</p><h3>" + esc(g.title) + '</h3><div class="tl-cols"><div class="tl-what">' + ul(g.items) + "</div>" +
        dl([["Working with", g.with], ["You would have", g.deliver], ["A call from you", g.decision]]) + '<div class="tl-hours"><p class="label">Where the ' + max + " hours go</p>" +
        HRS.map(function (h) { var v = +((g.hours || {})[h[0]] || 0); return '<div class="tl-hr"><span>' + esc(h[1]) + '</span><i style="--w:' + (max ? Math.round((v / max) * 100) : 0) + '%"></i><b>' + v + "</b></div>"; }).join("") +
        (total ? '<p class="tl-total">' + esc(total) + "</p>" : "") + "</div></div></article>";
    }).join("") + "</div></div>";
    var panNext = nx ? '<div class="tl-pan" data-view="next" id="tl-next" role="tabpanel" aria-labelledby="tl-tab-next" hidden>' + (nx.intro ? '<p class="tl-note" style="margin-top:16px">' + md(nx.intro) + "</p>" : "") + '<div class="tl-panels" aria-live="polite">' + hz.map(function (g, i) {
      return '<article class="tl-panel"' + (i ? " hidden" : "") + ' data-panel="' + i + '"><p class="label">' + esc(g.days) + "</p><h3>" + esc(g.title) + '</h3><div class="tl-cols two"><div class="tl-what">' + ul(g.items) + "</div>" + dl([["A call from you", g.decision]]) + "</div></article>";
    }).join("") + "</div></div>" : "";
    var tabs = nx ? '<div class="tl-tabs" role="tablist" aria-label="Plan horizon"><button type="button" role="tab" id="tl-tab-first" aria-selected="true" aria-controls="tl-first" data-tab="first">' + esc(t.firstLabel || "First 90 days") +
      '</button><button type="button" role="tab" id="tl-tab-next" aria-selected="false" aria-controls="tl-next" data-tab="next">' + esc(nx.label || "Next 180 days") + "</button></div>" : "";
    return '<div class="tl" data-tl><div class="tl-controls"><div class="tl-top">' + tabs + (t.rhythm ? '<p class="tl-hint">' + md(t.rhythm) + "</p>" : "") + "</div>" + ctlFirst + ctlNext + "</div>" + panFirst + panNext + "</div>";
  }
  function plan(c) {
    var s = c.plan; if (!s) return ""; NAV.push(["plan", s.nav || "90 days"]);
    var body = s.timeline ? timeline(s.timeline) : '<div class="phases">' + (s.phases || []).map(function (p) {
      return '<article class="phase" data-r><span class="label">' + esc(p.label) + "</span><h3>" + esc(p.title) + "</h3><ul>" + (p.items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ul>" +
        (p.deliver ? '<div class="deliver"><b>You would have</b><p>' + md(p.deliver) + "</p></div>" : "") + "</article>";
    }).join("") + "</div>";
    return '<section class="plan" id="plan"><div class="wrap">' + head(s.label || "04 — Your first 90 days", s.title, s.intro) + body +
      (s.rhythm ? '<div class="rhythm">' + s.rhythm.map(function (r) { return '<div data-r><b>' + esc(r.title) + "</b><p>" + md(r.text) + "</p></div>"; }).join("") + "</div>" : "") +
      (s.foot ? '<p class="fine" style="color:var(--on-dark-muted)" data-r>' + md(s.foot) + "</p>" : "") + "</div></section>";
  }
  var KIND = { system: "Brand systems", identity: "Identity", launch: "Launch pages", product: "Brand with product" };
  function creative(c) {
    var s = c.creative; if (!s) return ""; NAV.push(["creative", s.nav || "Marketing work"]);
    var items = s.items || [], kinds = []; items.forEach(function (i) { if (i.kind && kinds.indexOf(i.kind) < 0) kinds.push(i.kind); });
    var labels = s.kinds || {};
    return '<section id="creative"><div class="wrap">' + head(s.label || "05 — Brand and launch work", s.title, s.intro) +
      (kinds.length > 1 ? '<div class="filters wall-filters" role="group" aria-label="Highlight by type"><button type="button" aria-pressed="true" data-k="">All</button>' + kinds.map(function (k) { return '<button type="button" aria-pressed="false" data-k="' + esc(k) + '">' + esc(labels[k] || KIND[k] || k) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="wall" data-wall>' + items.map(function (i, k) {
        if (!okSrc(i.src)) return "";
        return '<button type="button" class="wtile" data-i="' + k + '" data-kind="' + esc(i.kind || "") + '" aria-label="Open larger: ' + esc(i.caption || i.alt || "image") + '"><img src="' + esc(i.src) + '" alt="' + esc(i.alt || "") + '" loading="lazy" decoding="async"' + (i.w ? ' width="' + +i.w + '" height="' + +i.h + '"' : "") + '><span class="wcap">' + md(i.caption || "") + "</span></button>";
      }).join("") + "</div></div></section>";
  }
  var scopeData = null;
  function scopeHtml(c) {
    var s = c.scope; if (!s) return ""; scopeData = s;
    var steps = (s.journey || []).map(function (j, i) { return '<li><span class="label">' + ("0" + (i + 1)).slice(-2) + "</span><b>" + esc(j.title) + "</b><span>" + esc(j.note || "") + "</span></li>"; }).join("");
    var calls = (s.calls || []).map(function (q, i) {
      return '<div class="sc-call" data-c="' + i + '"><p>' + md(q.q) + (q.note ? "<small>" + md(q.note) + "</small>" : "") + '</p><div class="sc-seg" role="group" aria-label="Decide now or discuss later"><button type="button" data-v="now" aria-pressed="false">Decide now</button><button type="button" data-v="later" aria-pressed="true">Discuss later</button></div></div>';
    }).join("");
    return '<button type="button" class="sc-fab" aria-haspopup="dialog" aria-expanded="false" aria-controls="sc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg><span>' + esc(s.button || "Scope") + "</span></button>" +
      '<div class="sc" id="sc" hidden role="dialog" aria-modal="true" aria-labelledby="sc-t" data-lenis-prevent><div class="sc-scrim" data-close></div><div class="sc-panel"><div class="sc-head"><div><p class="label">' + esc(s.label || "One page") + '</p><h2 id="sc-t">' + hd(s.title || "The first piece of work, in one page") + '</h2></div><button type="button" class="sc-x" data-close aria-label="Close">&times;</button></div>' +
      (s.intro ? '<p class="sc-intro">' + md(s.intro) + "</p>" : "") + (steps ? '<ol class="sc-steps">' + steps + "</ol>" : "") +
      '<div class="sc-meter-wrap"><div class="sc-meter" aria-hidden="true"><i></i></div><p class="sc-hrs" aria-live="polite"></p><p class="sc-flag" aria-live="polite"></p></div>' +
      '<div class="sc-cols"><div><h3 class="label">In the first loop</h3><div class="sc-list" data-side="in"></div></div><div><h3 class="label">Waits</h3><div class="sc-list" data-side="out"></div></div></div>' +
      (calls ? '<h3 class="label sc-h">Calls I need from you</h3><div class="sc-calls">' + calls + "</div>" : "") +
      '<div class="sc-actions"><a class="btn" data-mail href="#">Send this to me</a><button type="button" class="btn ghost" data-print>Print or save as PDF</button><button type="button" class="btn ghost" data-reset>Reset</button></div>' +
      (s.foot ? '<p class="sc-foot">' + md(s.foot) + "</p>" : "") + "</div></div>";
  }
  function ask(c) {
    var s = c.ask; if (!s) return "";
    return '<section id="ask" style="padding-top:0"><div class="wrap">' + head(s.label || "06 What I would like to learn from you", s.title, s.intro) +
      '<div class="cards">' + (s.items || []).map(function (i) { return '<div class="card" data-r><h3>' + esc(i.q) + "</h3><p>" + md(i.why) + "</p></div>"; }).join("") + "</div></div></section>";
  }
  function close(c) {
    var s = c.close; NAV.push(["close", s.nav || "Why me"]);
    return '<section class="close" id="close"><div class="wrap"><div class="rule" aria-hidden="true"></div><p class="label" data-r>' + esc(s.label || "07 The short version") + '</p><h2 class="h-xl" data-r>' + hd(s.headline) + "</h2>" +
      '<ol class="reasons">' + (s.reasons || []).map(function (r) { return '<li data-r><h3>' + esc(r.title) + "</h3><p>" + md(r.text) + "</p></li>"; }).join("") + "</ol>" +
      '<div class="cta">' + (s.ctas || []).map(function (b, i) { return '<a class="btn' + (i ? " ghost" : "") + '" href="' + esc(b.href) + '"' + (/^https:/.test(b.href) ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + esc(b.label) + "</a>"; }).join("") + "</div>" +
      (s.signoff ? '<p class="sign" data-r>' + md(s.signoff) + "</p>" : "") + "</div></section>";
  }
  function sources(c) {
    var s = c.sources; if (!s) return "";
    return '<section class="sources" id="sources"><div class="wrap"><p class="label">' + esc(c.sourcesLabel || "Sources") + "</p><ul>" + s.map(function (x) {
      return "<li><a href=\"" + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.label) + "</a>" + (x.note ? " &middot; " + esc(x.note) : "") + "</li>";
    }).join("") + "</ul>" + (c.fine ? '<p class="fine">' + md(c.fine) + "</p>" : "") + "</div></section>";
  }

  /* ---------- render ---------- */
  var TOK = { paper: "--paper", surface: "--surface", ink: "--ink", muted: "--muted", line: "--line", accent: "--accent", accentSoft: "--accent-soft", onAccent: "--on-accent", dark: "--dark", onDark: "--on-dark", onDarkMuted: "--on-dark-muted" };
  var SAFE = /^#[0-9a-f]{3,8}$|^rgba?\([\d\s.,%]+\)$/i;
  function block(sel, o) {
    var d = ""; Object.keys(TOK).forEach(function (k) { if (o && o[k] && SAFE.test(o[k])) d += TOK[k] + ":" + o[k] + ";"; });
    return d ? sel + "{" + d + "}" : "";
  }
  function applyTheme(t) {
    if (!t) return;
    var light = t.light || t, dark = t.dark && typeof t.dark === "object" ? t.dark : null;
    var css = block(":root", light);
    if (dark) css += "@media (prefers-color-scheme:dark){" + block(':root:not([data-theme="light"])', dark) + "}" + block(':root[data-theme="dark"]', dark);
    if (light && !dark) css += "";
    var fonts = [["display", "--display"], ["body", "--body"], ["mono", "--mono"], ["serif", "--serif"]], r = "";
    fonts.forEach(function (f) { if (t[f[0]]) r += f[1] + ":" + String(t[f[0]]).replace(/[;{}<]/g, "") + ";"; });
    if (+t.displayWeight >= 300 && +t.displayWeight <= 900) r += "--dw:" + +t.displayWeight + ";";
    if (/^-?[\d.]+em$/.test(t.displayTracking || "")) r += "--dtrack:" + t.displayTracking + ";";
    if (/^\d{1,2}px$/.test(t.radius || "")) r += "--r:" + t.radius + ";";
    if (r) css += ":root{" + r + "}";
    if (css) { var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }
    if (t.fontsHref && /^https:\/\/fonts\.googleapis\.com\//.test(t.fontsHref)) { var l = document.createElement("link"); l.rel = "stylesheet"; l.href = t.fontsHref; document.head.appendChild(l); }
    if (t.mode === "light" || t.mode === "dark") document.documentElement.setAttribute("data-theme", t.mode);
    try { var sv = localStorage.getItem("pp-theme"); if (sv === "light" || sv === "dark") document.documentElement.setAttribute("data-theme", sv); } catch (e) {}
  }
  function render(c) {
    applyTheme(c.theme); NAV = [];
    document.title = c.meta && c.meta.title ? c.meta.title : "Private";
    var body = hero(c) + marquee(c) + heard(c) + story(c) + ledger(c) + plan(c) + creative(c) + ask(c) + close(c) + sources(c);
    var m = c.meta || {}, home = /^https:\/\//.test(m.home || "") ? m.home : "";
    var nav = '<nav class="topbar" aria-label="Sections">' +
      (m.avatar && /^https:\/\//.test(m.avatar) ? '<a class="avatar" href="' + (home ? esc(home) : "#top") + '"' + (home ? ' target="_blank" rel="noopener noreferrer"' : "") + ' aria-label="' + esc(m.avatarLabel || "Home") + '"><img src="' + esc(m.avatar) + '" alt="" width="44" height="44"></a>' : "") +
      '<div class="links">' + NAV.map(function (n) { return '<a href="#' + n[0] + '">' + esc(n[1]) + "</a>"; }).join("") + "</div>" +
      (home && m.homeLabel ? '<a class="pill" href="' + esc(home) + '" target="_blank" rel="noopener noreferrer">' + esc(m.homeLabel) + " &#8599;</a>" : "") +
      '<button type="button" class="toggle" aria-label="Switch light and dark theme"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></nav>';
    var app = $("#app");
    app.innerHTML = '<div class="progress" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>' + nav + "<main>" + body + "</main>";
    app.insertAdjacentHTML("beforeend", scopeHtml(c));
    app.insertAdjacentHTML("beforeend", '<div class="lb" hidden role="dialog" aria-modal="true" aria-label="Image viewer" data-lenis-prevent><button type="button" class="lb-x" aria-label="Close">&times;</button><button type="button" class="lb-p" aria-label="Previous">&larr;</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-n" aria-label="Next">&rarr;</button></div>');
    app.hidden = false; document.body.classList.remove("is-locked"); $("#gate").remove();
    wire(); motion();
  }

  function wire() {
    $$(".filters button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var f = b.getAttribute("data-f");
        $$(".led-row").forEach(function (r) { r.hidden = !!f && r.getAttribute("data-theme") !== f; });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
    var sc = $(".sc"), fab = $(".sc-fab");
    if (sc && fab && scopeData) {
      var S = scopeData, B = S.budget || { hours: 0, weeks: 1 }, feats = (S.features || []).map(function (f) { return { name: f.name, hours: +f.hours || 0, on: !!f.in, was: !!f.in }; }), calls = {}, openFrom = null;
      var perWeek = B.weeks ? B.hours / B.weeks : B.hours || 1;
      function draw() {
        var used = 0; feats.forEach(function (f) { if (f.on) used += f.hours; });
        ["in", "out"].forEach(function (side) {
          var host = $('.sc-list[data-side="' + side + '"]', sc), html = "";
          feats.forEach(function (f, i) { if ((side === "in") === f.on) html += '<button type="button" class="sc-chip" data-i="' + i + '" aria-label="' + esc(f.name) + ", " + f.hours + " hours. Move to " + (f.on ? "waits" : "the first loop") + '"><span>' + esc(f.name) + "</span><b>" + f.hours + " h</b></button>"; });
          host.innerHTML = html || '<p class="sc-empty">Nothing here.</p>';
        });
        var over = used - B.hours, pct = Math.min(100, Math.round((used / (B.hours || 1)) * 100));
        $(".sc-meter", sc).classList.toggle("over", over > 0); $(".sc-meter i", sc).style.setProperty("--w", pct + "%");
        $(".sc-hrs", sc).innerHTML = "<b>" + used + "</b> of " + B.hours + " hours" + (B.label ? " &middot; " + esc(B.label) : "");
        var flag = $(".sc-flag", sc);
        if (over > 0) { var wk = Math.ceil(over / perWeek); flag.textContent = "Over by " + over + " hours: about " + wk + (wk === 1 ? " week" : " weeks") + " later."; flag.className = "sc-flag warn"; }
        else { flag.textContent = (B.hours - used) + " hours of room."; flag.className = "sc-flag"; }
        var mail = $("[data-mail]", sc);
        if (mail && S.send && S.send.to) {
          var body = (S.title || "Scope") + " (my estimates)\n\nIn the first loop (" + used + " of " + B.hours + " hours):\n" + feats.filter(function (f) { return f.on; }).map(function (f) { return "- " + f.name + " (" + f.hours + " h)"; }).join("\n") +
            "\n\nWaits:\n" + (feats.filter(function (f) { return !f.on; }).map(function (f) { return "- " + f.name + " (" + f.hours + " h)"; }).join("\n") || "- nothing") +
            "\n\nCalls:\n" + (S.calls || []).map(function (q, i) { return "- " + q.q.replace(/[*_]/g, "") + ": " + (calls[i] === "now" ? "decide now" : "discuss later"); }).join("\n");
          mail.href = "mailto:" + S.send.to + "?subject=" + encodeURIComponent(S.send.subject || "First loop scope") + "&body=" + encodeURIComponent(body);
        }
      }
      function setOpen(v) {
        if (v === !sc.hidden) return;
        sc.hidden = !v; fab.setAttribute("aria-expanded", v ? "true" : "false"); document.documentElement.style.overflow = v ? "hidden" : "";
        if (v) { openFrom = document.activeElement; fab.classList.add("show"); $(".sc-x", sc).focus(); } else if (openFrom && openFrom.focus) openFrom.focus();
      }
      draw();
      fab.addEventListener("click", function () { setOpen(true); });
      $$("[data-close]", sc).forEach(function (b) { b.addEventListener("click", function () { setOpen(false); }); });
      $(".sc-cols", sc).addEventListener("click", function (e) { var b = e.target.closest(".sc-chip"); if (!b) return; var f = feats[+b.getAttribute("data-i")]; f.on = !f.on; draw(); var again = $('.sc-chip[data-i="' + b.getAttribute("data-i") + '"]', sc); if (again) again.focus(); });
      $$(".sc-call", sc).forEach(function (row) {
        $$(".sc-seg button", row).forEach(function (bt) { bt.addEventListener("click", function () { $$(".sc-seg button", row).forEach(function (x) { x.setAttribute("aria-pressed", x === bt ? "true" : "false"); }); calls[+row.getAttribute("data-c")] = bt.getAttribute("data-v"); draw(); }); });
      });
      $("[data-reset]", sc).addEventListener("click", function () { feats.forEach(function (f) { f.on = f.was; }); calls = {}; $$(".sc-seg button", sc).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-v") === "later" ? "true" : "false"); }); draw(); });
      $("[data-print]", sc).addEventListener("click", function () { window.print(); });
      document.addEventListener("keydown", function (e) {
        var tag = (document.activeElement && document.activeElement.tagName) || "";
        if (e.key === "Escape" && !sc.hidden) { setOpen(false); return; }
        if ((e.key === "s" || e.key === "S") && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(tag) && $(".lb").hidden) { e.preventDefault(); setOpen(sc.hidden); }
      });
      // The button stays out of the way during the talk and appears when the closing section is reached.
      var closeSec = $("#close");
      if (closeSec && "IntersectionObserver" in window) new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) fab.classList.add("show"); }); }, { threshold: 0.35 }).observe(closeSec);
      else fab.classList.add("show");
    }
    var wall = $("[data-wall]"), lb = $(".lb");
    if (wall && lb) {
      var wt = $$(".wtile", wall), cur = -1, opener = null, lbi = $("img", lb), lbc = $("figcaption", lb);
      function show(i) {
        cur = (i + wt.length) % wt.length; var im = $("img", wt[cur]);
        lbi.src = im.currentSrc || im.src; lbi.alt = im.alt; lbc.textContent = $(".wcap", wt[cur]).textContent;
      }
      function openLb(i) { opener = document.activeElement; show(i); lb.hidden = false; document.documentElement.style.overflow = "hidden"; $(".lb-x", lb).focus(); }
      function closeLb() { lb.hidden = true; document.documentElement.style.overflow = ""; if (opener && opener.focus) opener.focus(); }
      wt.forEach(function (t, i) { t.addEventListener("click", function () { openLb(i); }); });
      $(".lb-x", lb).addEventListener("click", closeLb);
      $(".lb-p", lb).addEventListener("click", function () { show(cur - 1); });
      $(".lb-n", lb).addEventListener("click", function () { show(cur + 1); });
      lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
      document.addEventListener("keydown", function (e) {
        if (lb.hidden) return;
        if (e.key === "Escape") closeLb(); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "ArrowLeft") show(cur - 1);
      });
      $$(".wall-filters button").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-k");
          $$(".wall-filters button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          wt.forEach(function (t) { t.classList.toggle("dim", !!k && t.getAttribute("data-kind") !== k); });
        });
      });
    }
    var mapRoot = $("[data-map]");
    if (mapRoot) {
      var tiles = $$(".tile", mapRoot), mps = $$(".mp", mapRoot), cur = 0;
      function choose(i, focus) {
        cur = (i + tiles.length) % tiles.length;
        tiles.forEach(function (t, k) { t.setAttribute("aria-pressed", k === cur ? "true" : "false"); });
        mps.forEach(function (p, k) { p.hidden = k !== cur; });
        if (focus) tiles[cur].focus();
      }
      tiles.forEach(function (t, i) {
        t.addEventListener("click", function () { choose(i, false); });
        t.addEventListener("keydown", function (e) {
          var k = e.key, cols = Math.max(1, Math.round(mapRoot.querySelector(".map-grid").clientWidth / t.offsetWidth)), n = null;
          if (k === "ArrowRight") n = i + 1; else if (k === "ArrowLeft") n = i - 1; else if (k === "ArrowDown") n = i + cols; else if (k === "ArrowUp") n = i - cols; else return;
          if (n < 0 || n >= tiles.length) return; e.preventDefault(); choose(n, true);
        });
      });
      $$(".mp-nav button", mapRoot).forEach(function (b) { b.addEventListener("click", function () { choose(cur + +b.getAttribute("data-d"), false); }); });
      $$(".map-legend button", mapRoot).forEach(function (b) {
        b.addEventListener("click", function () {
          var f = b.getAttribute("data-s");
          $$(".map-legend button", mapRoot).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          tiles.forEach(function (t) { t.classList.toggle("dim", !!f && t.getAttribute("data-s") !== f); });
          if (f) { var first = tiles.findIndex(function (t) { return t.getAttribute("data-s") === f; }); if (first > -1) choose(first, false); }
        });
      });
    }
    $$('a[href^="#"]').forEach(function (a) { a.addEventListener("click", function (e) { var t = $(a.getAttribute("href")); if (t) { e.preventDefault(); jump(t); } }); });
    var tlRoot = $("[data-tl]");
    if (tlRoot) {
      function pair(view) { return { ctl: $('.tl-ctl[data-view="' + view + '"]', tlRoot), pan: $('.tl-pan[data-view="' + view + '"]', tlRoot) }; }
      // Keep the section the same height on every tab so nothing jumps: measure the tallest panel once.
      function fit() {
        tlRoot.classList.add("measure"); var max = 0;
        $$(".tl-panel", tlRoot).forEach(function (p) { if (p.offsetHeight > max) max = p.offsetHeight; });
        tlRoot.classList.remove("measure"); tlRoot.style.setProperty("--tlh", max + "px");
      }
      $$("[data-tab]", tlRoot).forEach(function (tb) {
        tb.addEventListener("click", function () {
          var v = tb.getAttribute("data-tab");
          $$("[data-tab]", tlRoot).forEach(function (x) { x.setAttribute("aria-selected", x === tb ? "true" : "false"); });
          ["first", "next"].forEach(function (k) { var pr = pair(k); if (pr.ctl) pr.ctl.hidden = k !== v; if (pr.pan) pr.pan.hidden = k !== v; });
        });
      });
      ["first", "next"].forEach(function (view) {
        var pr = pair(view); if (!pr.ctl || !pr.pan) return;
        var segs = $$(".tl-seg", pr.ctl), panels = $$(".tl-panel", pr.pan), bands = $$(".tl-band", pr.ctl);
        function pick(i, focus) {
          segs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
          panels.forEach(function (p, k) { p.hidden = k !== i; });
          var f = +segs[i].getAttribute("data-from"), t = +segs[i].getAttribute("data-to");
          bands.forEach(function (bd) { var on = f && +bd.getAttribute("data-from") <= t && +bd.getAttribute("data-to") >= f; bd.classList.toggle("on", !!on); });
          if (focus) segs[i].focus();
          var rail = segs[i].parentElement; if (rail && rail.scrollWidth > rail.clientWidth) rail.scrollLeft = segs[i].offsetLeft - 16;
        }
        segs.forEach(function (b, i) {
          b.addEventListener("click", function () { pick(i, false); });
          b.addEventListener("keydown", function (e) {
            var k = e.key, n = i;
            if (k === "ArrowRight" || k === "ArrowDown") n = Math.min(segs.length - 1, i + 1);
            else if (k === "ArrowLeft" || k === "ArrowUp") n = Math.max(0, i - 1);
            else if (k === "Home") n = 0; else if (k === "End") n = segs.length - 1; else return;
            e.preventDefault(); pick(n, true);
          });
        });
        if (segs.length) pick(0, false);
      });
      fit(); var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(fit, 150); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    }
    var tg = $(".toggle");
    if (tg) tg.addEventListener("click", function () {
      var root = document.documentElement, cur = root.getAttribute("data-theme");
      if (!cur) { try { cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { cur = "light"; } }
      var nx = cur === "dark" ? "light" : "dark"; root.setAttribute("data-theme", nx);
      try { localStorage.setItem("pp-theme", nx); } catch (e) {}
    });
    var links = $$(".topbar .links a"), chap = $$(".chap-list a");
    function spy() {
      var y = window.scrollY + innerHeight * 0.35, cur = null;
      links.forEach(function (a) { var s = $(a.getAttribute("href")); if (s && s.offsetTop <= y) cur = a; });
      links.forEach(function (a) { a.setAttribute("aria-current", a === cur ? "true" : "false"); });
      var cc = null; chap.forEach(function (a) { var s = $(a.getAttribute("href")); if (s && s.getBoundingClientRect().top <= innerHeight * 0.4) cc = a; });
      chap.forEach(function (a) { a.setAttribute("aria-current", a === cc ? "true" : "false"); });
      var h = document.documentElement, p = $(".progress"); if (p) p.style.transform = "scaleX(" + Math.min(1, window.scrollY / Math.max(1, h.scrollHeight - innerHeight)) + ")";
    }
    window.addEventListener("scroll", spy, { passive: true }); spy();
  }

  /* ---------- motion (loaded after unlock; the page is complete without it) ---------- */
  var lenisRef = null, userAt = 0;
  ["wheel", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { userAt = Date.now(); }, { passive: true }); });
  function scrollToY(y, offset) {
    if (lenisRef) lenisRef.scrollTo(y, { offset: offset || 0 });
    else window.scrollTo({ top: typeof y === "number" ? y : Math.max(0, y.getBoundingClientRect().top + window.pageYOffset + (offset || 0)), behavior: "smooth" });
  }
  // Works before the smooth-scroll library has loaded, and re-checks the landing because fonts and images may still be settling.
  function jump(t) {
    var startAt = Date.now(), y0 = landing(t), isEl = y0 === t;
    scrollToY(y0, isEl ? -70 : 0);
    function recheck() {
      if (userAt > startAt) return;
      var y2 = landing(t), off = isEl ? t.getBoundingClientRect().top - 70 : window.pageYOffset - y2;
      if (Math.abs(off) > 6) scrollToY(y2, isEl ? -70 : 0);
    }
    [1400, 2800, 5000].forEach(function (ms) { setTimeout(recheck, ms); });
    if (document.fonts && document.fonts.status !== "loaded" && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(recheck, 250); });
  }
  // Jumping to a section that holds the interactive plan lands with its controls pinned, so the panel is in view without scrolling.
  function landing(t) {
    var tl = t.querySelector && t.querySelector("[data-tl]");
    if (!tl) return t;
    return Math.max(0, Math.round(tl.getBoundingClientRect().top + window.pageYOffset - (window.innerWidth <= 900 ? 76 : 84)));
  }
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; s.crossOrigin = "anonymous"; document.head.appendChild(s); }); }
  function motion() {
    if (reduce) { $$("[data-count]").forEach(function (n) { n.textContent = n.getAttribute("data-count"); }); return; }
    load("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js")
      .then(function () { return load("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"); })
      .then(function () { return load("https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js").catch(function () {}); })
      .then(go).catch(function () {});
  }
  function go() {
    var gsap = window.gsap, ST = window.ScrollTrigger; if (!gsap || !ST) return;
    gsap.registerPlugin(ST); document.documentElement.classList.add("js-anim");
    if (window.Lenis) {
      var lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
      lenis.on("scroll", ST.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0);
      lenisRef = lenis;
    }
    gsap.from("#hero-h .w>span", { yPercent: 115, duration: 1.1, ease: "power4.out", stagger: 0.07, delay: 0.15 });
    $$(".rule").forEach(function (r) { gsap.to(r, { scaleX: 1, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: r, start: "top 92%", once: true } }); });
    ST.batch("[data-r]", { start: "top 88%", once: true, onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true }); } });
    // Images are shown whole: no scale or crop parallax.
    $$("[data-count]").forEach(function (n) {
      var raw = n.getAttribute("data-count"), m = raw.match(/^([^\d]*)([\d,.]+)(.*)$/); if (!m) return;
      var end = parseFloat(m[2].replace(/,/g, "")), dec = (m[2].split(".")[1] || "").length, o = { v: 0 };
      ST.create({ trigger: n, start: "top 90%", once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", onUpdate: function () { n.textContent = m[1] + o.v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3]; } });
      } });
    });
    var ph = $(".phases"); if (ph) gsap.fromTo(ph, { "--p": 0 }, { "--p": 1, ease: "none", scrollTrigger: { trigger: ph, start: "top 80%", end: "bottom 60%", scrub: true } });
    ST.refresh();
  }

  /* ---------- gate ---------- */
  var today = new Date().toISOString().slice(0, 10);
  var form = $("#gate-form"), msg = $("#gate-msg");
  if (payload.expires && payload.expires < today) {
    form.hidden = true; msg.textContent = "This page has expired. Please ask for a fresh link."; return;
  }
  if (!window.crypto || !crypto.subtle) { form.hidden = true; msg.textContent = "Your browser can't open this page securely. Try a current browser over https."; return; }
  async function open(pw, remember) {
    msg.textContent = "Opening…";
    try { var c = await decrypt(pw); if (remember) { try { sessionStorage.setItem("pp", pw); } catch (e) {} } render(c); return true; }
    catch (e) { msg.textContent = "That password didn't work. Check it and try again."; return false; }
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); open($("#pw").value, true); });
  var saved = null; try { saved = sessionStorage.getItem("pp"); } catch (e) {}
  if (saved) open(saved, false).then(function (ok) { if (!ok) { try { sessionStorage.removeItem("pp"); } catch (e) {} msg.textContent = ""; } });
})();
