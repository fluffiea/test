#!/usr/bin/env bash
# Quartz v5.0.0 的 Explorer 插件请求 /static/contentIndex.json（站点根路径），
# 在 GitHub Pages 项目站（如 /test/）会 404。构建产物里 body 已有 data-basepath，在此对齐。
set -euo pipefail

POSTSCRIPT="${1:?usage: patch-pages-subpath.sh <path/to/postscript.js>}"

sed -i 's#fetch("/static/contentIndex.json")#fetch((document.body.dataset.basepath||"")+"/static/contentIndex.json")#g' "$POSTSCRIPT"
sed -i 's#href="/"+#href=(document.body.dataset.basepath||"")+"/"+#g' "$POSTSCRIPT"
