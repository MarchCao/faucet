// HAICE Faucet static site builder: templates + i18n JSON -> dist/
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname);
const DIST = path.join(__dirname, '..', 'dist');
const DOMAIN = 'https://faucet.haice.top';

const LANGS = [
  { code: 'ja', og: 'ja_JP', name: '日本語' },
  { code: 'zh', og: 'zh_CN', name: '中文' },
  { code: 'en', og: 'en_US', name: 'English' },
  { code: 'ko', og: 'ko_KR', name: '한국어' },
];

const PAGES = [
  { slug: '',         tpl: 'home',     key: 'home' },
  { slug: 'oem-odm',  tpl: 'oem-odm',  key: 'oem-odm' },
  { slug: 'products', tpl: 'products', key: 'products' },
  { slug: 'service',  tpl: 'service',  key: 'service' },
  { slug: 'about',    tpl: 'about',    key: 'about' },
  { slug: 'flow',     tpl: 'flow',     key: 'flow' },
  { slug: 'faq',      tpl: 'faq',      key: 'faq' },
  { slug: 'contact',  tpl: 'contact',  key: 'contact' },
  { slug: 'privacy',  tpl: 'privacy',  key: 'privacy' },
];

// These template vars hold pre-rendered HTML and must NOT be escaped.
const RAW = new Set(['content', 'hreflang_block', 'switcher']);

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function get(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function replaceVars(s, ctx) {
  return s.replace(/\{\{\s*([^{}#\/]+?)\s*\}\}/g, (m, p) => {
    const key = p.trim();
    const v = get(ctx, key);
    if (v == null) return '';
    return RAW.has(key) ? String(v) : esc(String(v));
  });
}
function renderSection(s, ctx) {
  const start = s.indexOf('{{#each ');
  if (start === -1) return replaceVars(s, ctx);
  const openEnd = s.indexOf('}}', start);
  const loopPath = s.slice(start + 8, openEnd).trim();
  let depth = 1, i = openEnd + 2, innerEnd = -1;
  while (depth > 0) {
    const nx = s.indexOf('{{#each ', i);
    const ne = s.indexOf('{{/each}}', i);
    if (ne === -1) throw new Error('Unmatched {{#each}} for ' + loopPath);
    if (nx !== -1 && nx < ne) { depth++; i = nx + 8; }
    else { depth--; if (depth === 0) innerEnd = ne; i = ne + 9; }
  }
  const inner = s.slice(openEnd + 2, innerEnd);
  const before = s.slice(0, start), after = s.slice(innerEnd + 9);
  const arr = get(ctx, loopPath);
  let rendered = '';
  if (Array.isArray(arr)) {
    for (const item of arr) {
      const sub = (item && typeof item === 'object')
        ? Object.assign({}, ctx, item, { this: item })
        : Object.assign({}, ctx, { this: item });
      rendered += renderSection(inner, sub);
    }
  }
  return renderSection(before + rendered + after, ctx);
}
const render = (tpl, ctx) => renderSection(tpl, ctx);

function pageUrl(lang, slug) {
  return `${DOMAIN}/${lang}/${slug ? slug + '/' : ''}`;
}
function hreflangBlock(slug) {
  const tags = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l.code}" href="${pageUrl(l.code, slug)}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl('ja', slug)}">`);
  return tags.join('\n');
}
function switcher(cur, slug) {
  const pathPart = slug ? slug + '/' : '';
  return LANGS.map(l => l.code === cur
    ? `<a href="/${l.code}/${pathPart}" class="current" aria-current="true">${l.name}</a>`
    : `<a href="/${l.code}/${pathPart}">${l.name}</a>`
  ).join('<span class="sep">|</span>');
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---- build ----
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const baseTpl = fs.readFileSync(path.join(SRC, 'templates', 'base.html'), 'utf8');
const dicts = {};
for (const l of LANGS) {
  dicts[l.code] = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', l.code + '.json'), 'utf8'));
}

let pageCount = 0;
const sitemapUrls = [];
for (const l of LANGS) {
  const t = dicts[l.code];
  for (const pg of PAGES) {
    const pageTpl = fs.readFileSync(path.join(SRC, 'templates', 'pages', pg.tpl + '.html'), 'utf8');
    const content = render(pageTpl, Object.assign({ t, lang: l.code }, t));
    const meta = t.meta[pg.key];
    const html = render(baseTpl, {
      t, lang: l.code,
      og_locale: l.og,
      title: meta.title,
      description: meta.description,
      canonical: pageUrl(l.code, pg.slug),
      hreflang_block: hreflangBlock(pg.slug),
      page_slug: pg.slug || 'home',
      switcher: switcher(l.code, pg.slug),
      content,
    });
    const outDir = pg.slug ? path.join(DIST, l.code, pg.slug) : path.join(DIST, l.code);
    writeFile(path.join(outDir, 'index.html'), html);
    pageCount++;
    sitemapUrls.push({ loc: pageUrl(l.code, pg.slug), slug: pg.slug });
  }
}

// Root language gateway (defaults to /ja/, manual choice always available)
fs.copyFileSync(path.join(SRC, 'templates', 'root.html'), path.join(DIST, 'index.html'));

// 404 page (4 languages)
fs.copyFileSync(path.join(SRC, 'templates', '404.html'), path.join(DIST, '404.html'));

// robots.txt, CNAME
writeFile(path.join(DIST, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: https://faucet.haice.top/sitemap.xml\n');
writeFile(path.join(DIST, 'CNAME'), 'faucet.haice.top\n');

// sitemap.xml with hreflang alternates
const urlEntries = sitemapUrls.map(u => {
  const alts = LANGS.map(l =>
    `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${pageUrl(l.code, u.slug)}"/>`).join('\n')
    + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('ja', u.slug)}"/>`;
  return `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>2026-09-29</lastmod>\n${alts}\n  </url>`;
}).join('\n');
writeFile(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlEntries}\n</urlset>\n`);

// assets
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));

console.log(`Built ${pageCount} pages -> ${DIST}`);
