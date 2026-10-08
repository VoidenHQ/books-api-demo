#!/usr/bin/env bash
# Demo helper: makes a realistic breaking change to the API contract by
# renaming the `title` field to `name` in every book response.
# Undo with: git checkout server.js
set -euo pipefail
cd "$(dirname "$0")/.."
sed -i.bak 's/^    title: book\.title,$/    name: book.title,/' server.js && rm server.js.bak
git --no-pager diff --stat server.js
