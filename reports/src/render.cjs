// Two-pass render: HTML -> PDF (headless Chrome via puppeteer-core), locate section markers with pdf.js to
// fill TOC page numbers, render again. Usage: NODE_PATH=<dir with puppeteer-core & pdfjs-dist> node render.cjs [1|2]
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { PDFDocument } = require('pdf-lib');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(__dirname, '..');

async function markerPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), verbosity: 0 }).promise;
  const map = {};
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    const txt = tc.items.map((x) => x.str).join('').replace(/\s+/g, '');
    for (const m of txt.matchAll(/QQ([a-z0-9_]+)QQ/g)) if (!(m[1] in map)) map[m[1]] = i;
  }
  return { map, pages: doc.numPages };
}

async function pdf(browser, html, htmlFile, pdfFile, footer) {
  fs.writeFileSync(htmlFile, html);
  const page = await browser.newPage();
  await page.goto('file:///' + htmlFile.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => ['Noto Kufi Arabic', 'Tajawal', 'Amiri'].map((f) => [f, document.fonts.check(`16px "${f}"`, 'يومك')]));
  const imgs = await page.evaluate(() => [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src));
  await page.pdf({
    path: pdfFile, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-family:Tahoma,Arial;font-size:8px;color:#7a8586;padding:0 15mm;display:flex;justify-content:space-between;direction:rtl">
      <span>يومك · ${footer} · فريق Lemonada</span><span style="direction:ltr"><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
  });
  // Cover without footer: print page 1 alone with no header/footer and swap it in (removes the faint page number).
  const coverBuf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, pageRanges: '1' });
  await page.close();
  const full = await PDFDocument.load(fs.readFileSync(pdfFile));
  const cov = await PDFDocument.load(coverBuf);
  const [cp] = await full.copyPages(cov, [0]);
  full.removePage(0); full.insertPage(0, cp);
  fs.writeFileSync(pdfFile, await full.save());
  return { fonts, brokenImages: imgs };
}

(async () => {
  const which = process.argv[2] ? [process.argv[2]] : ['1', '2', '3'];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  for (const n of which) {
    const build = require(`./phase${n}.cjs`);
    const htmlFile = path.join(__dirname, `phase-${n}.html`);
    const pdfFile = path.join(OUT, `phase-${n}.pdf`);
    const footer = { '1': 'تقرير المرحلة 1 — الأساس', '2': 'تقرير المرحلة 2 — المشاهد', '3': 'تقرير المرحلة 3 — التكامل والجودة' }[n];
    let first = build({});
    await pdf(browser, first.html, htmlFile, pdfFile, footer);
    let { map } = await markerPages(pdfFile);
    const second = build(map);
    const info = await pdf(browser, second.html, htmlFile, pdfFile, footer);
    const check = await markerPages(pdfFile);
    const stable = first.toc.every((t) => check.map[t.id] === map[t.id]);
    const missing = first.toc.filter((t) => !(t.id in check.map)).map((t) => t.id);
    console.log(JSON.stringify({ phase: n, pdf: pdfFile, pages: check.pages, toc: check.map, stable, missing, ...info }));
  }
  await browser.close();
})();
