"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, Field, LinkButton, PageTitle, inputClass } from "@/components/ui";

export default function CodigoPage() {
  const { state, refresh, toast } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (state === "anon") return <div className="flex flex-1 flex-col items-center justify-center gap-4"><p>Entra para canjear códigos.</p><LinkButton href="/entrar">Entrar</LinkButton></div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim();
    if (clean.length < 6) { setResult({ ok: false, text: "El código tiene al menos 6 caracteres." }); return; }
    setBusy(true); setResult(null);
    const { data, error } = await supabase().rpc("redeem_code", { p_code: clean });
    setBusy(false);
    if (error) { setResult({ ok: false, text: friendlyError(error) }); return; }
    if (!data.ok) { setResult({ ok: false, text: friendlyError(data.error) }); return; }
    setResult({ ok: true, text: `+${data.xp} XP · ${data.label}` });
    toast(`+${data.xp} XP`, "xp");
    setCode("");
    refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 py-2" noValidate>
      <PageTitle sub="Búscalos en los carteles de Robledo, en las cajas y en las historias de Instagram.">CANJEAR CÓDIGO</PageTitle>
      <Field label="Código">
        <input className={`${inputClass} font-display text-xl uppercase tracking-widest`} autoCapitalize="characters" autoComplete="off" spellCheck={false}
          value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder="CARTEL-XXXX" />
      </Field>
      <Button type="submit" disabled={busy}>{busy ? "Revisando…" : "Canjear"}</Button>
      {result && <Card className={result.ok ? "border-cheese" : "border-danger"}><p role="status" className={result.ok ? "font-display text-cheese" : ""}>{result.text}</p></Card>}
    </form>
  );
}
