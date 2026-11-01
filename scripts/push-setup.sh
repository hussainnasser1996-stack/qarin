#!/usr/bin/env bash
# Switch on browser notifications: uses the VAPID keys already generated in ~/tools/keys/qarin-vapid.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; K=~/tools/keys/qarin-vapid.json
PUB=$(python3 -c "import json;print(json.load(open('$K'))['publicKey'])")
PRIV=$(python3 -c "import json;print(json.load(open('$K'))['privateKey'])")
cd "$ROOT/web"
for env in production preview development; do printf '%s' "$PUB" | vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY "$env" --force >/dev/null; done
cd "$ROOT"
printf '%s' "$PRIV" | gh secret set VAPID_PRIVATE_KEY
printf '%s' "mailto:hussainnasser.bahrain@gmail.com" | gh secret set VAPID_SUBJECT
cd "$ROOT/web" && vercel deploy --prod --yes >/dev/null
echo "Browser notifications are on."
