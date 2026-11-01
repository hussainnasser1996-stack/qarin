import { bnplName } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import type { Policies } from "@/lib/queries";

/** What the store itself says about paying, delivery, returns and warranty — with the pages it came from. */
export function StorePolicies({ p, lang }: { p: Policies | null; lang: Lang }) {
  const ar = lang === "ar";
  const yes = ar ? "نعم" : "Yes", no = ar ? "لا" : "No";
  if (!p) return null;
  const rows: [string, string | null][] = [
    [ar ? "الدفع لاحقاً" : "Pay later", p.bnpl?.length ? p.bnpl.map((b) => `${bnplName(b.provider, lang)}${b.payments ? ` (${b.payments} ${ar ? "دفعات" : "payments"})` : ""}`).join("، ") : p.bnpl ? no : null],
    [ar ? "الدفع عند الاستلام" : "Cash on delivery", p.cod == null ? null : `${p.cod ? yes : no}${p.cod_notes ? ` — ${p.cod_notes}` : ""}`],
    [ar ? "التوصيل المجاني" : "Free delivery", p.free_delivery_over == null ? null : p.free_delivery_over === 0 ? (ar ? "على كل الطلبات" : "On all orders") : `${ar ? "للطلبات فوق" : "Orders over"} ${p.free_delivery_over} ${p.free_delivery_currency ?? ""}`],
    [ar ? "مدة التوصيل" : "Delivery time", p.delivery_days ?? null],
    [ar ? "توصيل سريع (قد يكون برسوم)" : "Express delivery (may cost extra)", p.same_day == null ? null : p.same_day ? yes : no],
    [ar ? "استلام من الفرع" : "Pick up in store", p.click_collect == null ? null : p.click_collect ? yes : no],
    [ar ? "الإرجاع" : "Returns", p.returns_days ? `${p.returns_days} ${ar ? (p.returns_days >= 3 && p.returns_days <= 10 ? "أيام" : "يوماً") : "days"}${p.returns_notes ? ` — ${p.returns_notes}` : ""}` : p.returns_notes ?? null],
    [ar ? "الضمان" : "Warranty", p.warranty_policy ?? null],
  ];
  const shown = rows.filter((r) => r[1]);
  if (!shown.length) return null;
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="font-display text-[18px] font-bold mb-3">{ar ? "الدفع والتوصيل والإرجاع" : "Payment, delivery & returns"}</h2>
      <dl className="grid sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-[14px]">
        {shown.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <p className="text-[12px] text-muted mt-4 pt-3 border-t border-line">
        {ar ? "من صفحات المتجر نفسه" : "From the store's own pages"}{p.checked ? ` · ${ar ? "آخر تحقق" : "checked"} ${p.checked}` : ""}
        {p.sources?.slice(0, 3).map((u, i) => (
          <a key={u} href={u} target="_blank" rel="nofollow noopener" className="underline underline-offset-4 ms-2">{ar ? `المصدر ${i + 1}` : `source ${i + 1}`}</a>
        ))}
      </p>
    </section>
  );
}
