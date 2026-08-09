#!/usr/bin/env python3
"""Bundle src/ into a single self-contained page.

Writes two files with identical content:

  index.html     a complete HTML document — deploy, email or open it off disk
  artifact.html  the same page without the document wrapper, for publishing to
                 claude.ai, which supplies its own <head> and <body>

Neither makes a single external request. The data, styles, logic and typeface
are all embedded.

    python3 build.py
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT_DOC = ROOT / "index.html"
OUT_FRAGMENT = ROOT / "artifact.html"

HEAD = """<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="The Cash Converters All For: 1 leadership framework — ten competencies, thirty behaviours, three levels, with self and team member assessments.">
<meta name="color-scheme" content="dark light">
<title>All For: 1 Leadership Framework</title>
<style>
__CSS__
</style>"""

BODY = """<div id="app"></div>
<div class="toast" id="toast" role="status" aria-live="polite" data-show="false"></div>
<noscript>
  <div style="max-width:640px;margin:80px auto;padding:0 24px;font-family:Arial,sans-serif;color:#fff">
    <h1 style="text-transform:uppercase;letter-spacing:-0.03em">All For: 1 Leadership Framework</h1>
    <p>This tool needs JavaScript switched on. Everything runs in your browser — nothing is sent anywhere.</p>
  </div>
</noscript>
<script>
__JS__
</script>"""

DOCUMENT = """<!doctype html>
<html lang="en-AU">
<head>
{head}
</head>
<body>
{body}
</body>
</html>
"""


FONTS = {
    "__FONT_LATIN__": "fonts/archivo-latin.woff2",
    "__FONT_LATIN_EXT__": "fonts/archivo-latin-ext.woff2",
}


def data_uri(path):
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return "data:font/woff2;base64," + encoded


def main():
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    data_path = SRC / "framework.json"

    for marker, rel in FONTS.items():
        font = SRC / rel
        if not font.exists():
            sys.exit(f"Missing font: {font}")
        if marker not in css:
            sys.exit(f"styles.css no longer contains the {marker} marker.")
        css = css.replace(marker, data_uri(font), 1)

    if not data_path.exists():
        sys.exit("src/framework.json is missing — run scripts/extract_xlsx.py first.")

    data = json.loads(data_path.read_text(encoding="utf-8"))

    placeholder = "/*__FRAMEWORK__*/ null"
    if placeholder not in js:
        sys.exit("app.js no longer contains the framework data placeholder.")

    # `</script>` anywhere inside the JSON would close the tag early.
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    js = js.replace(placeholder, payload, 1)

    head = HEAD.replace("__CSS__", css)
    body = BODY.replace("__JS__", js)

    OUT_DOC.write_text(DOCUMENT.format(head=head, body=body), encoding="utf-8")
    OUT_FRAGMENT.write_text(head + "\n" + body + "\n", encoding="utf-8")

    behaviours = sum(len(c["behaviours"]) for c in data["competencies"])
    size = OUT_DOC.stat().st_size / 1024
    print(
        f"index.html + artifact.html — {size:.0f} KB, "
        f"{len(data['competencies'])} competencies, {behaviours} behaviours"
    )


if __name__ == "__main__":
    main()
