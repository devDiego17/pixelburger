"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, LinkButton, PageTitle, Spinner } from "@/components/ui";
import { playerTag } from "@/lib/format";

export default function QrPage() {
  const { state, summary, refresh, toast } = useApp();
  const [img, setImg] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!summary) return;
    QRCode.toDataURL(`PB:${summary.qr_token}`, { margin: 1, width: 560, color: { dark: "#15131F", light: "#F5F1E8" } }).then(setImg);
  }, [summary]);

  if (state === "anon") return <div className="flex flex-1 flex-col items-center justify-center gap-4"><p>Entra para ver tu código.</p><LinkButton href="/entrar">Entrar</LinkButton></div>;
  if (!summary) return <Spinner />;

  async function rotate() {
    const { error } = await supabase().rpc("rotate_my_qr");
    setConfirm(false);
    if (error) toast(friendlyError(error), "error"); else { toast("Tu código cambió. El anterior ya no sirve."); refresh(); }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <PageTitle sub="Muéstralo en caja para sumar XP o reclamar tus premios.">MI CÓDIGO</PageTitle>
      <div className="pixel-shadow rounded-2xl border-4 border-cheese bg-paper p-3">
        {img ? <img src={img} alt={`Código QR del jugador ${playerTag(summary.player_no)}`} width={280} height={280} className="size-[min(72vw,280px)]" /> : <div className="size-[280px]" />}
      </div>
      <p className="font-display text-3xl">{playerTag(summary.player_no)}</p>
      <p className="text-muted">{summary.alias}</p>

      {summary.pending_rewards.length > 0 && (
        <Card className="w-full border-lettuce text-left">
          <p className="mb-2 font-bold">Premios para reclamar en caja</p>
          <ul className="flex flex-col gap-1 text-sm">{summary.pending_rewards.map((r) => <li key={r.level}>🎁 {r.name}: {r.reward}</li>)}</ul>
        </Card>
      )}

      <p className="text-xs text-muted">No compartas una foto de este código: con él se registran compras a tu nombre.</p>
      {confirm ? (
        <div className="flex w-full gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirm(false)}>No</Button>
          <Button variant="danger" className="flex-1" onClick={rotate}>Sí, cambiarlo</Button>
        </div>
      ) : <button className="text-sm text-muted underline" onClick={() => setConfirm(true)}>Cambiar mi código</button>}
    </div>
  );
}
