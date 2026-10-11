"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/app-provider";
import { LinkButton, PageTitle, Spinner } from "@/components/ui";
import { PixelSprite } from "@/components/pixel-sprite";
import { cop } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

export default function MenuPage() {
  const { cart, setQty, config } = useApp();
  const [items, setItems] = useState<MenuItem[] | null>(null);

  useEffect(() => {
    supabase().from("menu_items").select("*").eq("active", true).order("sort").then(({ data }) => setItems((data as MenuItem[]) ?? []));
  }, []);

  const { count, total } = useMemo(() => {
    let count = 0, total = 0;
    for (const it of items ?? []) { const q = cart[it.slug] ?? 0; count += q; total += q * it.price; }
    return { count, total };
  }, [items, cart]);

  if (!items) return <Spinner label="Cargando el menú…" />;
  const closed = config?.store && !config.store.open;

  return (
    <div className="flex flex-col gap-4 py-2">
      <PageTitle sub={closed ? "En este momento estamos cerrados." : "Cada pedido entregado te da XP y una ficha."}>EL MENÚ</PageTitle>
      <ul className="flex flex-col gap-3">
        {items.map((it) => {
          const q = cart[it.slug] ?? 0;
          return (
            <li key={it.id} className={`flex gap-3 rounded-xl border-2 bg-cabinet p-3 ${q > 0 ? "border-cheese" : "border-line"}`}>
              <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-night"><PixelSprite name={it.slug} size={64} /></div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{it.name}</h2>
                  <span className="font-display text-cheese">{cop(it.price)}</span>
                </div>
                <p className="text-sm text-muted">{it.description}</p>
                <div className="mt-1 flex items-center justify-end gap-3">
                  {q > 0 && (
                    <>
                      <button aria-label={`Quitar una ${it.name}`} onClick={() => setQty(it.slug, q - 1)}
                        className="grid size-11 place-items-center rounded-lg border-2 border-line text-xl font-bold">−</button>
                      <span className="font-display w-6 text-center text-lg" aria-live="polite">{q}</span>
                    </>
                  )}
                  <button aria-label={`Agregar una ${it.name}`} onClick={() => setQty(it.slug, q + 1)} disabled={!!closed || q >= 20}
                    className="grid size-11 place-items-center rounded-lg bg-cheese text-xl font-bold text-night disabled:opacity-40">+</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 mx-auto w-full max-w-lg px-4 pb-3">
          <LinkButton href="/pedido" className="w-full justify-between text-lg">
            <span>Ver pedido ({count})</span><span className="font-display">{cop(total)}</span>
          </LinkButton>
        </div>
      )}
    </div>
  );
}
