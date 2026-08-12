/* =========================================================================
   All For: 1 — brand layer
   Drivers, competency colours, icons and the wordmark. Everything visual that
   is specific to the framework lives here; app.js stays about behaviour.
   ========================================================================= */

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
  green: '#163300',
  paper: '#ffffff',
  mist: '#f4f2f7',
};

const SPECTRUM = [C.blueGreen, C.lime, C.yellow, C.peach, C.purple];

/* ---------- Logo ----------------------------------------------------------
   Drop a real asset in by setting LOGO_SRC to a path or data URI — the
   wordmark below is the fallback lockup, built from type so it never 404s.
   ------------------------------------------------------------------------- */

const LOGO_SRC = null;

function logoMark(opts) {
  const o = opts || {};
  const ink = o.ink || '#ffffff';
  if (LOGO_SRC) {
    return '<img class="logo-img" src="' + LOGO_SRC + '" alt="All For: 1" />';
  }
  return (
    '<span class="logo" role="img" aria-label="All For: 1" style="color:' + ink + '">' +
    'All For<span class="logo-colon">:</span><span class="logo-one">1</span></span>'
  );
}

/* ---------- Leadership areas ----------------------------------------------
   The two halves of the framework. Called "drivers" in the methodology; the
   interface says "leadership area", which is what a first-time reader needs.
   The code keeps the shorter internal name.
   ------------------------------------------------------------------------- */

const DRIVERS = [
  {
    id: 'build-culture',
    name: 'Build Culture',
    lines: ['Build', 'Culture.'],
    kicker: 'Values-focused, leadership skillset',
    blurb: 'How leaders shape behaviour, mindset, and environment.',
    core: C.navy,
    coreInk: C.peach,
    coreSub: 'rgba(255,255,255,0.82)',
    tint: 'rgba(181,164,208,0.10)',
    order: ['responsibility', 'community', 'perseverance', 'potential', 'equity'],
  },
  {
    id: 'drive-operations',
    name: 'Drive Operations',
    lines: ['Drive', 'Operations.'],
    kicker: 'Business-focused, management skillset',
    blurb: 'How leaders create consistency, safety, and performance.',
    core: C.peach,
    coreInk: C.navy,
    coreSub: 'rgba(21,7,33,0.78)',
    tint: 'rgba(239,146,129,0.10)',
    order: ['people', 'systems-execution', 'risk-safety-protection', 'customer-trust', 'performance'],
  },
];

/* Where each competency sits in its driver's orbit, and how it is coloured.
   Both are lifted from the artwork rather than generated. */
const COMP_META = {
  responsibility: { fill: C.lime, ink: C.navy, icon: 'globe', slot: 'lower-left' },
  community: { fill: C.red, ink: '#ffffff', icon: 'heart', slot: 'upper-left' },
  perseverance: { fill: C.purple, ink: C.navy, icon: 'mountain', slot: 'top' },
  potential: { fill: C.blueGreen, ink: C.navy, icon: 'seedling', slot: 'upper-right' },
  equity: { fill: C.green, ink: C.yellow, icon: 'scales', slot: 'lower-right' },

  people: { fill: C.peach, ink: C.navy, icon: 'faces', slot: 'upper-left' },
  'systems-execution': { fill: C.blueGreen, ink: C.navy, icon: 'nodes', slot: 'lower-left' },
  'risk-safety-protection': { fill: C.red, ink: '#ffffff', icon: 'shield', slot: 'top' },
  'customer-trust': { fill: C.purple, ink: C.navy, icon: 'stars', slot: 'upper-right' },
  performance: { fill: C.lime, ink: C.navy, icon: 'growth', slot: 'lower-right' },
};

/* ---------- Orbit geometry ------------------------------------------------
   Everything is polar, measured from the centre of the core circle, so the
   five competencies read as a ring around it rather than a row either side.
   Radii are in "width units" — percentages of the diagram box's width — and
   angles are degrees anticlockwise from three o'clock, matching the artwork.
   ------------------------------------------------------------------------- */

const BOX = { w: 1000, h: 520 };

/* `y` is a percentage of the box height; `size` a percentage of its width. */
const CORE = { y: 64, size: 33 };

const RING = {
  icon: 16.5, // = the core's radius, so each disc straddles its circumference
  chip: 27.5, // where the chip's inner edge and its pointer sit
  disc: 4.6, // radius of a satellite disc, for where the dotted lead starts
};

const SLOTS = {
  top: { angle: 90, chip: 'top' },
  'upper-left': { angle: 146, chip: 'left' },
  'lower-left': { angle: 193, chip: 'left' },
  'upper-right': { angle: 31, chip: 'right' },
  'lower-right': { angle: -17, chip: 'right' },
};

/* Polar to percentage-of-box. A vertical offset given in width units has to be
   restated as a percentage of the height, hence the aspect correction. */
function polar(angle, radius) {
  const a = (angle * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(a),
    y: CORE.y - radius * Math.sin(a) * (BOX.w / BOX.h),
  };
}

/* ---------- Icons ---------------------------------------------------------
   Drawn to match the competency artwork: single-weight strokes, round caps,
   no fills. They inherit colour, so one set works on any disc.
   ------------------------------------------------------------------------- */

const ICONS = {
  globe:
    '<circle cx="24" cy="24" r="16.5"/><ellipse cx="24" cy="24" rx="7.2" ry="16.5"/>' +
    '<path d="M8.4 18.4h31.2M8.4 29.6h31.2"/>',

  heart:
    '<path d="M11 11h26a4.5 4.5 0 0 1 4.5 4.5v14A4.5 4.5 0 0 1 37 34H23l-8.5 7.5V34H11a4.5 4.5 0 0 1-4.5-4.5v-14A4.5 4.5 0 0 1 11 11z"/>' +
    '<path d="M24 29.4c-3.9-2.6-6.6-4.9-6.6-7.7a3.4 3.4 0 0 1 6.6-1.7 3.4 3.4 0 0 1 6.6 1.7c0 2.8-2.7 5.1-6.6 7.7z"/>',

  mountain:
    '<path d="M3.5 39.5h41L30.2 13.2l-7.6 13.4-5.1-6.3L3.5 39.5z"/>' +
    '<path d="M26.3 20.6l3.9-7.4 4.2 7.7-4 1.6-4.1-1.9z"/>',

  seedling:
    '<path d="M13.5 29.5h21l-2.3 12.6a2.2 2.2 0 0 1-2.2 1.8H18a2.2 2.2 0 0 1-2.2-1.8L13.5 29.5z"/>' +
    '<path d="M24 29.5V18"/>' +
    '<path d="M24 21.5c0-5.2 3.7-9 9-9 0 5.2-3.7 9-9 9z"/>' +
    '<path d="M24 25.5c0-4.5-3.2-7.8-7.8-7.8 0 4.5 3.2 7.8 7.8 7.8z"/>',

  scales:
    '<path d="M24 9.5v31M16 40.5h16"/><path d="M9 16.5h30"/><circle cx="24" cy="13" r="2.3"/>' +
    '<path d="M9 16.5L3.5 28a5.9 5.9 0 0 0 11 0L9 16.5z"/>' +
    '<path d="M39 16.5L33.5 28a5.9 5.9 0 0 0 11 0L39 16.5z"/>',

  faces:
    '<circle cx="18.5" cy="17" r="6.6"/><path d="M6.5 39.5a12 12 0 0 1 24 0"/>' +
    '<circle cx="33.5" cy="19.5" r="5.4"/><path d="M33.5 28a10.5 10.5 0 0 1 10.5 10.5"/>',

  nodes:
    '<circle cx="24" cy="24" r="4.8"/><circle cx="24" cy="9.5" r="4"/>' +
    '<circle cx="10.5" cy="34" r="4"/><circle cx="37.5" cy="34" r="4"/>' +
    '<path d="M24 13.5v5.7M20 26.6l-6 5M28 26.6l6 5"/>',

  shield:
    '<circle cx="24" cy="24" r="16.5" stroke-dasharray="2.4 5.4"/>' +
    '<circle cx="24" cy="24" r="6.4"/>' +
    '<circle cx="24" cy="7.5" r="3.4"/><circle cx="9.7" cy="32.3" r="3.4"/><circle cx="38.3" cy="32.3" r="3.4"/>',

  stars:
    '<path d="M9.5 27.5h29a0 0 0 0 1 0 0c0 8.6-7 15.5-15.5 15.5h-.5A13 13 0 0 1 9.5 30v-2.5z"/>' +
    '<path d="M18 12.5l1.9 4.9 4.9 1.9-4.9 1.9-1.9 4.9-1.9-4.9-4.9-1.9 4.9-1.9 1.9-4.9z"/>' +
    '<path d="M33 6.5l1.4 3.7 3.7 1.4-3.7 1.4-1.4 3.7-1.4-3.7-3.7-1.4 3.7-1.4 1.4-3.7z"/>',

  growth:
    '<circle cx="20" cy="28" r="14.5"/>' +
    '<path d="M25.5 22h-7.2a3.6 3.6 0 0 0 0 7.2h3.4a3.6 3.6 0 0 1 0 7.2H14"/>' +
    '<path d="M20 18.5v2.2M20 37.6v2.2"/>' +
    '<path d="M33 19L44 8M44 8h-7.5M44 8v7.5"/>',
};

function icon(name, size) {
  const body = ICONS[name];
  if (!body) return '';
  const s = size || 26;
  return (
    '<svg class="icon" viewBox="0 0 48 48" width="' + s + '" height="' + s + '" fill="none" ' +
    'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' + body + '</svg>'
  );
}
