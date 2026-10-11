"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, Eyebrow, LinkButton, PageTitle, Spinner } from "@/components/ui";
import { PAYMENT_LABEL, STATUS_LABEL, cop } from "@/lib/format";
import type { Order } from "@/lib/types";

const STEPS = { delivery: ["received", "preparing", "on_the_way", "delivered"], pickup: ["received", "preparing", "ready", "delivered"] } as const;

export default function PedidosPage() {
  const { state, user, toast, refresh } = useApp();
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase().from("orders").select("*, order_items(name, unit_price, qty)").order("created_at", { ascending: false }).limit(20);
    setOrders((data as Order[]) ?? []);
  }, []);

  useEffect(() => {
    if (state !== "ready" || !user) return;
    load();
    // Tiempo real: la base de datos solo envía los pedidos que este usuario puede ver (RLS).
    const ch = supabase().channel("mis-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, (p) => {
        load();
        const n = p.new as Partial<Order>;
        if (p.eventType === "UPDATE" && n.status) {
          toast(`Pedido #${n.order_no}: ${STATUS_LABEL[n.status]}`);
          if (n.status === "delivered") refresh();
        }
      })
      .subscribe();
    return () => { supabase().removeChannel(ch); };
  }, [state, user, load, toast, refresh]);

  if (state === "anon") return <div className="flex flex-1 flex-col items-center justify-center gap-4"><p>Entra para ver tus pedidos.</p><LinkButton href="/entrar">Entrar</LinkButton></div>;
  if (!orders) return <Spinner />;

  async function cancel(id: string) {
    const { error } = await supabase().rpc("cancel_my_order", { p_order: id });
    if (error) toast(friendlyError(error), "error"); else { toast("Pedido cancelado"); load(); }
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <PageTitle>MIS PEDIDOS</PageTitle>
      {orders.length === 0 && (<Card><p className="mb-3">Todavía no has pedido nada.</p><LinkButton href="/menu" className="w-full">Ver el menú</LinkButton></Card>)}
      {orders.map((o) => {
        const steps = STEPS[o.fulfillment];
        const idx = steps.indexOf(o.status as never);
        return (
          <Card key={o.id} className={o.status === "delivered" || o.status === "cancelled" ? "" : "border-cheese"}>
            <div className="flex items-start justify-between">
              <div><Eyebrow>Pedido #{o.order_no}</Eyebrow><p className="text-lg font-bold">{STATUS_LABEL[o.status]}</p></div>
              <span className="font-display text-cheese">{cop(o.total)}</span>
            </div>
            {o.status !== "cancelled" && (
              <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Progreso del pedido">
                {steps.map((s, i) => (
                  <li key={s} className="flex flex-col gap-1">
                    <span className={`h-2 rounded-full ${i <= idx ? "bg-cheese" : "bg-line"}`} />
                    <span className={`text-[10px] ${i <= idx ? "text-paper" : "text-muted"}`}>{STATUS_LABEL[s]}</span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="mt-3 text-sm text-muted">
              {o.order_items?.map((i) => <li key={i.name}>{i.qty} × {i.name}</li>)}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {o.fulfillment === "delivery" ? `${o.barrio} · ${o.address ?? ""}` : "Recoger en el local"} · {PAYMENT_LABEL[o.payment_method]}
            </p>
            {o.cancelled_reason && <p className="mt-2 text-sm text-danger">{o.cancelled_reason}</p>}
            {o.status === "received" && <Button variant="danger" className="mt-3 w-full" onClick={() => cancel(o.id)}>Cancelar pedido</Button>}
          </Card>
        );
      })}
    </div>
  );
}
