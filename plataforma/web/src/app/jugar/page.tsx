"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Card, LinkButton, Spinner } from "@/components/ui";
import { createGarra, type GarraController, type GarraResult, type GarraState } from "@/lib/garra/engine";
import { PLUSH } from "@/lib/format";

type Banner = { title: string; text: string; tip?: string; good: boolean };

export default function JugarPage() {
  const { state, summary, config, refresh, toast } = useApp();
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<GarraController | null>(null);
  const session = useRef<string | null>(null);
  const [gstate, setGstate] = useState<GarraState>("idle");
  const [timer, setTimer] = useState<number | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [starting, setStarting] = useState(false);
  const [sound, setSound] = useState(true);

  const finishRef = useRef<(r: GarraResult) => void>(() => {});
  useEffect(() => {
    if (!canvas.current) return;
    const g = createGarra(canvas.current, {
      onState: (s) => { setGstate(s); if (s !== "moving" && s !== "carrying") setTimer(null); },
      onTimer: setTimer,
      onResult: (r) => finishRef.current(r),
    });
    game.current = g;
    return () => g.destroy();
  }, [state]);

  async function finish(r: GarraResult) {
    const id = session.current; session.current = null;
    if (!id) return;
    const { data, error } = await supabase().rpc("finish_game", {
      p_session: id, p_prize: r.outcome === "win" ? r.prize : null,
      p_details: { outcome: r.outcome, tap_error_ms: r.tapErrorMs, duration_ms: r.durationMs },
    });
    if (error) { setBanner({ title: "UPS", text: friendlyError(error), good: false }); refresh(); return; }
    if (r.outcome === "win" && r.prize) {
      const xp = data.xp as number;
      setBanner({ title: "¡PREMIO!", text: `Peluche ${PLUSH[r.prize]?.name ?? r.prize}`, tip: xp > 0 ? `+${xp} XP` : "Ya llegaste al tope de XP del juego por hoy. Queda en tu álbum.", good: true });
      if (xp > 0) toast(`+${xp} XP`, "xp");
    } else {
      const titles: Record<string, string> = { slip: "¡CASI!", drop: "¡OH NO!", bounce: "¡REBOTÓ!", miss: "¡UFF!" };
      setBanner({ title: titles[r.outcome] ?? "¡UFF!", text: r.outcome === "slip" ? "Se te resbaló en el camino." : "No lo sacaste esta vez.", tip: r.tip, good: false });
    }
    refresh();
  }

  async function start() {
    if (!game.current || gstate !== "idle" || starting) return;
    setStarting(true); setBanner(null);
    const { data, error } = await supabase().rpc("start_game");
    setStarting(false);
    if (error) { toast(friendlyError(error), "error"); return; }
    session.current = data.session;
    game.current.startTurn(data.seed);
    refresh();
  }

  useEffect(() => { finishRef.current = finish; });
  function press() { if (gstate === "idle") start(); else game.current?.action(); }
  function steer(d: -1 | 0 | 1) { game.current?.setDir(d); }
  function holdStart(e: React.PointerEvent, d: -1 | 1) { e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); steer(d); }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat && e.key === " ") return;
      if (e.key === "ArrowLeft") game.current?.setDir(-1);
      else if (e.key === "ArrowRight") game.current?.setDir(1);
      else if (e.key === " ") { e.preventDefault(); press(); }
    };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") game.current?.setDir(0); };
    const blur = () => game.current?.setDir(0);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  });

  if (state === "loading") return <Spinner />;
  if (state === "anon") return <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><p>Entra para jugar la garra y ganar XP.</p><LinkButton href="/entrar">Entrar</LinkButton></div>;

  const fichas = summary?.fichas ?? 0;
  const cap = config?.game.daily_xp_cap ?? 80;
  const label = gstate === "idle" ? (starting ? "…" : fichas > 0 ? "JUGAR" : "SIN FICHAS") : gstate === "moving" ? "AGARRAR" : gstate === "gripping" ? "¡APRIETA!" : gstate === "carrying" ? "SOLTAR" : "…";
  const actionable = gstate === "idle" ? fichas > 0 && !starting : gstate !== "busy";
  const canMove = gstate === "moving" || gstate === "carrying";

  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-display rounded-md border-2 border-line bg-cabinet px-2 py-1">Fichas <b className="text-cheese">{fichas}</b></span>
        <span className="font-display rounded-md border-2 border-line bg-cabinet px-2 py-1">Tiempo <b className="text-cheese">{timer ?? "--"}</b></span>
        <span className="font-display rounded-md border-2 border-line bg-cabinet px-2 py-1">XP hoy <b className="text-cheese">{summary?.game_xp_today ?? 0}/{cap}</b></span>
        <button className="text-xs text-muted underline" onClick={() => { setSound(!sound); game.current?.setSound(!sound); }}>{sound ? "Sonido sí" : "Sonido no"}</button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-[3px] border-magenta shadow-[0_0_24px_rgba(255,79,139,.35)]"
        onPointerDown={() => { if (gstate === "gripping") game.current?.action(); }}>
        <canvas ref={canvas} className="block aspect-[360/520] w-full touch-none bg-[#120F1C]" aria-label="Máquina de garra de Pixel Burger" />
        {banner && gstate === "idle" && (
          <div className={`absolute left-1/2 top-[38%] w-[86%] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border-[3px] bg-night/95 p-4 text-center ${banner.good ? "border-cheese" : "border-magenta"}`}>
            <p className={`font-display text-2xl ${banner.good ? "text-cheese" : "text-magenta"}`}>{banner.title}</p>
            <p>{banner.text}</p>
            {banner.tip && <p className="mt-1 text-sm text-muted">{banner.tip}</p>}
          </div>
        )}
        {gstate === "idle" && fichas === 0 && !banner && (
          <div className="absolute inset-x-6 top-1/3 rounded-xl border-2 border-cheese bg-night/95 p-4 text-center text-sm">
            Cada pedido te da 1 ficha. <LinkButton href="/" className="mt-3 w-full">Pedir ahora</LinkButton>
          </div>
        )}
      </div>

      <div className="grid select-none grid-cols-[1fr_1.4fr_1fr] items-center gap-3 rounded-2xl border-2 border-line bg-cabinet p-3 touch-none">
        <button aria-label="Mover a la izquierda" disabled={!canMove} onPointerDown={(e) => holdStart(e, -1)} onPointerUp={() => steer(0)} onPointerCancel={() => steer(0)} onLostPointerCapture={() => steer(0)} onContextMenu={(e) => e.preventDefault()}
          className="font-display h-16 rounded-xl bg-panel text-2xl shadow-[inset_0_-5px_0_#18152A] active:translate-y-0.5 disabled:opacity-30">◀</button>
        <button onClick={press} disabled={!actionable}
          className="font-display mx-auto grid size-24 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#FF7A7C,#E5383B_55%,#9E1F22)] text-base font-bold leading-tight text-white shadow-[0_7px_0_#6B1416] active:translate-y-1 active:shadow-[0_3px_0_#6B1416] disabled:grayscale-[.8] disabled:brightness-75">
          {label}
        </button>
        <button aria-label="Mover a la derecha" disabled={!canMove} onPointerDown={(e) => holdStart(e, 1)} onPointerUp={() => steer(0)} onPointerCancel={() => steer(0)} onLostPointerCapture={() => steer(0)} onContextMenu={(e) => e.preventDefault()}
          className="font-display h-16 rounded-xl bg-panel text-2xl shadow-[inset_0_-5px_0_#18152A] active:translate-y-0.5 disabled:opacity-30">▶</button>
      </div>

      <Card className="text-sm text-muted">
        <b className="text-paper">Cómo se juega:</b> mueve la garra (se balancea), pulsa AGARRAR, aprieta cuando la aguja pase por el verde y suelta el peluche en la SALIDA.
        Cada peluche suma XP (tope de {cap} XP al día) y completa tu álbum.
      </Card>
    </div>
  );
}
