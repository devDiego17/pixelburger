import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "magenta" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-cheese text-night border-cheese",
  magenta: "bg-magenta text-night border-magenta",
  ghost: "bg-transparent text-paper border-line",
  danger: "bg-transparent text-danger border-danger",
};
const BASE =
  "pixel-shadow inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 px-5 py-3 text-base font-bold transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border-2 border-line bg-cabinet p-4 ${className}`}>{children}</section>;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-display text-xs uppercase text-magenta ${className}`}>{children}</p>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-2xl text-cheese">{children}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-paper">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-lg border-2 border-line bg-night px-3 py-2 text-base text-paper placeholder:text-muted/60 focus:border-cheese focus:outline-none";

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-muted">
      <span className="font-display animate-pulse text-cheese">■ ■ ■</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function XpBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 100;
  return (
    <div className="h-5 w-full rounded border-2 border-paper/80 bg-night p-0.5" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-sm bg-[repeating-linear-gradient(90deg,var(--color-cheese)_0_14px,transparent_14px_18px)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
