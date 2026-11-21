(() => {
  const KO = /[가-힣]/;
  const OWN = window.MSX_GLOSSARY || {};
  let G = { ...OWN };          // site dictionary (lower priority) + our glossary
  let UI = new Set();          // Korean strings that come from the site's own code = interface text
  const ATTRS = ["placeholder", "title", "alt", "aria-label"];
  let settings = { enabled: true, machine: true, region: "msea" };
  let RULES = [];
  let EN_RE = null;
  function setRegion(r) {
    const R = window.MSX_REGIONS || {};
    RULES = [...(R.common || []), ...(R[r] || [])];
    EN_RE = RULES.length ? new RegExp(RULES.map(([re]) => re.source).join("|")) : null;
  }
  const localize = (s) => { for (const [re, to] of RULES) s = s.replace(re, to); return s; };

  // ---------- glossary ----------
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Substring mode skips one-syllable keys (윌, 렌, 펫...) to avoid hitting random words.
  let subRe = null;
  const PARTICLES = "에서는|에서|으로|로는|에는|을|를|이|가|은|는|의|에|로|와|과|도|만|중|으론";
  function buildRegex() {
    // Our keys from 2 syllables, site keys from 3 (they're less curated).
    const keys = Object.keys(G).filter((k) => KO.test(k) && (k.length >= 3 || (k.length >= 2 && k in OWN)));
    keys.sort((a, b) => b.length - a.length);
    // Whole words only: the term can't sit inside a longer Korean word (페이지 != 페+이지).
    // A trailing grammar particle (을/를/의/에서...) is allowed and captured.
    subRe = keys.length
      ? new RegExp("(?<![\\uac00-\\ud7a3])(" + keys.map(esc).join("|") + ")(" + PARTICLES + ")?(?![\\uac00-\\ud7a3])", "g")
      : null;
  }
  buildRegex();

  // ---------- Korean number units: 3억 1631만 -> 316,310,000 ----------
  const UNIT = { "조": 1e12, "억": 1e8, "만": 1e4, "천": 1e3 };
  const bigNumRe = /\d[\d,.]*\s*[조억만천](?:\s*\d[\d,.]*\s*[조억만천]?)*/g;
  function convertBigNumbers(s) {
    return s.replace(bigNumRe, (m) => {
      let total = 0;
      const parts = m.matchAll(/(\d[\d,.]*)\s*([조억만천]?)/g);
      for (const [, n, u] of parts) total += parseFloat(n.replace(/,/g, "")) * (u ? UNIT[u] : 1);
      return Number.isFinite(total) ? total.toLocaleString("en-US") : m;
    });
  }

  const ord = (n) => {
    const v = +n % 100;
    return n + (v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[+n % 10] || "th"));
  };

  const PATTERNS = [
    [/(\d[\d,]*)\s*위/g, (_, n) => "#" + n],
    [/(\d+)\s*층/g, (_, n) => "Floor " + n],
    [/(\d+)\s*성(?![가-힣])/g, (_, n) => n + "★"],
    [/(\d)\s*차(?![가-힣])/g, (_, n) => ord(n) + " Job"],
    [/(\d+)\s*추(?![가-힣])/g, (_, n) => ord(n) + "-tier"],
    [/(\d+)\s*일\s*전/g, (_, n) => n + " days ago"],
    [/(\d+)\s*시간\s*전/g, (_, n) => n + " hours ago"],
    [/(\d+)\s*분\s*전/g, (_, n) => n + " min ago"],
    [/(\d+)\s*초(?![가-힣])/g, (_, n) => n + "s"],
    [/(\d+)\s*회씩/g, (_, n) => n + " times each"],
    [/(\d+)\s*회(?![가-힣])/g, (_, n) => n + " times"],
    [/(\d+)\s*분(?![가-힣])/g, (_, n) => n + " min"],
    [/([\d.]+)\s*배(?![가-힣])/g, (_, n) => "×" + n],
    [/(\d+)\s*개(?![가-힣])/g, (_, n) => n],
    [/방금\s*전/g, () => "just now"],
    [/(\d+)\s*셋(?![\uac00-\ud7a3])/g, (_, n) => n + "-set"],
    [/(\d+)\s*단계까지/g, (_, n) => "Up to Stage " + n],
    [/(\d+)\s*단계(?![\uac00-\ud7a3])/g, (_, n) => "Stage " + n],
    [/영환불\s*([\d,.]+)\s*개급/g, (_, n) => "~" + n + " Eternal Rebirth Flames"],
    [/(\d+)\s*줄(?![\uac00-\ud7a3])/g, (_, n) => " " + n + "-line"],
  ];

  // A nickname-looking string: one word, no digits-with-units, short.
  const looksLikeName = (s) => !/\s/.test(s) && s.length <= 12 && !/\d/.test(s);

  function translate(raw, keepParticles = false) {
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    const t = raw.trim();
    if (!t) return null;
    if (!KO.test(t)) { if (!EN_RE || !EN_RE.test(t)) return null; const l = localize(t); return l === t ? null : lead + l + trail; }

    if (Object.prototype.hasOwnProperty.call(G, t)) return lead + localize(G[t]) + trail;
    if (looksLikeName(t) && !UI.has(t)) return null; // leave character / guild names alone

    // Mask "world@name" credits so the name part isn't touched.
    const masks = [];
    let s = t.replace(/@(\S+)/g, (m) => { masks.push(m); return "\u0000" + (masks.length - 1) + "\u0000"; });

    s = convertBigNumbers(s);
    for (const [re, fn] of PATTERNS) s = s.replace(re, fn);
    if (subRe) s = s.replace(subRe, (_, k, p) => G[k] + (keepParticles && p ? p : ""));

    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => masks[+i]);
    // Second look-up: some sentences only match once their game terms are in English.
    if (Object.prototype.hasOwnProperty.call(G, s)) s = G[s];
    s = localize(s).replace(/ {2,}/g, " ").replace(/\( /g, "(");
    return s === t ? null : lead + s + trail;
  }

  // ---------- optional machine-translation fallback (Chrome's on-device Translator) ----------
  let translator = null;
  const mtCache = new Map();
  async function initTranslator() {
    if (!settings.machine || !("Translator" in self)) return;
    try {
      const opts = { sourceLanguage: "ko", targetLanguage: "en" };
      if ((await Translator.availability(opts)) === "available") translator = await Translator.create(opts);
    } catch (_) { translator = null; }
  }
  function needsMachine(s) {
    if (!translator || !KO.test(s) || s.includes("@")) return false;
    const t = s.trim();
    return /\s/.test(t) || UI.has(t);
  }
  async function machine(s) {
    if (mtCache.has(s)) return mtCache.get(s);
    const p = translator.translate(s).catch(() => s);
    mtCache.set(s, p);
    return p;
  }


  // ---------- MapleScouter's own built-in ko->en dictionary ----------
  // The site ships a Korean->English table in its JS. We read it (and the list of all
  // Korean interface strings) from the scripts the page already loaded, and cache it.
  const decode = (v) => v
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, " ").replace(/\\(["'\\])/g, "$1");
  const PAIR_RE = /"((?:[^"\\\n]|\\.){1,200}?)"\s*:\s*"((?:[^"\\\n]|\\.){1,200}?)"/g;
  const LIT_RE = /"((?:[^"\\\n]|\\.){1,120})"|'((?:[^'\\\n]|\\.){1,120})'|`([^`$]{1,120})`/g;
  const CACHE_KEY = "msxSiteV1";
  let cache = { urls: {}, dict: {}, ui: [] };

  function applyCache() {
    G = { ...cache.dict, ...OWN };
    UI = new Set(cache.ui);
    buildRegex();
  }

  async function ingest(url) {
    if (cache.urls[url]) return false;
    cache.urls[url] = 1;
    try {
      const text = await (await fetch(url)).text();
      if (!KO.test(text)) return true;
      for (const m of text.matchAll(PAIR_RE)) {
        const k = decode(m[1]).trim(), v = decode(m[2]).trim();
        if (KO.test(k) && !KO.test(v) && /[A-Za-z]/.test(v) && v !== "msea" && !/^[a-z0-9_]+$/.test(v)) cache.dict[k] = v;
      }
      const ui = new Set(cache.ui);
      for (const m of text.matchAll(LIT_RE)) {
        const v = decode(m[1] ?? m[2] ?? m[3] ?? "").trim();
        if (v && KO.test(v) && !/[{}<>;=]|function|https?:/.test(v)) ui.add(v);
      }
      cache.ui = [...ui];
    } catch (_) {}
    return true;
  }

  const isSiteJs = (u) => { try { const x = new URL(u); return x.hostname.endsWith("maplescouter.com") && x.pathname.endsWith(".js"); } catch (_) { return false; } };

  async function loadSiteDictionary() {
    const stored = await chrome.storage.local.get(CACHE_KEY);
    if (stored[CACHE_KEY]) cache = stored[CACHE_KEY];
    applyCache();
    const urls = performance.getEntriesByType("resource").map((e) => e.name).filter(isSiteJs);
    let changed = false;
    for (const u of urls) changed = (await ingest(u)) || changed;
    if (changed) { applyCache(); chrome.storage.local.set({ [CACHE_KEY]: cache }); }
    // Scripts loaded later (other pages, lazy popups)
    new PerformanceObserver(async (list) => {
      let c = false;
      for (const e of list.getEntries()) if (isSiteJs(e.name)) c = (await ingest(e.name)) || c;
      if (c) { applyCache(); chrome.storage.local.set({ [CACHE_KEY]: cache }); rescan(); }
    }).observe({ type: "resource", buffered: false });
    return changed;
  }

  function rescan() { written_reset(); walk(document.body); fixTitle(); }

  // ---------- DOM walking ----------
  let written = new WeakMap(); // node -> value we last wrote
  function written_reset() { written = new WeakMap(); }

  function handleText(node) {
    const v = node.nodeValue;
    if (!v || written.get(node) === v) return;
    if (!KO.test(v) && !(EN_RE && EN_RE.test(v))) return;
    const p = node.parentNode;
    if (p && /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.nodeName)) return;
    if (p && p.isContentEditable) return;

    let out = translate(v) ?? v;
    if (out !== v) { written.set(node, out); node.nodeValue = out; }
    if (needsMachine(out)) {
      const before = out;
      const mtInput = (translate(v, true) ?? v).trim();
      machine(mtInput).then((en) => {
        if (node.nodeValue !== before || !en) return;
        const final = before.replace(before.trim(), localize(en));
        written.set(node, final);
        node.nodeValue = final;
      });
    } else if (out === v) {
      written.set(node, v); // nothing to do; don't retry
    }
  }

  function handleAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && (KO.test(v) || (EN_RE && EN_RE.test(v)))) {
        const out = translate(v);
        if (out && out !== v) el.setAttribute(a, out);
      }
    }
  }

  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) return handleText(root);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    handleAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) n.nodeType === Node.TEXT_NODE ? handleText(n) : handleAttrs(n);
  }

  function fixTitle() {
    const out = translate(document.title);
    if (out && out !== document.title) document.title = out;
  }

  // Batch DOM changes (the site is a single-page app that re-renders often).
  const pending = new Set();
  let scheduled = false;
  function flush() {
    scheduled = false;
    for (const n of pending) if (n.isConnected) walk(n);
    pending.clear();
    fixTitle();
  }
  function queue(n) {
    pending.add(n);
    if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }

  // English is longer than Korean: let table headers wrap instead of overlapping.
  function addLayoutFixes() {
    const st = document.createElement("style");
    st.id = "msx-layout";
    st.textContent = "th{white-space:normal!important;overflow-wrap:break-word;line-height:1.25}";
    (document.head || document.documentElement).appendChild(st);
  }

  function start() {
    addLayoutFixes();
    walk(document.body);
    fixTitle();
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach(queue);
        else if (m.type === "characterData") queue(m.target);
        else if (m.type === "attributes") queue(m.target);
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }



  // ---------- dropdown search boxes (cmdk) ----------
  // The site's dropdowns filter on a hidden Korean value, so English searches find nothing.
  // When you type English, we filter the visible (English) item names ourselves instead.
  const norm = (x) => (x || "").toLowerCase().replace(/[\s\-_'’().]/g, "");
  const active = new WeakMap(); // input -> { q, observer, emptyEl }

  function comboRoot(input) { return input.closest("[cmdk-root]") || input.closest("[role=dialog]") || input.parentElement?.parentElement; }
  function items(root) { return [...root.querySelectorAll("[cmdk-item]")]; }

  function filterCombo(input) {
    const st = active.get(input);
    const root = comboRoot(input);
    if (!st || !root) return;
    const q = norm(st.q);
    const raw = st.q.toLowerCase();
    // Prefer names (or words in them) that start with what you typed: "ade" -> Adele, not Shade.
    const all = items(root).map((it) => {
      const text = it.textContent || "";
      const words = text.toLowerCase().split(/[\s()/\-]+/).filter(Boolean);
      const prefix = norm(text).startsWith(q) || words.some((w) => w.startsWith(raw));
      const sub = (norm(text) + "|" + norm(it.getAttribute("data-value"))).includes(q);
      return { it, prefix, sub };
    });
    const usePrefix = all.some((x) => x.prefix);
    let shown = 0;
    for (const { it, prefix, sub } of all) {
      const ok = usePrefix ? prefix : sub;
      it.style.display = ok ? "" : "none";
      if (ok) shown++;
    }
    root.querySelectorAll("[cmdk-empty]").forEach((e) => (e.style.display = "none"));
    root.querySelectorAll("[cmdk-group]").forEach((g) => {
      const any = g.querySelector("[cmdk-item]:not([style*='display: none'])");
      g.style.display = any ? "" : "none";
    });
    if (!st.emptyEl) {
      st.emptyEl = document.createElement("div");
      st.emptyEl.textContent = "No items found.";
      st.emptyEl.style.cssText = "padding:24px 8px;text-align:center;font-size:13px;opacity:.6";
      (root.querySelector("[cmdk-list]") || root).appendChild(st.emptyEl);
    }
    st.emptyEl.style.display = shown ? "none" : "";
  }

  function clearCombo(input) {
    const st = active.get(input);
    if (!st) return;
    st.observer?.disconnect();
    st.emptyEl?.remove();
    active.delete(input);
    const root = comboRoot(input);
    if (!root) return;
    items(root).forEach((it) => (it.style.display = ""));
    root.querySelectorAll("[cmdk-group],[cmdk-empty]").forEach((g) => (g.style.display = ""));
  }

  function setupComboSearch() {
    window.addEventListener("input", (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !el.matches("[cmdk-input]")) return;
      const q = el.value.trim();
      if (q && !KO.test(q)) {
        e.stopImmediatePropagation(); // keep the site's Korean-only filter out of it
        let st = active.get(el);
        if (!st) {
          st = { q };
          active.set(el, st);
          const root = comboRoot(el);
          if (root) {
            st.observer = new MutationObserver(() => filterCombo(el));
            st.observer.observe(root, { childList: true, subtree: true });
          }
        }
        st.q = q;
        filterCombo(el);
      } else {
        clearCombo(el); // empty or Korean: let the site handle it normally
      }
    }, true);

    // Enter picks the first visible match while our filter is on.
    window.addEventListener("keydown", (e) => {
      const el = e.target;
      if (e.key !== "Enter" || !(el instanceof HTMLInputElement) || !active.has(el)) return;
      const first = items(comboRoot(el) || document).find((it) => it.style.display !== "none");
      if (first) { e.preventDefault(); e.stopImmediatePropagation(); first.click(); }
    }, true);
  }

  // ---------- on-page button to switch on sentence translation ----------
  async function offerTranslator() {
    if (translator || !settings.machine || !("Translator" in self)) return;
    const opts = { sourceLanguage: "ko", targetLanguage: "en" };
    let a;
    try { a = await Translator.availability(opts); } catch (_) { return; }
    if (a !== "downloadable" && a !== "downloading") return;
    const { msxPillHidden } = await chrome.storage.local.get("msxPillHidden");
    if (msxPillHidden) return;

    const pill = document.createElement("div");
    pill.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;" +
      "background:#1c1d22;color:#e8e8ea;border:1px solid #f08a24;border-radius:999px;padding:8px 12px;" +
      "font:13px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4)";
    const btn = document.createElement("button");
    btn.textContent = "🌐 Translate full sentences too";
    btn.style.cssText = "all:unset;cursor:pointer;font-weight:600;color:#f6a654";
    const note = document.createElement("span");
    note.textContent = "(one-time download, runs on your PC)";
    note.style.cssText = "color:#9a9ba3;font-size:12px";
    const close = document.createElement("button");
    close.textContent = "×";
    close.title = "Hide";
    close.style.cssText = "all:unset;cursor:pointer;color:#9a9ba3;font-size:16px;padding:0 2px";
    pill.append(btn, note, close);
    document.body.appendChild(pill);

    close.onclick = () => { pill.remove(); chrome.storage.local.set({ msxPillHidden: true }); };
    btn.onclick = async () => {
      btn.disabled = true;
      note.textContent = "Downloading…";
      try {
        translator = await Translator.create({
          ...opts,
          monitor(m) { m.addEventListener("downloadprogress", (e) => (note.textContent = `Downloading… ${Math.round(e.loaded * 100)}%`)); },
        });
        note.textContent = "Done ✓";
        rescan();
        setTimeout(() => pill.remove(), 1500);
      } catch (e) {
        note.textContent = "Couldn't download: " + e.message;
        btn.disabled = false;
      }
    };
  }

  chrome.storage.sync.get(settings, async (s) => {
    settings = s;
    if (!settings.enabled) return;
    setRegion(settings.region);
    await initTranslator();
    const stored = await chrome.storage.local.get(CACHE_KEY);
    if (stored[CACHE_KEY]) { cache = stored[CACHE_KEY]; applyCache(); }
    start();
    setupComboSearch();
    offerTranslator();
    if (await loadSiteDictionary()) rescan();
  });
})();
