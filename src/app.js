/* =========================================================================
   All For: 1 Leadership Framework — application
   No dependencies, no network, no back end. Everything runs in the page.
   Brand tokens, drivers, icons and the wordmark live in brand.js.
   ========================================================================= */

const FRAMEWORK = /*__FRAMEWORK__*/ null;

/* ---------- Framework meta ------------------------------------------------
   Behaviour copy comes from the workbook. The level identities, audiences and
   focus lines are the programme's own language for the three stages — edit
   them here rather than in the spreadsheet.
   ------------------------------------------------------------------------- */

const LEVELS = [
  {
    id: 'foundations',
    name: 'Foundations',
    identity: 'Leaders in Future',
    color: C.blueGreen,
    who: 'Emerging leaders, ASMs, MTs and high performers preparing for leadership.',
    focus: 'Self, task and immediate influence.',
  },
  {
    id: 'momentum',
    name: 'Momentum',
    identity: 'Leaders in Action',
    color: C.yellow,
    who: 'Store Managers and functional leaders responsible for delivering through a team.',
    focus: 'Team, consistency and performance through others.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    identity: 'Leaders at Scale',
    color: C.purple,
    who: 'Regional and senior leaders with broader business responsibility.',
    focus: 'Systems, strategy and long term impact.',
  },
];

/* `color` is the brand value, used as a solid fill with `ink` on top. `wash`
   is the same hue at card-background strength. */
const RATINGS = [
  { id: 'needs-work', name: 'Needs Work', score: 1, color: C.red, ink: '#ffffff', wash: 'rgba(152,26,48,0.07)' },
  { id: 'great', name: 'Great', score: 2, color: C.lime, ink: C.navy, wash: 'rgba(227,235,123,0.24)' },
  { id: 'smashing-it', name: 'Smashing It', score: 3, color: C.yellow, ink: C.navy, wash: 'rgba(236,178,31,0.15)' },
];

const STANDARD_NOTE =
  'Great is the standard. Smashing It exceeds at the same scope — it is not automatically the next leadership level.';

/* Fold the brand layer onto the workbook data, and order competencies the way
   the drivers do rather than the way the spreadsheet happens to. */
const BY_ID = {};
FRAMEWORK.competencies.forEach((c) => {
  BY_ID[c.id] = c;
  Object.assign(c, COMP_META[c.id]);
  c.behaviours.forEach((b, j) => {
    b.comp = c;
    b.index = j;
    b.key = c.id + '::' + b.id;
  });
});

DRIVERS.forEach((d) => {
  d.competencies = d.order.map((id) => {
    const c = BY_ID[id];
    if (!c) throw new Error('Driver ' + d.id + ' references unknown competency ' + id);
    c.driver = d;
    return c;
  });
});

const COMPS = DRIVERS.flatMap((d) => d.competencies);
COMPS.forEach((c, i) => {
  c.index = i;
});
const ALL_BEHAVIOURS = COMPS.flatMap((c) => c.behaviours);

const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
const ratingById = (id) => RATINGS.find((r) => r.id === id) || null;
const compById = (id) => BY_ID[id] || null;
const behById = (compId, behId) => {
  const c = compById(compId);
  return c ? c.behaviours.find((b) => b.id === behId) || null : null;
};

/* ---------- State --------------------------------------------------------- */

const STORE_KEY = 'af1-leadership-framework-v1';

const blankAssessment = () => ({
  stage: 'setup',
  kind: 'self',
  subject: '',
  role: '',
  assessor: '',
  date: new Date().toISOString().slice(0, 10),
  level: null,
  step: 0,
  ratings: {},
  notes: {},
});

/* Three screens, not four: the framework, one competency, one behaviour.
   Everything else — jumping between domains, competencies and levels — is the
   menu's job, so the pages themselves stay about the content. */
let S = {
  mode: 'explore',
  zoom: 0,
  lens: 'foundations',
  comp: null,
  beh: null,
  menu: false,
  query: '',
  a: blankAssessment(),
};

let lastZoom = 0;
let pendingConfirm = null;
/* The tour is deliberately not part of S: it is a layer over whatever screen
   you are on, and it must never end up in the saved draft. */
let tourStep = null;
let seenTour = false;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ a: S.a, lens: S.lens, seenTour: seenTour }));
  } catch (e) {
    /* Private browsing or a full quota — the app still works, it just forgets. */
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.a && typeof saved.a === 'object') S.a = Object.assign(blankAssessment(), saved.a);
    if (saved && LEVELS.some((l) => l.id === saved.lens)) S.lens = saved.lens;
    if (saved && saved.seenTour === true) seenTour = true;
  } catch (e) {
    /* Corrupt or unreadable draft — start clean rather than crash. */
  }
}

/* ---------- Utilities ----------------------------------------------------- */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pad2 = (n) => String(n).padStart(2, '0');

function formatDate(iso) {
  if (!iso) return '—';
  const parts = String(iso).split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function highlight(text, query) {
  const safe = esc(text);
  if (!query) return safe;
  const needle = esc(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(needle, 'gi'), (m) => '<mark>' + m + '</mark>');
}

/* Competency colours are used as card fills, so a matching very-light wash is
   needed for selected states. */
function washOf(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

let toastTimer = null;
function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.setAttribute('data-show', 'true');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.setAttribute('data-show', 'false'), 2600);
}

/* ---------- Navigation ---------------------------------------------------- */

function go(patch, opts) {
  Object.assign(S, patch);
  render(opts);
}

function setLens(id) {
  S.lens = id;
  save();
}

function goZoom(zoom) {
  const patch = { zoom, mode: 'explore', menu: false };
  if (zoom < 2) patch.beh = null;
  if (zoom < 1) patch.comp = null;
  go(patch);
}

/* ---------- Scoring ------------------------------------------------------- */

const ratedCount = () => ALL_BEHAVIOURS.filter((b) => S.a.ratings[b.key]).length;

function averageOf(behaviours) {
  const scores = behaviours
    .map((b) => ratingById(S.a.ratings[b.key]))
    .filter(Boolean)
    .map((r) => r.score);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

const compScore = (comp) => averageOf(comp.behaviours);
const driverScore = (driver) => averageOf(driver.competencies.flatMap((c) => c.behaviours));
const overallScore = () => averageOf(ALL_BEHAVIOURS);

function bandFor(score) {
  if (score == null) return { label: 'Not rated', color: C.mist };
  if (score < 1.67) return { label: 'Below the standard', color: C.red };
  if (score < 2.34) return { label: 'At the standard', color: C.lime };
  return { label: 'Above the standard', color: C.yellow };
}

function ratingTally() {
  const counts = { 'needs-work': 0, great: 0, 'smashing-it': 0 };
  ALL_BEHAVIOURS.forEach((b) => {
    const id = S.a.ratings[b.key];
    if (id && counts[id] !== undefined) counts[id] += 1;
  });
  return counts;
}

/* ---------- Shared fragments ---------------------------------------------- */

const spectrumBar = () =>
  '<div class="spectrum" aria-hidden="true">' + SPECTRUM.map((c) => '<span style="background:' + c + '"></span>').join('') + '</div>';

function topbar() {
  const tab = (id, label) =>
    '<button class="mode" data-act="mode" data-mode="' + id + '" aria-current="' + (S.mode === id) + '">' + label + '</button>';
  return (
    '<header class="topbar"><div class="topbar-inner">' +
    '<button class="menu-btn" data-act="toggle-menu" aria-expanded="' + (S.menu ? 'true' : 'false') + '">' +
    '<span class="mb-bars" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="mb-word">Menu</span></button>' +
    '<button class="brandline" data-act="home">' + logoMark() +
    '<span class="divider" aria-hidden="true"></span>' +
    '<span class="app-name">Leadership<br>Framework</span></button>' +
    '<nav class="modes">' + tab('explore', 'Explore') + tab('assess', 'Assessment') + '</nav>' +
    '</div></header>'
  );
}

/* ---------- The menu -------------------------------------------------------
   Every one of the thirty behaviours is reachable from here in two clicks, so
   nobody has to retrace their steps through the diagram to change subject.
   ------------------------------------------------------------------------- */

function drawer() {
  const compRow = (c) =>
    '<button class="dw-comp" style="' + compVars(c) + '" data-act="open-comp" data-comp="' + c.id + '"' +
    (S.comp === c.id ? ' aria-current="true"' : '') + '>' +
    '<span class="dw-badge">' + icon(c.icon, 16) + '</span>' +
    '<span class="dw-comp-name">' + esc(c.name) + '</span></button>';

  const group = (d, i) =>
    '<div class="dw-group" style="' + driverVars(d) + '">' +
    '<button class="dw-domain" data-act="open-driver" data-driver="' + d.id + '">' +
    '<span class="dw-dot" aria-hidden="true"></span>' +
    '<span class="dw-domain-name">' + esc(d.name) + '</span>' +
    '<span class="dw-n">' + pad2(i + 1) + '</span></button>' +
    '<div class="dw-comps">' + d.competencies.map(compRow).join('') + '</div></div>';

  const lensRow = LEVELS.map(
    (l) =>
      '<button class="dw-lens" data-act="set-lens" data-level="' + l.id + '" ' +
      'aria-pressed="' + (l.id === S.lens) + '" style="--lens-dot:' + l.color + '">' +
      '<span class="dw-lens-name">' + esc(l.name) + '</span>' +
      '<span class="dw-lens-sub">' + esc(l.identity) + '</span></button>'
  ).join('');

  return (
    '<div class="dw-backdrop" data-act="close-menu"></div>' +
    '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Framework menu">' +
    '<div class="dw-top"><span class="dw-title">Go anywhere</span>' +
    '<button class="dw-close" data-act="close-menu" aria-label="Close menu">' +
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
    '<div class="dw-scroll">' +
    '<button class="dw-link" data-act="zoom" data-zoom="0"' + (S.zoom === 0 ? ' aria-current="true"' : '') +
    '>The whole framework</button>' +
    DRIVERS.map(group).join('') +
    '<div class="dw-sec"><span class="dw-label">Viewing level</span>' +
    '<p class="dw-note">A lens on the same ten competencies — it changes what good looks like, not what is measured.</p>' +
    '<div class="dw-lenses">' + lensRow + '</div></div>' +
    '<div class="dw-sec"><span class="dw-label">Assessment</span>' +
    '<button class="dw-link" data-act="mode" data-mode="assess">Rate yourself or a team member</button></div>' +
    '<div class="dw-sec"><span class="dw-label">New here?</span>' +
    '<button class="dw-link" data-act="tour-start">Take the guided tour</button></div>' +
    '</div></aside>'
  );
}

function zoomRail() {
  const crumbs = [{ label: 'Framework', zoom: 0 }];
  if (S.comp) crumbs.push({ label: compById(S.comp).name, zoom: 1 });
  if (S.beh) crumbs.push({ label: behById(S.comp, S.beh).name, zoom: 2 });

  const crumbHtml = crumbs
    .map((c, i) => {
      const last = i === crumbs.length - 1;
      const btn =
        '<button class="crumb" data-act="zoom" data-zoom="' + c.zoom + '"' +
        (last ? ' disabled aria-current="page"' : '') + '>' + esc(c.label) + '</button>';
      return i === 0 ? btn : '<span class="crumb-sep" aria-hidden="true">&rsaquo;</span>' + btn;
    })
    .join('');

  const lensBtns = LEVELS.map(
    (l) =>
      '<button class="lens-btn" data-act="set-lens" data-level="' + l.id + '" ' +
      'style="--lens-dot:' + l.color + '" aria-pressed="' + (l.id === S.lens) + '" ' +
      'title="' + esc(l.identity) + '">' + esc(l.name) + '</button>'
  ).join('');

  return (
    '<div class="rail"><div class="rail-inner">' +
    '<nav class="crumbs" aria-label="Where you are">' + crumbHtml + '</nav>' +
    '<div class="rail-right">' +
    '<div class="lens"><span class="rail-label">Viewing level</span>' +
    '<div class="lens-set" role="group" aria-label="Leadership level">' + lensBtns + '</div></div>' +
    '</div></div></div>'
  );
}

const footer = (hint) =>
  '<footer class="footer"><div class="footer-inner">' + logoMark({ ink: 'rgba(255,255,255,0.75)' }) +
  '<span class="hintline">' + esc(hint || '') + '</span></div></footer>';

const compVars = (c) =>
  '--fill:' + c.fill + ';--node-ink:' + c.ink + ';--chip-ink:' + c.ink + ';--halo:' + washOf(c.fill, 0.28) +
  ';--accent-ink:' + (c.fill === C.lime || c.fill === C.blueGreen ? C.navy : c.fill);

const driverVars = (d) =>
  '--core:' + d.core + ';--core-ink:' + d.coreInk + ';--core-sub:' + d.coreSub +
  ';--core-rule:' + (d.id === 'build-culture' ? 'rgba(255,255,255,0.2)' : 'rgba(21,7,33,0.2)') +
  ';--tint:' + d.tint;

/* A one-line "what do I do here" for every screen. Plain language, no jargon,
   and always the same shape so it reads as furniture rather than a warning. */
const howto = (html, opts) => {
  const o = opts || {};
  return (
    '<div class="howto' + (o.cls ? ' ' + o.cls : '') + '">' +
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11.2v4.6M12 7.7v.3"/></svg>' +
    '<span>' + html + '</span>' + (o.action || '') + '</div>'
  );
};

function searchBar(placeholder) {
  return (
    '<div class="searchbar">' +
    '<input type="search" id="q" placeholder="' + esc(placeholder) + '" value="' + esc(S.query) + '" ' +
    'autocomplete="off" spellcheck="false" aria-label="Search behaviours">' +
    '<button class="clear" data-act="clear-search" aria-label="Clear search"' + (S.query ? '' : ' hidden') + '>&times;</button>' +
    '</div>'
  );
}

function searchResults() {
  const q = S.query.trim().toLowerCase();
  if (!q) return '';
  const lens = S.lens;

  const hits = ALL_BEHAVIOURS.filter((b) => {
    const hay = [b.name, b.definition, b.comp.name, b.comp.driver.name, b.levels[lens].expectation]
      .concat(Object.values(b.levels[lens].ratings))
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  if (!hits.length) {
    return '<div class="empty">Nothing matches &ldquo;' + esc(S.query) + '&rdquo;. Try a shorter word.</div>';
  }

  return (
    '<p class="micro" style="color:var(--ink-soft);margin-bottom:13px">' +
    hits.length + ' of 30 behaviours &middot; showing ' + esc(levelById(lens).name) + '</p><div class="results">' +
    hits
      .map(
        (b) =>
          '<button class="result" style="' + compVars(b.comp) + '" data-act="open-beh" ' +
          'data-comp="' + b.comp.id + '" data-beh="' + b.id + '">' +
          '<span class="r-badge">' + icon(b.comp.icon, 20) + '</span>' +
          '<span style="flex:1;min-width:0">' +
          '<span class="r-comp">' + highlight(b.comp.name, S.query) + '</span>' +
          '<h4>' + highlight(b.name, S.query) + '</h4>' +
          '<p>' + highlight(b.levels[lens].expectation, S.query) + '</p>' +
          '</span></button>'
      )
      .join('') +
    '</div>'
  );
}

/* ---------- The ring -------------------------------------------------------
   One renderer for both levels of the framework: a domain with its five
   competencies, and a competency with its three behaviours. Satellites sit on
   the core's circumference and animate outward, each linked by a dotted lead
   to a chip that points back down the spoke at it.
   ------------------------------------------------------------------------- */

function ring(cfg) {
  const geo = cfg.geo;
  const placed = cfg.items.map((it) => {
    const slot = geo.slots[it.slot];
    return {
      it,
      slot,
      disc: polar(geo, slot.angle, geo.r.icon),
      // The lead starts at the disc's outer edge, not its centre, so the whole
      // dotted run is visible instead of half-hidden under the icon.
      from: polar(geo, slot.angle, geo.r.icon + geo.r.disc),
      to: polar(geo, slot.angle, geo.r.chip),
    };
  });

  const leads = placed
    .map(
      (p, i) =>
        '<line x1="' + p.from.x + '%" y1="' + p.from.y + '%" x2="' + p.to.x + '%" y2="' + p.to.y + '%" ' +
        'data-key="' + esc(p.it.key) + '" style="animation-delay:' + (240 + i * 70) + 'ms"/>'
    )
    .join('');

  const nodes = placed
    .map(
      (p, i) =>
        '<button class="orbit-node" style="' + p.it.vars +
        ';left:' + p.disc.x + '%;top:' + p.disc.y + '%;animation-delay:' + (110 + i * 70) + 'ms" ' +
        'data-key="' + esc(p.it.key) + '" ' + p.it.act + ' aria-label="' + esc(p.it.name) + '">' +
        (p.it.icon ? icon(p.it.icon, 28) : '<span class="node-num">' + esc(p.it.num || '') + '</span>') +
        '</button>'
    )
    .join('');

  const chips = placed
    .map(
      (p, i) =>
        '<button class="orbit-chip" data-side="' + p.slot.chip + '" style="' + p.it.vars +
        ';left:' + p.to.x + '%;top:' + p.to.y + '%;animation-delay:' + (290 + i * 70) + 'ms" ' +
        'data-key="' + esc(p.it.key) + '" ' + p.it.act + '>' +
        '<span class="chip-name">' + esc(p.it.name) + '</span></button>'
    )
    .join('');

  return (
    '<div class="orbit-wrap ' + (cfg.cls || '') + '" style="' + cfg.vars + '">' +
    '<div class="orbit" data-focus="" style="aspect-ratio:' + geo.box.w + ' / ' + geo.box.h + '">' +
    '<svg class="orbit-leads" preserveAspectRatio="none" aria-hidden="true">' + leads + '</svg>' +
    '<div class="orbit-core" style="top:' + geo.core.y + '%;width:' + geo.core.size + '%">' +
    cfg.core +
    '</div>' + nodes + chips +
    '</div></div>'
  );
}

function domainRing(driver) {
  return ring({
    geo: RINGS.domain,
    cls: 'page-ring',
    vars: driverVars(driver),
    core:
      '<span class="core-title">' + driver.lines.map((t) => esc(t)).join('<br>') + '</span>' +
      '<span class="core-kicker">' + esc(driver.kicker) + '</span>',
    items: driver.competencies.map((c) => ({
      key: c.id,
      name: c.name,
      icon: c.icon,
      slot: c.slot,
      vars: compVars(c),
      act: 'data-act="open-comp" data-comp="' + c.id + '"',
    })),
  });
}

function competencyRing(c) {
  return ring({
    geo: RINGS.competency,
    cls: 'comp-ring',
    vars:
      '--core:' + c.fill + ';--core-ink:' + c.ink +
      ';--core-sub:' + (c.ink === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(21,7,33,0.7)'),
    core:
      '<span class="core-icon">' + icon(c.icon, 34) + '</span>' +
      '<span class="core-title">' + esc(c.name) + '</span>',
    items: c.behaviours.map((b, i) => ({
      key: b.key,
      name: b.name,
      num: pad2(i + 1),
      slot: i,
      // The competency colour identifies the core; its behaviours invert to
      // navy so three same-coloured discs do not dissolve into the circle
      // behind them.
      vars: '--fill:' + C.navy + ';--node-ink:#ffffff;--chip-ink:#ffffff;--halo:rgba(21,7,33,0.16)',
      act: 'data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '"',
    })),
  });
}

/* ---------- Competency card ------------------------------------------------
   The unit that carries a competency wherever it is listed. It is also the
   whole story on a narrow screen, where the ring is too wide to read.
   ------------------------------------------------------------------------- */

function compCard(c, opts) {
  const o = opts || {};
  return (
    '<button class="comp-card" style="' + compVars(c) + '" data-act="open-comp" data-comp="' + c.id + '">' +
    '<span class="cc-badge">' + icon(c.icon, o.compact ? 22 : 26) + '</span>' +
    '<span class="cc-text"><span class="cc-name">' + esc(c.name) + '</span>' +
    (o.compact
      ? ''
      : '<span class="cc-beh">' + c.behaviours.map((b) => esc(b.name)).join(' &middot; ') + '</span>') +
    '</span>' +
    '<span class="cc-cta" aria-hidden="true">&rarr;</span></button>'
  );
}

/* ---------- Screen 1: the framework ----------------------------------------
   The diagram *is* the interface. Both domains are drawn full width, one under
   the other, and clicking any competency in either ring opens it. Nothing
   stands between the reader and the framework — the menu carries the rest.
   ------------------------------------------------------------------------- */

function domainSection(driver, i) {
  return (
    '<section class="fw-domain" id="domain-' + driver.id + '" style="' + driverVars(driver) + '" ' +
    'aria-labelledby="dh-' + driver.id + '">' +
    '<div class="fwd-head">' +
    '<span class="fwd-num" aria-hidden="true">' + pad2(i + 1) + '</span>' +
    '<div class="fwd-text">' +
    '<span class="eyebrow">' + esc(driver.kicker) + '</span>' +
    '<h2 id="dh-' + driver.id + '">' + esc(driver.name) + '</h2>' +
    '<p>' + esc(driver.blurb) + '</p></div>' +
    '<span class="fwd-count">5 competencies<br>15 behaviours</span>' +
    '</div>' +
    domainRing(driver) +
    '<p class="ring-note">Click a competency to open its three behaviours.</p>' +
    '<div class="comp-list page-list">' + driver.competencies.map((c) => compCard(c)).join('') + '</div>' +
    '</section>'
  );
}

function viewFramework() {
  const lens = levelById(S.lens);

  const steps = [
    ['Two domains', 'how leaders build culture, and how they drive operations'],
    ['Ten competencies', 'five around each domain — click one to open it'],
    ['Thirty behaviours', 'three inside every competency, and the thing you rate'],
  ]
    .map(
      (s, i) =>
        '<li class="step"><span class="st-n">' + pad2(i + 1) + '</span>' +
        '<b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>'
    )
    .join('');

  const levelRows = LEVELS.map(
    (l) =>
      '<li class="grow-row"' + (l.id === S.lens ? ' data-current="true"' : '') + '>' +
      '<span class="gr-dot" style="background:' + l.color + '"></span>' +
      '<span class="gr-name">' + esc(l.name) + '</span>' +
      '<span class="gr-focus">' + esc(l.focus) + '</span>' +
      (l.id === S.lens ? '<span class="gr-now">Viewing</span>' : '') +
      '</li>'
  ).join('');

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    '<div class="hero">' +
    '<div class="hero-text">' +
    '<span class="eyebrow">Cashies</span>' +
    '<h1 class="headline">All For: 1 Leadership Framework</h1>' +
    '<p class="lede-strong">A shared standard for what good leadership looks like at Cashies.</p>' +
    '</div>' +
    '<ol class="steps">' + steps + '</ol>' +
    '</div>' +

    howto(
      '<b>New here?</b> Click a competency name on either ring below to open it, or use <b>Menu</b> at the ' +
        'top left to jump straight to any part of the framework.',
      { action: '<button class="btn ghost small howto-cta" data-act="tour-start">Take the 60-second tour</button>' }
    ) +

    '<div data-hideable>' + DRIVERS.map(domainSection).join('') + '</div>' +

    '<section data-hideable class="grow" aria-labelledby="s-grow">' +
    '<div class="sec-head"><h2 id="s-grow">How leadership grows</h2>' +
    '<p>The same ten competencies and thirty behaviours apply right across the framework. What changes is ' +
    'the scope of leadership expected — so the level is a lens you read through, not a place you go.</p></div>' +
    '<ul class="grow-list">' + levelRows + '</ul>' +
    '<p class="sec-foot">You are reading <b>' + esc(lens.name) + '</b> &mdash; ' + esc(lens.who) +
    ' Change it in the rail above, or in the menu.</p>' +
    '</section>' +

    '<section class="search-sec" aria-labelledby="s-search">' +
    '<div class="sec-head"><h2 id="s-search">Or search for something</h2>' +
    '<p>Across all thirty behaviours — names, definitions, expectations and rating descriptors.</p></div>' +
    searchBar('Search behaviours, definitions and expectations…') +
    '<div data-search-results>' + searchResults() + '</div>' +
    '</section>' +
    '</div>'
  );
}

/* ---------- Screen 2: one competency ---------------------------------------
   The same ring one level down: the competency at the centre, its three
   behaviours around it, then each behaviour written out at all three levels so
   the growth is visible without navigating anywhere.
   ------------------------------------------------------------------------- */

function viewCompetency() {
  const c = compById(S.comp);
  const lens = levelById(S.lens);
  const pos = c.driver.competencies.indexOf(c);
  const siblings = c.driver.competencies.filter((x) => x.id !== c.id);

  const blocks = c.behaviours
    .map(
      (b, i) =>
        '<div class="xb" id="beh-' + b.id + '">' +
        '<div class="xb-top"><span class="xb-num">' + pad2(i + 1) + '</span>' +
        '<div><h3>' + esc(b.name) + '</h3><p>' + esc(b.definition) + '</p></div></div>' +
        '<div class="xb-rungs">' +
        LEVELS.map(
          (l) =>
            '<button class="rung" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '" ' +
            'data-level="' + l.id + '" data-current="' + (l.id === lens.id) + '">' +
            '<span class="rung-name"><span class="rung-dot" style="background:' + l.color + '"></span>' +
            esc(l.name) + '</span>' +
            '<span class="rung-exp">' + esc(b.levels[l.id].expectation) + '</span></button>'
        ).join('') +
        '</div></div>'
    )
    .join('');

  return (
    '<div class="layer" data-motion="' + motionDir() + '" style="' + compVars(c) + ';' + driverVars(c.driver) + '">' +
    '<div class="comp-hero">' +
    '<span class="ch-badge">' + icon(c.icon, 30) + '</span>' +
    '<div class="ch-text">' +
    '<button class="eyebrow ch-domain" data-act="open-driver" data-driver="' + c.driver.id + '">' +
    esc(c.driver.name) + '</button>' +
    '<h1 class="headline">' + esc(c.name) + '</h1>' +
    '<p class="prose">Competency ' + (pos + 1) + ' of 5 in ' + esc(c.driver.name) +
    '. Three observable behaviours sit inside it.</p></div></div>' +

    competencyRing(c) +

    '<div class="level-banner"><span class="lb-dot" style="background:' + lens.color + '"></span>' +
    '<span><b>Reading at ' + esc(lens.name) + '.</b> Every behaviour below is written out at all three ' +
    'levels so you can see how the expectation grows — the level you are viewing is marked.</span></div>' +

    howto(
      '<b>Click any level row below</b> to open that behaviour in full, with the Needs Work, Great and ' +
        'Smashing It wording used in the assessment.'
    ) +

    '<div class="xbs">' + blocks + '</div>' +

    '<section class="more"><div class="sec-head"><h2>More in ' + esc(c.driver.name) + '</h2></div>' +
    '<div class="comp-list">' + siblings.map((x) => compCard(x, { compact: true })).join('') + '</div>' +
    '<p class="sec-foot"><button class="linkish" data-act="open-driver" data-driver="' + c.driver.id + '">' +
    'Back to the framework diagram &rarr;</button></p></section>' +
    '</div>'
  );
}

/* ---------- Screen 3: one behaviour --------------------------------------- */

function viewBehaviour() {
  const c = compById(S.comp);
  const b = behById(S.comp, S.beh);
  const l = levelById(S.lens);
  const cell = b.levels[l.id];

  const pos = ALL_BEHAVIOURS.indexOf(b);
  const prev = ALL_BEHAVIOURS[pos - 1];
  const next = ALL_BEHAVIOURS[pos + 1];

  const pagerBtn = (target, dir) =>
    '<button class="' + (dir === 'next' ? 'next' : 'prev') + '"' +
    (target ? ' data-act="open-beh" data-comp="' + target.comp.id + '" data-beh="' + target.id + '"' : ' disabled') +
    '><span class="pg-dir">' + (dir === 'next' ? 'Next behaviour' : 'Previous behaviour') + '</span>' +
    '<span class="pg-name">' + esc(target ? target.name : '—') + '</span></button>';

  return (
    '<div class="layer narrow" data-motion="' + motionDir() + '" style="' + compVars(c) + ';--accent:' + l.color + '">' +
    '<div class="beh-hero">' +
    '<div class="bh-trail"><span class="bh-badge">' + icon(c.icon, 19) + '</span>' +
    '<button class="bh-link" data-act="open-driver" data-driver="' + c.driver.id + '">' + esc(c.driver.name) + '</button>' +
    '<span class="crumb-sep">&rsaquo;</span>' +
    '<button class="bh-link" data-act="open-comp" data-comp="' + c.id + '">' + esc(c.name) + '</button></div>' +
    '<h1 class="headline">' + esc(b.name) + '</h1>' +
    '<p class="def">' + esc(b.definition) + '</p></div>' +
    '<div class="expectation"><span class="eyebrow">' + esc(l.name) + ' expectation</span>' +
    '<p>' + esc(cell.expectation) + '</p></div>' +
    '<div class="note" style="margin-bottom:20px"><span class="flag"></span><span>' + esc(STANDARD_NOTE) + '</span></div>' +
    howto(
      '<b>These three descriptions are exactly what the assessment rates against.</b> Change the level in ' +
        'the rail above to see the same behaviour at a wider scope, or use the arrows at the bottom to keep reading.'
    ) +
    '<div class="rating-grid">' +
    RATINGS.map(
      (r) =>
        '<div class="rating-card"><span class="tag" data-r="' + r.id + '">' + esc(r.name) + '</span>' +
        '<p>' + esc(cell.ratings[r.id]) + '</p></div>'
    ).join('') +
    '</div>' +
    '<div class="pager">' + pagerBtn(prev, 'prev') + pagerBtn(next, 'next') + '</div>' +
    '</div>'
  );
}

/* ---------- Assessment: setup --------------------------------------------- */

function viewAssessSetup() {
  const a = S.a;
  const hasDraft = ratedCount() > 0;

  const kindChoice = (id, title, blurb) =>
    '<button class="choice" style="--accent:' + C.navy + ';--accent-wash:rgba(21,7,33,0.05)" ' +
    'data-act="set-kind" data-kind="' + id + '" aria-pressed="' + (a.kind === id) + '">' +
    '<b>' + esc(title) + '</b><span>' + esc(blurb) + '</span></button>';

  const levelChoice = (l) =>
    '<button class="choice" style="--accent:' + l.color + ';--accent-wash:' + washOf(l.color, 0.18) + '" ' +
    'data-act="set-alevel" data-level="' + l.id + '" aria-pressed="' + (a.level === l.id) + '">' +
    '<b>' + esc(l.name) + '</b><span>' + esc(l.identity) + ' &middot; ' + esc(l.focus) + '</span></button>';

  return (
    '<div class="layer narrow" data-motion="flat">' +
    '<div class="hero" style="margin-bottom:30px">' +
    '<span class="eyebrow">Assessment</span>' +
    '<h1 class="headline" style="font-size:clamp(32px,5.2vw,50px)">Set it up</h1>' +
    '<p class="prose lede">Thirty behaviours across both drivers, rated against one level. It takes about fifteen minutes. ' +
    'Nothing is sent anywhere — the draft is saved in this browser only, and you download the finished assessment as a PDF.</p>' +
    '</div>' +
    howto(
      '<b>Fill in the details, then rate.</b> Ten screens, three behaviours on each. Your answers save ' +
        'automatically as you go, so you can stop and come back to it.'
    ) +
    (hasDraft
      ? '<div class="note" style="margin-bottom:26px"><span class="flag"></span><span>' +
        'You have a draft in progress — <b>' + ratedCount() + ' of 30</b> behaviours rated. ' +
        'Continue below, or clear it and start again.</span></div>'
      : '') +
    '<div class="field"><label>Who is this for?</label><div class="choice-row">' +
    kindChoice('self', 'Self assessment', 'You rate your own leadership behaviours.') +
    kindChoice('team', 'Team member', 'You rate someone who reports to you.') +
    '</div></div>' +
    '<div class="field"><label for="f-subject">' + (a.kind === 'self' ? 'Your name' : 'Team member’s name') + '</label>' +
    '<input type="text" id="f-subject" data-field="subject" value="' + esc(a.subject) + '" placeholder="Full name" autocomplete="off"></div>' +
    '<div class="field"><label for="f-role">' + (a.kind === 'self' ? 'Your role' : 'Their role') + '</label>' +
    '<input type="text" id="f-role" data-field="role" value="' + esc(a.role) + '" placeholder="e.g. Store Manager, Sunbury" autocomplete="off"></div>' +
    (a.kind === 'team'
      ? '<div class="field"><label for="f-assessor">Assessor</label>' +
        '<input type="text" id="f-assessor" data-field="assessor" value="' + esc(a.assessor) + '" placeholder="Your name" autocomplete="off"></div>'
      : '') +
    '<div class="field"><label for="f-date">Date</label>' +
    '<input type="date" id="f-date" data-field="date" value="' + esc(a.date) + '"></div>' +
    '<div class="field"><label>Which level are they being assessed against?</label><div class="choice-row">' +
    LEVELS.map(levelChoice).join('') +
    '<p class="hint" style="grid-column:1/-1">Rate against the scope of the level they lead at today, not the one they are aiming for.</p>' +
    '</div></div>' +
    '<div class="step-nav">' +
    '<button class="btn" data-act="start-rating"' + (a.level && a.subject.trim() ? '' : ' disabled') + '>' +
    (hasDraft ? 'Continue rating' : 'Start rating') + '</button>' +
    (hasDraft ? '<button class="btn ghost small" data-act="reset">Clear draft</button>' : '') +
    '</div></div>'
  );
}

/* ---------- Assessment: rating steps -------------------------------------- */

function viewAssessStep() {
  const a = S.a;
  const l = levelById(a.level);
  const c = COMPS[Math.min(a.step, COMPS.length - 1)];
  const done = ratedCount();

  const blocks = c.behaviours
    .map((b) => {
      const chosen = a.ratings[b.key];
      return (
        '<div class="q-block" style="--lvl:' + l.color + '">' +
        '<h3>' + esc(b.name) + '</h3>' +
        '<p class="q-def">' + esc(b.definition) + '</p>' +
        '<div class="q-expect"><span>' + esc(l.name) + ' expectation</span><p>' + esc(b.levels[l.id].expectation) + '</p></div>' +
        '<div class="opt-row" role="group" aria-label="Rating for ' + esc(b.name) + '">' +
        RATINGS.map(
          (r) =>
            '<button class="opt" style="--r-color:' + r.color + ';--r-ink:' + r.ink +
            ';--r-ink-idle:' + (r.id === 'needs-work' ? r.color : C.navy) + ';--r-wash:' + r.wash + '" ' +
            'data-act="rate" data-key="' + esc(b.key) + '" data-rating="' + r.id + '" ' +
            'aria-pressed="' + (chosen === r.id) + '">' +
            '<span class="opt-tag">' + esc(r.name) + '</span>' +
            '<p>' + esc(b.levels[l.id].ratings[r.id]) + '</p></button>'
        ).join('') +
        '</div></div>'
      );
    })
    .join('');

  // Dots are grouped by driver so the two halves of the framework stay visible
  // while you work through them.
  let dots = '';
  COMPS.forEach((comp, i) => {
    if (i > 0 && comp.driver !== COMPS[i - 1].driver) dots += '<span class="dot-gap"></span>';
    const filled = comp.behaviours.every((b) => a.ratings[b.key]);
    dots +=
      '<button class="step-dot" data-act="goto-step" data-step="' + i + '" data-done="' + filled + '" ' +
      'style="--dot-color:' + comp.fill + '" aria-current="' + (i === a.step) + '" ' +
      'aria-label="' + esc(comp.driver.name + ' — ' + comp.name) + '" title="' + esc(comp.name) + '"></button>';
  });

  const complete = done === ALL_BEHAVIOURS.length;
  const last = a.step === COMPS.length - 1;

  return (
    '<div class="layer narrow" data-motion="flat" style="' + compVars(c) + '">' +
    '<div class="progress-head">' +
    '<div class="ph-left"><span class="ph-badge">' + icon(c.icon, 28) + '</span><div>' +
    '<span class="eyebrow">' + esc(c.driver.name) + ' &middot; ' + esc(l.name) + '</span>' +
    '<h1 class="headline" style="font-size:clamp(26px,4.2vw,38px);margin-top:6px">' + esc(c.name) + '</h1></div></div>' +
    '<span class="micro">Competency ' + (a.step + 1) + ' of 10 &middot; ' + done + '/30 rated</span>' +
    '</div>' +
    '<div class="track"><div class="fill" style="width:' + Math.max((done / 30) * 100, 2) + '%"></div></div>' +
    howto(
      '<b>Pick one rating for each of the three behaviours below.</b> Nothing is locked in — the coloured ' +
        'dots at the bottom jump between competencies, and you can change any answer before you finish.'
    ) +
    blocks +
    '<div class="q-block">' +
    '<div class="field" style="margin:0"><label for="f-notes">Evidence or notes on ' + esc(c.name) +
    ' <span style="color:var(--ink-soft)">(optional)</span></label>' +
    '<textarea id="f-notes" data-note="' + esc(c.id) + '" placeholder="What have you seen? Examples make the conversation much easier.">' +
    esc(a.notes[c.id] || '') + '</textarea></div></div>' +
    '<div class="step-nav">' +
    '<button class="btn ghost small" data-act="' + (a.step === 0 ? 'back-setup' : 'prev-step') + '">' +
    (a.step === 0 ? 'Details' : 'Back') + '</button>' +
    '<div class="step-dots">' + dots + '</div>' +
    '<div class="spacer"></div>' +
    (last
      ? '<button class="btn" data-act="finish"' + (complete ? '' : ' disabled') + '>' +
        (complete ? 'See the summary' : 30 - done + ' still to rate') + '</button>'
      : '<button class="btn" data-act="next-step">Next competency</button>') +
    '</div>' +
    (!complete && last
      ? '<p style="margin-top:14px"><button class="btn ghost small" data-act="goto-unrated">Jump to the first unrated behaviour</button></p>'
      : '') +
    '</div>'
  );
}

/* ---------- Assessment: report --------------------------------------------
   Built from the same two circles as the framework, so the dashboard and the
   thing it measures look like one system.
   ------------------------------------------------------------------------- */

/* A radial gauge. `score` is out of 3; the tick marks the standard, 2.0. */
function gauge(score, opts) {
  const o = opts || {};
  const r = 42;
  const circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : score / 3;
  const band = bandFor(score);
  return (
    '<span class="gauge" style="--gauge-size:' + (o.size || 128) + 'px">' +
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle class="g-track" cx="50" cy="50" r="' + r + '"/>' +
    '<circle class="g-fill" cx="50" cy="50" r="' + r + '" stroke="' + (o.color || band.color) + '" ' +
    'stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ * (1 - pct) + '" ' +
    'transform="rotate(-90 50 50)"/>' +
    '<line class="g-tick" x1="50" y1="4" x2="50" y2="14" transform="rotate(240 50 50)"/>' +
    '</svg>' +
    '<span class="g-value">' + (score == null ? '—' : score.toFixed(1)) + '<small>/3</small></span>' +
    '</span>'
  );
}

function viewReport() {
  const a = S.a;
  const l = levelById(a.level);
  const overall = overallScore();
  const band = bandFor(overall);
  const tally = ratingTally();

  const ranked = COMPS.map((c) => ({ comp: c, score: compScore(c) }))
    .filter((x) => x.score != null)
    .sort((x, y) => y.score - x.score);

  const strengths = ALL_BEHAVIOURS.filter((b) => a.ratings[b.key] === 'smashing-it');
  const focus = ALL_BEHAVIOURS.filter((b) => a.ratings[b.key] === 'needs-work');
  const stretch = ranked.slice(-3).reverse();

  const compBar = (c) => {
    const score = compScore(c);
    const b = bandFor(score);
    return (
      '<div class="score-row"><span class="sr-name">' + esc(c.name) + '</span>' +
      '<span class="sr-bar"><span class="sr-mark"></span>' +
      '<span class="sr-fill" style="width:' + (score == null ? 0 : (score / 3) * 100) + '%;background:' + b.color + '"></span></span>' +
      '<span class="sr-score">' + (score == null ? '—' : score.toFixed(1)) + '</span></div>'
    );
  };

  const driverPanels = DRIVERS.map((d) => {
    const ds = driverScore(d);
    return (
      '<section class="dpanel" style="' + driverVars(d) + '">' +
      '<div class="dp-head">' + gauge(ds, { size: 116, color: d.core }) +
      '<div><span class="eyebrow">Leadership area</span><h3>' + esc(d.name) + '</h3>' +
      '<p>' + esc(d.kicker) + '</p></div></div>' +
      '<div class="dp-scores">' + d.competencies.map(compBar).join('') + '</div>' +
      '</section>'
    );
  }).join('');

  const behaviourList = (list, numbered) =>
    '<ol class="find-list">' +
    list
      .map(
        (b, i) =>
          '<li><span class="fl-n"' + (numbered ? '' : ' data-plain="true"') + '>' + (numbered ? i + 1 : '') + '</span>' +
          '<div><b>' + esc(b.name) + '</b><span class="fl-comp">' + esc(b.comp.name) + '</span>' +
          '<p>' + esc(b.levels[l.id].ratings[a.ratings[b.key]]) + '</p></div></li>'
      )
      .join('') +
    '</ol>';

  const detail = DRIVERS.map(
    (d) =>
      '<div class="det-driver" style="' + driverVars(d) + '">' +
      '<h3 class="det-driver-name"><span class="dg-mark"></span>' + esc(d.name) + '</h3>' +
      d.competencies
        .map((c) => {
          const score = compScore(c);
          return (
            '<div class="detail-comp">' +
            '<div class="dc-head"><span class="dc-name">' + esc(c.name) + '</span>' +
            '<span class="dc-score">' + (score == null ? '—' : score.toFixed(1) + ' / 3') + '</span></div>' +
            c.behaviours
              .map((b) => {
                const r = ratingById(a.ratings[b.key]);
                return (
                  '<div class="detail-beh"><div class="db-top"><span class="db-name">' + esc(b.name) + '</span>' +
                  '<span class="db-tag" data-r="' + (r ? r.id : 'none') + '">' + esc(r ? r.name : 'Not rated') + '</span></div>' +
                  '<p>' + esc(r ? b.levels[l.id].ratings[r.id] : b.levels[l.id].expectation) + '</p></div>'
                );
              })
              .join('') +
            (a.notes[c.id] && a.notes[c.id].trim()
              ? '<div class="notes-block"><span>Evidence and notes</span><p>' + esc(a.notes[c.id].trim()) + '</p></div>'
              : '') +
            '</div>'
          );
        })
        .join('') +
      '</div>'
  ).join('');

  return (
    '<div class="layer narrow report" data-motion="flat">' +
    '<div class="rpt-actions print-hide">' +
    '<button class="btn" data-act="print">Download as PDF</button>' +
    '<button class="btn ghost small" data-act="edit-answers">Edit answers</button>' +
    '<button class="btn ghost small" data-act="reset">Start a new assessment</button>' +
    '</div>' +
    howto(
      '<b>Download as PDF to keep or share this.</b> It lives in this browser only — clearing site data or ' +
        'switching device loses it. <b>Edit answers</b> takes you back without losing anything.',
      { cls: 'print-hide' }
    ) +
    '<div class="print-brand print-only"><span>Cashies &middot; All For: 1 Leadership Framework</span>' +
    '<span>' + esc(formatDate(a.date)) + '</span></div>' +

    '<header class="rpt-head">' +
    '<div class="rh-text"><span class="eyebrow">' +
    esc(a.kind === 'self' ? 'Self assessment' : 'Team member assessment') + ' &middot; ' + esc(l.name) + '</span>' +
    '<h1 class="headline">' + esc(a.subject || 'Unnamed') + '</h1>' +
    '<p class="rh-sub">' + esc(a.role || 'Role not recorded') + '</p>' +
    '<div class="rh-meta">' +
    '<div><span>Assessor</span><b>' + esc(a.kind === 'self' ? a.subject || 'Self' : a.assessor || 'Not recorded') + '</b></div>' +
    '<div><span>Date</span><b>' + esc(formatDate(a.date)) + '</b></div>' +
    '</div></div>' +
    '<div class="rh-gauge">' + gauge(overall, { size: 150 }) +
    '<span class="rh-band">' + esc(band.label) + '</span></div>' +
    '</header>' +

    '<div class="counts">' +
    RATINGS.map(
      (r) =>
        '<div class="count"><span class="c-dot" style="background:' + r.color + '"></span>' +
        '<b>' + tally[r.id] + '</b><span>' + esc(r.name) + '</span></div>'
    ).join('') +
    '<div class="count"><span class="c-dot" style="background:var(--rule)"></span><b>30</b><span>Behaviours rated</span></div>' +
    '</div>' +

    '<div class="dpanels">' + driverPanels + '</div>' +

    '<div class="findings">' +
    '<section class="find"><h2>Strengths to keep using</h2>' +
    (strengths.length
      ? behaviourList(strengths, false)
      : '<p class="find-none">Nothing was rated Smashing It this time. The strongest competencies are ' +
        ranked.slice(0, 2).map((x) => '<b>' + esc(x.comp.name) + '</b>').join(' and ') + '.</p>') +
    '</section>' +
    '<section class="find"><h2>' + (focus.length ? 'Where to focus next' : 'Next stretch') + '</h2>' +
    (focus.length
      ? '<p class="find-lede">Rated Needs Work. Pick one or two — not all of them.</p>' + behaviourList(focus, true)
      : '<p class="find-lede">Nothing sits below the standard. These are the lowest scoring competencies.</p>' +
        '<ol class="find-list">' +
        stretch
          .map(
            (x, i) =>
              '<li><span class="fl-n">' + (i + 1) + '</span><div><b>' + esc(x.comp.name) + '</b>' +
              '<p>Scoring ' + x.score.toFixed(1) + ' of 3 across its three behaviours.</p></div></li>'
          )
          .join('') + '</ol>') +
    '</section></div>' +

    '<section class="det page-break"><h2>Every behaviour</h2>' +
    '<p class="find-lede">The full record — each behaviour, the rating given, and the descriptor that rating ' +
    'matched at ' + esc(l.name) + ' level.</p>' + detail + '</section>' +

    '<p class="print-note print-hide">Download opens your browser&rsquo;s print dialog — choose <b>Save as PDF</b> ' +
    'as the destination. Nothing leaves this device.</p>' +
    '</div>'
  );
}

/* ---------- Render -------------------------------------------------------- */

function motionDir() {
  if (S.zoom > lastZoom) return 'in';
  if (S.zoom < lastZoom) return 'out';
  return 'flat';
}

function currentView() {
  if (S.mode === 'assess') {
    if (S.a.stage === 'report') return { html: viewReport(), hint: 'Saved on this device only' };
    if (S.a.stage === 'rate') return { html: viewAssessStep(), hint: 'Draft saves as you go' };
    return { html: viewAssessSetup(), hint: 'Nothing is sent anywhere' };
  }
  if (S.zoom === 2 && S.beh) return { html: viewBehaviour(), hint: 'Esc to go back' };
  if (S.zoom === 1 && S.comp) return { html: viewCompetency(), hint: 'Esc to go back' };
  S.zoom = 0;
  return { html: viewFramework(), hint: 'Menu jumps anywhere · press / to search' };
}

/* ---------- The tour -------------------------------------------------------
   Seven stops that drive the app themselves — each one sets the state it needs
   before pointing at something real on the screen, so the reader watches the
   interface work rather than reading a description of it.
   ------------------------------------------------------------------------- */

const TOUR = [
  {
    title: 'Welcome — here is how this works',
    body:
      'This is the shared standard for what good leadership looks like at Cashies: two domains, ' +
      'ten competencies and thirty behaviours. The quick tour points out the four things worth knowing.',
    next: 'Show me around',
    skip: 'No thanks',
    state: { mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' },
  },
  {
    target: '#domain-build-culture .orbit',
    alt: '#domain-build-culture .page-list',
    title: 'Two domains, ten competencies',
    body:
      'Every competency name you can see is a button — click one to open its three behaviours. Build Culture ' +
      'is the first domain, and Drive Operations sits just below it with five more.',
    state: { mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' },
  },
  {
    target: '.xb',
    title: 'Three behaviours inside every competency',
    body:
      'Behaviours are the things actually observed and rated. Each one is written out at all three levels ' +
      'so you can see how the expectation grows — click any level row to read the full wording.',
    state: { mode: 'explore', zoom: 1, comp: 'potential', beh: null, menu: false, query: '' },
  },
  {
    target: '.lens',
    title: 'Level is a lens, not a label',
    body:
      'Switch between Foundations, Momentum and Enterprise whenever you like. The page you are on re-reads ' +
      'at that level — it changes what good looks like, not what is being measured.',
    pad: 8,
  },
  {
    target: '.menu-btn',
    title: 'Menu jumps you anywhere',
    body:
      'Every domain, all ten competencies and the three levels sit in the menu, so changing subject never ' +
      'means retracing your steps back up the diagram.',
    pad: 8,
  },
  {
    target: '.search-sec',
    title: 'Or just search for a word',
    body:
      'Searches all thirty behaviours at once — names, definitions, expectations and the rating wording. ' +
      'Press the / key from this screen to jump straight into it.',
    state: { mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' },
  },
  {
    target: '.modes',
    title: 'When you are ready, assess',
    body:
      'Rate yourself or someone in your team against the same thirty behaviours. It takes about fifteen ' +
      'minutes, saves as you go, and downloads as a PDF at the end.',
    pad: 7,
  },
  {
    title: 'That is the whole thing',
    body:
      'Start anywhere — click a competency, or open the menu. You can run this tour again at any time from ' +
      'the bottom of the menu.',
    next: 'Start exploring',
    state: { mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' },
  },
];

function tourLayer() {
  const s = TOUR[tourStep];
  const last = tourStep === TOUR.length - 1;
  return (
    '<div class="tour-block" data-dim="' + (s.target ? 'false' : 'true') + '"></div>' +
    '<div class="tour-spot" aria-hidden="true"' + (s.target ? '' : ' hidden') + '></div>' +
    '<div class="tour-card" role="dialog" aria-modal="true" aria-label="Guided tour" ' +
    'data-center="' + (s.target ? 'false' : 'true') + '">' +
    '<span class="tc-count">' + (tourStep + 1) + ' of ' + TOUR.length + '</span>' +
    '<h2>' + esc(s.title) + '</h2><p>' + esc(s.body) + '</p>' +
    '<div class="tc-nav">' +
    (tourStep > 0 ? '<button class="btn ghost small" data-act="tour-back">Back</button>' : '') +
    '<button class="btn small" data-act="tour-next">' + esc(s.next || (last ? 'Done' : 'Next')) + '</button>' +
    (last ? '' : '<button class="tc-skip" data-act="tour-end">' + esc(s.skip || 'Skip tour') + '</button>') +
    '</div></div>'
  );
}

/* Resolve a step to something actually on screen. Several targets swap out at
   narrow widths — the five-point rings become lists below 1010px — so each
   step may name a fallback, and anything zero-sized is treated as absent. */
function tourTarget(s) {
  for (const q of [s.target, s.alt]) {
    if (!q) continue;
    const el = document.querySelector(q);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 8 && r.height > 8) return el;
  }
  return null;
}

/* Measure after paint: the layer is written by render(), so the target only
   exists once the new screen is in the document. */
function tourPlace() {
  if (tourStep === null) return;
  const s = TOUR[tourStep];
  const card = document.querySelector('.tour-card');
  const spot = document.querySelector('.tour-spot');
  const block = document.querySelector('.tour-block');
  if (!card || !spot) return;

  const el = tourTarget(s);
  if (block) block.dataset.dim = el ? 'false' : 'true';
  if (!el) {
    card.style.left = '';
    card.style.top = '';
    card.dataset.center = 'true';
    spot.hidden = true;
    return;
  }

  spot.hidden = false;
  card.dataset.center = 'false';

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const m = 8;
  const gap = 14;
  const pad = s.pad == null ? 12 : s.pad;

  // Clamped to the viewport: a target taller than the screen gets its visible
  // slice lit rather than a spotlight running off both edges.
  const r = el.getBoundingClientRect();
  const x = Math.max(m, r.left - pad);
  const y = Math.max(m, r.top - pad);
  const w = Math.max(28, Math.min(vw - m, r.right + pad) - x);
  const h = Math.max(28, Math.min(vh - m, r.bottom + pad) - y);
  spot.style.left = x + 'px';
  spot.style.top = y + 'px';
  spot.style.width = w + 'px';
  spot.style.height = h + 'px';

  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  const midX = Math.min(Math.max(m + 2, x + w / 2 - cw / 2), Math.max(m + 2, vw - cw - m - 2));
  const midY = Math.min(Math.max(m + 2, y + h / 2 - ch / 2), Math.max(m + 2, vh - ch - m - 2));
  let top;
  let left;

  if (y + h + gap + ch <= vh - m) {
    top = y + h + gap;
    left = midX;
  } else if (y - gap - ch >= m) {
    top = y - gap - ch;
    left = midX;
  } else if (x + w + gap + cw <= vw - m) {
    top = midY;
    left = x + w + gap;
  } else if (x - gap - cw >= m) {
    top = midY;
    left = x - gap - cw;
  } else {
    // The target fills the screen — sit in the corner rather than off it.
    top = vh - ch - 14;
    left = vw - cw - 14;
  }

  card.style.top = Math.round(top) + 'px';
  card.style.left = Math.round(left) + 'px';
}

/* Bring the target somewhere comfortable before pointing at it. */
function tourScroll() {
  if (tourStep === null) return;
  const el = tourTarget(TOUR[tourStep]);
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.top >= 90 && r.bottom <= window.innerHeight - 90) return;
  const to = window.scrollY + r.top - Math.max(96, (window.innerHeight - r.height) / 2);
  window.scrollTo({ top: Math.max(0, to), behavior: 'smooth' });
}

function tourGo(i) {
  if (i < 0) return;
  if (i >= TOUR.length) return tourEnd();
  tourStep = i;
  const s = TOUR[i];
  if (s.state) Object.assign(S, s.state);
  render({ keepScroll: true });
  tourScroll();
}

function tourEnd() {
  tourStep = null;
  seenTour = true;
  save();
  go({ mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' });
}

window.addEventListener('resize', tourPlace);
window.addEventListener('scroll', tourPlace, { passive: true });

function confirmDialog() {
  return (
    '<div class="confirm-backdrop">' +
    '<div class="confirm-box">' +
    '<p>' + esc(pendingConfirm.message) + '</p>' +
    '<div class="confirm-btns">' +
    '<button class="btn small" data-act="confirm-yes">' + esc(pendingConfirm.ok || 'OK') + '</button>' +
    '<button class="btn ghost small" data-act="confirm-no">Cancel</button>' +
    '</div></div></div>'
  );
}

function render(opts) {
  const view = currentView();
  document.getElementById('app').innerHTML =
    '<div class="shell">' +
    spectrumBar() +
    topbar() +
    (S.mode === 'explore' ? zoomRail() : '') +
    '<main>' + view.html + '</main>' +
    footer(view.hint) +
    '</div>' +
    (S.menu ? drawer() : '') +
    (pendingConfirm ? confirmDialog() : '') +
    (tourStep !== null ? tourLayer() : '');

  document.body.style.overflow = (S.menu || pendingConfirm) ? 'hidden' : '';
  if (S.menu) {
    const first = document.querySelector('.dw-close');
    if (first) first.focus();
  }

  lastZoom = S.zoom;
  if (!opts || !opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
  if (tourStep !== null) requestAnimationFrame(tourPlace);
}

/* ---------- Events -------------------------------------------------------- */

const ACTIONS = {
  home: () => go({ mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' }),

  mode: (el) => go({ mode: el.dataset.mode, menu: false }),

  zoom: (el) => goZoom(Number(el.dataset.zoom)),

  'toggle-menu': () => go({ menu: !S.menu }, { keepScroll: true }),

  'close-menu': () => go({ menu: false }, { keepScroll: true }),

  'set-lens': (el) => {
    setLens(el.dataset.level);
    // Staying put is the point of a lens — it re-reads the current screen.
    render({ keepScroll: true });
  },

  // A domain is not a screen of its own any more; it is a place on the
  // framework diagram, so this scrolls the reader to its ring.
  'open-driver': (el) => {
    const id = el.dataset.driver;
    go({ mode: 'explore', zoom: 0, comp: null, beh: null, menu: false, query: '' });
    const target = document.getElementById('domain-' + id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  'open-comp': (el) => go({ mode: 'explore', zoom: 1, comp: el.dataset.comp, beh: null, menu: false }),

  'open-beh': (el) => {
    // Opening a specific level's rung switches the lens to that level.
    if (el.dataset.level) setLens(el.dataset.level);
    go({ mode: 'explore', zoom: 2, comp: el.dataset.comp, beh: el.dataset.beh, menu: false });
  },

  'clear-search': () => go({ query: '' }),

  'set-kind': (el) => {
    S.a.kind = el.dataset.kind;
    save();
    render({ keepScroll: true });
  },

  'set-alevel': (el) => {
    const next = el.dataset.level;
    const rated = ratedCount();
    if (rated > 0 && S.a.level && S.a.level !== next) {
      const from = levelById(S.a.level).name;
      const to = levelById(next).name;
      pendingConfirm = {
        message: rated + ' behaviour' + (rated === 1 ? ' was' : 's were') + ' rated against ' + from + '. ' + to +
          ' describes the same behaviours at a different scope, so those ratings may no longer hold. Clear them and rate again against ' + to + '?',
        ok: 'Clear ratings',
        onConfirm: () => {
          S.a.ratings = {};
          S.a.step = 0;
          S.a.level = next;
          save();
          render({ keepScroll: true });
        },
      };
      render({ keepScroll: true });
      return;
    }
    S.a.level = next;
    save();
    render({ keepScroll: true });
  },

  'start-rating': () => {
    S.a.stage = 'rate';
    const firstGap = COMPS.findIndex((c) => c.behaviours.some((b) => !S.a.ratings[b.key]));
    S.a.step = firstGap === -1 ? 0 : firstGap;
    save();
    render();
  },

  rate: (el) => {
    S.a.ratings[el.dataset.key] = el.dataset.rating;
    save();
    render({ keepScroll: true });
  },

  'next-step': () => {
    S.a.step = Math.min(S.a.step + 1, COMPS.length - 1);
    save();
    render();
  },

  'prev-step': () => {
    S.a.step = Math.max(S.a.step - 1, 0);
    save();
    render();
  },

  'goto-step': (el) => {
    S.a.step = Number(el.dataset.step);
    save();
    render();
  },

  'goto-unrated': () => {
    const gap = COMPS.findIndex((c) => c.behaviours.some((b) => !S.a.ratings[b.key]));
    if (gap !== -1) {
      S.a.step = gap;
      save();
      render();
    }
  },

  'back-setup': () => {
    S.a.stage = 'setup';
    save();
    render();
  },

  finish: () => {
    S.a.stage = 'report';
    save();
    render();
  },

  'edit-answers': () => {
    S.a.stage = 'rate';
    save();
    render();
  },

  print: () => window.print(),

  reset: () => {
    pendingConfirm = {
      message: 'Clear this assessment and start again? This cannot be undone.',
      ok: 'Clear',
      onConfirm: () => {
        S.a = blankAssessment();
        save();
        go({ mode: 'assess' });
        toast('Assessment cleared');
      },
    };
    render({ keepScroll: true });
  },

  'confirm-yes': () => {
    const fn = pendingConfirm && pendingConfirm.onConfirm;
    pendingConfirm = null;
    if (fn) fn();
  },

  'confirm-no': () => {
    pendingConfirm = null;
    render({ keepScroll: true });
  },

  'tour-start': () => tourGo(0),
  'tour-next': () => tourGo(tourStep + 1),
  'tour-back': () => tourGo(tourStep - 1),
  'tour-end': () => tourEnd(),
};

document.addEventListener('click', (e) => {
  if (pendingConfirm && e.target.classList.contains('confirm-backdrop')) {
    pendingConfirm = null;
    render({ keepScroll: true });
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el, e);
});

/* Pointing at any part of a spoke lights the whole spoke and quiets the rest.
   Decorative only — the diagram is fully usable without it. */
function focusOrbit(orbit, key) {
  orbit.setAttribute('data-focus', key || '');
  orbit.querySelectorAll('.orbit-node, .orbit-chip, .orbit-leads line').forEach((n) => {
    n.classList.toggle('is-focus', !!key && n.dataset.key === key);
  });
}

document.addEventListener('pointerover', (e) => {
  const orbit = e.target.closest ? e.target.closest('.orbit') : null;
  if (!orbit) {
    document.querySelectorAll('.orbit:not([data-focus=""])').forEach((o) => focusOrbit(o, null));
    return;
  }
  const part = e.target.closest('[data-key]');
  focusOrbit(orbit, part && orbit.contains(part) ? part.dataset.key : null);
});

document.addEventListener('input', (e) => {
  const el = e.target;

  if (el.id === 'q') {
    S.query = el.value;
    // Patch in place rather than re-render, so the field keeps focus mid-word.
    const host = document.querySelector('[data-search-results]');
    if (host) host.innerHTML = searchResults();
    const searching = !!S.query.trim();
    document.querySelectorAll('[data-hideable]').forEach((n) => {
      n.hidden = searching;
    });
    const clear = document.querySelector('[data-act="clear-search"]');
    if (clear) clear.hidden = !searching;
    return;
  }

  if (el.dataset.field) {
    S.a[el.dataset.field] = el.value;
    save();
    const start = document.querySelector('[data-act="start-rating"]');
    if (start) start.disabled = !(S.a.level && S.a.subject.trim());
    return;
  }

  if (el.dataset.note) {
    S.a.notes[el.dataset.note] = el.value;
    save();
  }
});

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

  // The tour owns the keyboard while it is up.
  if (tourStep !== null) {
    if (e.key === 'Escape') tourEnd();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') tourGo(tourStep + 1);
    else if (e.key === 'ArrowLeft') tourGo(tourStep - 1);
    else return;
    e.preventDefault();
    return;
  }

  if (e.key === 'Escape') {
    if (S.menu) {
      go({ menu: false }, { keepScroll: true });
      return;
    }
    if (typing) return;
    if (S.mode !== 'explore') return;
    if (S.zoom > 0) goZoom(S.zoom - 1);
    return;
  }

  if (e.key === '/' && !typing && S.mode === 'explore' && S.zoom === 0) {
    const q = document.getElementById('q');
    if (q) {
      e.preventDefault();
      q.focus();
    }
  }
});

/* ---------- Boot ---------------------------------------------------------- */

restore();
// First visit gets the tour offered rather than imposed — step one is a card
// with "No thanks" on it, and the choice is remembered either way.
if (!seenTour) tourStep = 0;
render();
