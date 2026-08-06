#!/usr/bin/env python3

"""Synchronize CV Journal Publications from _bibliography/papers.bib.

This script parses BibTeX entries and rewrites the
cv.sections["Journal Publications"] list in _data/cv.yml as bullet entries,
which is the shape supported by the current CV section renderer for custom
section titles.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import yaml

BIB_PATH = Path("_bibliography/papers.bib")
CV_PATH = Path("_data/cv.yml")
SECTION_NAME = "Journal Publications"


@dataclass
class BibEntry:
    entry_type: str
    key: str
    fields: Dict[str, str]


def _parse_entries(bib_text: str) -> List[BibEntry]:
    entries: List[BibEntry] = []
    i = 0
    n = len(bib_text)

    while i < n:
        at = bib_text.find("@", i)
        if at == -1:
            break

        type_match = re.match(r"@([A-Za-z]+)\s*\{", bib_text[at:])
        if not type_match:
            i = at + 1
            continue

        entry_type = type_match.group(1).lower()
        body_start = at + type_match.end()
        depth = 1
        j = body_start
        while j < n and depth > 0:
            ch = bib_text[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            j += 1

        if depth != 0:
            break

        body = bib_text[body_start : j - 1].strip()
        i = j

        if not body:
            continue

        key_split = body.split(",", 1)
        if len(key_split) != 2:
            continue

        key = key_split[0].strip()
        field_blob = key_split[1]

        fields: Dict[str, str] = {}

        # Match key = {value} or key = "value" up to next field separator.
        for match in re.finditer(
            r"(?ms)([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|\"(?:[^\"\\]|\\.)*\")\s*,?",
            field_blob,
        ):
            field_name = match.group(1).strip().lower()
            raw_val = match.group(2).strip()
            if raw_val.startswith("{") and raw_val.endswith("}"):
                value = raw_val[1:-1]
            elif raw_val.startswith('"') and raw_val.endswith('"'):
                value = raw_val[1:-1]
            else:
                value = raw_val

            # Collapse inner whitespace but preserve punctuation.
            value = " ".join(value.split())
            fields[field_name] = value

        entries.append(BibEntry(entry_type=entry_type, key=key, fields=fields))

    return entries


def _build_venue(fields: Dict[str, str]) -> str:
    arxiv = fields.get("arxiv") or fields.get("eprint")
    journal = fields.get("journal", "")
    volume = fields.get("volume")
    pages = fields.get("pages")

    if arxiv:
        return f"arXiv:{arxiv}"

    parts: List[str] = []
    if journal:
        parts.append(journal)
    if volume:
        parts.append(volume)
    if pages:
        if volume:
            parts[-1] = f"**{parts[-1]}**, {pages}"
        else:
            parts.append(pages)

    return " ".join(parts).strip() or "Publication"


def _initial_token(token: str) -> str:
    cleaned = token.strip().strip("{}")
    if not cleaned:
        return ""

    if cleaned.endswith("."):
        return cleaned

    return f"{cleaned[0]}."


def _format_author_name(author: str) -> str:
    normalized = " ".join(author.strip().split())
    if not normalized:
        return ""

    if "," in normalized:
        surname, given_names = [part.strip() for part in normalized.split(",", 1)]
        initials = " ".join(_initial_token(part) for part in given_names.split() if part.strip())
        return f"{initials} {surname}".strip()

    parts = normalized.split()
    if len(parts) == 1:
        return parts[0]

    surname = parts[-1]
    initials = " ".join(_initial_token(part) for part in parts[:-1] if part.strip())
    return f"{initials} {surname}".strip()


def _author_string(fields: Dict[str, str]) -> str:
    authors = fields.get("author", "")
    if not authors:
        return ""

    parts = [_format_author_name(p) for p in authors.split(" and ") if p.strip()]
    return ", ".join(parts)


def _year_value(fields: Dict[str, str]) -> int:
    year_raw = fields.get("year", "0")
    year_digits = re.sub(r"[^0-9]", "", year_raw)
    if not year_digits:
        return 0
    try:
        return int(year_digits)
    except ValueError:
        return 0


def _linked_title(fields: Dict[str, str]) -> str:
    title = fields.get("title", "").strip()
    doi = fields.get("doi", "").strip()

    if not title:
        return ""

    if not doi:
        return title

    doi_url = f"https://doi.org/{doi}"
    return f"[{title}]({doi_url})"


def _entry_to_bullet(entry: BibEntry) -> str | None:
    title = _linked_title(entry.fields)
    if not title:
        return None

    year_num = _year_value(entry.fields)
    year = str(year_num) if year_num > 0 else "n.d."
    authors = _author_string(entry.fields)
    venue = _build_venue(entry.fields)

    segments = [f"{title}."]
    if authors:
        segments.append(f"{authors}.")
    if venue:
        segments.append(f"*{venue}*")
    if year:
        segments.append(f"({year}).")

    return " ".join(segments)


def sync_cv_publications() -> int:
    if not BIB_PATH.exists():
        print(f"BibTeX file not found: {BIB_PATH}")
        return 1

    if not CV_PATH.exists():
        print(f"CV YAML file not found: {CV_PATH}")
        return 1

    bib_text = BIB_PATH.read_text(encoding="utf-8")
    entries = _parse_entries(bib_text)

    article_entries = [e for e in entries if e.entry_type in {"article", "inproceedings", "misc"}]
    article_entries.sort(key=lambda e: (_year_value(e.fields), e.key.lower()), reverse=True)

    bullets = []
    for entry in article_entries:
        bullet = _entry_to_bullet(entry)
        if bullet:
            bullets.append({"bullet": bullet})

    if not bullets:
        print("No publications parsed from BibTeX; leaving CV unchanged.")
        return 1

    data = yaml.safe_load(CV_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "cv" not in data or "sections" not in data["cv"]:
        print(f"Unexpected CV structure in {CV_PATH}")
        return 1

    sections = data["cv"]["sections"]
    if not isinstance(sections, dict):
        print(f"Unexpected sections structure in {CV_PATH}")
        return 1

    old_value = sections.get(SECTION_NAME)
    if old_value == bullets:
        print("CV Journal Publications already up-to-date with papers.bib")
        return 0

    sections[SECTION_NAME] = bullets

    new_text = yaml.safe_dump(data, sort_keys=False, allow_unicode=False, width=1000)
    CV_PATH.write_text(new_text, encoding="utf-8")
    print(f"Updated {SECTION_NAME} in {CV_PATH} from {BIB_PATH} ({len(bullets)} entries).")
    return 0


if __name__ == "__main__":
    sys.exit(sync_cv_publications())
