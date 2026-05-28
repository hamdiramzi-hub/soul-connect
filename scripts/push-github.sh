#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH_BIN="${GH_BIN:-gh}"
if ! command -v "$GH_BIN" >/dev/null 2>&1; then
  if [ -x "/tmp/gh-extract/gh_2.93.0_macOS_arm64/bin/gh" ]; then
    GH_BIN="/tmp/gh-extract/gh_2.93.0_macOS_arm64/bin/gh"
  else
    echo "Install GitHub CLI: https://cli.github.com/"
    exit 1
  fi
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  echo "Sign in to GitHub first:"
  "$GH_BIN" auth login --hostname github.com --git-protocol https --web
fi

USER="$("$GH_BIN" api user -q .login)"
REMOTE="https://github.com/${USER}/soul-connect.git"
git remote set-url origin "$REMOTE"

if ! "$GH_BIN" repo view "${USER}/soul-connect" >/dev/null 2>&1; then
  "$GH_BIN" repo create soul-connect --public --source=. --remote=origin --description "Cosmic dating app — zodiac, Human Design, Chinese year matching"
else
  echo "Repository ${USER}/soul-connect already exists."
fi

git push -u origin main
echo "Done: https://github.com/${USER}/soul-connect"
