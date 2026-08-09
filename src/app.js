/* =========================================================================
   All For: 1 Leadership Framework — application
   No dependencies, no network, no back end. Everything runs in the page.
   ========================================================================= */

const FRAMEWORK = /*__FRAMEWORK__*/ null;

/* ---------- Brand tokens -------------------------------------------------- */

const C = {
  navy: '#150721',
  navySoft: '#241335',
  navyLine: '#372550',
  blueGreen: '#85e3f4',
  lime: '#e3eb7b',
  yellow: '#ecb21f',
  peach: '#ef9281',
  purple: '#b5a4d0',
  red: '#981a30',
  redTint: '#e0808f',
  green: '#163300',
  paper: '#ffffff',
  mist: '#f4f2f7',
};

const SPECTRUM = [C.blueGreen, C.lime, C.yellow, C.peach, C.purple];

/* ---------- Framework meta ------------------------------------------------
   Level names and all behaviour copy come from the workbook. The tagline,
   scope and "who this is" lines below are programme copy written for the app
   — edit them here rather than in the spreadsheet.
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

// `color` is the brand value, used as a solid fill with `ink` on top. `tint`
// is the version that survives on a navy surface, with `tintInk` on top.
const RATINGS = [
  { id: 'needs-work', name: 'Needs Work', score: 1, color: C.red, ink: '#ffffff', tint: C.redTint, tintInk: C.navy },
  { id: 'great', name: 'Great', score: 2, color: C.lime, ink: C.navy, tint: C.lime, tintInk: C.navy },
  { id: 'smashing-it', name: 'Smashing It', score: 3, color: C.yellow, ink: C.navy, tint: C.yellow, tintInk: C.navy },
];

const STANDARD_NOTE =
  'Great is the standard. Smashing It exceeds at the same scope — it is not automatically the next leadership level.';

const COMPS = FRAMEWORK.competencies;
COMPS.forEach((c, i) => {
  c.color = SPECTRUM[i % SPECTRUM.length];
  c.index = i;
  c.behaviours.forEach((b, j) => {
    b.comp = c;
    b.index = j;
    b.key = c.id + '::' + b.id;
  });
});

const ALL_BEHAVIOURS = COMPS.flatMap((c) => c.behaviours);

const levelById = (id) => LEVELS.find((l) => l.id === id) || null;
const ratingById = (id) => RATINGS.find((r) => r.id === id) || null;
const compById = (id) => COMPS.find((c) => c.id === id) || null;
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
  level: null,
  comp: null,
  beh: null,
  query: '',
  a: blankAssessment(),
};

let lastZoom = 0;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ a: S.a }));
  } catch (e) {
    /* Private browsing or a full quota — the app still works, it just forgets. */
  }
}

function restore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.a && typeof saved.a === 'object') {
      S.a = Object.assign(blankAssessment(), saved.a);
    }
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

function goZoom(zoom) {
  const patch = { zoom, mode: 'explore' };
  if (zoom < 3) patch.beh = null;
  if (zoom < 2) patch.comp = null;
  if (zoom < 1) patch.level = null;
  go(patch);
}

function openBehaviour(compId, behId, levelId) {
  go({
    mode: 'explore',
    zoom: 3,
    comp: compId,
    beh: behId,
    level: levelId || S.level || 'foundations',
  });
}

/* ---------- Scoring ------------------------------------------------------- */

function ratedCount() {
  return ALL_BEHAVIOURS.filter((b) => S.a.ratings[b.key]).length;
}

function compScore(comp) {
  const scores = comp.behaviours
    .map((b) => ratingById(S.a.ratings[b.key]))
    .filter(Boolean)
    .map((r) => r.score);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function overallScore() {
  const scores = ALL_BEHAVIOURS.map((b) => ratingById(S.a.ratings[b.key]))
    .filter(Boolean)
    .map((r) => r.score);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function bandFor(score) {
  if (score == null) return { label: 'Not rated', color: C.navyLine };
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

function spectrumBar() {
  return '<div class="spectrum" aria-hidden="true">' + SPECTRUM.map((c) => '<span style="background:' + c + '"></span>').join('') + '</div>';
}

function topbar() {
  const tab = (id, label) =>
    '<button class="mode" data-act="mode" data-mode="' + id + '" aria-current="' + (S.mode === id) + '">' + label + '</button>';
  return (
    '<header class="topbar"><div class="topbar-inner">' +
    '<button class="wordmark" data-act="home"><b>All For: 1</b><i>Leadership Framework</i></button>' +
    '<nav class="modes">' + tab('explore', 'Explore') + tab('assess', 'Assessment') + '</nav>' +
    '</div></header>'
  );
}

function zoomRail() {
  const crumbs = [{ label: 'Framework', zoom: 0 }];
  if (S.level) crumbs.push({ label: levelById(S.level).name, zoom: 1 });
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

  const labels = ['Whole framework', 'Level', 'Competency', 'Behaviour'];
  const enabled = [true, !!S.level, !!S.comp, !!S.beh];
  const stops = labels
    .map(
      (label, i) =>
        '<button class="stop" data-act="zoom" data-zoom="' + i + '" title="' + esc(label) + '" ' +
        'aria-label="Zoom to ' + esc(label.toLowerCase()) + '" aria-current="' + (S.zoom === i) + '"' +
        (enabled[i] ? '' : ' disabled') + '><span></span></button>'
    )
    .join('');

  return (
    '<div class="rail"><div class="rail-inner">' +
    '<nav class="crumbs" aria-label="Framework depth">' + crumbHtml + '</nav>' +
    '<div class="zoomer"><span class="zoomer-label">Zoom</span><div class="stops">' + stops + '</div></div>' +
    '</div></div>'
  );
}

function footer(hint) {
  return (
    '<footer class="footer"><span class="mark">All for: 1</span>' +
    '<span class="hintline">' + esc(hint || '') + '</span></footer>'
  );
}

function sectionHead(title, accent) {
  return (
    '<div class="sec-head"><span class="bar" style="background:' + accent + '"></span>' +
    '<h3>' + esc(title) + '</h3></div>'
  );
}

function searchBar(placeholder) {
  return (
    '<div class="searchbar">' +
    '<input type="search" id="q" placeholder="' + esc(placeholder) + '" value="' + esc(S.query) + '" ' +
    'autocomplete="off" spellcheck="false" aria-label="Search behaviours">' +
    '<button class="clear" data-act="clear-search" aria-label="Clear search"' +
    (S.query ? '' : ' hidden') + '>&times;</button>' +
    '</div>'
  );
}

function searchResults() {
  const q = S.query.trim().toLowerCase();
  if (!q) return '';
  const scope = S.level ? [S.level] : LEVELS.map((l) => l.id);

  const hits = ALL_BEHAVIOURS.filter((b) => {
    const hay = [b.name, b.definition, b.comp.name]
      .concat(scope.map((id) => b.levels[id].expectation))
      .concat(scope.flatMap((id) => Object.values(b.levels[id].ratings)))
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  if (!hits.length) {
    return '<div class="empty">Nothing matches &ldquo;' + esc(S.query) + '&rdquo;. Try a shorter word.</div>';
  }

  const lens = S.level || 'foundations';
  return (
    '<p class="micro" style="color:rgba(255,255,255,.4);margin-bottom:14px">' +
    hits.length + ' of 30 behaviours</p><div class="results">' +
    hits
      .map(
        (b) =>
          '<button class="result" style="--accent:' + b.comp.color + '" data-act="open-beh" ' +
          'data-comp="' + b.comp.id + '" data-beh="' + b.id + '" data-level="' + lens + '">' +
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

/* ---------- Explore: zoom 0 ----------------------------------------------- */

function viewFramework() {
  const levelCards = LEVELS.map(
    (l) =>
      '<button class="level-card" style="--accent:' + l.color + '" data-act="open-level" data-level="' + l.id + '">' +
      '<span class="eyebrow" style="color:' + l.color + '">Level ' + (LEVELS.indexOf(l) + 1) + '</span>' +
      '<h3>' + esc(l.name) + '</h3><p>' + esc(l.tagline) + '</p>' +
      '<div class="scope">' + esc(l.who) + '</div></button>'
  ).join('');

  const compCards = COMPS.map(
    (c) =>
      '<div class="comp-card" style="--accent:' + c.color + '">' +
      '<button class="cc-title" data-act="open-comp" data-comp="' + c.id + '">' +
      '<span class="num">' + pad2(c.index + 1) + '</span>' +
      '<span class="h">' + esc(c.name) + '</span></button>' +
      '<div class="behaviours">' +
      c.behaviours
        .map(
          (b) =>
            '<button class="beh-line" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '">' +
            '<span class="dot"></span><span>' + esc(b.name) + '</span></button>'
        )
        .join('') +
      '</div></div>'
  ).join('');

  const body = S.query.trim()
    ? '<div data-search-results>' + searchResults() + '</div>'
    : '<section aria-label="Leadership levels">' +
      sectionHead('The three levels', C.blueGreen) +
      '<p class="prose" style="color:rgba(255,255,255,.62);max-width:64ch;margin-bottom:22px">' +
      'The same ten competencies run through every level. What changes is scope — how far the behaviour reaches and how much of the system a leader is shaping.</p>' +
      '<div class="level-cards">' + levelCards + '</div></section>' +
      '<section aria-label="Competencies">' +
      sectionHead('Ten competencies, thirty behaviours', C.lime) +
      '<p class="prose" style="color:rgba(255,255,255,.62);max-width:64ch;margin-bottom:22px">' +
      'Pick a competency to see how it grows across the levels, or jump straight to a single behaviour.</p>' +
      '<div class="comp-grid">' + compCards + '</div></section>' +
      '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    '<div class="hero">' +
    '<span class="eyebrow">Cashies &middot; All For: 1</span>' +
    '<h1 class="headline">The leadership framework</h1>' +
    '<p>Ten All For: 1 competencies, expressed through thirty assessable behaviours, across three levels of leadership. ' +
    'Zoom out for the whole picture, or zoom all the way in to what good looks like in a single behaviour.</p>' +
    '<div class="stats">' +
    '<div class="stat"><b>10</b><span>Competencies</span></div>' +
    '<div class="stat"><b>30</b><span>Behaviours</span></div>' +
    '<div class="stat"><b>3</b><span>Levels</span></div>' +
    '<div class="stat"><b>90</b><span>Expectations</span></div>' +
    '</div></div>' +
    searchBar('Search behaviours, definitions and expectations…') +
    body +
    '</div>'
  );
}

/* ---------- Explore: zoom 1 ----------------------------------------------- */

function viewLevel() {
  const l = levelById(S.level);

  const blocks = COMPS.map(
    (c) =>
      '<section class="level-comp" style="--accent:' + c.color + '">' +
      '<div class="lc-head"><button data-act="open-comp" data-comp="' + c.id + '">' +
      '<div class="lc-num">' + pad2(c.index + 1) + '</div><h3>' + esc(c.name) + '</h3></button></div>' +
      '<div class="lc-body">' +
      c.behaviours
        .map(
          (b) =>
            '<button class="exp-card" data-act="open-beh" data-comp="' + c.id + '" data-beh="' + b.id + '" data-level="' + l.id + '" ' +
            'title="See what Needs Work, Great and Smashing It look like">' +
            '<h4><span>' + esc(b.name) + '</span><span class="more" aria-hidden="true">&rarr;</span></h4>' +
            '<p>' + esc(b.levels[l.id].expectation) + '</p></button>'
        )
        .join('') +
      '</div></section>'
  ).join('');

  const body = S.query.trim() ? '<div data-search-results>' + searchResults() + '</div>' : blocks + '<div data-search-results></div>';

  return (
    '<div class="layer" data-motion="' + motionDir() + '">' +
    '<div class="level-hero" style="--accent:' + l.color + '">' +
    '<span class="eyebrow">Level ' + (LEVELS.indexOf(l) + 1) + ' of 3</span>' +
    '<h1 class="headline">' + esc(l.name) + '</h1><p>' + esc(l.tagline) + '</p>' +
    '<div class="scope-row">' +
    '<div><span>Scope</span><b>' + esc(l.scope) + '</b></div>' +
    '<div><span>Typically</span><b>' + esc(l.who) + '</b></div>' +
    '<div><span>Behaviours</span><b>30 at this level</b></div>' +
    '</div></div>' +
    '<div class="note"><span class="flag"></span><span>' + esc(STANDARD_NOTE) + '</span></div>' +
    searchBar('Search ' + l.name + ' expectations…') +
    body +
    '</div>'
  );
}

/* ---------- Explore: zoom 2 ----------------------------------------------- */

function viewCompetency() {
  const c = compById(S.comp);

  const blocks = c.behaviours
    .map(
      (b) =>
        '<section class="beh-block">' +
        '<div class="bb-top"><h3>' + esc(b.name) + '</h3>' +
        '<span class="micro" style="color:rgba(255,255,255,.35)">Behaviour ' + (b.index + 1) + ' of 3</span></div>' +
        '<p class="bb-def">' + esc(b.definition) + '</p>' +
        '<div class="ladder">' +
        LEVELS.map(
          (l) =>
            '<button class="rung" style="--accent:' + l.color + '" data-act="open-beh" data-comp="' + c.id + '" ' +
            'data-beh="' + b.id + '" data-level="' + l.id + '" data-dim="' + (!!S.level && S.level !== l.id) + '">' +
            '<span class="rung-name">' + esc(l.name) + '</span><p>' + esc(b.levels[l.id].expectation) + '</p></button>'
        ).join('') +
        '</div></section>'
    )
    .join('');

  return (
    '<div class="layer" data-motion="' + motionDir() + '" style="--accent:' + c.color + '">' +
    '<div class="comp-hero">' +
    '<span class="eyebrow" style="color:' + c.color + '">Competency ' + pad2(c.index + 1) + ' of 10</span>' +
    '<h1 class="headline">' + esc(c.name) + '</h1>' +
    '<p>Three assessable behaviours. Read across to see how the same behaviour changes shape as scope grows.</p>' +
    '</div>' + blocks + '</div>'
  );
}

/* ---------- Explore: zoom 3 ----------------------------------------------- */

function viewBehaviour() {
  const c = compById(S.comp);
  const b = behById(S.comp, S.beh);
  const l = levelById(S.level) || LEVELS[0];
  const cell = b.levels[l.id];

  const pos = ALL_BEHAVIOURS.indexOf(b);
  const prev = ALL_BEHAVIOURS[pos - 1];
  const next = ALL_BEHAVIOURS[pos + 1];

  const pagerBtn = (target, dir) =>
    '<button class="' + (dir === 'next' ? 'next' : 'prev') + '"' +
    (target
      ? ' data-act="open-beh" data-comp="' + target.comp.id + '" data-beh="' + target.id + '" data-level="' + l.id + '"'
      : ' disabled') +
    '><span class="pg-dir">' + (dir === 'next' ? 'Next behaviour' : 'Previous behaviour') + '</span>' +
    '<span class="pg-name">' + esc(target ? target.name : '—') + '</span></button>';

  return (
    '<div class="layer narrow" data-motion="' + motionDir() + '" style="--accent:' + l.color + ';--tab-accent:' + l.color + '">' +
    '<div class="beh-hero">' +
    '<button class="eyebrow" style="color:' + c.color + ';background:none;border:0;padding:0;cursor:pointer" ' +
    'data-act="open-comp" data-comp="' + c.id + '">' + esc(c.name) + ' &rsaquo;</button>' +
    '<h1 class="headline">' + esc(b.name) + '</h1>' +
    '<p class="def">' + esc(b.definition) + '</p></div>' +
    '<div class="tabs" role="tablist" aria-label="Leadership level">' +
    LEVELS.map(
      (lv) =>
        '<button class="tab" role="tab" aria-selected="' + (lv.id === l.id) + '" ' +
        'data-act="set-level" data-level="' + lv.id + '">' + esc(lv.name) + '</button>'
    ).join('') +
    '</div>' +
    '<div class="expectation"><span class="eyebrow">' + esc(l.name) + ' expectation</span>' +
    '<p>' + esc(cell.expectation) + '</p></div>' +
    '<div class="note" style="margin-bottom:22px"><span class="flag"></span><span>' + esc(STANDARD_NOTE) + '</span></div>' +
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
    '<button class="choice" style="--accent:' + C.blueGreen + '" data-act="set-kind" data-kind="' + id + '" ' +
    'aria-pressed="' + (a.kind === id) + '"><b>' + esc(title) + '</b><span>' + esc(blurb) + '</span></button>';

  const levelChoice = (l) =>
    '<button class="choice" style="--accent:' + l.color + '" data-act="set-alevel" data-level="' + l.id + '" ' +
    'aria-pressed="' + (a.level === l.id) + '"><b>' + esc(l.name) + '</b><span>' + esc(l.who) + ' &middot; ' + esc(l.scope) + '</span></button>';

  const subjectLabel = a.kind === 'self' ? 'Your name' : 'Team member’s name';
  const roleLabel = a.kind === 'self' ? 'Your role' : 'Their role';

  return (
    '<div class="layer narrow" data-motion="flat">' +
    '<div class="hero" style="margin-bottom:32px">' +
    '<span class="eyebrow">Assessment</span>' +
    '<h1 class="headline" style="font-size:clamp(32px,5.2vw,48px)">Set it up</h1>' +
    '<p style="font-size:16px">Thirty behaviours, rated against one level. It takes about fifteen minutes. ' +
    'Nothing is sent anywhere — the draft is saved in this browser only, and you download the finished assessment as a PDF.</p>' +
    '</div>' +
    (hasDraft
      ? '<div class="note" style="margin-bottom:28px"><span class="flag"></span><span>' +
        'You have a draft in progress — <b>' + ratedCount() + ' of 30</b> behaviours rated. ' +
        'Continue below, or clear it and start again.</span></div>'
      : '') +
    '<div class="field"><label>Who is this for?</label><div class="choice-row">' +
    kindChoice('self', 'Self assessment', 'You rate your own leadership behaviours.') +
    kindChoice('team', 'Team member', 'You rate someone who reports to you.') +
    '</div></div>' +
    '<div class="field"><label for="f-subject">' + esc(subjectLabel) + '</label>' +
    '<input type="text" id="f-subject" data-field="subject" value="' + esc(a.subject) + '" placeholder="Full name" autocomplete="off"></div>' +
    '<div class="field"><label for="f-role">' + esc(roleLabel) + '</label>' +
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
        '<div class="q-block" style="--accent:' + c.color + ';--lvl:' + l.color + '">' +
        '<h3>' + esc(b.name) + '</h3>' +
        '<p class="q-def">' + esc(b.definition) + '</p>' +
        '<div class="q-expect"><span>' + esc(l.name) + ' expectation</span><p>' + esc(b.levels[l.id].expectation) + '</p></div>' +
        '<div class="opt-row" role="group" aria-label="Rating for ' + esc(b.name) + '">' +
        RATINGS.map(
          (r) =>
            '<button class="opt" style="--r-color:' + r.tint + ';--r-ink:' + r.tintInk + '" data-act="rate" ' +
            'data-key="' + esc(b.key) + '" data-rating="' + r.id + '" aria-pressed="' + (chosen === r.id) + '">' +
            '<span class="opt-tag">' + esc(r.name) + '</span>' +
            '<p>' + esc(b.levels[l.id].ratings[r.id]) + '</p></button>'
        ).join('') +
        '</div></div>'
      );
    })
    .join('');

  const dots = COMPS.map((comp, i) => {
    const filled = comp.behaviours.every((b) => a.ratings[b.key]);
    return (
      '<button class="step-dot" data-act="goto-step" data-step="' + i + '" data-done="' + filled + '" ' +
      'aria-current="' + (i === a.step) + '" aria-label="' + esc(comp.name) + '" title="' + esc(comp.name) + '"></button>'
    );
  }).join('');

  const complete = done === ALL_BEHAVIOURS.length;
  const last = a.step === COMPS.length - 1;

  return (
    '<div class="layer narrow" data-motion="flat">' +
    '<div class="progress-head">' +
    '<div><span class="eyebrow" style="color:' + l.color + '">' + esc(l.name) + ' &middot; ' +
    esc(a.kind === 'self' ? 'Self assessment' : a.subject || 'Team member') + '</span>' +
    '<h1 class="headline" style="font-size:clamp(28px,4.4vw,40px);margin-top:10px;color:' + c.color + '">' + esc(c.name) + '</h1></div>' +
    '<span class="micro">Competency ' + (a.step + 1) + ' of 10 &middot; ' + done + '/30 rated</span>' +
    '</div>' +
    '<div class="track"><div class="fill" style="width:' + Math.max((done / 30) * 100, 2) + '%"></div></div>' +
    blocks +
    '<div class="q-block" style="--accent:' + c.color + '">' +
    '<div class="field" style="margin:0"><label for="f-notes">Evidence or notes on ' + esc(c.name) + ' <span style="color:rgba(255,255,255,.3)">(optional)</span></label>' +
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
      ? '<p class="hint" style="margin-top:14px;color:rgba(255,255,255,.4);font-size:13px">' +
        '<button class="btn ghost small" data-act="goto-unrated">Jump to the first unrated behaviour</button></p>'
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

  const scored = COMPS.map((c) => ({ comp: c, score: compScore(c) })).filter((x) => x.score != null);
  const ranked = scored.slice().sort((x, y) => y.score - x.score);

  const strengths = ALL_BEHAVIOURS.filter((b) => a.ratings[b.key] === 'smashing-it');
  const focus = ALL_BEHAVIOURS.filter((b) => a.ratings[b.key] === 'needs-work');
  const stretch = ranked.slice(-3).reverse();

  const meterRow = (name, sub, score, color) => {
    const pct = (score / 3) * 100;
    const b = bandFor(score);
    return (
      '<div class="rpt-row"><div><div class="rr-name">' + esc(name) + '</div>' +
      (sub ? '<div class="rr-sub">' + esc(sub) + '</div>' : '') + '</div>' +
      '<div class="meter"><div class="mid" title="Great is the standard" style="left:66.6%"></div>' +
      '<div class="mfill" style="width:' + pct + '%;background:' + (color || b.color) + '"></div></div>' +
      '<div class="rr-score">' + score.toFixed(1) + '<small>/3</small></div></div>'
    );
  };

  const behaviourList = (list, numbered) =>
    '<div class="pill-list">' +
    list
      .map(
        (b, i) =>
          '<div class="pill-item">' +
          (numbered
            ? '<span class="n">' + (i + 1) + '</span>'
            : '<span class="d" style="background:' + b.comp.color + '"></span>') +
          '<div><b>' + esc(b.name) + '</b>' +
          '<p>' + esc(b.comp.name) + ' — ' + esc(b.levels[l.id].ratings[a.ratings[b.key]]) + '</p></div></div>'
      )
      .join('') +
    '</div>';

  const detail = COMPS.map((c) => {
    const score = compScore(c);
    return (
      '<div class="detail-comp">' +
      '<div class="sec-head" style="margin-bottom:10px"><span class="bar" style="background:' + c.color + '"></span>' +
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
  }).join('');

  return (
    '<div class="layer" data-motion="flat">' +
    '<div class="rpt-actions print-hide">' +
    '<button class="btn" data-act="print">Download as PDF</button>' +
    '<button class="btn on-light ghost small" data-act="edit-answers">Edit answers</button>' +
    '<button class="btn on-light ghost small" data-act="reset">Start a new assessment</button>' +
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
    '<div class="rpt-card">' + sectionHead('Competency profile', C.yellow) +
    '<p style="font-size:14px;color:rgba(21,7,33,.6);margin-bottom:16px">' +
    'Each competency is the average of its three behaviours. The line marks the standard — Great across all three.</p>' +
    scored.map((x) => meterRow(x.comp.name, null, x.score)).join('') + '</div>' +
    '<div class="rpt-card">' + sectionHead('Strengths to keep using', C.lime) +
    (strengths.length
      ? behaviourList(strengths, false)
      : '<p style="font-size:14px;color:rgba(21,7,33,.6)">Nothing was rated Smashing It this time. The strongest competencies are ' +
        ranked.slice(0, 2).map((x) => '<b>' + esc(x.comp.name) + '</b>').join(' and ') + '.</p>') +
    '</div>' +
    '<div class="rpt-card">' + sectionHead(focus.length ? 'Where to focus next' : 'Next stretch', C.yellow) +
    (focus.length
      ? '<p style="font-size:14px;color:rgba(21,7,33,.6);margin-bottom:16px">Behaviours rated Needs Work. Pick one or two — not all of them.</p>' +
        behaviourList(focus, true)
      : '<p style="font-size:14px;color:rgba(21,7,33,.6);margin-bottom:16px">Nothing sits below the standard. These are the lowest scoring competencies and the natural place to stretch.</p>' +
        '<div class="pill-list">' +
        stretch
          .map(
            (x, i) =>
              '<div class="pill-item"><span class="n">' + (i + 1) + '</span><div><b>' + esc(x.comp.name) + '</b>' +
              '<p>Scoring ' + x.score.toFixed(1) + ' of 3 across its three behaviours.</p></div></div>'
          )
          .join('') +
        '</div>') +
    '</div>' +
    '<div class="rpt-card page-break">' + sectionHead('Every behaviour', C.purple) +
    '<p style="font-size:14px;color:rgba(21,7,33,.6);margin-bottom:18px">' +
    'The full record — each behaviour, the rating given, and the descriptor that rating matched at ' + esc(l.name) + ' level.</p>' +
    detail + '</div>' +
    '<p class="print-note print-hide">Download opens your browser&rsquo;s print dialog — choose <b>Save as PDF</b> as the destination. ' +
    'Nothing leaves this device.</p>' +
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
    if (S.a.stage === 'report') return { html: viewReport(), light: true, hint: 'Saved on this device only' };
    if (S.a.stage === 'rate') return { html: viewAssessStep(), light: false, hint: 'Draft saves as you go' };
    return { html: viewAssessSetup(), light: false, hint: 'Nothing is sent anywhere' };
  }
  if (S.zoom === 3 && S.beh) return { html: viewBehaviour(), light: false, hint: 'Esc to zoom out' };
  if (S.zoom === 2 && S.comp) return { html: viewCompetency(), light: false, hint: 'Esc to zoom out' };
  if (S.zoom === 1 && S.level) return { html: viewLevel(), light: false, hint: 'Esc to zoom out' };
  S.zoom = 0;
  return { html: viewFramework(), light: false, hint: 'Press / to search' };
}

function render(opts) {
  const view = currentView();
  const showRail = S.mode === 'explore';

  document.body.className = view.light ? 'report-page' : '';
  document.getElementById('app').innerHTML =
    '<div class="shell">' +
    spectrumBar() +
    topbar() +
    (showRail ? zoomRail() : '') +
    '<main>' + view.html + '</main>' +
    footer(view.hint) +
    '</div>';

  lastZoom = S.zoom;
  if (!opts || !opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ---------- Events -------------------------------------------------------- */

const ACTIONS = {
  home: () => go({ mode: 'explore', zoom: 0, level: null, comp: null, beh: null, query: '' }),

  mode: (el) => go({ mode: el.dataset.mode }),

  'back-setup': () => {
    S.a.stage = 'setup';
    save();
    render();
  },

  zoom: (el) => goZoom(Number(el.dataset.zoom)),

  'open-level': (el) => go({ mode: 'explore', zoom: 1, level: el.dataset.level, comp: null, beh: null, query: '' }),

  'open-comp': (el) => go({ mode: 'explore', zoom: 2, comp: el.dataset.comp, beh: null }),

  'open-beh': (el) => openBehaviour(el.dataset.comp, el.dataset.beh, el.dataset.level),

  'set-level': (el) => go({ level: el.dataset.level }, { keepScroll: true }),

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
        rated + ' behaviour' + (rated === 1 ? ' was' : 's were') + ' rated against ' + from +
          '. ' + to + ' describes the same behaviours at a different scope, so those ratings may no longer hold.\n\n' +
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
  if (!fn) return;
  // Behaviour chips sit inside clickable competency cards; stop the card firing too.
  if (el.dataset.stop) e.stopPropagation();
  fn(el);
});

// Competency cards are divs so their behaviour chips can be real buttons.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.comp-card[data-act]');
  if (!card || e.target !== card) return;
  e.preventDefault();
  ACTIONS['open-comp'](card);
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
