#!/usr/bin/env python3
"""Mint a short-lived ES256 JWT for the App Store Connect API.

Dependency-free: signs with the system `openssl` and uses only the Python
standard library (no PyJWT / cryptography needed). Reads three env vars and
prints the token to stdout.

  ASC_KEY_ID    — the API key's Key ID (e.g. T2LWVMN6TF)
  ASC_ISSUER_ID — the team's Issuer ID (UUID)
  ASC_KEY_PATH  — path to the downloaded AuthKey_<KEYID>.p8 (kept outside git)

Usage:
  ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=~/.config/trunk-asc/AuthKey_X.p8 \
      python3 scripts/asc-jwt.py
"""
import base64
import json
import os
import subprocess
import time


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def main() -> None:
    kid = os.environ["ASC_KEY_ID"]
    iss = os.environ["ASC_ISSUER_ID"]
    key_path = os.path.expanduser(os.path.expandvars(os.environ["ASC_KEY_PATH"]))

    header = {"alg": "ES256", "kid": kid, "typ": "JWT"}
    now = int(time.time())
    # ASC tokens may live at most 20 minutes; 15 is a safe margin.
    payload = {"iss": iss, "iat": now, "exp": now + 900, "aud": "appstoreconnect-v1"}

    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + b64url(json.dumps(payload, separators=(",", ":")).encode())
    )

    # ES256 signature via openssl -> DER-encoded ECDSA (SEQUENCE{INTEGER r, INTEGER s}).
    der = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=signing_input.encode(),
        capture_output=True,
        check=True,
    ).stdout

    # Convert DER to the JOSE raw form r||s (32 bytes each). P-256 sigs use
    # single-byte ASN.1 lengths, so a minimal parser suffices.
    assert der[0] == 0x30, "bad DER signature"
    i = 2
    assert der[i] == 0x02
    i += 1
    rlen = der[i]
    i += 1
    r = der[i : i + rlen]
    i += rlen
    assert der[i] == 0x02
    i += 1
    slen = der[i]
    i += 1
    s = der[i : i + slen]
    r = r.lstrip(b"\x00").rjust(32, b"\x00")
    s = s.lstrip(b"\x00").rjust(32, b"\x00")

    print(signing_input + "." + b64url(r + s))


if __name__ == "__main__":
    main()
