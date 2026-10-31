/** Admin session: HMAC-signed cookie (Web Crypto, works in proxy and route handlers). Fails closed. */
export const ADMIN_COOKIE = "qarin_admin";
const enc = new TextEncoder();

async function hmac(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

export async function makeSession(): Promise<string | null> {
  const s = secret();
  if (!s) return null;
  const exp = Date.now() + 7 * 864e5;
  return `${exp}.${await hmac(String(exp), s)}`;
}

export async function validSession(token: string | undefined | null): Promise<boolean> {
  const s = secret();
  if (!s || !token || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expect = await hmac(exp, s);
  if (expect.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
  return diff === 0;
}

export async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Buffer.from(h).toString("hex").slice(0, 32);
}
