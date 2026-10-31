/** Resend via REST. Returns false (not throws) when email isn't configured yet. */
export async function sendMail(to: string, subject: string, html: string, headers: Record<string, string> = {}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM;
  if (!key || !from) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, headers }),
  });
  return r.ok;
}
