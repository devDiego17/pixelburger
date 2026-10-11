"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useApp } from "@/components/app-provider";
import { Card, Eyebrow, PageTitle, Spinner } from "@/components/ui";
import { xpFmt } from "@/lib/format";
import type { RankRow } from "@/lib/types";

export default function RankingPage() {
  const { summary, config } = useApp();
  const [rows, setRows] = useState<RankRow[] | null>(null);
  useEffect(() => { supabase().rpc("leaderboard", { p_limit: 50 }).then(({ data }) => setRows((data as RankRow[]) ?? [])); }, []);

  const c = config?.campaign;
  return (
    <div className="flex flex-col gap-4 py-2">
      <PageTitle sub={c ? `Del ${new Date(c.starts_at).toLocaleDateString("es-CO", { day: "numeric", month: "long" })} al ${new Date(c.ends_at).toLocaleDateString("es-CO", { day: "numeric", month: "long" })}` : undefined}>
        RANKING
      </PageTitle>
      {c && (
        <Card className="border-cheese">
          <Eyebrow>{c.name}</Eyebrow>
          <p className="text-lg font-bold">Puesto 1: <span className="text-cheese">{c.prize}</span></p>
          <p className="text-sm text-muted">2.º y 3.º: 2 hamburguesas · 4.º a 10.º: 1 hamburguesa. Gana quien llegue primero en caso de empate.</p>
        </Card>
      )}
      {summary?.rank && <p className="text-center text-sm">Vas en el puesto <b className="text-cheese">#{summary.rank}</b> con {xpFmt(summary.xp)} XP</p>}
      {!rows ? <Spinner /> : rows.length === 0 ? <Card><p className="text-muted">Todavía nadie suma XP en esta campaña. ¡Sé el primero!</p></Card> : (
        <ol className="flex flex-col gap-2">
          {rows.map((r) => {
            const me = r.alias === summary?.alias;
            const medal = r.rank === 1 ? "text-cheese" : r.rank <= 3 ? "text-magenta" : "text-muted";
            return (
              <li key={r.rank} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 ${me ? "border-cheese bg-panel" : "border-line bg-cabinet"}`}>
                <span className="flex items-center gap-3"><span className={`font-display w-8 text-lg ${medal}`}>{r.rank}</span><span className="font-medium">{r.alias}{me && " (tú)"}</span></span>
                <span className="font-display">{xpFmt(r.xp)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
