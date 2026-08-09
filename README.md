# All For: 1 Leadership Framework

An interactive version of the Cash Converters All For: 1 leadership competency
matrix — ten competencies, thirty assessable behaviours, three leadership
levels — plus a self assessment and a team member assessment that download as a
PDF.

Everything is one file. `index.html` has no external requests at all: the data,
the styles, the logic and the Archivo typeface are embedded. Open it off disk,
email it, or drop it on any static host.

## Using it

**Explore** has four levels of zoom, and you can move between them with the
breadcrumb, the zoom control on the right, or the `Esc` key.

| Zoom | Shows |
|---|---|
| Framework | The whole thing — three levels, ten competencies, thirty behaviours |
| Level | Every behaviour expressed at Foundations, Momentum or Enterprise |
| Competency | Its three behaviours, with all three levels side by side |
| Behaviour | One behaviour at one level, with the Needs Work / Great / Smashing It descriptors |

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

Not everything comes from the workbook. The level taglines, scope lines and
"typically" lines are programme copy written for the app and live in the
`LEVELS` array at the top of `src/app.js` — edit them there.

## Layout

```
index.html               built artefact — the only file you need to deploy
build.py                 bundles src/ into index.html
scripts/extract_xlsx.py  workbook -> src/framework.json
src/framework.json       generated content, do not hand-edit
src/app.js               state, views, scoring, PDF
src/styles.css           the All For: 1 visual system
src/fonts/               Archivo variable subsets, embedded at build time
source/                  the original workbook
```

## Branding

Built to the Cash Converters All For: 1 app brand standard — navy `#150721`
ground, the five-colour spectrum bar, Archivo throughout, pill buttons,
uppercase headlines with tight tracking.

Two extensions to the standard were needed and are marked in the source:

- **`--red-tint` (`#e0808f`).** Brand red `#981a30` has too little contrast
  against navy for thin borders and label text. Solid red fills with white text
  still use the brand value; only borders and text on dark surfaces use the tint.
- **A 1180px wide layer.** The framework and level views are a wide matrix and
  need more room than the 880px report width, which reports and the assessment
  still use.

Competency accents cycle the five spectrum colours in order. Levels take
positions 1, 3 and 5 — blue-green for Foundations, yellow for Momentum, purple
for Enterprise — so they read as ascending.

## Browser support

Any current Chrome, Edge, Safari or Firefox. Print-to-PDF is tested against
Chromium's A4 output; the report is laid out to avoid breaking a behaviour
across a page.
