#!/usr/bin/env python3
"""Print the newest Xcode Cloud build run as `number|progress|completion`.

Exists because /v1/ciWorkflows/{id}/buildRuns does NOT return newest-first:
a `limit=1` query can hand back an *older* run and a poller built on it will
wait forever on a build that already finished. Always take the max run number.

Credentials come from the same env as scripts/asc-jwt.py.
"""
import json
import os
import subprocess
import sys
import urllib.request

API = "https://api.appstoreconnect.apple.com"
HERE = os.path.dirname(os.path.abspath(__file__))
WORKFLOW = os.environ.get("TRUNK_WORKFLOW_ID", "E7C96877-39E6-458D-91FC-9B435ED6B968")


def main() -> int:
    token = subprocess.check_output(["python3", os.path.join(HERE, "asc-jwt.py")]).decode().strip()
    req = urllib.request.Request(
        f"{API}/v1/ciWorkflows/{WORKFLOW}/buildRuns?limit=20",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as r:
        runs = json.load(r)["data"]

    if not runs:
        print("|", end="")
        return 1

    newest = max(runs, key=lambda x: x["attributes"].get("number") or 0)["attributes"]
    print(
        f"{newest.get('number')}|{newest.get('executionProgress')}|{newest.get('completionStatus')}",
        end="",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
