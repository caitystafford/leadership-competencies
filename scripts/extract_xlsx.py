#!/usr/bin/env python3
"""Turn the All For:1 competency matrix workbook into src/framework.json.

Run this whenever the workbook changes, then run build.py to regenerate index.html.

    python3 scripts/extract_xlsx.py
    python3 build.py
"""
import json
import pathlib
import sys

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKBOOK = ROOT / "source" / "All_For_1_Competency_Matrix_KF_Aligned.xlsx"
OUT = ROOT / "src" / "framework.json"

LEVELS = [
    ("foundations", "Foundations", "Foundations Ratings"),
    ("momentum", "Momentum", "Momentum Ratings"),
    ("enterprise", "Enterprise", "Enterprise Ratings"),
]

# Every sheet opens with a title, an instruction line and a header row, but the
# blank spacer rows between them move around, so find the header instead of
# hardcoding its position. Data starts on the row after it.
HEADER_FIRST_CELL = "All For:1 competency"


def slug(text):
    out = []
    for ch in text.lower():
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-")


def rows(sheet):
    seen_header = False
    for row in sheet.iter_rows(values_only=True):
        cells = [c.strip() if isinstance(c, str) else c for c in row]
        if not seen_header:
            seen_header = cells[0] == HEADER_FIRST_CELL
            continue
        if not cells[0]:
            continue
        yield cells


def main():
    if not WORKBOOK.exists():
        sys.exit(f"Workbook not found: {WORKBOOK}")

    wb = openpyxl.load_workbook(WORKBOOK, data_only=True)
    matrix = list(rows(wb["Full Matrix"]))

    competencies = []
    index = {}
    for comp_name, behaviour, definition, foundations, momentum, enterprise in matrix:
        if comp_name not in index:
            index[comp_name] = {
                "id": slug(comp_name),
                "name": comp_name,
                "behaviours": [],
            }
            competencies.append(index[comp_name])
        index[comp_name]["behaviours"].append(
            {
                "id": slug(behaviour),
                "name": behaviour,
                "definition": definition,
                "levels": {
                    "foundations": {"expectation": foundations},
                    "momentum": {"expectation": momentum},
                    "enterprise": {"expectation": enterprise},
                },
            }
        )

    # Fold the three ratings sheets onto the behaviours they describe.
    for level_id, _label, sheet_name in LEVELS:
        for comp_name, behaviour, expectation, needs_work, great, smashing in rows(wb[sheet_name]):
            target = None
            for b in index[comp_name]["behaviours"]:
                if b["name"] == behaviour:
                    target = b
                    break
            if target is None:
                sys.exit(f"{sheet_name}: no behaviour '{behaviour}' under '{comp_name}'")
            level = target["levels"][level_id]
            if level["expectation"] != expectation:
                # The ratings sheets restate the expectation; keep the matrix wording
                # as canonical but record any drift so it is not silently lost.
                level["expectation_variant"] = expectation
            level["ratings"] = {
                "needs-work": needs_work,
                "great": great,
                "smashing-it": smashing,
            }

    payload = {
        "source": WORKBOOK.name,
        "competencies": competencies,
    }

    behaviour_count = sum(len(c["behaviours"]) for c in competencies)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(competencies)} competencies, {behaviour_count} behaviours -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
