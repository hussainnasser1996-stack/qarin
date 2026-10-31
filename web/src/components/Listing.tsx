import Link from "next/link";
import { Empty, ProductList } from "./ProductList";
import { PAGE_SIZE, listProducts, type ListParams } from "@/lib/queries";
import { t, type CC, type Lang } from "@/lib/i18n";

/** Shared search/category listing with filters (plain GET form → works without JS). */
export async function Listing({ cc, lang, base, p, hidden = {} }: {
  cc: CC; lang: Lang; base: string; p: ListParams; hidden?: Record<string, string>;
}) {
  const d = t(lang);
  const data = await listProducts(cc, p).catch(() => ({ items: [], total: 0, brands: [] }));
  const page = Math.max(1, p.page || 1);
  const pages = Math.ceil(data.total / PAGE_SIZE);
  const qs = (over: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const all = { q: p.q, brand: p.brand, sort: p.sort, stock: p.inStock ? "1" : undefined, store: p.store, ...over };
    for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== "" && v !== null) u.set(k, String(v));
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="space-y-4">
      <form method="get" action={base} className="flex flex-wrap items-center gap-2 text-[14px]">
        {p.q !== undefined && <input type="hidden" name="q" value={p.q} />}
        {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <select name="sort" defaultValue={p.sort || ""} className="h-10 px-2 rounded-md border border-line bg-surface" aria-label="Sort">
          <option value="">{d.sortRelevance}</option>
          <option value="price_asc">{d.sortPriceAsc}</option>
          <option value="price_desc">{d.sortPriceDesc}</option>
          <option value="offers">{d.sortOffers}</option>
          <option value="gap">{d.sortGap}</option>
        </select>
        {data.brands.length > 1 && (
          <select name="brand" defaultValue={p.brand || ""} className="h-10 px-2 rounded-md border border-line bg-surface" aria-label={d.filterBrand}>
            <option value="">{d.allBrands}</option>
            {data.brands.map((b) => <option key={b.brand} value={b.brand}>{b.brand} ({b.n})</option>)}
          </select>
        )}
        <label className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-line bg-surface">
          <input type="checkbox" name="stock" value="1" defaultChecked={p.inStock} /> {d.filterInStock}
        </label>
        <button className="h-10 px-4 rounded-md bg-ink text-surface font-medium">{d.search}</button>
        <span className="text-muted ms-auto"><span className="num">{data.total.toLocaleString("en-US")}</span> {d.results}</span>
      </form>
      {data.items.length ? <ProductList items={data.items} cc={cc} lang={lang} showGap /> : <Empty title={d.noResults} sub={d.noResultsSub} />}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-[14px]" aria-label={d.page}>
          {page > 1 && <Link className="h-10 px-4 inline-flex items-center rounded-md border border-line bg-surface" href={qs({ page: page - 1 })}>{d.prev}</Link>}
          <span className="text-muted">{d.page} <span className="num">{page} / {pages}</span></span>
          {page < pages && <Link className="h-10 px-4 inline-flex items-center rounded-md border border-line bg-surface" href={qs({ page: page + 1 })}>{d.next}</Link>}
        </nav>
      )}
    </div>
  );
}

export type SP = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
export const listParams = (sp: Record<string, string | string[] | undefined>): ListParams => ({
  q: one(sp.q),
  brand: one(sp.brand),
  sort: one(sp.sort),
  inStock: one(sp.stock) === "1",
  page: Number(one(sp.page) || 1),
  store: one(sp.store),
});
