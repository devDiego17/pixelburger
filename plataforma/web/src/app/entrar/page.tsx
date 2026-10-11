"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useApp } from "@/components/app-provider";
import { Button, Field, inputClass } from "@/components/ui";
import { PixelSprite } from "@/components/pixel-sprite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EntrarPage() {
  const router = useRouter();
  const { state, refresh } = useApp();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (state === "ready") router.replace("/"); if (state === "incomplete") router.replace("/bienvenida"); }, [state, router]);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown((c) => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setError("Escribe un correo válido."); return; }
    setBusy(true);
    const { error } = await supabase().auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) { setError(error.status === 429 ? "Pediste muchos códigos. Espera un minuto." : friendlyError(error)); return; }
    setEmail(clean); setStep("code"); setCooldown(60);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) { setError("El código tiene 6 números."); return; }
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) { setError("Ese código no es válido o ya venció. Pide uno nuevo."); return; }
    await refresh();
  }

  async function google() {
    setError("");
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(friendlyError(error));
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <PixelSprite name="byte" size={88} title="Byte, la mascota de Pixel Burger" />
        <h1 className="font-display text-3xl text-cheese">PIXEL BURGER</h1>
        <p className="text-muted">Entra para pedir, jugar y sumar XP.</p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
          <Field label="Tu correo" hint="Te enviamos un código de 6 números. Sin contraseñas.">
            <input className={inputClass} type="email" inputMode="email" autoComplete="email" placeholder="tucorreo@gmail.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviarme el código"}</Button>
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" /></div>
          <Button type="button" variant="ghost" onClick={google}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M21.8 10.2H12v3.9h5.6c-.5 2.5-2.7 4.2-5.6 4.2a6.3 6.3 0 1 1 4.1-11.1l2.8-2.8A10.2 10.2 0 1 0 12 22.2c5.9 0 9.9-4.1 9.9-10 0-.7-.1-1.3-.1-2z"/></svg>
            Entrar con Google
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4" noValidate>
          <Field label={`Código enviado a ${email}`} hint="Revisa también la carpeta de spam.">
            <input className={`${inputClass} text-center font-display text-2xl tracking-[0.5em]`} inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          </Field>
          <Button type="submit" disabled={busy}>{busy ? "Verificando…" : "Entrar"}</Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-muted underline" onClick={() => { setStep("email"); setCode(""); }}>Cambiar correo</button>
            <button type="button" className="text-cheese underline disabled:text-muted disabled:no-underline" disabled={cooldown > 0 || busy} onClick={() => sendCode()}>
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg border-2 border-danger bg-cabinet p-3 text-sm">{error}</p>}
      <p className="text-center text-xs text-muted">
        Al entrar aceptas la <a className="underline" href="/privacidad">política de tratamiento de datos</a>.
      </p>
    </div>
  );
}
