#!/usr/bin/env bash
# Quartz v5.0.0 不会在 <body> 上输出 data-basepath，Explorer 却写死 /static/... 与 href="/"+...
# 从 quartz.config.yaml 的 baseUrl 解析子路径（如 /test）并写入构建产物。
set -euo pipefail

CONFIG="${1:?usage: patch-pages-subpath.sh <quartz.config.yaml>}"
PUBLIC="${2:?usage: patch-pages-subpath.sh <config> <public-dir>}"

BASEPATH="$(python3 - "$CONFIG" <<'PY'
import sys
from urllib.parse import urlparse

with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        if "baseUrl:" in line:
            raw = line.split(":", 1)[1].strip().strip('"').strip("'")
            path = urlparse("https://" + raw).path.rstrip("/")
            print(path if path.startswith("/") else ("/" + path if path else ""))
            break
    else:
        print("", end="")
PY
)"

POSTSCRIPT="$PUBLIC/postscript.js"
test -f "$POSTSCRIPT"

export BASEPATH POSTSCRIPT
python3 <<'PY'
import os
import pathlib
import re

base = os.environ["BASEPATH"]
path = pathlib.Path(os.environ["POSTSCRIPT"])
text = path.read_text(encoding="utf-8")
prefix = base  # e.g. /test

replacements = [
    (
        r'fetch\(\(document\.body\.dataset\.basepath\|\|""\)\+"/static/contentIndex\.json"\)',
        f'fetch("{prefix}/static/contentIndex.json")',
    ),
    (
        r'fetch\("/static/contentIndex\.json"\)',
        f'fetch("{prefix}/static/contentIndex.json")',
    ),
    (
        r'\(document\.body\.dataset\.basepath\|\|""\)\+"/"',
        f'"{prefix}/"',
    ),
]

total = 0
for pat, rep in replacements:
    text, n = re.subn(pat, rep, text)
    total += n

if not re.search(rf'fetch\("{re.escape(prefix)}/static/contentIndex\.json"\)', text):
    raise SystemExit("patch-pages-subpath: contentIndex fetch was not patched")

path.write_text(text, encoding="utf-8")
print(f"Patched {path} (basePath={prefix!r}, {total} replacements)")
PY

if [ -n "$BASEPATH" ]; then
  export BASEPATH PUBLIC
  python3 <<'PY'
import os
import pathlib
import re

base = os.environ["BASEPATH"]
public = pathlib.Path(os.environ["PUBLIC"])
pat = re.compile(r'<body data-slug="([^"]*)">')
repl = rf'<body data-slug="\1" data-basepath="{base}">'
for html in public.rglob("*.html"):
    text = html.read_text(encoding="utf-8")
    if "data-basepath=" in text:
        continue
    html.write_text(pat.sub(repl, text), encoding="utf-8")
PY
fi
