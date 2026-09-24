/* Le pagine di testo del sito, tutte con la stessa testata (tag Google con
   consenso, caratteri, stili) e lo stesso piede di navigazione.
   Il contenuto sta in content.mjs: qui c'è solo l'impaginazione.

   node tools/pages/build.mjs */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES as TEXT_PAGES, NAV, UPDATED } from './content.mjs';
import { MODE_PAGES, MODE_NAV } from './modes.mjs';

const PAGES = [...TEXT_PAGES, ...MODE_PAGES];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = 'https://instascope.app';

const head = (p) => `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title} — NOVANTA</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="${SITE}/${p.slug}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<meta property="og:site_name" content="NOVANTA">
<meta property="og:title" content="${p.title} — NOVANTA">
<meta property="og:description" content="${p.description}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE}/${p.slug}">
<meta property="og:image" content="${SITE}/assets/og.jpg">
<!-- Google AdSense: verifica del sito e annunci -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9665914988223658"
     crossorigin="anonymous"></script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HFCC29N242"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  // In Europa nessun cookie prima del sì: si parte negati e si sale col banner.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  // le partite di collaudo non devono sporcare i numeri veri
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    gtag('config', 'G-HFCC29N242');
  }
</script>
<script src="/analytics.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<style>
.doc{max-width:44rem;padding-block:var(--s-7) var(--s-8)}
.doc h2{margin-top:var(--s-6);font-size:var(--t-lg)}
.doc h3{margin-top:var(--s-5);font-size:1.05rem}
.doc a{color:var(--lime)}
.doc a.btn{color:var(--btn-fg,var(--ink-950));text-decoration:none}
.doc h2 a{color:inherit;text-decoration:underline;text-decoration-color:var(--lime);text-underline-offset:4px}
.doc p{margin-top:var(--s-3);line-height:1.6}
.doc ul,.doc ol{margin-top:var(--s-3);padding-left:1.2rem;line-height:1.6}
.doc li{margin-top:var(--s-2)}
.doc details{margin-top:var(--s-3);padding:var(--s-3) var(--s-4);border:1px solid var(--line);border-radius:var(--r-md)}
.doc summary{cursor:pointer;font-weight:600}
.doc table{width:100%;border-collapse:collapse;margin-top:var(--s-3);font-size:var(--t-sm)}
.doc th,.doc td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}
.doc__nav{margin-top:var(--s-7);display:flex;flex-wrap:wrap;gap:6px 14px;font-size:var(--t-sm)}
.doc__play{display:inline-block;margin-top:var(--s-5)}
.doc__play--top{margin-top:var(--s-4)}
.doc__nav--pages{margin-top:var(--s-4)}
</style>${p.jsonld ? `\n<script type="application/ld+json">${JSON.stringify(p.jsonld)}</script>` : ''}
</head>`;

const nav = (slug) => `  <nav class="doc__nav" aria-label="Le modalità">
    <strong>Le modalità:</strong>
${MODE_NAV.filter(([s]) => s !== slug).map(([s, label]) => `    <a href="/${s}">${label}</a>`).join('\n')}
  </nav>
  <nav class="doc__nav doc__nav--pages" aria-label="Pagine">
    <a href="/">← Gioca</a>
${NAV.filter(([s]) => s !== slug).map(([s, label]) => `    <a href="/${s}">${label}</a>`).join('\n')}
  </nav>`;

for (const p of PAGES) {
  const html = `${head(p)}
<body>
<div class="sky" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<div id="app"><main class="shell doc">
  <p class="label">NOVANTA</p>
  <h1 class="display t-xxl">${p.h1 || p.title}</h1>
  <p class="dim">${p.lead}</p>
  <a class="btn btn--go doc__play doc__play--top" href="${p.play ? p.play.href : '/'}">${p.play ? p.play.label : 'Gioca a NOVANTA'}</a>
${p.body.trim()}
  <a class="btn btn--go doc__play" href="${p.play ? p.play.href : '/'}">${p.play ? p.play.label : 'Gioca a NOVANTA'}</a>
${nav(p.slug)}
</main></div>
</body>
</html>
`;
  writeFileSync(join(ROOT, `${p.slug}.html`), html);
}

/* la mappa del sito: il gioco e tutte le pagine di testo */
const urls = [['', 'daily', '1.0'], ...PAGES.map((p) => [p.slug, p.changefreq || 'monthly', p.priority || '0.6'])];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([s, f, pr]) => `  <url><loc>${SITE}/${s}</loc><lastmod>${UPDATED.iso}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
console.log(`pagine: ${PAGES.map((p) => p.slug).join(', ')}`);
