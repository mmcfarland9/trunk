#!/usr/bin/env python3
"""Attach the newest processed build to Trunk's internal TestFlight group.

Xcode Cloud uploads builds, but they can stall at READY_FOR_BETA_TESTING
instead of advancing to IN_BETA_TESTING (i.e. they never actually show up
for internal testers). This script closes that gap deterministically: it
waits for the newest build to finish processing, then adds it to every
internal beta group, flipping it to IN_BETA_TESTING. Idempotent — safe to
re-run.

Usage:
    scripts/testflight-distribute.py [VERSION]
        VERSION   build number to distribute (default: newest uploaded)

Credentials come from the same env as scripts/asc-jwt.py
(ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH), typically sourced from
~/.config/trunk-asc/config.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.appstoreconnect.apple.com"
BUNDLE = os.environ.get("TRUNK_BUNDLE_ID", "mpmcf.Trunk")
HERE = os.path.dirname(os.path.abspath(__file__))
WAIT_MINUTES = int(os.environ.get("DISTRIBUTE_WAIT_MINUTES", "15"))
INTERVAL = 30


def token() -> str:
    return subprocess.check_output(["python3", os.path.join(HERE, "asc-jwt.py")]).decode().strip()


def call(method: str, path: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode()
        return r.status, (json.loads(raw) if raw else {})


def app_id() -> str:
    _, d = call("GET", "/v1/apps?fields[apps]=bundleId&limit=200")
    aid = next((a["id"] for a in d["data"] if a["attributes"].get("bundleId") == BUNDLE), None)
    if not aid:
        sys.exit(f"App with bundleId {BUNDLE} not found")
    return aid


def newest_valid_build(aid: str, target_version: str | None):
    _, d = call(
        "GET",
        f"/v1/builds?filter[app]={aid}&limit=10&sort=-uploadedDate"
        "&fields[builds]=version,processingState",
    )
    for b in d["data"]:
        a = b["attributes"]
        if target_version and a.get("version") != target_version:
            continue
        if a.get("processingState") == "VALID":
            return b
        if target_version:  # found the target but not VALID yet
            return None
    return None


def internal_groups(aid: str):
    _, d = call("GET", f"/v1/apps/{aid}/betaGroups?fields[betaGroups]=name,isInternalGroup&limit=50")
    return [g for g in d["data"] if g["attributes"].get("isInternalGroup")]


def internal_state(build_id: str):
    _, d = call("GET", f"/v1/builds/{build_id}/buildBetaDetail?fields[buildBetaDetails]=internalBuildState")
    return d.get("data", {}).get("attributes", {}).get("internalBuildState")


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else None
    aid = app_id()
    groups = internal_groups(aid)
    if not groups:
        sys.exit("No internal beta group found")

    deadline = time.time() + WAIT_MINUTES * 60
    build = None
    while time.time() < deadline:
        build = newest_valid_build(aid, target)
        if build:
            break
        print(f"  waiting for build{' ' + target if target else ''} to finish processing…", flush=True)
        time.sleep(INTERVAL)
    if not build:
        sys.exit("Timed out waiting for a VALID build to distribute")

    bid, ver = build["id"], build["attributes"].get("version")
    for g in groups:
        gid, name = g["id"], g["attributes"].get("name")
        try:
            status, _ = call(
                "POST",
                f"/v1/betaGroups/{gid}/relationships/builds",
                {"data": [{"type": "builds", "id": bid}]},
            )
            print(f"Attached build {ver} to internal group '{name}' -> HTTP {status}")
        except urllib.error.HTTPError as e:
            # Already attached / benign conflict — keep going.
            print(f"group '{name}': HTTP {e.code} ({e.read().decode()[:120]})")

    state = internal_state(bid)
    print(f"build {ver} internalBuildState = {state}")
    return 0 if state == "IN_BETA_TESTING" else 1


if __name__ == "__main__":
    raise SystemExit(main())
