// Shared helpers + stylesheet for the «يومك» phase reports.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');           // E:\hackthon
const LOCS = ['home', 'work', 'school', 'street', 'public_events', 'private_events'];
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const code = (s) => `<code dir="ltr">${esc(s)}</code>`;

const VERDICT = {
  haram: ['حرام', '#b03a2e'], makruh: ['مكروه', '#d35400'], mubah: ['مباح', '#2e8b57'], halal: ['حلال', '#1e8449'],
  mustahab: ['مستحب', '#138d75'], wajib: ['واجب', '#1f618d'], disputed: ['مختلف فيه', '#9a7d0a'], depends: ['يختلف بحسب الحال', '#2874a6']
};
const CONF = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
const STATUS = { ai_verified: ['مدقق آلياً', 'ok'], ai_draft: ['مسودة — معلّق لعالم', 'warn'] };
const QUALITY = { best: ['الأفضل', '#1e8449'], acceptable: ['مقبول', '#9a7d0a'], wrong: ['خاطئ', '#b03a2e'] };
const LOC_AR = { home: 'البيت', work: 'العمل', school: 'الكلية', street: 'الشارع', public_events: 'المناسبات العامة', private_events: 'المناسبات الخاصة' };

const verdictPill = (v) => { const [t, c] = VERDICT[v] || [v, '#555']; return `<span class="pill" style="background:${c}">${t}</span>`; };
const qualityPill = (q) => { const [t, c] = QUALITY[q] || [q, '#555']; return `<span class="pill sm" style="background:${c}">${t}</span>`; };
const statusPill = (s) => { const [t, k] = STATUS[s] || [s, 'warn']; return `<span class="tag ${k}">${t}</span>`; };

// Section heading with an invisible ASCII marker used to locate its page in the PDF (two-pass TOC).
function makeToc() {
  const items = [];
  return {
    h2(id, title, np) { items.push({ id, title, level: 2 }); return `<h2 id="${id}"${np ? ' class="newpage"' : ''}>${title}<span class="mk">QQ${id}QQ</span></h2>`; },
    h3(id, title) { items.push({ id, title, level: 3 }); return `<h3 id="${id}">${title}<span class="mk">QQ${id}QQ</span></h3>`; },
    render(pages = {}) {
      return `<nav class="toc"><h2 class="toc-title">المحتويات</h2><ol>` + items.map((it) =>
        `<li class="l${it.level}"><a href="#${it.id}"><span class="t">${it.title.replace(/<[^>]+>/g, '')}</span><span class="dots"></span><span class="pg">${pages[it.id] ?? '00'}</span></a></li>`).join('') + `</ol></nav>`;
    },
    items
  };
}

const CSS = `
@import url('fonts/fonts.css');
:root{
  --ink:#1d2b2c; --muted:#5f6b6c; --teal:#0f5354; --teal-d:#0b2e2f; --teal-l:#e6f0ef;
  --gold:#c9a227; --gold-l:#f8f0d6; --sand:#faf7f0; --line:#e2dccd; --red:#b03a2e; --green:#1e8449;
}
@page{ size:A4; margin:17mm 15mm 19mm 15mm; }
@page :first{ margin:0; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; background:#fff; }
body{ font-family:'Tajawal',sans-serif; font-size:10.6pt; line-height:1.78; color:var(--ink); direction:rtl; text-align:right;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
h1,h2,h3,h4{ font-family:'Noto Kufi Arabic',sans-serif; color:var(--teal-d); line-height:1.5; margin:0; }
h2{ font-size:17pt; font-weight:800; margin:0 0 5mm; padding:0 0 2.5mm; border-bottom:2.5px solid var(--gold); break-after:avoid; }
h2.newpage{ break-before:page; }
h3{ font-size:12.5pt; font-weight:700; margin:6mm 0 2.5mm; color:var(--teal); break-after:avoid; }
h4{ font-size:10.8pt; font-weight:700; margin:4mm 0 1.5mm; color:var(--teal-d); break-after:avoid; }
p{ margin:0 0 2.6mm; text-align:justify; }
ul,ol{ margin:0 0 3mm; padding-right:6mm; }
li{ margin:0 0 1mm; }
code{ direction:ltr; font-family:Consolas,'Courier New',monospace; font-size:8.6pt; background:#eef3f2; color:#0b4a4b; padding:0 1.2mm; border-radius:1mm; unicode-bidi:isolate; white-space:nowrap; }
.mk{ font-size:1.5px; color:#fff; letter-spacing:0; }
a{ color:inherit; text-decoration:none; }
.ltr{ direction:ltr; unicode-bidi:isolate; display:inline-block; }
.muted{ color:var(--muted); }
.small{ font-size:9pt; }

/* ---------- cover ---------- */
.cover{ width:210mm; height:297mm; position:relative; overflow:hidden; color:#fff; break-after:page;
  background:
    radial-gradient(circle at 85% 12%, rgba(201,162,39,.22) 0, rgba(201,162,39,0) 38%),
    radial-gradient(circle at 10% 95%, rgba(64,160,150,.25) 0, rgba(64,160,150,0) 45%),
    linear-gradient(160deg,#0b2e2f 0%,#0f4446 55%,#0b2e2f 100%); }
.cover .pattern{ position:absolute; inset:0; opacity:.13; }
.cover .inner{ position:absolute; inset:24mm 22mm; display:flex; flex-direction:column; }
.cover .org{ font-family:'Noto Kufi Arabic'; font-size:11pt; letter-spacing:.5px; color:#e9d9a0; display:flex; justify-content:space-between; align-items:center; }
.cover .org .lm{ font-family:'Tajawal'; font-weight:800; font-size:13pt; color:#fff; direction:ltr; }
.cover .kicker{ margin-top:52mm; font-family:'Noto Kufi Arabic'; font-size:12pt; color:#e9d9a0; }
.cover .title{ font-family:'Noto Kufi Arabic'; font-weight:800; font-size:76pt; line-height:1.2; margin:2mm 0 0; color:#fff; }
.cover .en{ font-family:'Tajawal'; font-size:15pt; color:#cfe3e1; direction:ltr; text-align:right; margin-top:-2mm; }
.cover .phase{ margin-top:12mm; display:inline-flex; align-items:center; gap:4mm; }
.cover .phase .num{ width:24mm; height:24mm; border-radius:50%; border:2px solid var(--gold); display:flex; align-items:center; justify-content:center;
  font-family:'Noto Kufi Arabic'; font-weight:800; font-size:26pt; color:var(--gold); }
.cover .phase .lbl{ font-family:'Noto Kufi Arabic'; font-weight:700; font-size:20pt; }
.cover .phase .lbl small{ display:block; font-family:'Tajawal'; font-weight:400; font-size:11.5pt; color:#cfe3e1; }
.cover .desc{ margin-top:9mm; max-width:140mm; font-size:11.5pt; color:#dfeceb; line-height:1.9; }
.cover .foot{ margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid rgba(255,255,255,.25); padding-top:5mm; font-size:10.5pt; color:#dfeceb; }
.cover .foot b{ display:block; font-family:'Noto Kufi Arabic'; color:#fff; font-size:11pt; }
.cover .warn{ margin-top:6mm; font-size:9pt; color:#e9d9a0; }

/* ---------- toc ---------- */
.toc{ break-after:page; }
.toc-title{ margin-bottom:6mm; }
.toc ol{ list-style:none; padding:0; margin:0; }
.toc li a{ display:flex; align-items:baseline; gap:2mm; padding:1.4mm 0; }
.toc li.l2 a{ font-family:'Noto Kufi Arabic'; font-weight:700; font-size:11pt; color:var(--teal-d); margin-top:1.6mm; }
.toc li.l3 a{ font-size:10pt; padding-right:7mm; color:#3b4a4b; }
.toc .dots{ flex:1; border-bottom:1.5px dotted #b9b19c; transform:translateY(-1.2mm); }
.toc .pg{ font-family:'Tajawal'; font-weight:700; min-width:7mm; text-align:left; }

/* ---------- blocks ---------- */
.lead{ font-size:11.4pt; color:#2b3a3b; }
.callout{ border:1px solid var(--line); border-right:5px solid var(--gold); background:var(--gold-l); padding:3.5mm 4.5mm; border-radius:2mm; margin:3mm 0 4mm; break-inside:avoid; }
.callout.teal{ background:var(--teal-l); border-right-color:var(--teal); }
.callout.red{ background:#fbecea; border-right-color:var(--red); }
.callout h4{ margin-top:0; }
.callout p:last-child{ margin-bottom:0; }
.kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; margin:3mm 0 5mm; }
.kpis.k3{ grid-template-columns:repeat(3,1fr); }
.kpi{ background:var(--sand); border:1px solid var(--line); border-radius:2.5mm; padding:3mm 3mm 2.5mm; break-inside:avoid; }
.kpi .v{ font-family:'Noto Kufi Arabic'; font-weight:800; font-size:19pt; color:var(--teal); line-height:1.25; }
.kpi .v small{ font-size:10pt; color:var(--muted); font-weight:600; }
.kpi .l{ font-size:9pt; color:var(--muted); line-height:1.45; }
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:4mm; }

table{ width:100%; border-collapse:separate; border-spacing:0; margin:2mm 0 5mm; font-size:9.2pt; line-height:1.55; }
thead{ display:table-header-group; }
th{ background:var(--teal); color:#fff; font-family:'Noto Kufi Arabic'; font-weight:600; font-size:8.6pt; padding:2mm 2.2mm; text-align:right; vertical-align:bottom; }
th:first-child{ border-top-right-radius:2mm; } th:last-child{ border-top-left-radius:2mm; }
td{ padding:1.8mm 2.2mm; border-bottom:1px solid var(--line); vertical-align:top; }
tbody tr:nth-child(even) td{ background:#fbfaf6; }
tr{ break-inside:avoid; }
td.c, th.c{ text-align:center; }
td.num{ font-weight:700; font-family:'Tajawal'; text-align:center; }
table.compact{ font-size:8.6pt; }
table.compact td{ padding:1.4mm 2mm; }

.pill{ display:inline-block; color:#fff; font-weight:700; font-size:8.3pt; padding:.2mm 2.4mm; border-radius:10mm; white-space:nowrap; line-height:1.7; }
.pill.sm{ font-size:7.8pt; padding:0 2mm; }
.tag{ display:inline-block; font-size:8pt; font-weight:700; padding:0 2mm; border-radius:1.2mm; white-space:nowrap; line-height:1.8; }
.tag.ok{ background:#e3f1e8; color:#1e6b3c; border:1px solid #b9dcc5; }
.tag.warn{ background:#fdf1d8; color:#8a6100; border:1px solid #ecd290; }

/* ---------- ruling card ---------- */
.rcard{ border:1px solid var(--line); border-radius:3mm; overflow:hidden; margin:3mm 0 4mm; }
.rcard .hd{ background:linear-gradient(135deg,#0b2e2f,#135c5d); color:#fff; padding:4mm 5mm; }
.rcard .hd .id{ font-size:8.5pt; color:#bfe0dc; direction:ltr; text-align:right; }
.rcard .hd h3{ color:#fff; margin:1mm 0 2mm; font-size:13.5pt; }
.rcard .bd{ padding:4mm 5mm 3mm; }
.ayah{ font-family:'Amiri',serif; font-size:15.5pt; line-height:2.15; color:#13393a; background:#f7f4ea; border:1px solid #e6dcc0; border-right:4px solid var(--gold);
  border-radius:2mm; padding:3mm 4.5mm 2mm; margin:2mm 0 1mm; text-align:justify; break-inside:avoid; }
.ayah .ref{ display:block; font-family:'Tajawal'; font-size:8.6pt; color:var(--muted); line-height:1.6; margin-top:1mm; }
.ayah .ref .en{ display:block; direction:ltr; text-align:left; font-style:italic; }
.hadith{ font-family:'Amiri',serif; font-size:14pt; line-height:2; background:#f2f6f5; border:1px solid #d6e3e1; border-right:4px solid var(--teal); border-radius:2mm; padding:3mm 4.5mm 2mm; break-inside:avoid; }
.hadith .ref{ display:block; font-family:'Tajawal'; font-size:8.6pt; color:var(--muted); line-height:1.6; }
.mz{ display:grid; grid-template-columns:1fr 1fr; gap:3mm; margin:2mm 0 3mm; }
.mz > div{ border:1px solid var(--line); border-radius:2mm; padding:2.5mm 3.5mm; background:#fff; break-inside:avoid; }
.mz h4{ margin:0 0 1mm; color:var(--teal); }
.mz .src{ font-size:8pt; color:var(--muted); line-height:1.5; border-top:1px dashed var(--line); padding-top:1.2mm; margin-top:1.5mm; word-break:break-word; }
.mz p{ font-size:9.6pt; line-height:1.7; text-align:justify; }
.ctab td:first-child{ width:30%; }

/* ---------- figures ---------- */
figure{ margin:2mm 0 4mm; break-inside:avoid; }
figure img{ width:100%; display:block; border-radius:2mm; border:1px solid #cfd6d5; }
figcaption{ font-size:8.6pt; color:var(--muted); margin-top:1.2mm; text-align:center; }
.figs2{ display:grid; grid-template-columns:1fr 1fr; gap:3mm; }
.figs2 figure{ margin:0; }

.scene-head{ display:flex; justify-content:space-between; align-items:center; background:var(--teal-l); border-radius:2.5mm; padding:2.5mm 4mm; margin:0 0 3mm; font-size:9.6pt; }
.scene-head b{ font-family:'Noto Kufi Arabic'; color:var(--teal-d); }
.sit{ border:1px solid var(--line); border-radius:2.5mm; padding:2.5mm 4mm; margin:0 0 3mm; break-inside:avoid; }
.sit .top{ display:flex; justify-content:space-between; gap:3mm; align-items:baseline; flex-wrap:wrap; }
.sit .top b{ font-family:'Noto Kufi Arabic'; color:var(--teal); font-size:10pt; }
.sit p{ font-size:9.5pt; margin:1mm 0 1.5mm; }
.sit ul{ list-style:none; padding:0; margin:0; }
.sit li{ font-size:9.2pt; margin:.8mm 0; display:flex; gap:2mm; align-items:baseline; }
.sit li .pill{ flex:none; }
.figs-m{ display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; }
.figs-m figure{ margin:0; } .figs-m img{ max-height:118mm; object-fit:cover; object-position:top; }
.ok{ color:var(--green); font-weight:800; } .wait{ color:#a06a00; font-weight:800; }
.footnote{ font-size:8.4pt; color:var(--muted); }
.end{ margin-top:8mm; text-align:center; color:var(--muted); font-size:9pt; }
`;

// Decorative 8-point-star lattice for the cover (inline SVG, no external assets).
const PATTERN = `<svg class="pattern" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse">
<g fill="none" stroke="#e9d9a0" stroke-width="0.8"><rect x="7" y="7" width="14" height="14"/><rect x="7" y="7" width="14" height="14" transform="rotate(45 14 14)"/><circle cx="14" cy="14" r="3"/></g></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;

function cover({ phase, title, subtitle, desc }) {
  return `<section class="cover">${PATTERN}<div class="inner">
  <div class="org"><span>تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي</span><span class="lm">Lemonada</span></div>
  <div class="kicker">تقرير المرحلة — ${title}</div>
  <div class="title">يومك</div>
  <div class="en">Yawmuk — a 3D web game on the fiqh of everyday dealings</div>
  <div class="phase"><div class="num">${phase}</div><div class="lbl">المرحلة ${['', 'الأولى', 'الثانية', 'الثالثة'][phase]}: ${title}<small>${subtitle}</small></div></div>
  <div class="desc">${desc}</div>
  <div class="warn">الأحكام الشرعية في هذا المشروع مسودة أعدّها ذكاء اصطناعي ودُقّقت آلياً، ولا تُعتمد قبل مراجعة عالم شرعي بشري.</div>
  <div class="foot"><div><b>فريق Lemonada</b>إعداد: وكيل التوثيق</div><div style="text-align:left"><b>2026-10-05</b>الإصدار 1.0</div></div>
  </div></section>`;
}

function page(title, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

module.exports = { ROOT, LOCS, readJSON, esc, code, VERDICT, CONF, STATUS, QUALITY, LOC_AR, verdictPill, qualityPill, statusPill, makeToc, cover, page };
