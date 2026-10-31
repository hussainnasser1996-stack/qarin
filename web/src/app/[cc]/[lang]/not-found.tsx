import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-4">
      <p className="tag inline-flex font-display font-bold text-[28px] py-1.5 pe-4">404</p>
      <h1 className="font-display text-[26px] font-bold">This page isn’t here · الصفحة غير موجودة</h1>
      <p className="text-ink-2">The product may have been removed by the store. Try searching for it instead.</p>
      <Link href="/" className="inline-flex h-11 px-5 items-center rounded-xl bg-ink text-surface font-medium">Qarin home · الرئيسية</Link>
    </div>
  );
}
