#!/usr/bin/env python3
"""Return data for the selected Tuple environment to the Omarchy bar."""

import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path


HOME = Path.home()
ENVIRONMENT = sys.argv[1] if len(sys.argv) > 1 else "production"
STAGING = ENVIRONMENT == "staging"
DATA = Path(os.environ.get("XDG_DATA_HOME", HOME / ".local/share")) / ("tuple-staging" if STAGING else "tuple") / "0"
TOKEN = DATA / ".auth_token"
LOG = DATA / "log.txt"
API = "https://staging.tuple.app/api/v2" if STAGING else "https://production.tuple.app/api/v2"
CLIENT = HOME / ("bin/tuple-staging" if STAGING else ".local/bin/tuple")


def contacts():
    try:
        proc = subprocess.run([str(CLIENT), "ls"], capture_output=True, text=True, timeout=8, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return []
    pattern = re.compile(r"^\s*(\d+)\s+(.+?)\s+<([^>]+)>\s+\[(available|unavailable|offline)\](?:\s+\(favorite\))?$")
    result = []
    for line in proc.stdout.splitlines():
        match = pattern.match(line)
        if match:
            result.append({"id": match.group(1), "name": match.group(2), "email": match.group(3), "presence": match.group(4), "favorite": line.endswith("(favorite)")})
    rank = {"available": 0, "unavailable": 1, "offline": 2}
    return sorted(result, key=lambda contact: (not contact["favorite"], rank[contact["presence"]], contact["name"].lower()))


def get(path):
    if not TOKEN.exists():
        return []
    request = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + TOKEN.read_text().strip(), "Accept": "application/tuple.app; version=1", "User-Agent": "omarchy-tuple/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            value = json.load(response)
            return value if isinstance(value, list) else []
    except Exception:
        return []


def rooms():
    result = []
    for kind, path in (("team", "/teams/current/call_urls"), ("personal", "/users/current/call_urls")):
        for room in get(path):
            slug = str(room.get("slug") or "")
            if not slug:
                continue
            owner = room.get("user") or {}
            name = room.get("name") or owner.get("short_name") or owner.get("full_name")
            result.append({"id": str(room.get("id") or slug), "name": str(name or "Personal room"), "slug": slug, "url": ("https://staging.tuple.app/c/" if STAGING else "https://tuple.app/c/") + slug, "kind": kind})
    return sorted(result, key=lambda room: (room["kind"] != "team", room["name"].lower()))


def call_state():
    state = {"active": False, "muted": False, "sharing": False}
    try:
        lines = LOG.read_text(errors="replace").splitlines()[-1500:]
    except OSError:
        return state
    for line in lines:
        low = line.lower()
        if any(event in low for event in ("peer joined call:", "answering call with", "adding user to call", "cli: new", "cli: join ", "call connected")):
            state["active"] = True
        if any(event in low for event in ("call is no longer valid:", "call was torn down remotely", "cli: end")):
            state = {"active": False, "muted": False, "sharing": False}
        if "cli: mute" in low:
            state["muted"] = True
        elif "cli: unmute" in low:
            state["muted"] = False
        elif "cli: share" in low:
            state["sharing"] = True
        elif "cli: unshare" in low:
            state["sharing"] = False
    return state


print(json.dumps({"authenticated": TOKEN.exists(), "daemon": subprocess.run(["pgrep", "-x", CLIENT.name], capture_output=True).returncode == 0, "contacts": contacts(), "rooms": rooms(), "call": call_state()}, separators=(",", ":")))
