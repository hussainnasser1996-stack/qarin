#!/usr/bin/env bash
# Switch on WhatsApp alerts once Meta has approved the business + the alert template. Needs, from Meta's
# WhatsApp Manager / App dashboard: permanent access token, phone number ID, the display number, app secret,
# and the approved template name. Usage:
#   scripts/whatsapp-setup.sh <ACCESS_TOKEN> <PHONE_NUMBER_ID> <DISPLAY_NUMBER e.g. 97333334444> <APP_SECRET> <TEMPLATE_NAME>
# Then in Meta: Webhooks → callback URL https://qarin-gulf.vercel.app/api/whatsapp , verify token = the one printed
# below, subscribe to "messages".
set -euo pipefail
TOKEN="$1"; PHONE_ID="$2"; NUMBER="$3"; APP_SECRET="$4"; TEMPLATE="$5"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERIFY="$(openssl rand -hex 16)"
umask 077; printf 'WHATSAPP_VERIFY_TOKEN=%s\n' "$VERIFY" > ~/tools/keys/qarin-whatsapp-verify.env
cd "$ROOT/web"
for env in production preview; do
  printf '%s' "$TOKEN"      | vercel env add WHATSAPP_TOKEN "$env" --force >/dev/null
  printf '%s' "$PHONE_ID"   | vercel env add WHATSAPP_PHONE_ID "$env" --force >/dev/null
  printf '%s' "$NUMBER"     | vercel env add WHATSAPP_NUMBER "$env" --force >/dev/null
  printf '%s' "$APP_SECRET" | vercel env add WHATSAPP_APP_SECRET "$env" --force >/dev/null
  printf '%s' "$VERIFY"     | vercel env add WHATSAPP_VERIFY_TOKEN "$env" --force >/dev/null
done
cd "$ROOT"
printf '%s' "$TOKEN" | gh secret set WHATSAPP_TOKEN
printf '%s' "$PHONE_ID" | gh secret set WHATSAPP_PHONE_ID
printf '%s' "$TEMPLATE" | gh secret set WHATSAPP_TEMPLATE
cd "$ROOT/web" && vercel deploy --prod --yes >/dev/null
echo "WhatsApp alerts are on. Webhook verify token saved in ~/tools/keys/qarin-whatsapp-verify.env"
