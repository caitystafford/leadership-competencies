# All For: 1 Leadership Framework

An interactive version of the Cash Converters All For: 1 leadership competency
matrix — two leadership areas, ten competencies, thirty assessable behaviours, three
leadership levels — plus a self assessment and a team member assessment that
download as a PDF.

Everything is one file. `index.html` has no external requests at all: the data,
the styles, the logic, the icons and the Archivo typeface are embedded. Open it
off disk, email it, or drop it on any static host.

## Structure

Every competency sits in one of two **leadership areas**, and the framework is
read at one of three **levels**.

| Leadership area | Skillset | Competencies |
|---|---|---|
| **Build Culture** | Values-focused, leadership | Responsibility, Community, Perseverance, Potential, Equity |
| **Drive Operations** | Business-focused, management | People, Systems & Execution, Risk Safety & Protection, Customer Trust, Performance |

| Level | Identity | Who |
|---|---|---|
| **Foundations** | Leaders in Future | Emerging leaders, ASMs, MTs and high performers preparing for leadership |
| **Momentum** | Leaders in Action | Store Managers and functional leaders delivering through a team |
| **Enterprise** | Leaders at Scale | Regional and senior leaders with broader business responsibility |

The methodology calls the two areas *drivers*, and the code still does. The
interface says "leadership area", because that is a term a first-time reader
does not have to be taught.

## Using it

**The first screen orients before it asks you to explore.** In order: what this
is, how it is organised, which level applies to you, and only then the two areas
to open. Level selection sits *above* the areas, because the level you pick
changes every expectation you will read afterwards.

**Explore** goes four screens deep, moved through with the breadcrumb or `Esc`:

| Screen | Shows |
|---|---|
| Framework | Orientation, level choice, and the two areas as circles |
| Area or level | One area expanded into its ring of five competencies, or all ten grouped by area |
| Competency | Its three behaviours, with all three levels side by side |
| Behaviour | One behaviour at one level, with the Needs Work / Great / Smashing It descriptors |

There is no "zoom" control. The hierarchy is real, but naming it after the
design metaphor made people learn the interface architecture; the breadcrumb
already says where you are.

**Level is a lens, not a destination.** The Foundations / Momentum / Enterprise
control sits in the rail on every screen and re-reads whatever you are looking
at, so you never have to navigate back out to change level. Every screen states
which level you are reading in plain words rather than assuming you remember.

Press `/` to search across behaviour names, definitions, expectations and rating
descriptors.

**Assessment** covers the same thirty behaviours, one competency per screen,
rated against a single level. Ratings are scored Needs Work 1, Great 2,
Smashing It 3, and each competency reports the average of its three behaviours.
Great is the standard, so 2.0 is the line the report marks.

The draft is kept in the browser's `localStorage` and nothing is sent anywhere.
**Download as PDF** opens the browser print dialog — choose *Save as PDF* as the
destination. Clearing site data or using a different browser or device loses the
draft, so download the PDF when you are done.

## Editing the content

The behaviour copy is generated from the workbook in `source/`. To change it,
edit the workbook and re-run both steps:

```bash
pip install openpyxl              # once
python3 scripts/extract_xlsx.py   # source/*.xlsx  ->  src/framework.json
python3 build.py                  # src/*          ->  index.html
```

`extract_xlsx.py` expects the workbook's four sheets — `Full Matrix`, plus
`Foundations Ratings`, `Momentum Ratings` and `Enterprise Ratings` — each with
the header row starting `All For:1 competency`. It fails loudly rather than
silently dropping rows if a behaviour in a ratings sheet has no match in the
matrix.

Not everything comes from the workbook:

- **Level identities, audiences and focus lines** are the programme's own
  language for the three stages. They live in the `LEVELS` array at the top of
  `src/app.js`.
- **Leadership areas, competency colours, ring positions and icons** come from
  the competency artwork, not the spreadsheet. They live in `src/brand.js` —
  `DRIVERS`, `COMP_META`, `SLOTS` and `ICONS`.

**Canonical names.** The workbook is the single source of truth for behaviour
names, and the app follows it — those are the names the Needs Work / Great /
Smashing It descriptors are written against. Where the artwork differs it is the
artwork that needs updating, not this app:

| Workbook (canonical) | Artwork |
|---|---|
| Learns and adapts | Grows capability |
| Makes ethical decisions | Acts ethically and fairly |
| Finds a way | Solves problems |
| Uses insight and judgement | Uses insight to improve results |

The area is **Build Culture**, not "Building Culture". Both decisions are locked
so the app, framework PDF, decks and assessment language can be made identical.

### The logo

No usable logo file was available, so the wordmark is set from type, all white,
in `logoMark()` in `src/brand.js`. To use the real asset, set `LOGO_SRC` at the
top of that file to a path or data URI and it is used everywhere instead.

## Layout

```
index.html               built artefact — the only file you need to deploy
build.py                 bundles src/ into index.html
scripts/extract_xlsx.py  workbook -> src/framework.json
src/framework.json       generated content, do not hand-edit
src/brand.js             drivers, competency colours, orbit geometry, icons, logo
src/app.js               state, views, scoring, PDF
src/styles.css           the visual system
src/fonts/               Archivo variable subsets, embedded at build time
source/                  the original workbook
```

## Design

Light-first, built around the competency artwork rather than the dark app
shell: white cards on a warm off-white ground, a navy rail top and bottom.

**Colour is rationed.** The page itself is paper, ink and one warm neutral.
Navy and peach carry the two drivers and nothing else. The ten competency
colours from the artwork appear only once you are inside a driver — five at a
time, never twenty — and levels and ratings are reduced to dots and pills
rather than filled cards.

Typography is Archivo throughout, per the All For: 1 app brand standard. The
artwork sets its two driver names in a rounded geometric face that is not
Archivo; that face is not identified anywhere available, so the app uses Archivo
at heavy weight instead. Name it and it is a one-line change.

Two notes on the palette:

- **Equity is dark green with gold type**, and **Community and Risk, Safety &
  Protection are deep red with white type**, because that is what the artwork
  does. This is a deliberate departure from the app brand standard's rule that
  green is only for growth indicators and red only for warnings.
- **A 1200px wide layer.** The framework and driver views need more room than
  the 900px width that reports and the assessment use.

Levels take spectrum positions 1, 3 and 5 — blue-green for Foundations, yellow
for Momentum, purple for Enterprise — so they read as ascending.

The page commits to this one light world and does not swap with the viewer's
system theme. Every colour and the page background are painted explicitly, so it
holds up on either a light or a dark host background.

Icons are hand-drawn inline SVG in `src/brand.js`, matching the artwork's
single-weight stroke style. They inherit `currentColor`, so one set works on any
coloured disc.

### The report

Built from the same two circles as the framework, so the dashboard and the
thing it measures read as one system: a radial gauge for the whole assessment,
one per driver in its driver colour, then the five competencies under each as
plain bars. A tick on every gauge and a line on every bar marks the standard —
Great across the board, 2.0 of 3.

### The orbit diagram

All of its geometry is polar and lives in `BOX`, `CORE`, `RING` and `SLOTS` in
`src/brand.js`: the five discs sit *on* the core's circumference, and each chip
hangs off the same angle with a dotted lead and a pointer aimed back down the
spoke. Hovering any part of a spoke quiets the other four.

The layout is verified by measurement rather than by eye — no chip spills its
box, collides with the core, another chip or another node; no disc covers the
core's own text; and the core title fits its column — at every width down to
1010px, below which the diagram becomes a stacked list.

## Browser support

Any current Chrome, Edge, Safari or Firefox. Print-to-PDF is tested against
Chromium's A4 output; the report is laid out to avoid breaking a behaviour
across a page.
