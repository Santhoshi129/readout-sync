#!/usr/bin/env python3
"""
Checks every finding's reddit permalink against Reddit's own public .json
API to see whether it's still live, or has since been deleted/removed.

Why this exists: the dashboard's "poster's account deleted" badge only
reflects what we saw at scrape time, months or years ago for most of this
data. It can't know about a deletion that happened afterward, and there's
no way to check that live from inside the dashboard itself (2,000+ links,
no server-side job to do it). This script does that check once, in bulk,
from wherever you run it, and writes out one status per finding. Hand the
output file back and it gets merged into the live dashboard as a real,
always-visible badge.

USAGE
  python3 check-reddit-status.py
  (run from the repo root, or pass --data-dir explicitly)

Uses only Python's standard library - nothing to install first.

Reads every data/retention-research/<community>.json file, checks each
finding's permalink, and writes source_status.json:
  { "<finding id>": "live" | "deleted" | "removed" | "unknown", ... }

Respects Reddit's rate limits with a 1.1s pause between requests - for
~2,250 findings across the four live communities that's roughly 40
minutes total. Safe to stop and rerun; it skips ids already checked in
a previous partial run (reads its own output file first if present).
"""

import json
import time
import sys
import argparse
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

USER_AGENT = "twu-retention-research-status-check/1.0 (by /u/Immediate-Hold1968)"
REQUEST_DELAY_SECONDS = 1.1
COMMUNITIES = ["gymowner", "f45", "orangetheory", "crossfit", "hyrox"]


def to_json_url(permalink: str) -> str:
    """Reddit's own permalink + '.json' returns the full post/comment tree
    as data, no auth needed. Works whether the link is to a post or a
    specific comment."""
    url = permalink.rstrip("/")
    if not url.endswith(".json"):
        url += ".json"
    # old.reddit.com's JSON endpoint is the most reliable one publicly
    return url.replace("://reddit.com", "://old.reddit.com").replace("://www.reddit.com", "://old.reddit.com")


def check_one(permalink: str) -> str:
    """Returns 'live', 'deleted', 'removed', or 'unknown'."""
    url = to_json_url(permalink)
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=15) as resp:
            if resp.status == 404:
                return "removed"
            data = json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        if e.code == 404:
            return "removed"
        return "unknown"
    except (URLError, TimeoutError, json.JSONDecodeError):
        return "unknown"

    # data[0] = the post listing, data[1] = the comment tree (if a comment
    # permalink). Walk both, since a comment link's own status can differ
    # from its parent post's.
    try:
        post = data[0]["data"]["children"][0]["data"]
        if post.get("author") in ("[deleted]", None) and post.get("selftext") in ("[deleted]", "[removed]"):
            return "deleted"
        if post.get("removed_by_category"):
            return "removed"

        if len(data) > 1 and data[1]["data"]["children"]:
            comment = data[1]["data"]["children"][0]["data"]
            body = comment.get("body", "")
            if body in ("[deleted]", "[removed]"):
                return "removed" if body == "[removed]" else "deleted"
            if comment.get("author") == "[deleted]":
                return "deleted"

        return "live"
    except (KeyError, IndexError, TypeError):
        return "unknown"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/retention-research")
    parser.add_argument("--out", default="source_status.json")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    out_path = Path(args.out)

    statuses = {}
    if out_path.exists():
        statuses = json.loads(out_path.read_text())
        print(f"Resuming: {len(statuses)} already checked in a prior run.")

    all_findings = []
    for name in COMMUNITIES:
        f = data_dir / f"{name}.json"
        if not f.exists():
            continue
        d = json.loads(f.read_text())
        for finding in d["findings"]:
            if finding["id"] not in statuses and finding.get("permalink"):
                all_findings.append((name, finding["id"], finding["permalink"]))

    total = len(all_findings)
    print(f"{total} findings left to check across {len(COMMUNITIES)} communities.")
    if total == 0:
        print("Nothing to do.")
        return

    for i, (community, fid, permalink) in enumerate(all_findings, 1):
        status = check_one(permalink)
        statuses[fid] = status
        if i % 20 == 0 or i == total:
            out_path.write_text(json.dumps(statuses, indent=2))
            print(f"  [{i}/{total}] {community}/{fid}: {status} (saved)")
        time.sleep(REQUEST_DELAY_SECONDS)

    out_path.write_text(json.dumps(statuses, indent=2))
    live = sum(1 for v in statuses.values() if v == "live")
    deleted = sum(1 for v in statuses.values() if v == "deleted")
    removed = sum(1 for v in statuses.values() if v == "removed")
    unknown = sum(1 for v in statuses.values() if v == "unknown")
    print(f"\nDone. {out_path} written.")
    print(f"live: {live} | deleted: {deleted} | removed: {removed} | unknown: {unknown}")


if __name__ == "__main__":
    main()
