"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Card, Eyebrow, Field, LinkButton, PageTitle, Spinner, inputClass } from "@/components/ui";
import { PixelSprite } from "@/components/pixel-sprite";
import { PLUSH, playerTag, xpFmt } from "@/lib/format";

export default function PerfilPage() {
  const router = useRouter();
  const { state, summary, config, refresh, toast, signOut, user } = useApp();
  const [form, setForm] = useState({ name: "", whatsapp: "", barrio: "", marketing: false });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState("");

  useEffect(() => {
    if (summary) setForm({ name: summary.display_name, whatsapp: summary.whatsapp ?? "", barrio: summary.barrio ?? "", marketing: summary.consent_marketing });
  }, [summary]);

  if (state === "anon") return <div className="flex flex-1 flex-col items-center justify-center gap-4"><p>Entra para ver tu perfil.</p><LinkButton href="/entrar">Entrar</LinkButton></div>;
  if (!summary) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase().rpc("update_my_profile", {
      p_display_name: form.name.trim(), p_whatsapp: form.whatsapp.replace(/\D/g, "") || null, p_barrio: form.barrio || null, p_consent_marketing: form.marketing,
    });
    setBusy(false);
    if (error) toast(friendlyError(error), "error"); else { toast("Datos guardados"); refresh(); }
  }

  async function deleteAccount() {
    const { error } = await supabase().rpc("delete_my_account");
    if (error) { toast(friendlyError(error), "error"); return; }
    await signOut();
    toast("Tu cuenta y tus datos personales se eliminaron.");
    router.replace("/");
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <PageTitle sub={`${playerTag(summary.player_no)} · ${user?.email ?? ""}`}>{summary.alias}</PageTitle>

      <Card>
        <Eyebrow>Álbum de la garra</Eyebrow>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {Object.entries(PLUSH).map(([k, p]) => {
            const n = summary.album[k] ?? 0;
            return (
              <div key={k} className={`flex flex-col items-center gap-1 rounded-lg border-2 bg-night p-2 text-center ${n ? (p.rare ? "border-cheese" : "border-lettuce") : "border-line"}`}>
                <PixelSprite name={k} size={44} dim={!n} />
                <span className="text-xs font-medium">{p.name}</span>
                <span className="font-display text-[10px] text-muted">{n ? `x${n}` : p.rare ? "RARA" : "???"}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">Completa los 6 y ganas {xpFmt(config?.game.album_bonus ?? 200)} XP.</p>
      </Card>

      <form onSubmit={save} className="flex flex-col gap-3">
        <Card className="flex flex-col gap-3">
          <Eyebrow>Mis datos</Eyebrow>
          <Field label="Nombre"><input className={inputClass} value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="WhatsApp"><input className={inputClass} inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          <Field label="Barrio">
            <select className={inputClass} value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })}>
              <option value="">Sin barrio</option>
              {(config?.zones ?? []).map((z) => <option key={z.barrio} value={z.barrio}>{z.barrio}</option>)}
              <option value="Otro">Otro barrio</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[var(--color-cheese)]" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} />Recibir promociones por WhatsApp</label>
          <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
        </Card>
      </form>

      <div className="flex flex-col gap-2">
        <LinkButton href="/pedidos" variant="ghost">Mis pedidos</LinkButton>
        {(summary.role === "staff" || summary.role === "admin") && <LinkButton href="/staff" variant="magenta">Panel del personal</LinkButton>}
        <Button variant="ghost" onClick={async () => { await signOut(); router.replace("/"); }}>Cerrar sesión</Button>
        <Link href="/privacidad" className="py-2 text-center text-sm text-muted underline">Política de tratamiento de datos</Link>
      </div>

      <Card className="border-danger/60">
        <p className="font-bold">Borrar mi cuenta</p>
        <p className="mb-2 text-sm text-muted">Se eliminan tu nombre, WhatsApp, barrio y direcciones. Pierdes tu XP y tus premios. No se puede deshacer.</p>
        <Field label='Escribe BORRAR para confirmar'><input className={inputClass} value={del} onChange={(e) => setDel(e.target.value)} /></Field>
        <Button variant="danger" className="mt-3 w-full" disabled={del.trim().toUpperCase() !== "BORRAR"} onClick={deleteAccount}>Borrar mi cuenta</Button>
      </Card>
    </div>
  );
}
