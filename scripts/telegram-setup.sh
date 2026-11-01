#!/usr/bin/env bash
# Switch on Telegram alerts. Run once after creating the bot with @BotFather:
#   scripts/telegram-setup.sh <BOT_TOKEN> <BOT_USERNAME>
# It stores the token (never printed) in ~/tools/keys, sets Vercel + GitHub secrets, points the bot's webhook at
# Qarin, and redeploys so the "Telegram" choice appears in the alert form.
set -euo pipefail
TOKEN="${1:?bot token from @BotFather}"; USERNAME="${2:?bot username, e.g. QarinAlertsBot}"
SITE="${SITE_URL:-https://qarin-gulf.vercel.app}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRET="$(openssl rand -hex 24)"
umask 077; mkdir -p ~/tools/keys
printf 'TELEGRAM_BOT_TOKEN=%s\nTELEGRAM_BOT_USERNAME=%s\nTELEGRAM_WEBHOOK_SECRET=%s\n' "$TOKEN" "$USERNAME" "$SECRET" > ~/tools/keys/qarin-telegram.env
cd "$ROOT/web"
for env in production preview; do
  printf '%s' "$TOKEN"    | vercel env add TELEGRAM_BOT_TOKEN "$env" --force >/dev/null
  printf '%s' "$USERNAME" | vercel env add TELEGRAM_BOT_USERNAME "$env" --force >/dev/null
  printf '%s' "$SECRET"   | vercel env add TELEGRAM_WEBHOOK_SECRET "$env" --force >/dev/null
done
cd "$ROOT"; printf '%s' "$TOKEN" | gh secret set TELEGRAM_BOT_TOKEN
curl -fsS "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d "url=${SITE}/api/telegram" -d "secret_token=${SECRET}" -d 'allowed_updates=["message"]' >/dev/null
curl -fsS "https://api.telegram.org/bot${TOKEN}/setMyCommands" -H 'content-type: application/json' \
  -d '{"commands":[{"command":"stop","description":"Stop all price alerts"}]}' >/dev/null
cd "$ROOT/web" && vercel deploy --prod --yes >/dev/null
echo "Telegram alerts are on. Webhook: ${SITE}/api/telegram"
