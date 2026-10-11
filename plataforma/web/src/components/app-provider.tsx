"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { errorCode } from "@/lib/errors";
import type { PublicConfig, Summary } from "@/lib/types";

type Toast = { id: number; text: string; kind: "ok" | "error" | "xp" };
type ProfileState = "loading" | "anon" | "incomplete" | "ready";

type Ctx = {
  user: User | null;
  state: ProfileState;
  summary: Summary | null;
  config: PublicConfig | null;
  refresh: () => Promise<void>;
  cart: Record<string, number>;
  setQty: (slug: string, qty: number) => void;
  clearCart: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);
const CART_KEY = "pb-carrito-v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<ProfileState>("loading");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    const sb = supabase();
    const { data: { user: u } } = await sb.auth.getUser();
    setUser(u);
    if (!u) { setSummary(null); setState("anon"); return; }
    const { data, error } = await sb.rpc("my_summary");
    if (error) {
      if (errorCode(error) === "PERFIL_INCOMPLETO") { setSummary(null); setState("incomplete"); return; }
      setState("ready"); // error de red: se mantiene lo último que había
      return;
    }
    setSummary(data as Summary);
    setState("ready");
  }, []);

  useEffect(() => {
    const sb = supabase();
    sb.rpc("public_config").then(({ data }) => data && setConfig(data as PublicConfig));
    refresh();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    try { const raw = localStorage.getItem(CART_KEY); if (raw) setCart(sanitizeCart(JSON.parse(raw))); } catch { /* sin almacenamiento */ }
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const setQty = useCallback((slug: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[slug]; else next[slug] = Math.min(20, Math.floor(qty));
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
    try { localStorage.removeItem(CART_KEY); } catch { /* sin almacenamiento */ }
  }, []);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    clearCart();
    setUser(null); setSummary(null); setState("anon");
  }, [clearCart]);

  const value = useMemo(() => ({ user, state, summary, config, refresh, cart, setQty, clearCart, toast, signOut }),
    [user, state, summary, config, refresh, cart, setQty, clearCart, toast, signOut]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id}
            className={`pixel-shadow pointer-events-auto max-w-sm rounded-lg border-2 px-4 py-3 text-sm font-medium ${
              t.kind === "error" ? "border-danger bg-cabinet text-paper" : t.kind === "xp" ? "border-cheese bg-cabinet text-cheese" : "border-lettuce bg-cabinet text-paper"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

function sanitizeCart(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^[a-z0-9-]{2,40}$/.test(k) && Number.isInteger(v) && (v as number) > 0) out[k] = Math.min(20, v as number);
    }
  }
  return out;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fuera de AppProvider");
  return ctx;
}
