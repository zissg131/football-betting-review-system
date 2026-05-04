#!/usr/bin/env python3
"""
FootyStats official API fetcher.

Purpose:
- Read football match data from the official FootyStats / football-data-api.com JSON API.
- Save raw JSON and flattened CSV files for later analysis.

This is intentionally NOT a scraper that bypasses login, app encryption, CAPTCHA, or anti-bot systems.
Keep API keys out of frontend JavaScript. Run this locally or from a backend.

Examples:
    export FOOTYSTATS_API_KEY="your_api_key_here"

    python scripts/footystats_fetcher.py todays --date 2026-05-04 --timezone Asia/Shanghai

    python scripts/footystats_fetcher.py league-matches --season-id 2012 --max-pages 2
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

API_BASE = "https://api.football-data-api.com"
DEFAULT_OUTPUT_DIR = Path("data")


class FetchError(RuntimeError):
    """Raised when the remote API request fails."""


def build_url(endpoint: str, params: Dict[str, Any]) -> str:
    clean_params = {k: v for k, v in params.items() if v is not None and v != ""}
    query = urllib.parse.urlencode(clean_params)
    return f"{API_BASE}/{endpoint.lstrip('/')}?{query}"


def get_json(url: str, timeout: int = 30) -> Dict[str, Any] | List[Any]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "football-betting-review-system/0.1",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise FetchError(f"HTTP {exc.code}: {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise FetchError(f"Network error: {exc}") from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise FetchError(f"Response is not valid JSON: {body[:500]}") from exc


def ensure_api_key(cli_key: Optional[str]) -> str:
    key = cli_key or os.getenv("FOOTYSTATS_API_KEY")
    if not key:
        raise FetchError(
            "Missing API key. Set FOOTYSTATS_API_KEY environment variable or pass --key. "
            "Do not put the API key into docs/app.js or any frontend file."
        )
    return key


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def flatten_dict(data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    flat: Dict[str, Any] = {}
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else str(key)
        if isinstance(value, dict):
            flat.update(flatten_dict(value, full_key))
        elif isinstance(value, list):
            flat[full_key] = json.dumps(value, ensure_ascii=False)
        else:
            flat[full_key] = value
    return flat


def extract_records(payload: Any) -> List[Dict[str, Any]]:
    """
    FootyStats responses usually expose a list under data.
    This function is defensive so it can handle list, {data: list}, or nested match lists.
    """
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]

    if not isinstance(payload, dict):
        return []

    candidates = [
        payload.get("data"),
        payload.get("matches"),
        payload.get("fixtures"),
        payload.get("results"),
    ]

    for candidate in candidates:
        if isinstance(candidate, list):
            return [row for row in candidate if isinstance(row, dict)]
        if isinstance(candidate, dict):
            for nested_key in ("data", "matches", "fixtures", "results"):
                nested = candidate.get(nested_key)
                if isinstance(nested, list):
                    return [row for row in nested if isinstance(row, dict)]

    # Fallback: if the whole dict looks like one record, return it as one row.
    return [payload]


def save_csv(path: Path, records: Iterable[Dict[str, Any]]) -> None:
    flat_records = [flatten_dict(row) for row in records]
    path.parent.mkdir(parents=True, exist_ok=True)

    if not flat_records:
        path.write_text("", encoding="utf-8-sig")
        return

    headers = sorted({key for row in flat_records for key in row.keys()})
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(flat_records)


def fetch_paginated(
    endpoint: str,
    params: Dict[str, Any],
    max_pages: int,
    sleep_seconds: float,
) -> List[Any]:
    pages: List[Any] = []
    for page in range(1, max_pages + 1):
        page_params = dict(params)
        page_params["page"] = page
        url = build_url(endpoint, page_params)
        print(f"Fetching page {page}: {url.replace(str(params.get('key')), '***') if params.get('key') else url}")
        payload = get_json(url)
        pages.append(payload)

        records = extract_records(payload)
        if not records:
            break
        if sleep_seconds > 0 and page < max_pages:
            time.sleep(sleep_seconds)
    return pages


def merge_records_from_pages(pages: List[Any]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    for page in pages:
        merged.extend(extract_records(page))
    return merged


def timestamp_slug() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def command_todays(args: argparse.Namespace) -> int:
    key = ensure_api_key(args.key)
    params = {
        "key": key,
        "date": args.date,
        "timezone": args.timezone,
    }
    pages = fetch_paginated("todays-matches", params, args.max_pages, args.sleep)
    records = merge_records_from_pages(pages)

    out_dir = Path(args.output_dir)
    slug = args.date or timestamp_slug()
    save_json(out_dir / "raw" / f"todays_matches_{slug}.json", pages)
    save_csv(out_dir / "processed" / f"todays_matches_{slug}.csv", records)

    print(f"Saved {len(records)} records")
    print(f"Raw JSON: {out_dir / 'raw' / f'todays_matches_{slug}.json'}")
    print(f"CSV:      {out_dir / 'processed' / f'todays_matches_{slug}.csv'}")
    return 0


def command_league_matches(args: argparse.Namespace) -> int:
    key = ensure_api_key(args.key)
    params = {
        "key": key,
        "season_id": args.season_id,
        "max_per_page": args.max_per_page,
        "max_time": args.max_time,
    }
    pages = fetch_paginated("league-matches", params, args.max_pages, args.sleep)
    records = merge_records_from_pages(pages)

    out_dir = Path(args.output_dir)
    slug = f"season_{args.season_id}_{timestamp_slug()}"
    save_json(out_dir / "raw" / f"league_matches_{slug}.json", pages)
    save_csv(out_dir / "processed" / f"league_matches_{slug}.csv", records)

    print(f"Saved {len(records)} records")
    print(f"Raw JSON: {out_dir / 'raw' / f'league_matches_{slug}.json'}")
    print(f"CSV:      {out_dir / 'processed' / f'league_matches_{slug}.csv'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read football data from FootyStats official API")
    parser.add_argument("--key", help="FootyStats API key. Prefer using FOOTYSTATS_API_KEY env var.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory")
    parser.add_argument("--max-pages", type=int, default=1, help="Maximum pages to fetch")
    parser.add_argument("--sleep", type=float, default=1.0, help="Seconds to wait between paginated requests")

    subparsers = parser.add_subparsers(dest="command", required=True)

    todays = subparsers.add_parser("todays", help="Fetch matches by date")
    todays.add_argument("--date", help="Date in YYYY-MM-DD. If omitted, API defaults to current UTC day.")
    todays.add_argument("--timezone", default="Asia/Shanghai", help="TZ database timezone, e.g. Asia/Shanghai")
    todays.set_defaults(func=command_todays)

    league_matches = subparsers.add_parser("league-matches", help="Fetch league schedule and match stats by season_id")
    league_matches.add_argument("--season-id", required=True, help="FootyStats season_id")
    league_matches.add_argument("--max-per-page", type=int, default=500, help="Rows per page, API max may vary")
    league_matches.add_argument("--max-time", type=int, help="Optional UNIX timestamp to get stats up to a time")
    league_matches.set_defaults(func=command_league_matches)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except FetchError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
