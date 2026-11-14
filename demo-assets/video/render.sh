#!/usr/bin/env bash
# Usage: ./render.sh   (re-times, re-records and renders; uses audio/voice.mp3 when present)
set -euo pipefail
cd "$(dirname "$0")"
node tools/timing.mjs
[ "${SKIP_RECORD:-0}" = 1 ] || node tools/record.mjs
HAS=false; [ -f audio/voice.mp3 ] && HAS=true
OUT=out/revvault-demo$([ $HAS = true ] && echo "" || echo "-novoice").mp4
mkdir -p out
cd remotion
../../../web/node_modules/.bin/tsc -p . 2>/dev/null || true
~/Projects/Personal/Creator/studio/node_modules/.bin/remotion render index.ts RevVaultDemo ../$OUT --props="{\"hasVoice\":$HAS}" --public-dir=public --port=8888 --concurrency=3 --crf=20
echo "rendered demo-assets/video/$OUT"
