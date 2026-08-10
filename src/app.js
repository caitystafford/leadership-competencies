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

  const lensBtns = LEVELS.map(
    (l) =>
      '<button class="lens-btn" data-act="set-lens" data-level="' + l.id + '" ' +
      'style="--lens-dot:' + l.color + '" aria-pressed="' + (l.id === S.lens) + '">' + esc(l.name) + '</button>'
  ).join('');

  return (
    '<div class="rail"><div class="rail-inner">' +
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
  const placed = driver.competencies.map((c) => {
    const slot = SLOTS[c.slot];
    return {
      c,
      slot,
      disc: polar(slot.angle, RING.icon),
      // The lead starts at the disc's outer edge, not its centre, so the whole
      // dotted run is visible instead of half-hidden under the icon.
      from: polar(slot.angle, RING.icon + RING.disc),
      to: polar(slot.angle, RING.chip),
    };
  });

  const leads = placed
    .map(
      (p, i) =>
        '<line x1="' + p.from.x + '%" y1="' + p.from.y + '%" x2="' + p.to.x + '%" y2="' + p.to.y + '%" ' +
        'data-comp="' + p.c.id + '" style="animation-delay:' + (260 + i * 60) + 'ms"/>'
    )
    .join('');

  const nodes = placed
    .map(
      (p, i) =>
        '<button class="orbit-node" style="' + compVars(p.c) +
        ';left:' + p.disc.x + '%;top:' + p.disc.y + '%;animation-delay:' + (120 + i * 60) + 'ms" ' +
        'data-act="open-comp" data-comp="' + p.c.id + '" aria-label="' + esc(p.c.name) + '">' +
        icon(p.c.icon, 30) + '</button>'
    )
    .join('');

  // Chips carry the competency name only. The behaviours live in the list
  // below the ring — putting all fifteen on the diagram made it unreadable.
  const chips = placed
    .map(
      (p, i) =>
        '<button class="orbit-chip" data-side="' + p.slot.chip + '" style="' + compVars(p.c) +
        ';left:' + p.to.x + '%;top:' + p.to.y + '%;animation-delay:' + (300 + i * 60) + 'ms" ' +
        'data-act="open-comp" data-comp="' + p.c.id + '">' +
        '<span class="chip-name">' + esc(p.c.name) + '</span></button>'
    )
    .join('');

  const core =
    '<div class="orbit-core" style="top:' + CORE.y + '%;width:' + CORE.size + '%"><span class="core-title">' +
    driver.lines.map((t) => esc(t)).join('<br>') + '</span>' +
    '<span class="core-kicker">' + esc(driver.kicker) + '</span></div>';

  return (
    '<div class="orbit-wrap" style="' + driverVars(driver) + '"><div class="orbit" data-focus="">' +
    '<svg class="orbit-leads" preserveAspectRatio="none" aria-hidden="true">' + leads + '</svg>' +
    core + nodes + chips +
    '</div></div>'
  );
}

/* ---------- Zoom 0: framework ---------------------------------------------
   Two circles and nothing else. Everything below this screen is reached by
   opening one of them, so the entry point stays legible.
   ------------------------------------------------------------------------- */

function driverDial(driver) {
  // Five dots previewing the ring, on the dial's own circumference at the very
  // angles the competencies expand into. The dial is square, so this is plain
  // trigonometry rather than the aspect-corrected polar() the diagram needs.
  const dots = driver.competencies
    .map((c, i) => {
      const a = (SLOTS[c.slot].angle * Math.PI) / 180;
      return (
        '<span class="dial-dot" style="background:' + c.fill +
        ';left:' + (50 + 50 * Math.cos(a)) + '%;top:' + (50 - 50 * Math.sin(a)) +
        '%;transition-delay:' + i * 40 + 'ms"></span>'
      );
    })
    .join('');

  return (
    '<button class="dial" style="' + driverVars(driver) + '" data-act="open-driver" data-driver="' + driver.id + '">' +
    '<span class="dial-ring">' + dots +
    '<span class="dial-face">' +
    '<span class="dial-title">' + driver.lines.map((t) => esc(t)).join('<br>') + '</span>' +
    '<span class="dial-kicker">' + esc(driver.kicker) + '</span>' +
    '</span></span>' +
    '<span class="dial-meta">' +
    '<span class="dial-blurb">' + esc(driver.blurb) + '</span>' +
    '<span class="dial-open">5 competencies &middot; 15 behaviours <b>Open &rarr;</b></span>' +
    '</span></button>'
  );
}

function viewFramework() {
  const lens = levelById(S.lens);

  const levelRow = LEVELS.map(
    (l) =>
      '<button class="level-row" data-act="open-level" data-level="' + l.id + '"' +
      (l.id === S.lens ? ' data-current="true"' : '') + '>' +
      '<span class="lr-dot" style="background:' + l.color + '"></span>' +
      '<span class="lr-text"><b>' + esc(l.name) + '</b><span>' + esc(l.who) + '</span></span>' +
      '<span class="lr-go" aria-hidden="true">&rarr;</span></button>'
  ).join('');

  const body = S.query.trim()
    ? '<div data-search-results>' + searchResults() + '</div>'
    : '<section class="dials" aria-label="The two drivers">' + DRIVERS.map(driverDial).join('') + '</section>' +
      '<section class="levels" aria-label="Leadership levels">' +
      '<div class="levels-head"><h2>Three levels</h2>' +
      '<p>The same thirty behaviours run through every level — what changes is scope. ' +
      'You are reading at <b>' + esc(lens.name) + '</b>.</p></div>' +
      '<div class="level-list">' + levelRow + '</div></section>' +
      '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    '<div class="hero">' +
    '<span class="eyebrow">Cashies &middot; All For: 1</span>' +
    '<h1 class="headline">The leadership framework</h1>' +
    '<p class="prose lede">Two drivers hold the whole thing. Open one to see its five competencies, ' +
    'then a competency to see the behaviours underneath it.</p>' +
    '</div>' +
    searchBar('Search behaviours, definitions and expectations…') +
    body +
    '</div>'
  );
}

/* ---------- Zoom 1: a driver or a level ----------------------------------- */

function compRow(c, lens, n) {
  return (
    '<section class="comp-row" style="' + compVars(c) + '">' +
    '<button class="cr-head" data-act="open-comp" data-comp="' + c.id + '">' +
    '<span class="cr-badge">' + icon(c.icon, 22) + '</span>' +
    '<span class="cr-name">' + esc(c.name) + '</span>' +
    '<span class="cr-go" aria-hidden="true">&rarr;</span></button>' +
    '<div class="cr-body">' +
    c.behaviours
      .map(
        (b) =>
          '<button class="exp-card" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '" ' +
          'title="See what Needs Work, Great and Smashing It look like">' +
          '<span class="ec-name">' + esc(b.name) + '</span>' +
          '<span class="ec-exp">' + esc(b.levels[lens].expectation) + '</span></button>'
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

  const hero = isDriver
    ? '<div class="slice-head" style="' + driverVars(driver) + '">' +
      '<span class="eyebrow">Driver</span>' +
      '<h1 class="headline">' + esc(driver.name) + '</h1>' +
      '<p class="prose">' + esc(driver.kicker) + '. ' + esc(driver.blurb) + '</p></div>' +
      orbit(driver) +
      '<p class="ring-note">Pick a competency from the ring, or read them below at ' +
      '<b>' + esc(lens.name) + '</b> level.</p>'
    : '<div class="slice-head">' +
      '<span class="eyebrow">Level ' + (LEVELS.indexOf(lens) + 1) + ' of 3</span>' +
      '<h1 class="headline">' + esc(lens.name) + '</h1>' +
      '<p class="prose">' + esc(lens.tagline) + '</p>' +
      '<div class="slice-meta">' +
      '<div><span>Scope</span><b>' + esc(lens.scope) + '</b></div>' +
      '<div><span>Typically</span><b>' + esc(lens.who) + '</b></div>' +
      '</div></div>';

  let blocks;
  if (isDriver) {
    blocks = '<div class="comp-list">' + driver.competencies.map((c) => compRow(c, lens.id)).join('') + '</div>';
  } else {
    blocks = DRIVERS.map(
      (d) =>
        '<section class="driver-group" style="' + driverVars(d) + '">' +
        '<button class="dg-head" data-act="open-driver" data-driver="' + d.id + '">' +
        '<span class="dg-mark"></span><span class="dg-name">' + esc(d.name) + '</span>' +
        '<span class="dg-go" aria-hidden="true">&rarr;</span></button>' +
        '<div class="comp-list">' + d.competencies.map((c) => compRow(c, lens.id)).join('') + '</div>' +
        '</section>'
    ).join('');
  }

  const body = S.query.trim() ? '<div data-search-results>' + searchResults() + '</div>' : blocks + '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    hero +
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
      (b, i) =>
        '<section class="beh-block">' +
        '<div class="bb-top"><span class="bb-num">' + pad2(i + 1) + '</span>' +
        '<div><h3>' + esc(b.name) + '</h3><p class="bb-def">' + esc(b.definition) + '</p></div></div>' +
        '<div class="ladder">' +
        LEVELS.map(
          (l) =>
            '<button class="rung" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '" ' +
            'data-level="' + l.id + '" data-current="' + (l.id === lens.id) + '">' +
            '<span class="rung-name"><span class="rung-dot" style="background:' + l.color + '"></span>' +
            esc(l.name) + '</span>' +
            '<span class="rung-exp">' + esc(b.levels[l.id].expectation) + '</span></button>'
        ).join('') +
        '</div></section>'
    )
    .join('');

  return (
    '<div class="layer" data-motion="' + motionDir() + '" style="' + compVars(c) + ';' + driverVars(c.driver) + '">' +
    '<div class="comp-head">' +
    '<span class="ch-badge">' + icon(c.icon, 38) + '</span>' +
    '<div class="ch-text">' +
    '<button class="eyebrow ch-driver" data-act="open-driver" data-driver="' + c.driver.id + '">' +
    esc(c.driver.name) + '</button>' +
    '<h1 class="headline">' + esc(c.name) + '</h1>' +
    '<p class="prose">Three behaviours. Read across to see how each one changes shape as scope grows — ' +
    esc(lens.name) + ' is marked.</p>' +
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
      '<div><span class="eyebrow">Driver</span><h3>' + esc(d.name) + '</h3>' +
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

/* Pointing at any part of a spoke lights the whole spoke and quiets the rest.
   Decorative only — the diagram is fully usable without it. */
function focusOrbit(orbit, compId) {
  orbit.setAttribute('data-focus', compId || '');
  orbit.querySelectorAll('.orbit-node, .orbit-chip, .orbit-leads line').forEach((n) => {
    n.classList.toggle('is-focus', !!compId && n.dataset.comp === compId);
  });
}

document.addEventListener('pointerover', (e) => {
  const orbit = e.target.closest ? e.target.closest('.orbit') : null;
  if (!orbit) {
    document.querySelectorAll('.orbit:not([data-focus=""])').forEach((o) => focusOrbit(o, null));
    return;
  }
  const part = e.target.closest('[data-comp]');
  focusOrbit(orbit, part ? part.dataset.comp : null);
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
