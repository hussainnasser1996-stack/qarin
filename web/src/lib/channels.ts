/** Which alert channels are live, from server env. A channel without credentials is hidden, never half-shown. */
export function alertChannels() {
  return {
    email: true,
    telegram: process.env.TELEGRAM_BOT_USERNAME ? process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "") : null,
    whatsapp: process.env.WHATSAPP_NUMBER ? process.env.WHATSAPP_NUMBER.replace(/\D/g, "") : null,
    push: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  };
}
export type Channels = ReturnType<typeof alertChannels>;

/** Lowest in-stock price of a product in a country right now (the alert's starting point). */
export const BASE_PRICE_SQL = `
  SELECT min(o.price) AS p FROM offers o JOIN stores s ON s.id = o.store_id
  WHERE o.product_id = $1 AND s.country = $2 AND o.in_stock IS NOT FALSE AND o.price > 0`;
