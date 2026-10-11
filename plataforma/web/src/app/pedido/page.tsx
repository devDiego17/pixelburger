"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, Field, LinkButton, PageTitle, Spinner, inputClass } from "@/components/ui";
import { PAYMENT_LABEL, cop } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

type Payment = "cash" | "transfer" | "card_on_delivery";

export default function PedidoPage() {
  const router = useRouter();
  const { state, summary, cart, setQty, clearCart, config, toast } = useApp();
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [barrio, setBarrio] = useState("");
  const [address, setAddress] = useState("");
  const [ref, setRef] = useState("");
  const [payment, setPayment] = useState<Payment>("cash");
  const [change, setChange] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase().from("menu_items").select("*").eq("active", true).order("sort").then(({ data }) => setItems((data as MenuItem[]) ?? []));
  }, []);
  useEffect(() => { if (summary?.barrio && !barrio) setBarrio(summary.barrio); }, [summary, barrio]);

  const lines = useMemo(() => (items ?? []).filter((i) => cart[i.slug]).map((i) => ({ ...i, qty: cart[i.slug] })), [items, cart]);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const zone = config?.zones.find((z) => z.barrio === barrio);
  const fee = mode === "delivery" ? zone?.fee ?? 0 : 0;
  const total = subtotal + fee;

  if (!items || state === "loading") return <Spinner />;
  if (lines.length === 0) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg">Tu pedido está vacío.</p>
      <LinkButton href="/menu">Ir al menú</LinkButton>
    </div>
  );

  const canSubmit = state === "ready" && (mode === "pickup" || (zone && address.trim().length >= 5));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true); setError("");
    const { data, error } = await supabase().rpc("place_order", {
      p_items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
      p_fulfillment: mode, p_barrio: mode === "delivery" ? barrio : null,
      p_address: mode === "delivery" ? address.trim() : null, p_address_ref: mode === "delivery" ? ref.trim() || null : null,
      p_payment: payment, p_cash_change_for: payment === "cash" && change ? Number(change.replace(/\D/g, "")) || null : null,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    clearCart();
    toast(`¡Pedido #${data.order_no} recibido!`);
    router.replace("/pedidos");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 py-2" noValidate>
      <PageTitle>TU PEDIDO</PageTitle>

      <Card>
        <ul className="flex flex-col gap-2">
          {lines.map((l) => (
            <li key={l.slug} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <button type="button" aria-label={`Quitar una ${l.name}`} onClick={() => setQty(l.slug, l.qty - 1)} className="grid size-8 place-items-center rounded border-2 border-line">−</button>
                <span className="font-display w-5 text-center">{l.qty}</span>
                <button type="button" aria-label={`Agregar una ${l.name}`} onClick={() => setQty(l.slug, l.qty + 1)} className="grid size-8 place-items-center rounded border-2 border-line">+</button>
                <span className="ml-1">{l.name}</span>
              </span>
              <span className="font-display text-sm">{cop(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <Link href="/menu" className="mt-3 inline-block text-sm text-cheese underline">Agregar más</Link>
      </Card>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cómo lo recibes">
        {(["delivery", "pickup"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`min-h-14 rounded-lg border-2 font-bold ${mode === m ? "border-cheese bg-cheese text-night" : "border-line bg-cabinet"}`}>
            {m === "delivery" ? "🛵 Domicilio" : "🏪 Recoger"}
          </button>
        ))}
      </div>

      {mode === "delivery" ? (
        <Card className="flex flex-col gap-3">
          <Field label="Barrio" hint={!zone && barrio ? "Ese barrio está fuera de nuestra zona." : undefined}>
            <select className={inputClass} value={barrio} onChange={(e) => setBarrio(e.target.value)}>
              <option value="">Elige tu barrio</option>
              {(config?.zones ?? []).map((z) => <option key={z.barrio} value={z.barrio}>{z.barrio}{z.fee ? ` · domicilio ${cop(z.fee)}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Dirección">
            <input className={inputClass} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} placeholder="Calle 65 # 88-20" />
          </Field>
          <Field label="Referencia (opcional)">
            <input className={inputClass} value={ref} onChange={(e) => setRef(e.target.value)} maxLength={160} placeholder="Apto 301, portería, casa azul…" />
          </Field>
        </Card>
      ) : (
        <Card><p className="text-sm text-muted">Te avisamos aquí mismo cuando esté listo para recoger en el local.</p></Card>
      )}

      <Card className="flex flex-col gap-2">
        <p className="font-bold">¿Cómo vas a pagar?</p>
        {(Object.keys(PAYMENT_LABEL) as Payment[]).map((p) => (
          <label key={p} className={`flex min-h-12 items-center gap-3 rounded-lg border-2 px-3 ${payment === p ? "border-cheese" : "border-line"}`}>
            <input type="radio" name="pago" className="size-5 accent-[var(--color-cheese)]" checked={payment === p} onChange={() => setPayment(p)} />
            {PAYMENT_LABEL[p]}
          </label>
        ))}
        {payment === "cash" && (
          <Field label="¿Con cuánto pagas? (opcional)" hint="Para llevarte las vueltas.">
            <input className={inputClass} inputMode="numeric" value={change} onChange={(e) => setChange(e.target.value)} placeholder="$100.000" />
          </Field>
        )}
      </Card>

      <Field label="Notas para la cocina (opcional)">
        <textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Sin cebolla, salsa aparte…" />
      </Field>

      <Card>
        <div className="flex justify-between text-sm text-muted"><span>Subtotal</span><span>{cop(subtotal)}</span></div>
        {mode === "delivery" && <div className="flex justify-between text-sm text-muted"><span>Domicilio</span><span>{fee ? cop(fee) : "Gratis"}</span></div>}
        <div className="mt-1 flex justify-between text-lg font-bold"><span>Total</span><span className="font-display text-cheese">{cop(total)}</span></div>
        <p className="mt-2 text-xs text-muted">El total final lo confirma Pixel Burger con los precios vigentes. Al entregarse suma XP y 1 ficha.</p>
      </Card>

      {state !== "ready" && (
        <Card className="border-magenta"><p className="text-sm">Para pedir necesitas entrar. Tu carrito queda guardado.</p>
          <LinkButton href="/entrar" className="mt-3 w-full">Entrar</LinkButton></Card>
      )}
      {error && <p role="alert" className="rounded-lg border-2 border-danger bg-cabinet p-3 text-sm">{error}</p>}
      {state === "ready" && <Button type="submit" disabled={!canSubmit || busy} className="text-lg">{busy ? "Enviando…" : `Confirmar pedido · ${cop(total)}`}</Button>}
    </form>
  );
}
