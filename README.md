# All For: 1 Leadership Framework

An interactive version of the Cash Converters All For: 1 leadership competency
matrix — two drivers, ten competencies, thirty assessable behaviours, three
leadership levels — plus a self assessment and a team member assessment that
download as a PDF.

Everything is one file. `index.html` has no external requests at all: the data,
the styles, the logic, the icons and the Archivo typeface are embedded. Open it
off disk, email it, or drop it on any static host.

## Structure

Every competency belongs to one of two drivers, matching the All For: 1
competency artwork:

| Driver | Skillset | Competencies |
|---|---|---|
| **Building Culture** | Values-focused, leadership | Responsibility, Community, Perseverance, Potential, Equity |
| **Drive Operations** | Business-focused, management | People, Systems & Execution, Risk Safety & Protection, Customer Trust, Performance |

## Using it

**Explore** has four levels of zoom, moved through with the breadcrumb, the zoom
control, or the `Esc` key.

| Zoom | Shows |
|---|---|
| Framework | Both drivers as the orbit diagram, plus the three levels |
| Driver or level | One driver's five competencies, or all ten grouped by driver |
| Competency | Its three behaviours, with all three levels side by side |
| Behaviour | One behaviour at one level, with the Needs Work / Great / Smashing It descriptors |

**Level is a lens, not a destination.** The Foundations / Momentum / Enterprise
control sits in the rail on every screen and re-reads whatever you are looking
at, so you never have to navigate back out to change level. Choosing a level
from the framework page also opens the whole framework at that level.

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

- **Level taglines, scope and "typically" lines** are programme copy written for
  the app. They live in the `LEVELS` array at the top of `src/app.js`.
- **Drivers, competency colours, orbit positions and icons** come from the
  competency artwork, not the spreadsheet. They live in `src/brand.js` —
  `DRIVERS`, `COMP_META`, `SLOTS` and `ICONS`.

**Known wording difference.** The artwork uses shorter labels for four
behaviours than the workbook does: *Grows capability* / "Learns and adapts",
*Acts ethically and fairly* / "Makes ethical decisions", *Solves problems* /
"Finds a way", *Uses insight to improve results* / "Uses insight and judgement".
The app follows the workbook, because those are the names the assessable rating
descriptors are written against. If the artwork's labels are the canonical ones,
change them in the workbook and re-run the two commands above.

### The logo

No logo file was available, so the wordmark is built from type — the lockup in
`logoMark()` in `src/brand.js`. To use the real asset, set `LOGO_SRC` at the top
of that file to a path or data URI and it is used everywhere instead.

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
shell: white cards on a warm off-white ground, a navy rail top and bottom, and
the ten competency colours doing the work. The framework page leads with the
orbit diagram from the artwork — driver at the centre, five competencies around
it, dotted leads out to their behaviours.

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

## Browser support

Any current Chrome, Edge, Safari or Firefox. Print-to-PDF is tested against
Chromium's A4 output; the report is laid out to avoid breaking a behaviour
across a page.
