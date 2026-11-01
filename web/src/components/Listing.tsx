import Link from "next/link";
import { Empty, ProductList } from "./ProductList";
import { PAGE_SIZE, listProducts, type ListParams } from "@/lib/queries";
import { brandName, storeName } from "@/lib/format";
import { COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";

type Over = Record<string, string | number | undefined>;

/**
 * Shared search/category listing. Filters are plain links and one GET form, so they work without JavaScript
 * and every filtered view has its own URL. Facets only offer choices that return products.
 */
export async function Listing({ cc, lang, base, p, hidden = {} }: {
  cc: CC; lang: Lang; base: string; p: ListParams; hidden?: Record<string, string>;
}) {
  const d = t(lang);
  const data = await listProducts(cc, p).catch(() => ({ items: [], total: 0, brands: [], storages: [], stores: [] }));
  const page = Math.max(1, p.page || 1);
  const pages = Math.ceil(data.total / PAGE_SIZE);
  const cur = COUNTRIES[cc].currency;
  const state: Over = {
    q: p.q, brand: p.brand, sort: p.sort, stock: p.inStock ? "1" : undefined, store: p.store, storage: p.storage,
    min: p.min, max: p.max, bnpl: p.bnpl ? "1" : undefined, cod: p.cod ? "1" : undefined, warranty: p.warranty ? "1" : undefined, ...hidden,
  };
  const qs = (over: Over) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...state, page: undefined, ...over })) if (v !== undefined && v !== "" && v !== null) u.set(k, String(v));
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const toggle = (k: string, v: string) => qs({ [k]: state[k] === v ? undefined : v });

  const active: { label: string; href: string }[] = [];
  if (p.brand) active.push({ label: brandName(p.brand), href: qs({ brand: undefined }) });
  if (p.storage) active.push({ label: p.storage, href: qs({ storage: undefined }) });
  if (p.store) active.push({ label: storeName(data.stores.find((s) => s.id === p.store)?.name ?? p.store, lang), href: qs({ store: undefined }) });
  if (p.min !== undefined || p.max !== undefined) active.push({ label: `${p.min ?? "0"}–${p.max ?? "∞"} ${cur}`, href: qs({ min: undefined, max: undefined }) });
  if (p.inStock) active.push({ label: d.filterInStock, href: qs({ stock: undefined }) });
  const ar = lang === "ar";
  const trust: [string, string, boolean | undefined][] = [
    ["bnpl", ar ? "الدفع لاحقاً (تابي، تمارا…)" : "Pay later (Tabby, Tamara…)", p.bnpl],
    ["cod", ar ? "الدفع عند الاستلام" : "Cash on delivery", p.cod],
    ["warranty", ar ? "ضمان سنة أو أكثر" : "1+ year warranty", p.warranty],
  ];
  for (const [k, label, on] of trust) if (on) active.push({ label, href: qs({ [k]: undefined }) });

  const sorts: [string | undefined, string][] = [
    [undefined, d.sortRelevance], ["price_asc", d.sortPriceAsc], ["price_desc", d.sortPriceDesc], ["offers", d.sortOffers], ["gap", d.sortGap],
  ];
  const chip = (on: boolean) =>
    `inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[13px] transition-colors ${on ? "bg-ink text-surface border-ink" : "bg-surface border-line hover:border-ink-2"}`;

  const filters = (
    <div className="space-y-5 text-[14px]">
      {data.brands.length > 1 && (
        <section>
          <h3 className="font-semibold text-[13px] text-muted mb-2">{d.filterBrand}</h3>
          <ul className="space-y-0.5 max-h-72 overflow-y-auto pe-1">
            {data.brands.slice(0, 24).map((b) => (
              <li key={b.brand}>
                <Link href={toggle("brand", b.brand)} scroll={false}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-sunk ${p.brand === b.brand ? "bg-sunk font-semibold" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={`w-4 h-4 rounded border ${p.brand === b.brand ? "bg-ink border-ink" : "border-line-strong"}`} />
                    {brandName(b.brand)}
                  </span>
                  <span className="text-muted text-[12px] num">{b.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.storages.length > 1 && (
        <section>
          <h3 className="font-semibold text-[13px] text-muted mb-2">{d.storage}</h3>
          <div className="flex flex-wrap gap-1.5">
            {data.storages.map((x) => (
              <Link key={x.storage} href={toggle("storage", x.storage)} scroll={false} className={chip(p.storage === x.storage)}>
                <span className="ltr">{x.storage}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="font-semibold text-[13px] text-muted mb-2">{d.priceRange} <span className="font-normal">({cur})</span></h3>
        <form method="get" action={base} className="flex items-center gap-2">
          {Object.entries(state).filter(([k, v]) => v !== undefined && k !== "min" && k !== "max").map(([k, v]) => <input key={k} type="hidden" name={k} value={String(v)} />)}
          <input name="min" inputMode="decimal" defaultValue={p.min ?? ""} placeholder={d.min} aria-label={d.min}
            className="w-full h-9 px-2 rounded-md border border-line bg-surface num" />
          <span className="text-muted">–</span>
          <input name="max" inputMode="decimal" defaultValue={p.max ?? ""} placeholder={d.max} aria-label={d.max}
            className="w-full h-9 px-2 rounded-md border border-line bg-surface num" />
          <button className="h-9 px-3 rounded-md bg-ink text-surface text-[13px] font-medium shrink-0">{d.apply}</button>
        </form>
      </section>
      {data.stores.length > 1 && (
        <section>
          <h3 className="font-semibold text-[13px] text-muted mb-2">{d.store}</h3>
          <ul className="space-y-0.5">
            {data.stores.map((s) => (
              <li key={s.id}>
                <Link href={toggle("store", s.id)} scroll={false}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-sunk ${p.store === s.id ? "bg-sunk font-semibold" : ""}`}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className={`w-4 h-4 rounded-full border ${p.store === s.id ? "bg-ink border-ink" : "border-line-strong"}`} />
                    {storeName(s.name, lang)}
                  </span>
                  <span className="text-muted text-[12px] num">{s.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h3 className="font-semibold text-[13px] text-muted mb-2">{ar ? "الدفع والضمان" : "Payment & warranty"}</h3>
        <div className="space-y-0.5">
          {trust.map(([k, label, on]) => (
            <Link key={k} href={toggle(k, "1")} scroll={false} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sunk">
              <span aria-hidden className={`w-4 h-4 rounded border ${on ? "bg-ink border-ink" : "border-line-strong"}`} />{label}
            </Link>
          ))}
        </div>
      </section>
      <Link href={toggle("stock", "1")} scroll={false} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sunk">
        <span aria-hidden className={`w-4 h-4 rounded border ${p.inStock ? "bg-ink border-ink" : "border-line-strong"}`} />
        {d.filterInStock}
      </Link>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-start">
      <aside className="hidden lg:block panel p-4 lg:sticky lg:top-20" aria-label={d.filters}>{filters}</aside>
      <div className="space-y-4 min-w-0">
        <details className="lg:hidden panel">
          <summary className="px-4 h-11 flex items-center justify-between cursor-pointer select-none font-medium">
            {d.filters}{active.length > 0 && <span className="num text-[12px] bg-ink text-surface rounded-full px-2">{active.length}</span>}
          </summary>
          <div className="px-4 pb-4">{filters}</div>
        </details>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <nav aria-label={d.sortRelevance} className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {sorts.map(([k, label]) => (
              <Link key={label} href={qs({ sort: k })} scroll={false} className={`${chip((p.sort || undefined) === k)} whitespace-nowrap`}>{label}</Link>
            ))}
          </nav>
          <span className="text-muted text-[13px] ms-auto"><span className="num">{data.total.toLocaleString("en-US")}</span> {d.results}</span>
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {active.map((a) => (
              <Link key={a.label} href={a.href} scroll={false} className="inline-flex items-center gap-1.5 h-7 ps-3 pe-2 rounded-full bg-tag/30 border border-tag-edge/40 text-[13px]">
                {a.label} <span aria-hidden className="text-ink-2">×</span>
              </Link>
            ))}
            <Link href={qs({ brand: undefined, storage: undefined, store: undefined, min: undefined, max: undefined, stock: undefined, bnpl: undefined, cod: undefined, warranty: undefined })} scroll={false}
              className="text-[13px] underline underline-offset-4 text-ink-2 ms-1">{d.clearAll}</Link>
          </div>
        )}

        {data.items.length ? <ProductList items={data.items} cc={cc} lang={lang} showGap /> : <Empty title={d.noResults} sub={d.noResultsSub} />}

        {pages > 1 && (
          <nav className="flex items-center justify-center gap-3 text-[14px]" aria-label={d.page}>
            {page > 1 && <Link className="h-10 px-4 inline-flex items-center rounded-md border border-line bg-surface" href={qs({ page: page - 1 })}>{d.prev}</Link>}
            <span className="text-muted">{d.page} <span className="num">{page} / {pages}</span></span>
            {page < pages && <Link className="h-10 px-4 inline-flex items-center rounded-md border border-line bg-surface" href={qs({ page: page + 1 })}>{d.next}</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}

export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | undefined) => (v === undefined || v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
export const listParams = (sp: Record<string, string | string[] | undefined>): ListParams => ({
  q: one(sp.q),
  brand: one(sp.brand),
  sort: one(sp.sort),
  inStock: one(sp.stock) === "1",
  page: Number(one(sp.page) || 1),
  store: one(sp.store),
  storage: one(sp.storage)?.slice(0, 10),
  min: num(one(sp.min)),
  max: num(one(sp.max)),
  bnpl: one(sp.bnpl) === "1",
  cod: one(sp.cod) === "1",
  warranty: one(sp.warranty) === "1",
});
