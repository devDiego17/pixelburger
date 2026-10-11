"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/app-provider";
import { Eyebrow, Spinner, XpBar } from "@/components/ui";
import { PixelSprite } from "@/components/pixel-sprite";
import { MenuList } from "@/components/menu-list";
import { REF_KEY } from "@/lib/constants";
import { STATUS_LABEL, playerTag, xpFmt } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function Home() {
  const { state, summary, config } = useApp();
  const router = useRouter();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[#0-9A-Za-z]{1,40}$/.test(ref)) { try { localStorage.setItem(REF_KEY, ref); } catch { /* sin almacenamiento */ } }
  }, []);
  useEffect(() => { if (state === "incomplete") router.replace("/bienvenida"); }, [state, router]);

  if (state === "loading" || state === "incomplete") return <Spinner />;
  const ready = state === "ready" && summary ? summary : null;

  return (
    <div className="flex flex-col gap-4 py-3">
      {/* Marca a la izquierda; XP compacto (o "Entrar") a la derecha */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PixelSprite name="byte" size={40} title="Byte" />
          <span className="font-display text-lg leading-none text-cheese">PIXEL<br />BURGER</span>
        </div>
        {ready ? (
          <Link href="/qr" aria-label="Mi QR de jugador" className="pixel-shadow rounded-lg border-2 border-line bg-cabinet px-3 py-1.5 text-right">
            <span className="block font-display text-sm leading-tight">{xpFmt(ready.xp)} <span className="text-cheese">XP</span></span>
            <span className="block text-[11px] text-muted">{playerTag(ready.player_no)}</span>
          </Link>
        ) : (
          <Link href="/entrar" className="rounded-lg border-2 border-cheese px-3 py-2 text-sm font-bold text-cheese">Entrar</Link>
        )}
      </header>

      {ready && <Alerts />}

      {/* Protagonista: la carta */}
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-2xl leading-tight">¿QUÉ SE TE ANTOJA?</h1>
          <p className="text-sm text-muted">Domicilio en Robledo o recoge en el local. Pagas al recibir o por transferencia.</p>
        </div>
        <MenuList />
      </section>

      {/* Segundo plano: lo que ganas por pedir */}
      <section className="mt-2 flex flex-col gap-3">
        <h2 className="font-display text-sm text-muted">GANA MIENTRAS COMES</h2>
        {ready ? <Progress /> : (
          <p className="rounded-xl border-2 border-line bg-cabinet p-4 text-sm">
            Cada pedido te da <b className="text-cheese">XP</b> y una <b className="text-magenta">ficha</b> para la garra.
            Sube de nivel y gana hamburguesas gratis. <Link href="/entrar" className="font-bold text-cheese underline">Entra y empieza a sumar</Link>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/jugar" className="pixel-shadow flex flex-col gap-1 rounded-xl border-2 border-magenta bg-cabinet p-4">
            <span className="text-2xl" aria-hidden="true">🕹️</span>
            <span className="font-bold">La garra</span>
            <span className="text-sm text-muted">{ready ? `${ready.fichas} ${ready.fichas === 1 ? "ficha" : "fichas"} para jugar` : "Atrapa peluches y gana XP"}</span>
          </Link>
          <Link href="/ranking" className="pixel-shadow flex flex-col gap-1 rounded-xl border-2 border-line bg-cabinet p-4">
            <span className="text-2xl" aria-hidden="true">🏆</span>
            <span className="font-bold">{config?.campaign?.name ?? "Misión Pixel"}</span>
            <span className="text-sm text-muted">
              {ready?.rank ? <>Vas <b className="text-paper">#{ready.rank}</b> · </> : null}
              Premio: {config?.campaign?.prize ?? "GTA VI"}
            </span>
          </Link>
        </div>
        <Link href="/codigo" className="text-center text-sm text-muted underline">¿Tienes un código? Canjéalo aquí</Link>
      </section>
    </div>
  );
}

function Alerts() {
  const { summary } = useApp();
  const [active, setActive] = useState<Order | null>(null);
  useEffect(() => {
    supabase().from("orders").select("*").not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setActive((data?.[0] as Order) ?? null));
  }, []);
  if (!summary) return null;
  return (
    <>
      {active && (
        <Link href="/pedidos" className="flex items-center justify-between rounded-xl border-2 border-magenta bg-cabinet p-4">
          <span><Eyebrow>Pedido #{active.order_no}</Eyebrow><span className="font-bold">{STATUS_LABEL[active.status]}</span></span>
          <span className="text-sm text-cheese underline">Ver</span>
        </Link>
      )}
      {summary.pending_rewards.length > 0 && (
        <Link href="/qr" className="pixel-shadow flex items-center gap-3 rounded-xl border-2 border-lettuce bg-cabinet p-4">
          <span className="text-2xl" aria-hidden="true">🎁</span>
          <span className="flex-1"><b>¡Tienes {summary.pending_rewards.length === 1 ? "un premio" : `${summary.pending_rewards.length} premios`}!</b>
            <span className="block text-sm text-muted">{summary.pending_rewards[0].reward}. Muestra tu QR en caja.</span></span>
        </Link>
      )}
    </>
  );
}

function Progress() {
  const { summary } = useApp();
  if (!summary) return null;
  const lvl = summary.level, next = summary.next_level, base = lvl?.min_xp ?? 0;
  return (
    <div className="rounded-xl border-2 border-cheese bg-cabinet p-4">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Nivel {lvl?.level ?? 0} · {lvl?.name ?? "Sin nivel"}</Eyebrow>
        <span className="font-display">{xpFmt(summary.xp)} <span className="text-cheese">XP</span></span>
      </div>
      {next ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <XpBar value={summary.xp - base} max={next.min_xp - base} />
          <p className="text-sm text-muted">Te faltan <b className="text-paper">{xpFmt(next.min_xp - summary.xp)} XP</b> para {next.name}: {next.reward}.</p>
        </div>
      ) : <p className="mt-2 text-sm text-cheese">¡Llegaste al nivel máximo!</p>}
    </div>
  );
}
