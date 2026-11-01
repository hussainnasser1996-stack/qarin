"""Alert delivery: email (Resend), Telegram, WhatsApp (Meta Cloud API) and browser push (Web Push / VAPID).
Each channel is switched on by its own environment variables; a channel without credentials leaves its alerts
queued (not dropped), so they go out once the keys exist."""
from __future__ import annotations

import json
import os

import httpx

_http = httpx.Client(timeout=20)


def enabled() -> dict[str, bool]:
    e = os.environ.get
    return {
        "email": bool(e("RESEND_API_KEY") and e("ALERT_FROM")),
        "telegram": bool(e("TELEGRAM_BOT_TOKEN")),
        "whatsapp": bool(e("WHATSAPP_TOKEN") and e("WHATSAPP_PHONE_ID") and e("WHATSAPP_TEMPLATE")),
        "push": bool(e("VAPID_PRIVATE_KEY") and e("VAPID_SUBJECT")),
    }


def text_for(lang: str, kind: str, name: str, price: str, store: str) -> tuple[str, str]:
    ar = lang == "ar"
    if kind == "stock":
        return ((f"عاد للتوفر: {name}", f"متوفر الآن بسعر {price} لدى {store}") if ar
                else (f"Back in stock: {name}", f"Now {price} at {store}"))
    return ((f"نزل السعر: {name}", f"أرخص سعر الآن {price} لدى {store}") if ar
            else (f"Price drop: {name}", f"Now {price} at {store}"))


def send_email(to: str, subject: str, line: str, url: str, unsub: str, lang: str) -> bool:
    ar = lang == "ar"
    html = (f"<div dir=\"{'rtl' if ar else 'ltr'}\" style=\"font-family:system-ui,sans-serif\">"
            f"<p style=\"font-size:16px\">{line}</p>"
            f"<p><a href=\"{url}\" style=\"background:#0c1f24;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">"
            f"{'قارن الأسعار' if ar else 'Compare prices'}</a></p>"
            f"<p style=\"color:#888;font-size:12px\"><a href=\"{unsub}\">{'إلغاء التنبيه' if ar else 'Unsubscribe'}</a></p></div>")
    r = _http.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
                   json={"from": os.environ["ALERT_FROM"], "to": [to], "subject": subject, "html": html,
                         "headers": {"List-Unsubscribe": f"<{unsub}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}})
    return r.status_code < 300


def send_telegram(chat_id: str, subject: str, line: str, url: str, unsub: str, lang: str) -> bool:
    ar = lang == "ar"
    r = _http.post(f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage", json={
        "chat_id": chat_id,
        "text": f"{subject}\n{line}",
        "reply_markup": {"inline_keyboard": [[
            {"text": "قارن الأسعار" if ar else "Compare prices", "url": url},
            {"text": "إيقاف التنبيه" if ar else "Stop this alert", "url": unsub},
        ]]},
    })
    return r.status_code < 300


def send_whatsapp(phone: str, name: str, price: str, store: str, url: str, lang: str) -> bool:
    """Business-initiated WhatsApp messages must use a Meta-approved template. Template body (create in Meta):
    EN: "Price drop on {{1}}: now {{2}} at {{3}}. Compare: {{4}}  Reply STOP to stop alerts."
    AR: "نزل سعر {{1}}: الآن {{2}} لدى {{3}}. قارن: {{4}}  أرسل STOP لإيقاف التنبيهات." """
    r = _http.post(f"https://graph.facebook.com/v21.0/{os.environ['WHATSAPP_PHONE_ID']}/messages",
                   headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"},
                   json={"messaging_product": "whatsapp", "to": phone, "type": "template", "template": {
                       "name": os.environ["WHATSAPP_TEMPLATE"], "language": {"code": "ar" if lang == "ar" else "en"},
                       "components": [{"type": "body", "parameters": [
                           {"type": "text", "text": name[:60]}, {"type": "text", "text": price},
                           {"type": "text", "text": store}, {"type": "text", "text": url}]}]}})
    return r.status_code < 300


def send_push(sub: dict, subject: str, line: str, url: str) -> bool | None:
    """Returns None when the browser subscription is gone (410/404) so the alert can be retired."""
    from pywebpush import WebPushException, webpush
    try:
        webpush(subscription_info=sub, data=json.dumps({"title": subject, "body": line, "url": url}),
                vapid_private_key=os.environ["VAPID_PRIVATE_KEY"], vapid_claims={"sub": os.environ["VAPID_SUBJECT"]}, ttl=86400)
        return True
    except WebPushException as e:
        if e.response is not None and e.response.status_code in (404, 410):
            return None
        return False
