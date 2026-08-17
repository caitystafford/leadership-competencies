# All For: 1 Leadership Framework

An interactive version of the Cash Converters All For: 1 leadership competency
matrix — two domains, ten competencies, thirty assessable behaviours, three
leadership levels — plus a self assessment and a team member assessment that
download as a PDF.

Everything is one file. `index.html` has no external requests at all: the data,
the styles, the logic, the icons and the Archivo typeface are embedded. Open it
off disk, email it, or drop it on any static host.

## Structure

Every competency sits in one of two **domains**, and the framework is read at
one of three **levels**.

| Domain | Skillset | Competencies |
|---|---|---|
| **Build Culture** | Values-focused, leadership | Responsibility, Community, Perseverance, Potential, Equity |
| **Drive Operations** | Business-focused, management | People, Systems & Execution, Risk Safety & Protection, Customer Trust, Performance |

| Level | Identity | Who |
|---|---|---|
| **Foundations** | Leaders in Future | Emerging leaders, ASMs, MTs and high performers preparing for leadership |
| **Momentum** | Leaders in Action | Store Managers and functional leaders delivering through a team |
| **Enterprise** | Leaders at Scale | Regional and senior leaders with broader business responsibility |

The methodology calls the two domains *drivers*, and the code still does. The
interface says "domain", because it is the word the framework overview itself
uses and a first-time reader does not have to be taught it.

## Using it

**The diagram is the interface.** The first screen is both domains drawn full
width as radial diagrams, one under the other — no card to click through first,
no level to choose before you have seen anything. All ten competency names are
readable off the two rings, and clicking any one of them opens it.

Explore is three screens, moved through with the breadcrumb or `Esc`:

| Screen | Shows |
|---|---|
| Framework | Both domains as rings, with all ten competencies named on them |
| Competency | The same ring one level down — three behaviours around the competency — then each behaviour written out at all three levels |
| Behaviour | One behaviour at one level, with the Needs Work / Great / Smashing It descriptors |

A three-sentence note at the top says what the three screens are before you
touch anything: two domains, ten competencies, thirty behaviours.

**The menu is how you move sideways.** Every domain, all ten competencies, the
three levels and the assessment are one click away in the drawer, so changing
subject never means retracing your steps back up the diagram. It opens from the
top left and closes on `Esc`, the close button or a click outside.

There is no "zoom" control and no separate domain page. The hierarchy is real,
but a domain is a *place on the diagram* rather than a screen of its own —
clicking a domain name anywhere scrolls you to its ring.

**Level is a lens, not a classification.** The rail says *Viewing level*, not
*Your level* — a Store Manager may well switch to Enterprise to see what growth
looks like. It sits on every screen and re-reads whatever you are looking at.
The competency screen sidesteps the question entirely by printing every
behaviour at all three levels at once, with the one you are viewing marked.

Press `/` to search across behaviour names, definitions, expectations and rating
descriptors.

**The tour.** Eight stops that drive the app themselves — each one sets the
state it needs, then spotlights something real on the screen, so a first-time
reader watches the interface work rather than reading a description of it. It
offers itself once on a first visit, with *No thanks* on the opening card, and
the answer is remembered either way. After that it lives at the bottom of the
menu and on the framework screen. Arrow keys step through it and `Esc` leaves.

Steps whose target changes with the viewport name a fallback — the five-point
rings become lists below 1010px, so the ring stop points at the list instead —
and a target that resolves to nothing dims the whole screen rather than
spotlighting a collapsed box.

**Every screen says what to do on it.** A single quiet line, the same shape
everywhere, sits above the content: click a competency to open it, click a level
row to read the full wording, pick one rating per behaviour, download the PDF to
keep the report. They are `howto()` calls in `src/app.js`.

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
- **Domains, competency colours, ring positions and icons** come from
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

The domain is **Build Culture**, not "Building Culture". Both decisions are locked
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
Navy and peach carry the two domains and nothing else. The ten competency
colours from the artwork appear only once you are inside a domain — five at a
time, never twenty — and levels and ratings are reduced to dots and pills
rather than filled cards.

Typography is Archivo throughout, per the All For: 1 app brand standard. The
artwork sets its two domain names in a rounded geometric face that is not
Archivo; that face is not identified anywhere available, so the app uses Archivo
at heavy weight instead. Name it and it is a one-line change.

Two notes on the palette:

- **Equity is dark green with gold type**, and **Community and Risk, Safety &
  Protection are deep red with white type**, because that is what the artwork
  does. This is a deliberate departure from the app brand standard's rule that
  green is only for growth indicators and red only for warnings.
- **A 1180px wide layer.** The framework and domain views need more room than
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

### The ring

Both levels of the framework use the same radial diagram, from one renderer:
a domain with its five competencies, and a competency with its three
behaviours. The discs sit *on* the core's circumference, and each chip hangs
off the same angle with a dotted lead and a pointer aimed back down the spoke.
Hovering any part of a spoke quiets the others.

Geometry for both lives in `RINGS` in `src/brand.js` — a five-point ring wants
a wider box than a three-point one, so each has its own, but the maths is
shared. In a competency ring the competency colour identifies the core and its
behaviours invert to navy, so three same-coloured discs do not dissolve into
the circle behind them.

The layout is verified by measurement rather than by eye — no chip spills its
box, collides with the core, another chip or another node; no disc covers the
core's own text; and the core title fits its column.

**One representation at a time.** Below 1010px the five-point ring is replaced
by a list of the same five competency cards, in the same order and colours,
rather than being squeezed. The three-point competency ring is narrow enough to
survive down to a phone, so it stays.

## Browser support

Any current Chrome, Edge, Safari or Firefox. Print-to-PDF is tested against
Chromium's A4 output; the report is laid out to avoid breaking a behaviour
across a page.
