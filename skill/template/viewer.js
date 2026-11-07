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
  function img(i, cls) {
    if (!i || !i.src || !/^https:\/\//.test(i.src)) return "";
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
  function ledger(c) {
    var s = c.ledger; if (!s) return ""; NAV.push(["ledger", s.nav || "Your list"]);
    var cols = s.cols && s.cols.length === 3 ? s.cols : ["The need", "What I have done", "What I would do"];
    var themes = []; (s.rows || []).forEach(function (r) { if (r.theme && themes.indexOf(r.theme) < 0) themes.push(r.theme); });
    return '<section id="ledger"><div class="wrap">' + head(s.label || "03 Your list, answered", s.title, s.intro) +
      '<div class="filters" role="group" aria-label="Filter by theme"><button type="button" aria-pressed="true" data-f="">All</button>' + themes.map(function (t) { return '<button type="button" aria-pressed="false" data-f="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>" +
      '<div class="led-head label" aria-hidden="true"><span>' + esc(cols[0]) + "</span><span>" + esc(cols[1]) + "</span><span>" + esc(cols[2]) + "</span></div>" +
      (s.rows || []).map(function (r) {
        var gap = r.gap;
        return '<article class="led-row" data-theme="' + esc(r.theme || "") + '" data-r><div><div class="led-col-label">' + esc(cols[0]) + '</div><p class="ask">' + md(r.ask) + "</p></div>" +
          '<div><div class="led-col-label">' + esc(cols[1]) + '</div><div class="who">' + (r.project ? '<span class="tag">' + esc(r.project) + "</span>" : "") + tag(gap ? "gap" : r.label) + "</div>" + paras(r.did) + "</div>" +
          '<div class="will"><div class="led-col-label">' + esc(cols[2]) + "</div>" + paras(r.will) + "</div></article>";
      }).join("") + "</div></section>";
  }
  function plan(c) {
    var s = c.plan; if (!s) return ""; NAV.push(["plan", s.nav || "90 days"]);
    return '<section class="plan" id="plan"><div class="wrap">' + head(s.label || "04 Your first 90 days", s.title, s.intro) +
      '<div class="phases">' + (s.phases || []).map(function (p) {
        return '<article class="phase" data-r><span class="label">' + esc(p.label) + "</span><h3>" + esc(p.title) + "</h3><ul>" + (p.items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ul>" +
          (p.deliver ? '<div class="deliver"><b>You would have</b><p>' + md(p.deliver) + "</p></div>" : "") + "</article>";
      }).join("") + "</div>" +
      (s.rhythm ? '<div class="rhythm">' + s.rhythm.map(function (r) { return '<div data-r><b>' + esc(r.title) + "</b><p>" + md(r.text) + "</p></div>"; }).join("") + "</div>" : "") +
      (s.foot ? '<p class="fine" style="color:var(--on-dark-muted)" data-r>' + md(s.foot) + "</p>" : "") + "</div></section>";
  }
  function creative(c) {
    var s = c.creative; if (!s) return ""; NAV.push(["creative", s.nav || "Marketing work"]);
    return '<section id="creative"><div class="wrap">' + head(s.label || "05 Marketing and launch creative", s.title, s.intro) +
      '<div class="gallery">' + (s.items || []).map(function (i) { return '<div data-r>' + img(i, "par") + "</div>"; }).join("") + "</div></div></section>";
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
      $$('a[href^="#"]').forEach(function (a) { a.addEventListener("click", function (e) { var t = $(a.getAttribute("href")); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -70 }); } }); });
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
