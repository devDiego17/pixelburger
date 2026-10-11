"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, Eyebrow, Field, PageTitle, Spinner, inputClass } from "@/components/ui";
import { QrScanner } from "@/components/qr-scanner";
import { PAYMENT_LABEL, STATUS_LABEL, cop, playerTag, xpFmt } from "@/lib/format";
import type { Level, Order } from "@/lib/types";

type StaffOrder = Order & { profiles: { alias: string; display_name: string; whatsapp: string | null } | null };
type Tab = "pedidos" | "caja" | "admin";

export default function StaffPage() {
  const { state, summary } = useApp();
  const [tab, setTab] = useState<Tab>("pedidos");
  if (state === "loading" || !summary) return <Spinner />;
  if (summary.role !== "staff" && summary.role !== "admin") {
    return <Card><p>Esta sección es solo para el personal de Pixel Burger.</p><Link href="/" className="mt-2 inline-block text-cheese underline">Volver</Link></Card>;
  }
  const tabs: [Tab, string][] = [["pedidos", "Pedidos"], ["caja", "Caja"], ...(summary.role === "admin" ? [["admin", "Admin"] as [Tab, string]] : [])];
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <PageTitle>PANEL</PageTitle>
        <Link href="/" className="text-sm text-muted underline">Salir del panel</Link>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-12 rounded-lg border-2 font-bold ${tab === k ? "border-cheese bg-cheese text-night" : "border-line bg-cabinet"}`}>{l}</button>
        ))}
      </div>
      {tab === "pedidos" && <OrdersBoard />}
      {tab === "caja" && <Register />}
      {tab === "admin" && <Admin />}
    </div>
  );
}

// ---------------------------------------------------------------- Pedidos
const NEXT: Record<string, { status: string; label: string }[]> = {
  received: [{ status: "preparing", label: "A la plancha" }],
  preparing: [{ status: "on_the_way", label: "Salió en la moto" }, { status: "ready", label: "Listo para recoger" }],
  on_the_way: [{ status: "delivered", label: "Entregado" }],
  ready: [{ status: "delivered", label: "Entregado" }],
};

function OrdersBoard() {
  const { toast } = useApp();
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const known = useRef<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const load = useCallback(async () => {
    const { data } = await supabase().from("orders")
      .select("*, order_items(name, unit_price, qty), profiles(alias, display_name, whatsapp)")
      .in("status", ["received", "preparing", "on_the_way", "ready"]).order("created_at", { ascending: true });
    const list = (data as StaffOrder[]) ?? [];
    const fresh = list.filter((o) => o.status === "received" && !known.current.has(o.id));
    if (known.current.size > 0 && fresh.length) { toast(`Nuevo pedido #${fresh[0].order_no}`); try { navigator.vibrate?.([200, 100, 200]); } catch { /* */ } }
    list.forEach((o) => known.current.add(o.id));
    setOrders(list);
  }, [toast]);

  useEffect(() => {
    load();
    const ch = supabase().channel("panel-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    const t = setInterval(load, 30000); // respaldo si el tiempo real se cae
    return () => { supabase().removeChannel(ch); clearInterval(t); };
  }, [load]);

  async function move(o: StaffOrder, status: string, why?: string) {
    const { data, error } = await supabase().rpc("staff_set_order_status", { p_order: o.id, p_status: status, p_reason: why ?? null });
    if (error) { toast(friendlyError(error), "error"); return; }
    if (status === "delivered") toast(data.xp > 0 ? `Entregado: +${data.xp} XP para ${o.profiles?.alias}` : "Entregado (sin XP: ya sumó compra hoy)");
    setCancelling(null); setReason("");
    load();
  }

  if (!orders) return <Spinner />;
  if (orders.length === 0) return <Card><p className="text-muted">No hay pedidos abiertos. Te avisamos cuando llegue uno.</p></Card>;

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((o) => {
        const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60000));
        return (
          <li key={o.id}>
            <Card className={o.status === "received" ? "border-magenta" : "border-line"}>
              <div className="flex items-start justify-between">
                <div><Eyebrow>#{o.order_no} · hace {mins} min</Eyebrow><p className="text-lg font-bold">{STATUS_LABEL[o.status]}</p></div>
                <span className="font-display text-cheese">{cop(o.total)}</span>
              </div>
              <ul className="mt-2">{o.order_items?.map((i) => <li key={i.name} className="text-lg"><b>{i.qty}</b> × {i.name}</li>)}</ul>
              {o.notes && <p className="mt-1 rounded bg-night p-2 text-sm">📝 {o.notes}</p>}
              <div className="mt-2 text-sm text-muted">
                <p>{o.profiles?.display_name} ({o.profiles?.alias}){o.profiles?.whatsapp && <> · <a className="text-cheese underline" href={`https://wa.me/57${o.profiles.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></>}</p>
                <p>{o.fulfillment === "delivery" ? `🛵 ${o.barrio} · ${o.address}${o.address_ref ? ` (${o.address_ref})` : ""}` : "🏪 Recoge en el local"}</p>
                <p>💳 {PAYMENT_LABEL[o.payment_method]}{o.cash_change_for ? ` · paga con ${cop(o.cash_change_for)}` : ""}</p>
              </div>
              {cancelling === o.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <input className={inputClass} placeholder="Motivo (el cliente lo verá)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
                  <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setCancelling(null)}>Volver</Button>
                    <Button variant="danger" className="flex-1" onClick={() => move(o, "cancelled", reason)}>Cancelar pedido</Button></div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(NEXT[o.status] ?? []).filter((n) => !(n.status === "on_the_way" && o.fulfillment !== "delivery") && !(n.status === "ready" && o.fulfillment !== "pickup"))
                    .map((n) => <Button key={n.status} className="flex-1" onClick={() => move(o, n.status)}>{n.label}</Button>)}
                  <Button variant="danger" onClick={() => setCancelling(o.id)}>Cancelar</Button>
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- Caja
type Player = { id: string; player_no: number; alias: string; display_name: string; xp: number; fichas: number; pending_rewards: Level[] };

function Register() {
  const { toast } = useApp();
  const [code, setCode] = useState("");
  const [scan, setScan] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [burgers, setBurgers] = useState(1);
  const [mont, setMont] = useState(0);
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);

  const find = useCallback(async (raw: string) => {
    const value = raw.trim().replace(/^PB:/, "");
    if (!value) return;
    setScan(false);
    const { data, error } = await supabase().rpc("staff_find_player", { p_code: value });
    if (error) { toast(friendlyError(error), "error"); setPlayer(null); return; }
    setPlayer(data as Player); setCode(""); setBurgers(1); setMont(0); setTicket("");
  }, [toast]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;
    setBusy(true);
    const { data, error } = await supabase().rpc("staff_register_purchase", { p_player: player.id, p_burgers: burgers, p_montaneras: mont, p_ticket: ticket.trim() });
    setBusy(false);
    if (error) { toast(friendlyError(error), "error"); return; }
    toast(data.xp > 0 ? `+${data.xp} XP y 1 ficha para ${player.alias}` : "Registrada, sin XP (ya sumó compra hoy o el ticket ya se usó)");
    find(String(player.player_no));
  }

  async function deliver(level: number) {
    if (!player) return;
    const { error } = await supabase().rpc("staff_deliver_reward", { p_player: player.id, p_level: level });
    if (error) toast(friendlyError(error), "error"); else { toast("Premio entregado"); find(String(player.player_no)); }
  }

  return (
    <div className="flex flex-col gap-3">
      {scan ? <QrScanner onCode={find} onClose={() => setScan(false)} /> : (
        <Card className="flex flex-col gap-3">
          <Button onClick={() => setScan(true)}>📷 Escanear QR del cliente</Button>
          <form onSubmit={(e) => { e.preventDefault(); find(code); }} className="flex gap-2">
            <input className={inputClass} placeholder="o número: #0012" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" variant="ghost">Buscar</Button>
          </form>
        </Card>
      )}

      {player && (
        <>
          <Card className="border-cheese">
            <Eyebrow>{playerTag(player.player_no)}</Eyebrow>
            <p className="text-xl font-bold">{player.alias} <span className="text-base font-normal text-muted">· {player.display_name}</span></p>
            <p className="text-sm text-muted">{xpFmt(player.xp)} XP · {player.fichas} fichas</p>
            {player.pending_rewards.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="font-bold text-lettuce">Premios por entregar</p>
                {player.pending_rewards.map((r) => (
                  <div key={r.level} className="flex items-center justify-between gap-2 rounded-lg bg-night p-2">
                    <span className="text-sm">{r.name}: {r.reward}</span>
                    <Button className="min-h-10 px-3 py-1 text-sm" onClick={() => deliver(r.level)}>Entregado</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <form onSubmit={register}>
            <Card className="flex flex-col gap-3">
              <Eyebrow>Registrar compra en el local</Eyebrow>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hamburguesas"><input className={inputClass} type="number" min={1} max={20} value={burgers} onChange={(e) => setBurgers(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></Field>
                <Field label="De ellas, Montañeras"><input className={inputClass} type="number" min={0} max={burgers} value={mont} onChange={(e) => setMont(Math.max(0, Math.min(burgers, Number(e.target.value) || 0)))} /></Field>
              </div>
              <Field label="N.º de ticket o factura" hint="Evita registrar la misma compra dos veces."><input className={inputClass} value={ticket} onChange={(e) => setTicket(e.target.value)} maxLength={40} /></Field>
              <Button type="submit" disabled={busy || !ticket.trim()}>{busy ? "Registrando…" : "Sumar XP y ficha"}</Button>
            </Card>
          </form>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Admin
function Admin() {
  const { toast } = useApp();
  const [c, setC] = useState({ code: "", label: "", xp: 150, max: "", until: "" });
  const [adj, setAdj] = useState({ player: "", amount: 0, note: "" });
  const [role, setRole] = useState({ player: "", role: "staff" });
  const [log, setLog] = useState<{ id: number; action: string; target: string; details: unknown; created_at: string }[]>([]);

  const loadLog = useCallback(async () => {
    const { data } = await supabase().from("audit_log").select("*").order("created_at", { ascending: false }).limit(30);
    setLog(data ?? []);
  }, []);
  useEffect(() => { loadLog(); }, [loadLog]);

  async function playerId(code: string): Promise<string | null> {
    const { data, error } = await supabase().rpc("staff_find_player", { p_code: code.trim() });
    if (error) { toast(friendlyError(error), "error"); return null; }
    return (data as Player).id;
  }

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().rpc("admin_create_code", {
      p_code: c.code, p_label: c.label, p_xp: c.xp, p_max_uses: c.max ? Number(c.max) : null, p_valid_to: c.until ? new Date(c.until).toISOString() : null,
    });
    if (error) toast(friendlyError(error), "error"); else { toast(`Código creado: ${c.code.toUpperCase()}`); setC({ code: "", label: "", xp: 150, max: "", until: "" }); loadLog(); }
  }
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    const id = await playerId(adj.player); if (!id) return;
    const { error } = await supabase().rpc("admin_adjust_xp", { p_player: id, p_amount: adj.amount, p_note: adj.note });
    if (error) toast(friendlyError(error), "error"); else { toast("XP ajustada"); setAdj({ player: "", amount: 0, note: "" }); loadLog(); }
  }
  async function setPlayerRole(e: React.FormEvent) {
    e.preventDefault();
    const id = await playerId(role.player); if (!id) return;
    const { error } = await supabase().rpc("admin_set_role", { p_player: id, p_role: role.role });
    if (error) toast(friendlyError(error), "error"); else { toast("Rol actualizado"); loadLog(); }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={createCode}><Card className="flex flex-col gap-3">
        <Eyebrow>Crear código secreto</Eyebrow>
        <Field label="Código (mínimo 6 caracteres)" hint="Se guarda cifrado: anótalo, después no se puede ver."><input className={`${inputClass} uppercase`} value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} /></Field>
        <Field label="Descripción"><input className={inputClass} value={c.label} onChange={(e) => setC({ ...c, label: e.target.value })} placeholder="Cartel secreto de la U" /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="XP"><input className={inputClass} type="number" min={1} max={5000} value={c.xp} onChange={(e) => setC({ ...c, xp: Number(e.target.value) })} /></Field>
          <Field label="Usos máx."><input className={inputClass} type="number" min={1} value={c.max} onChange={(e) => setC({ ...c, max: e.target.value })} placeholder="∞" /></Field>
          <Field label="Vence"><input className={inputClass} type="date" value={c.until} onChange={(e) => setC({ ...c, until: e.target.value })} /></Field>
        </div>
        <Button type="submit" disabled={c.code.trim().length < 6 || !c.label.trim()}>Crear código</Button>
      </Card></form>

      <form onSubmit={adjust}><Card className="flex flex-col gap-3">
        <Eyebrow>Ajustar XP</Eyebrow>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Jugador"><input className={inputClass} value={adj.player} onChange={(e) => setAdj({ ...adj, player: e.target.value })} placeholder="#0012" /></Field>
          <Field label="XP (+/−)"><input className={inputClass} type="number" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Motivo (queda registrado)"><input className={inputClass} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></Field>
        <Button type="submit" variant="magenta" disabled={!adj.player || !adj.amount || !adj.note.trim()}>Aplicar ajuste</Button>
      </Card></form>

      <form onSubmit={setPlayerRole}><Card className="flex flex-col gap-3">
        <Eyebrow>Roles del equipo</Eyebrow>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Jugador"><input className={inputClass} value={role.player} onChange={(e) => setRole({ ...role, player: e.target.value })} placeholder="#0003" /></Field>
          <Field label="Rol"><select className={inputClass} value={role.role} onChange={(e) => setRole({ ...role, role: e.target.value })}>
            <option value="customer">Cliente</option><option value="staff">Personal</option><option value="admin">Administrador</option></select></Field>
        </div>
        <Button type="submit" variant="ghost" disabled={!role.player}>Guardar rol</Button>
      </Card></form>

      <Card>
        <Eyebrow>Registro de auditoría</Eyebrow>
        <ul className="mt-2 flex max-h-80 flex-col gap-1 overflow-auto text-xs">
          {log.map((l) => <li key={l.id} className="border-b border-line py-1"><b>{l.action}</b> · {new Date(l.created_at).toLocaleString("es-CO")} · <span className="text-muted">{JSON.stringify(l.details)}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}
