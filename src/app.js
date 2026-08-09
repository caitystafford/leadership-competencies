/* =========================================================================
   All For: 1 Leadership Framework — application
   No dependencies, no network, no back end. Everything runs in the page.
   Brand tokens, drivers, icons and the wordmark live in brand.js.
   ========================================================================= */

const FRAMEWORK = /*__FRAMEWORK__*/ null;

/* ---------- Framework meta ------------------------------------------------
   Level names and all behaviour copy come from the workbook. The tagline,
   scope and "typically" lines are programme copy written for the app — edit
   them here rather than in the spreadsheet.
   ------------------------------------------------------------------------- */

const LEVELS = [
  {
    id: 'foundations',
    name: 'Foundations',
    color: C.blueGreen,
    tagline: 'Leading yourself. Doing what you say you will do, learning quickly, and lifting the people around you.',
    scope: 'Own work and immediate team',
    who: 'Team members and emerging leaders',
  },
  {
    id: 'momentum',
    name: 'Momentum',
    color: C.yellow,
    tagline: 'Leading a team. Setting the standard, coaching people, and delivering results through others.',
    scope: 'A team, store or function',
    who: 'Store and team leaders',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    color: C.purple,
    tagline: 'Leading the business. Designing the systems, culture and trade offs that hold up at scale.',
    scope: 'Multiple teams, functions or markets',
    who: 'Senior and executive leaders',
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
const driverById = (id) => DRIVERS.find((d) => d.id === id) || null;
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

let S = {
  mode: 'explore',
  zoom: 0,
  lens: 'foundations',
  // Zoom 1 shows one slice of the framework — a driver or a level.
  slice: null,
  comp: null,
  beh: null,
  query: '',
  a: blankAssessment(),
};

let lastZoom = 0;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ a: S.a, lens: S.lens }));
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

/* Zoom 1 needs a slice. If the user jumps out from a competency, fall back to
   the driver that competency belongs to. */
function currentSlice() {
  if (S.slice) return S.slice;
  const c = S.comp ? compById(S.comp) : null;
  return c ? { type: 'driver', id: c.driver.id } : { type: 'level', id: S.lens };
}

/* A level slice *is* the lens, so the two must never drift apart — otherwise
   the breadcrumb names one level while the page shows another. Every change of
   level goes through here. */
function setLens(id) {
  S.lens = id;
  if (S.slice && S.slice.type === 'level') S.slice = { type: 'level', id: id };
  save();
}

function goZoom(zoom) {
  const patch = { zoom, mode: 'explore' };
  if (zoom === 1) patch.slice = currentSlice();
  if (zoom < 3) patch.beh = null;
  if (zoom < 2) patch.comp = null;
  if (zoom < 1) patch.slice = null;
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
    '<button class="brandline" data-act="home">' + logoMark() +
    '<span class="divider" aria-hidden="true"></span>' +
    '<span class="app-name">Leadership<br>Framework</span></button>' +
    '<nav class="modes">' + tab('explore', 'Explore') + tab('assess', 'Assessment') + '</nav>' +
    '</div></header>'
  );
}

function zoomRail() {
  const slice = S.zoom >= 1 ? currentSlice() : null;
  const crumbs = [{ label: 'Framework', zoom: 0 }];
  if (slice) {
    crumbs.push({
      label: slice.type === 'driver' ? driverById(slice.id).name : levelById(slice.id).name,
      zoom: 1,
    });
  }
  if (S.comp) crumbs.push({ label: compById(S.comp).name, zoom: 2 });
  if (S.beh) crumbs.push({ label: behById(S.comp, S.beh).name, zoom: 3 });

  const crumbHtml = crumbs
    .map((c, i) => {
      const last = i === crumbs.length - 1;
      const btn =
        '<button class="crumb" data-act="zoom" data-zoom="' + c.zoom + '"' +
        (last ? ' disabled aria-current="page"' : '') + '>' + esc(c.label) + '</button>';
      return i === 0 ? btn : '<span class="crumb-sep" aria-hidden="true">&rsaquo;</span>' + btn;
    })
    .join('');

  const labels = ['Whole framework', 'Driver or level', 'Competency', 'Behaviour'];
  const enabled = [true, S.zoom >= 1 || !!S.comp, !!S.comp, !!S.beh];
  const stops = labels
    .map(
      (label, i) =>
        '<button class="stop" data-act="zoom" data-zoom="' + i + '" title="' + esc(label) + '" ' +
        'aria-label="Zoom to ' + esc(label.toLowerCase()) + '" aria-current="' + (S.zoom === i) + '"' +
        (enabled[i] ? '' : ' disabled') + '><span></span></button>'
    )
    .join('');

  const lens = levelById(S.lens);
  const lensBtns = LEVELS.map(
    (l) =>
      '<button class="lens-btn" data-act="set-lens" data-level="' + l.id + '" ' +
      'aria-pressed="' + (l.id === S.lens) + '">' + esc(l.name) + '</button>'
  ).join('');

  return (
    '<div class="rail" style="--lens-color:' + lens.color + '"><div class="rail-inner">' +
    '<nav class="crumbs" aria-label="Framework depth">' + crumbHtml + '</nav>' +
    '<div class="rail-right">' +
    '<div class="lens"><span class="rail-label">Level</span><div class="lens-set" role="group" aria-label="Leadership level">' +
    lensBtns + '</div></div>' +
    '<div class="lens"><span class="rail-label">Zoom</span><div class="stops">' + stops + '</div></div>' +
    '</div></div></div>'
  );
}

const footer = (hint) =>
  '<footer class="footer"><div class="footer-inner">' + logoMark({ ink: 'rgba(255,255,255,0.75)' }) +
  '<span class="hintline">' + esc(hint || '') + '</span></div></footer>';

const sectionHead = (title, accent) =>
  '<div class="sec-head"><span class="bar" style="background:' + accent + '"></span><h3>' + esc(title) + '</h3></div>';

const compVars = (c) =>
  '--fill:' + c.fill + ';--node-ink:' + c.ink + ';--chip-ink:' + c.ink + ';--halo:' + washOf(c.fill, 0.28) +
  ';--accent-ink:' + (c.fill === C.lime || c.fill === C.blueGreen ? C.navy : c.fill);

const driverVars = (d) =>
  '--core:' + d.core + ';--core-ink:' + d.coreInk + ';--core-sub:' + d.coreSub +
  ';--core-rule:' + (d.id === 'building-culture' ? 'rgba(255,255,255,0.2)' : 'rgba(21,7,33,0.2)') +
  ';--tint:' + d.tint;

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

/* ---------- The orbit ------------------------------------------------------
   The signature diagram: a driver at the centre, its five competencies in
   orbit, each linked to a chip listing its three behaviours.
   ------------------------------------------------------------------------- */

function orbit(driver) {
  const placed = driver.competencies.map((c) => ({ c, slot: SLOTS[c.slot] }));

  const leads = placed
    .map(
      (p, i) =>
        '<line x1="' + p.slot.icon[0] + '%" y1="' + p.slot.icon[1] + '%" ' +
        'x2="' + p.slot.anchor[0] + '%" y2="' + p.slot.anchor[1] + '%" ' +
        'style="animation-delay:' + (260 + i * 60) + 'ms"/>'
    )
    .join('');

  const nodes = placed
    .map(
      (p, i) =>
        '<button class="orbit-node" style="' + compVars(p.c) +
        ';left:' + p.slot.icon[0] + '%;top:' + p.slot.icon[1] + '%;animation-delay:' + (120 + i * 60) + 'ms" ' +
        'data-act="open-comp" data-comp="' + p.c.id + '" aria-label="' + esc(p.c.name) + '">' +
        icon(p.c.icon, 30) + '</button>'
    )
    .join('');

  const chips = placed
    .map(
      (p, i) =>
        '<button class="orbit-chip" data-side="' + p.slot.chip + '" style="' + compVars(p.c) +
        ';left:' + p.slot.anchor[0] + '%;top:' + p.slot.anchor[1] + '%;animation-delay:' + (300 + i * 60) + 'ms" ' +
        'data-act="open-comp" data-comp="' + p.c.id + '">' +
        '<span class="chip-name">' + esc(p.c.name) + '</span>' +
        p.c.behaviours.map((b) => '<span class="chip-beh">' + esc(b.name) + '</span>').join('') +
        '</button>'
    )
    .join('');

  const stack = driver.competencies
    .map(
      (c) =>
        '<button class="stack-item" style="' + compVars(c) + '" data-act="open-comp" data-comp="' + c.id + '">' +
        '<span class="si-icon">' + icon(c.icon, 30) + '</span><span>' +
        '<span class="si-name">' + esc(c.name) + '</span>' +
        '<span class="si-beh">' + c.behaviours.map((b) => esc(b.name)).join(' &middot; ') + '</span>' +
        '</span></button>'
    )
    .join('');

  const core =
    '<div class="orbit-core" style="top:' + CORE.y + '%;width:' + CORE.size + '%"><span class="core-title">' +
    driver.lines.map((t) => esc(t)).join('<br>') + '</span>' +
    '<span class="core-kicker">' + esc(driver.kicker) + '</span>' +
    '<span class="core-blurb">' + esc(driver.blurb) + '</span></div>';

  return (
    '<section class="driver-block" style="' + driverVars(driver) + '" aria-label="' + esc(driver.name) + '">' +
    '<div class="orbit-wrap"><div class="orbit">' +
    '<svg class="orbit-leads" preserveAspectRatio="none" aria-hidden="true">' + leads + '</svg>' +
    core + nodes + chips +
    '</div>' +
    '<div class="orbit-foot"><span class="of-label">Five competencies &middot; fifteen behaviours</span>' +
    '<button class="btn small accent" data-act="open-driver" data-driver="' + driver.id + '">' +
    'Open ' + esc(driver.name) + '</button></div></div>' +
    '<div class="driver-stack">' +
    '<div class="stack-core"><h3>' + driver.lines.map((t) => esc(t)).join(' ') + '</h3>' +
    '<p>' + esc(driver.kicker) + '</p></div>' +
    '<div class="stack-list">' + stack + '</div>' +
    '<div class="orbit-foot"><span class="of-label">Five competencies &middot; fifteen behaviours</span>' +
    '<button class="btn small accent" data-act="open-driver" data-driver="' + driver.id + '">' +
    'Open ' + esc(driver.name) + '</button></div>' +
    '</div></section>'
  );
}

/* ---------- Zoom 0: framework --------------------------------------------- */

function viewFramework() {
  const lens = levelById(S.lens);

  const levelCards = LEVELS.map(
    (l) =>
      '<button class="level-card" style="--accent:' + l.color + '" data-act="open-level" data-level="' + l.id + '">' +
      '<span class="eyebrow">Level ' + (LEVELS.indexOf(l) + 1) + '</span>' +
      '<h3>' + esc(l.name) + '</h3><p>' + esc(l.tagline) + '</p>' +
      '<div class="scope">' + esc(l.who) + '</div></button>'
  ).join('');

  const body = S.query.trim()
    ? '<div data-search-results>' + searchResults() + '</div>'
    : '<section aria-label="The two drivers">' +
      sectionHead('Two drivers', C.peach) +
      '<p class="prose" style="margin-bottom:24px">Every competency belongs to one of two drivers. ' +
      'Building Culture is the leadership skillset — how leaders shape behaviour and environment. ' +
      'Drive Operations is the management skillset — how leaders create consistency and performance.</p>' +
      DRIVERS.map(orbit).join('') +
      '</section>' +
      '<section aria-label="Leadership levels" style="margin-top:40px">' +
      sectionHead('Three levels', lens.color) +
      '<p class="prose" style="margin-bottom:22px">The same thirty behaviours run through every level. ' +
      'What changes is scope. You are currently reading the framework at <b>' + esc(lens.name) +
      '</b> — switch the level lens at any time, from any screen.</p>' +
      '<div class="level-cards">' + levelCards + '</div></section>' +
      '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    '<div class="hero">' +
    '<span class="eyebrow">Cashies &middot; All For: 1</span>' +
    '<h1 class="headline">The leadership framework</h1>' +
    '<p class="prose lede">Two drivers, ten competencies and thirty assessable behaviours, across three levels of ' +
    'leadership. Zoom out for the whole picture, or zoom all the way in to what good looks like in a single behaviour.</p>' +
    '<div class="stats">' +
    '<div class="stat"><b>2</b><span>Drivers</span></div>' +
    '<div class="stat"><b>10</b><span>Competencies</span></div>' +
    '<div class="stat"><b>30</b><span>Behaviours</span></div>' +
    '<div class="stat"><b>3</b><span>Levels</span></div>' +
    '</div></div>' +
    searchBar('Search behaviours, definitions and expectations…') +
    body +
    '</div>'
  );
}

/* ---------- Zoom 1: a driver or a level ----------------------------------- */

function compRow(c, lens, showDriver) {
  return (
    '<section class="comp-row" style="' + compVars(c) + '">' +
    '<div class="cr-head"><button data-act="open-comp" data-comp="' + c.id + '">' +
    '<span class="cr-badge">' + icon(c.icon, 24) + '</span>' +
    '<h3>' + esc(c.name) + '</h3>' +
    (showDriver ? '<div class="cr-driver">' + esc(c.driver.name) + '</div>' : '') + '</button></div>' +
    '<div class="cr-body">' +
    c.behaviours
      .map(
        (b) =>
          '<button class="exp-card" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '" ' +
          'title="See what Needs Work, Great and Smashing It look like">' +
          '<h4><span>' + esc(b.name) + '</span><span class="more" aria-hidden="true">&rarr;</span></h4>' +
          '<p>' + esc(b.levels[lens].expectation) + '</p></button>'
      )
      .join('') +
    '</div></section>'
  );
}

function viewSlice() {
  const slice = currentSlice();
  const lens = levelById(S.lens);
  const isDriver = slice.type === 'driver';
  const driver = isDriver ? driverById(slice.id) : null;
  const comps = isDriver ? driver.competencies : COMPS;

  const hero = isDriver
    ? '<div class="slice-hero" style="' + driverVars(driver) + '">' +
      '<span class="eyebrow">Driver &middot; ' + esc(driver.kicker) + '</span>' +
      '<h1 class="headline">' + esc(driver.name) + '</h1><p>' + esc(driver.blurb) + '</p>' +
      '<div class="slice-meta">' +
      '<div><span>Competencies</span><b>5</b></div>' +
      '<div><span>Behaviours</span><b>15</b></div>' +
      '<div><span>Reading at</span><b>' + esc(lens.name) + '</b></div>' +
      '</div></div>'
    : '<div class="slice-hero" style="--core:' + lens.color + ';--core-ink:' + C.navy +
      ';--core-sub:rgba(21,7,33,0.74);--core-rule:rgba(21,7,33,0.2)">' +
      '<span class="eyebrow">Level ' + (LEVELS.indexOf(lens) + 1) + ' of 3</span>' +
      '<h1 class="headline">' + esc(lens.name) + '</h1><p>' + esc(lens.tagline) + '</p>' +
      '<div class="slice-meta">' +
      '<div><span>Scope</span><b>' + esc(lens.scope) + '</b></div>' +
      '<div><span>Typically</span><b>' + esc(lens.who) + '</b></div>' +
      '<div><span>Behaviours</span><b>30 at this level</b></div>' +
      '</div></div>';

  let blocks;
  if (isDriver) {
    // No driver sub-label here — the whole page is that driver.
    blocks = comps.map((c) => compRow(c, lens.id, false)).join('');
  } else {
    blocks = DRIVERS.map(
      (d) =>
        '<div style="' + driverVars(d) + '">' +
        '<div class="driver-score" style="margin:34px 0 4px">' +
        '<span>' + '<span class="ds-name">' + esc(d.name) + '</span>' +
        '<span class="ds-sub">' + esc(d.kicker) + '</span></span>' +
        '<button class="btn small" style="margin-left:auto;background:var(--core-ink);color:var(--core)" ' +
        'data-act="open-driver" data-driver="' + d.id + '">Open driver</button>' +
        '</div>' +
        d.competencies.map((c) => compRow(c, lens.id, false)).join('') +
        '</div>'
    ).join('');
  }

  const body = S.query.trim() ? '<div data-search-results>' + searchResults() + '</div>' : blocks + '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    hero +
    '<div class="note"><span class="flag"></span><span>' + esc(STANDARD_NOTE) + '</span></div>' +
    searchBar('Search ' + esc(lens.name) + ' expectations…') +
    body +
    '</div>'
  );
}

/* ---------- Zoom 2: competency -------------------------------------------- */

function viewCompetency() {
  const c = compById(S.comp);
  const lens = levelById(S.lens);

  const blocks = c.behaviours
    .map(
      (b) =>
        '<section class="beh-block">' +
        '<div class="bb-top"><h3>' + esc(b.name) + '</h3>' +
        '<span class="micro" style="color:var(--ink-soft)">Behaviour ' + (b.index + 1) + ' of 3</span></div>' +
        '<p class="bb-def">' + esc(b.definition) + '</p>' +
        '<div class="ladder">' +
        LEVELS.map(
          (l) =>
            '<button class="rung" style="--accent:' + l.color + '" data-act="open-beh" data-comp="' + c.id + '" ' +
            'data-beh="' + b.id + '" data-level="' + l.id + '" data-dim="' + (l.id !== lens.id) + '">' +
            '<span class="rung-name" style="color:' + (l.id === lens.id ? C.navy : 'var(--ink-soft)') + '">' +
            esc(l.name) + (l.id === lens.id ? ' &middot; current' : '') + '</span>' +
            '<p>' + esc(b.levels[l.id].expectation) + '</p></button>'
        ).join('') +
        '</div></section>'
    )
    .join('');

  return (
    '<div class="layer" data-motion="' + motionDir() + '" style="' + compVars(c) + '">' +
    '<div class="comp-hero">' +
    '<span class="ch-badge">' + icon(c.icon, 42) + '</span>' +
    '<div class="ch-text">' +
    '<button class="eyebrow" style="background:none;border:0;padding:0;cursor:pointer" ' +
    'data-act="open-driver" data-driver="' + c.driver.id + '">' + esc(c.driver.name) + ' &rsaquo;</button>' +
    '<h1 class="headline">' + esc(c.name) + '</h1>' +
    '<p class="prose" style="margin-top:14px">Three assessable behaviours. Read across to see how the same behaviour ' +
    'changes shape as scope grows — ' + esc(lens.name) + ' is highlighted.</p>' +
    '</div></div>' + blocks + '</div>'
  );
}

/* ---------- Zoom 3: behaviour --------------------------------------------- */

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
    '<b>' + esc(l.name) + '</b><span>' + esc(l.who) + ' &middot; ' + esc(l.scope) + '</span></button>';

  return (
    '<div class="layer narrow" data-motion="flat">' +
    '<div class="hero" style="margin-bottom:30px">' +
    '<span class="eyebrow">Assessment</span>' +
    '<h1 class="headline" style="font-size:clamp(32px,5.2vw,50px)">Set it up</h1>' +
    '<p class="prose lede">Thirty behaviours across both drivers, rated against one level. It takes about fifteen minutes. ' +
    'Nothing is sent anywhere — the draft is saved in this browser only, and you download the finished assessment as a PDF.</p>' +
    '</div>' +
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

/* ---------- Assessment: report -------------------------------------------- */

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

  const meterRow = (c, score) => {
    const b = bandFor(score);
    return (
      '<div class="rpt-row"><div class="rr-name">' +
      '<span class="rr-dot" style="background:' + c.fill + '"></span>' + esc(c.name) + '</div>' +
      '<div class="meter"><div class="mid" title="Great is the standard"></div>' +
      '<div class="mfill" style="width:' + (score / 3) * 100 + '%;background:' + b.color + '"></div></div>' +
      '<div class="rr-score">' + score.toFixed(1) + '<small>/3</small></div></div>'
    );
  };

  const behaviourList = (list, numbered) =>
    '<div class="pill-list">' +
    list
      .map(
        (b, i) =>
          '<div class="pill-item">' +
          (numbered ? '<span class="n">' + (i + 1) + '</span>' : '<span class="d" style="background:' + b.comp.fill + '"></span>') +
          '<div><b>' + esc(b.name) + '</b>' +
          '<p>' + esc(b.comp.name) + ' — ' + esc(b.levels[l.id].ratings[a.ratings[b.key]]) + '</p></div></div>'
      )
      .join('') +
    '</div>';

  const profile = DRIVERS.map((d) => {
    const ds = driverScore(d);
    return (
      '<div style="' + driverVars(d) + '">' +
      '<div class="driver-score">' +
      '<span><span class="ds-name">' + esc(d.name) + '</span>' +
      '<span class="ds-sub">' + esc(d.kicker) + '</span></span>' +
      '<span class="ds-score">' + (ds == null ? '—' : ds.toFixed(1)) + '<small>/3</small></span></div>' +
      d.competencies.map((c) => meterRow(c, compScore(c))).join('') +
      '</div>'
    );
  }).join('');

  const detail = DRIVERS.map(
    (d) =>
      '<div style="' + driverVars(d) + '">' +
      '<div class="driver-score" style="margin-top:22px">' +
      '<span><span class="ds-name">' + esc(d.name) + '</span></span>' +
      '<span class="ds-score">' + (driverScore(d) == null ? '—' : driverScore(d).toFixed(1)) + '<small>/3</small></span></div>' +
      d.competencies
        .map((c) => {
          const score = compScore(c);
          return (
            '<div class="detail-comp">' +
            '<div class="sec-head" style="margin:16px 0 6px"><span class="bar" style="background:' + c.fill + '"></span>' +
            '<h3 style="font-size:16px">' + esc(c.name) + '</h3>' +
            '<span style="margin-left:auto;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums">' +
            (score == null ? '—' : score.toFixed(1) + ' / 3') + '</span></div>' +
            c.behaviours
              .map((b) => {
                const r = ratingById(a.ratings[b.key]);
                return (
                  '<div class="detail-beh"><div class="db-top"><span class="db-name">' + esc(b.name) + '</span>' +
                  '<span class="db-tag" style="background:' + (r ? r.color : C.mist) + ';color:' + (r ? r.ink : C.navy) + '">' +
                  esc(r ? r.name : 'Not rated') + '</span></div>' +
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
    '<div class="layer narrow" data-motion="flat">' +
    '<div class="rpt-actions print-hide">' +
    '<button class="btn accent" data-act="print">Download as PDF</button>' +
    '<button class="btn ghost small" data-act="edit-answers">Edit answers</button>' +
    '<button class="btn ghost small" data-act="reset">Start a new assessment</button>' +
    '</div>' +
    '<div class="print-brand print-only"><span>Cashies &middot; All For: 1 Leadership Framework</span>' +
    '<span>' + esc(formatDate(a.date)) + '</span></div>' +
    '<div class="rpt-head" style="--accent:' + l.color + '">' +
    '<span class="eyebrow">' + esc(a.kind === 'self' ? 'Self assessment' : 'Team member assessment') + '</span>' +
    '<h1 class="headline">' + esc(a.subject || 'Unnamed') + '</h1>' +
    '<div class="sub">' + esc(a.role || 'Role not recorded') + ' &middot; ' + esc(l.name) + ' level</div>' +
    '<div class="rpt-meta">' +
    '<div><span>Assessed against</span><b>' + esc(l.name) + '</b></div>' +
    '<div><span>Assessor</span><b>' + esc(a.kind === 'self' ? a.subject || 'Self' : a.assessor || 'Not recorded') + '</b></div>' +
    '<div><span>Date</span><b>' + esc(formatDate(a.date)) + '</b></div>' +
    '</div>' +
    '<div class="tiles">' +
    '<div class="tile"><span>Overall</span><b>' + (overall == null ? '—' : overall.toFixed(1)) + '</b><i>out of 3 &middot; ' + esc(band.label) + '</i></div>' +
    '<div class="tile"><span>Needs Work</span><b>' + tally['needs-work'] + '</b><i>of 30 behaviours</i></div>' +
    '<div class="tile"><span>Great</span><b>' + tally.great + '</b><i>of 30 behaviours</i></div>' +
    '<div class="tile"><span>Smashing It</span><b>' + tally['smashing-it'] + '</b><i>of 30 behaviours</i></div>' +
    '</div></div>' +
    '<div class="rpt-card">' + sectionHead('Profile by driver', C.peach) +
    '<p style="font-size:14px;color:var(--ink-mid)">Each competency is the average of its three behaviours, and each driver ' +
    'the average of its five competencies. The line marks the standard — Great across the board.</p>' +
    profile + '</div>' +
    '<div class="rpt-card">' + sectionHead('Strengths to keep using', C.lime) +
    (strengths.length
      ? behaviourList(strengths, false)
      : '<p style="font-size:14px;color:var(--ink-mid)">Nothing was rated Smashing It this time. The strongest competencies are ' +
        ranked.slice(0, 2).map((x) => '<b>' + esc(x.comp.name) + '</b>').join(' and ') + '.</p>') +
    '</div>' +
    '<div class="rpt-card">' + sectionHead(focus.length ? 'Where to focus next' : 'Next stretch', C.yellow) +
    (focus.length
      ? '<p style="font-size:14px;color:var(--ink-mid);margin-bottom:16px">Behaviours rated Needs Work. Pick one or two — not all of them.</p>' +
        behaviourList(focus, true)
      : '<p style="font-size:14px;color:var(--ink-mid);margin-bottom:16px">Nothing sits below the standard. These are the lowest ' +
        'scoring competencies and the natural place to stretch.</p><div class="pill-list">' +
        stretch
          .map(
            (x, i) =>
              '<div class="pill-item"><span class="n">' + (i + 1) + '</span><div><b>' + esc(x.comp.name) + '</b>' +
              '<p>Scoring ' + x.score.toFixed(1) + ' of 3 across its three behaviours.</p></div></div>'
          )
          .join('') + '</div>') +
    '</div>' +
    '<div class="rpt-card page-break">' + sectionHead('Every behaviour', C.purple) +
    '<p style="font-size:14px;color:var(--ink-mid)">The full record — each behaviour, the rating given, and the descriptor ' +
    'that rating matched at ' + esc(l.name) + ' level.</p>' + detail + '</div>' +
    '<p class="print-note print-hide">Download opens your browser&rsquo;s print dialog — choose <b>Save as PDF</b> as the ' +
    'destination. Nothing leaves this device.</p>' +
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
  if (S.zoom === 3 && S.beh) return { html: viewBehaviour(), hint: 'Esc to zoom out' };
  if (S.zoom === 2 && S.comp) return { html: viewCompetency(), hint: 'Esc to zoom out' };
  if (S.zoom === 1) return { html: viewSlice(), hint: 'Esc to zoom out' };
  S.zoom = 0;
  return { html: viewFramework(), hint: 'Press / to search' };
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
    '</div>';

  lastZoom = S.zoom;
  if (!opts || !opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------- Events -------------------------------------------------------- */

const ACTIONS = {
  home: () => go({ mode: 'explore', zoom: 0, slice: null, comp: null, beh: null, query: '' }),

  mode: (el) => go({ mode: el.dataset.mode }),

  zoom: (el) => goZoom(Number(el.dataset.zoom)),

  'set-lens': (el) => {
    setLens(el.dataset.level);
    // Staying put is the point of a lens — it re-reads the current screen.
    render({ keepScroll: true });
  },

  'open-driver': (el) =>
    go({ mode: 'explore', zoom: 1, slice: { type: 'driver', id: el.dataset.driver }, comp: null, beh: null, query: '' }),

  'open-level': (el) => {
    setLens(el.dataset.level);
    go({ mode: 'explore', zoom: 1, slice: { type: 'level', id: el.dataset.level }, comp: null, beh: null, query: '' });
  },

  'open-comp': (el) => go({ mode: 'explore', zoom: 2, comp: el.dataset.comp, beh: null }),

  'open-beh': (el) => {
    // Opening a specific level's rung switches the lens to that level.
    if (el.dataset.level) setLens(el.dataset.level);
    go({ mode: 'explore', zoom: 3, comp: el.dataset.comp, beh: el.dataset.beh });
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
    // Each rating was judged against one level's descriptors. Switching level
    // silently reinterprets them, so make that the assessor's call.
    if (rated > 0 && S.a.level && S.a.level !== next) {
      const from = levelById(S.a.level).name;
      const to = levelById(next).name;
      const clear = confirm(
        rated + ' behaviour' + (rated === 1 ? ' was' : 's were') + ' rated against ' + from + '. ' + to +
          ' describes the same behaviours at a different scope, so those ratings may no longer hold.\n\n' +
          'OK to clear them and rate again against ' + to + '. Cancel to keep them.'
      );
      if (clear) {
        S.a.ratings = {};
        S.a.step = 0;
      }
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
    if (!confirm('Clear this assessment and start again? This cannot be undone.')) return;
    S.a = blankAssessment();
    save();
    go({ mode: 'assess' });
    toast('Assessment cleared');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el);
});

document.addEventListener('input', (e) => {
  const el = e.target;

  if (el.id === 'q') {
    S.query = el.value;
    // Patch in place rather than re-render, so the field keeps focus mid-word.
    const host = document.querySelector('[data-search-results]');
    if (host) host.innerHTML = searchResults();
    const searching = !!S.query.trim();
    document.querySelectorAll('.layer > section').forEach((n) => {
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

  if (e.key === 'Escape') {
    if (typing) return;
    if (S.mode === 'explore' && S.zoom > 0) goZoom(S.zoom - 1);
    return;
  }

  if (e.key === '/' && !typing && S.mode === 'explore' && S.zoom < 2) {
    const q = document.getElementById('q');
    if (q) {
      e.preventDefault();
      q.focus();
    }
  }
});

/* ---------- Boot ---------------------------------------------------------- */

restore();
render();
