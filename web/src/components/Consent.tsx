"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

const KEY = "qarin-consent";

/** Analytics load only after an explicit "Accept" (Saudi PDPL / UAE PDPL). */
export function Consent({ lang }: { lang: Lang }) {
  const [state, setState] = useState<"unknown" | "yes" | "no">("unknown");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(v === "yes" || v === "no" ? v : "unknown");
    } catch { setState("no"); }
  }, []);
  const choose = (v: "yes" | "no") => {
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
    setState(v);
  };
  const d = t(lang);
  return (
    <>
      {state === "yes" && <Analytics />}
      {state === "unknown" && (
        <div role="dialog" aria-live="polite" className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:end-4 sm:max-w-md z-50 panel shadow-xl p-4 text-[14px]">
          <p className="mb-3">{d.consentText}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => choose("no")} className="px-3 h-9 rounded-md border border-line hover:bg-paper">{d.decline}</button>
            <button onClick={() => choose("yes")} className="px-3 h-9 rounded-md bg-ink text-surface font-medium">{d.accept}</button>
          </div>
        </div>
      )}
    </>
  );
}
