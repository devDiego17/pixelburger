"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/app-provider";
import { Card, Eyebrow, LinkButton, Spinner, XpBar } from "@/components/ui";
import { PixelSprite } from "@/components/pixel-sprite";
import { REF_KEY } from "@/lib/constants";
import { STATUS_LABEL, playerTag, xpFmt } from "@/lib/format";
import type { Order, RankRow } from "@/lib/types";

export default function Home() {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[#0-9A-Za-z]{1,40}$/.test(ref)) { try { localStorage.setItem(REF_KEY, ref); } catch { /* sin almacenamiento */ } }
  }, []);
  useEffect(() => { if (state === "incomplete") router.replace("/bienvenida"); }, [state, router]);

  if (state === "loading" || state === "incomplete") return <Spinner />;
  return state === "ready" ? <Dashboard /> : <Landing />;
}

function useCountdown(iso?: string) {
  const [left, setLeft] = useState<string>("");
  useEffect(() => {
    if (!iso) return;
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) { setLeft("¡Terminó!"); return; }
      const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
      setLeft(d > 0 ? `${d} días ${h} h` : `${h} h ${Math.floor((ms % 3600000) / 60000)} min`);
    };
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t);
  }, [iso]);
  return left;
}

function Landing() {
  const { config } = useApp();
  const left = useCountdown(config?.campaign?.ends_at);
  const [top, setTop] = useState<RankRow[]>([]);
  useEffect(() => { supabase().rpc("leaderboard", { p_limit: 5 }).then(({ data }) => data && setTop(data as RankRow[])); }, []);
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="grid-bg flex flex-col items-center gap-4 rounded-2xl border-2 border-magenta bg-cabinet px-5 py-8 text-center">
        <PixelSprite name="byte" size={104} title="Byte" />
        <h1 className="font-display text-4xl leading-none text-cheese">PIXEL<br />BURGER</h1>
        <p className="text-lg">Pide. Juega. <span className="text-cheese">Gana XP.</span></p>
        <div className="flex w-full flex-col gap-3">
          <LinkButton href="/entrar">Entrar con mi correo</LinkButton>
          <LinkButton href="/menu" variant="ghost">Ver el menú</LinkButton>
        </div>
      </div>

      {config?.campaign && (
        <Card className="border-cheese">
          <Eyebrow>{config.campaign.name}</Eyebrow>
          <p className="mt-1 text-lg font-bold">El puesto 1 se lleva <span className="text-cheese">{config.campaign.prize}</span></p>
          {left && <p className="text-sm text-muted">Termina en {left}</p>}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm text-muted">ASÍ FUNCIONA</h2>
        {[
          ["1", "Pide tu hamburguesa", "Domicilio en Robledo o recoge en el local."],
          ["2", "Suma XP y fichas", "Cada pedido te da XP y una ficha para la garra."],
          ["3", "Sube de nivel y gana", "Hamburguesas gratis por nivel y GTA VI para el puesto 1."],
        ].map(([n, t, d]) => (
          <div key={n} className="flex items-start gap-3">
            <span className="font-display grid size-9 shrink-0 place-items-center rounded-lg bg-magenta text-night">{n}</span>
            <div><p className="font-bold">{t}</p><p className="text-sm text-muted">{d}</p></div>
          </div>
        ))}
      </section>

      {top.length > 0 && <MiniRanking rows={top} />}
    </div>
  );
}

function MiniRanking({ rows, me }: { rows: RankRow[]; me?: string }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between"><Eyebrow>Top de la Misión</Eyebrow><Link href="/ranking" className="text-sm text-cheese underline">Ver todo</Link></div>
      <ol className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.rank} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${r.alias === me ? "bg-panel" : ""}`}>
            <span className="flex items-center gap-3"><span className="font-display w-6 text-cheese">{r.rank}</span>{r.alias}</span>
            <span className="font-display text-sm">{xpFmt(r.xp)} XP</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Dashboard() {
  const { summary, config } = useApp();
  const [active, setActive] = useState<Order | null>(null);
  const [top, setTop] = useState<RankRow[]>([]);
  useEffect(() => {
    const sb = supabase();
    sb.from("orders").select("*").not("status", "in", "(delivered,cancelled)").order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setActive((data?.[0] as Order) ?? null));
    sb.rpc("leaderboard", { p_limit: 3 }).then(({ data }) => data && setTop(data as RankRow[]));
  }, []);
  const left = useCountdown(config?.campaign?.ends_at);
  if (!summary) return <Spinner />;
  const lvl = summary.level, next = summary.next_level;
  const base = lvl?.min_xp ?? 0;

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="font-display text-2xl text-cheese">{summary.alias}</h1>
        </div>
        <Link href="/qr" className="pixel-shadow rounded-lg border-2 border-line bg-cabinet px-3 py-2 text-center">
          <span className="block font-display text-xs text-muted">JUGADOR</span>
          <span className="font-display text-lg">{playerTag(summary.player_no)}</span>
        </Link>
      </header>

      <Card className="border-cheese">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Nivel {lvl?.level ?? 0} · {lvl?.name ?? "Sin nivel"}</Eyebrow>
            <p className="font-display text-4xl leading-tight">{xpFmt(summary.xp)}<span className="ml-2 text-lg text-cheese">XP</span></p>
          </div>
          <Link href="/jugar" className="text-right">
            <span className="block font-display text-2xl text-magenta">{summary.fichas}</span>
            <span className="text-xs text-muted">{summary.fichas === 1 ? "ficha" : "fichas"}</span>
          </Link>
        </div>
        {next ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <XpBar value={summary.xp - base} max={next.min_xp - base} />
            <p className="text-sm text-muted">Te faltan <b className="text-paper">{xpFmt(next.min_xp - summary.xp)} XP</b> para {next.name}: {next.reward}.</p>
          </div>
        ) : <p className="mt-2 text-sm text-cheese">¡Llegaste al nivel máximo!</p>}
      </Card>

      {summary.pending_rewards.length > 0 && (
        <Link href="/qr" className="pixel-shadow flex items-center gap-3 rounded-xl border-2 border-lettuce bg-cabinet p-4">
          <span className="text-2xl" aria-hidden="true">🎁</span>
          <span className="flex-1"><b>¡Tienes {summary.pending_rewards.length === 1 ? "un premio" : `${summary.pending_rewards.length} premios`}!</b>
            <span className="block text-sm text-muted">{summary.pending_rewards[0].reward}. Muestra tu QR en caja.</span></span>
        </Link>
      )}

      {active && (
        <Link href="/pedidos" className="flex items-center justify-between rounded-xl border-2 border-magenta bg-cabinet p-4">
          <span><Eyebrow>Pedido #{active.order_no}</Eyebrow><span className="font-bold">{STATUS_LABEL[active.status]}</span></span>
          <span className="text-sm text-cheese underline">Ver</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="/menu" className="col-span-2 min-h-16 text-lg">🍔 Pedir ahora</LinkButton>
        <LinkButton href="/jugar" variant="magenta">🕹️ Jugar</LinkButton>
        <LinkButton href="/codigo" variant="ghost">🔑 Código</LinkButton>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>{config?.campaign?.name ?? "Misión Pixel"}</Eyebrow>
            <p className="text-lg font-bold">{summary.rank ? <>Vas en el puesto <span className="text-cheese">#{summary.rank}</span></> : "Todavía no estás en el ranking"}</p>
            {left && <p className="text-sm text-muted">Premio: {config?.campaign?.prize} · termina en {left}</p>}
          </div>
        </div>
      </Card>
      {top.length > 0 && <MiniRanking rows={top} me={summary.alias} />}
    </div>
  );
}
