"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Field, PageTitle, Spinner, inputClass } from "@/components/ui";
import { REF_KEY } from "@/lib/constants";

const ALIAS_RE = /^[A-Za-z0-9_]{3,20}$/;

export default function BienvenidaPage() {
  const router = useRouter();
  const { state, config, refresh, toast } = useApp();
  const [form, setForm] = useState({ name: "", alias: "", whatsapp: "", barrio: "", adult: false, consent: false, marketing: false, ref: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state === "anon") router.replace("/entrar");
    if (state === "ready") router.replace("/");
  }, [state, router]);
  useEffect(() => { try { const r = localStorage.getItem(REF_KEY); if (r) setForm((f) => ({ ...f, ref: r })); } catch { /* sin almacenamiento */ } }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const aliasOk = ALIAS_RE.test(form.alias);
  const phone = form.whatsapp.replace(/\D/g, "");
  const phoneOk = phone === "" || /^3\d{9}$/.test(phone);
  const ready = form.name.trim().length >= 2 && aliasOk && phoneOk && form.adult && form.consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError("");
    const { error } = await supabase().rpc("complete_signup", {
      p_display_name: form.name.trim(), p_alias: form.alias.trim(), p_whatsapp: phone || null, p_barrio: form.barrio || null,
      p_adult: form.adult, p_consent_data: form.consent, p_consent_marketing: form.marketing, p_referral_qr: form.ref.trim() || null,
    });
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    try { localStorage.removeItem(REF_KEY); } catch { /* sin almacenamiento */ }
    toast("¡Bienvenido! Ganaste tus primeros 100 XP", "xp");
    await refresh();
    router.replace("/");
  }

  if (state === "loading") return <Spinner />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 py-4" noValidate>
      <PageTitle sub="Un minuto y quedas listo para pedir y jugar.">CREA TU JUGADOR</PageTitle>

      <Field label="Tu nombre">
        <input className={inputClass} autoComplete="name" value={form.name} onChange={set("name")} maxLength={60} placeholder="Como te llamamos" />
      </Field>
      <Field label="Tu alias de jugador" hint={form.alias && !aliasOk ? "Solo letras, números y _ (3 a 20)." : "Así apareces en el ranking. Nadie ve tu nombre real."}>
        <input className={inputClass} autoComplete="nickname" value={form.alias} onChange={set("alias")} maxLength={20} placeholder="PlayerUno" />
      </Field>
      <Field label="WhatsApp" hint={!phoneOk ? "Debe ser un celular de 10 dígitos que empiece por 3." : "Para avisarte de tu pedido. Opcional."}>
        <input className={inputClass} inputMode="tel" autoComplete="tel-national" value={form.whatsapp} onChange={set("whatsapp")} placeholder="300 123 4567" />
      </Field>
      <Field label="Tu barrio">
        <select className={inputClass} value={form.barrio} onChange={set("barrio")}>
          <option value="">Elige tu barrio</option>
          {(config?.zones ?? []).map((z) => <option key={z.barrio} value={z.barrio}>{z.barrio}</option>)}
          <option value="Otro">Otro barrio</option>
        </select>
      </Field>
      <Field label="¿Te invitó un jugador?" hint="Escribe su número de jugador (ej. #0012). Opcional.">
        <input className={inputClass} value={form.ref} onChange={set("ref")} maxLength={40} placeholder="#0012" />
      </Field>

      <div className="flex flex-col gap-3 rounded-xl border-2 border-line bg-cabinet p-4 text-sm">
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-cheese)]" checked={form.adult} onChange={set("adult")} />Confirmo que soy mayor de 18 años.</label>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-cheese)]" checked={form.consent} onChange={set("consent")} />
          <span>Autorizo a Pixel Burger a tratar mis datos según la <a href="/privacidad" target="_blank" className="text-cheese underline">política de tratamiento de datos</a> (Ley 1581 de 2012).</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-cheese)]" checked={form.marketing} onChange={set("marketing")} />Quiero recibir promociones por WhatsApp. (Opcional)</label>
      </div>

      {error && <p role="alert" className="rounded-lg border-2 border-danger bg-cabinet p-3 text-sm">{error}</p>}
      <Button type="submit" disabled={!ready || busy}>{busy ? "Creando…" : "Empezar a jugar"}</Button>
    </form>
  );
}
