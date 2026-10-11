"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";

const HIDDEN = ["/entrar", "/bienvenida", "/staff", "/auth"];

const TABS = [
  { href: "/", label: "Inicio", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/menu", label: "Pedir", icon: "M4 10h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm1-4a7 7 0 0 1 14 0v1H5zm0 8h14l-1 4H6z" },
  { href: "/jugar", label: "Jugar", icon: "M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7zm1 3v2H6v2h2v2h2v-2h2v-2h-2v-2zm7.5 1a1.5 1.5 0 1 0 0 .01zm2 2.5a1.5 1.5 0 1 0 0 .01z" },
  { href: "/ranking", label: "Ranking", icon: "M5 20V10h4v10zm5 0V4h4v16zm5 0v-7h4v7z" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 9a8 8 0 0 1 16 0z" },
];

export function BottomNav() {
  const path = usePathname();
  const { summary, cart } = useApp();
  if (HIDDEN.some((h) => path.startsWith(h))) return null;
  const items = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <nav aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-night/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          const badge = t.href === "/menu" ? items : t.href === "/jugar" ? summary?.fichas ?? 0 : 0;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-cheese" : "text-muted"}`}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d={t.icon} /></svg>
                {t.label}
                {badge > 0 && (
                  <span className="absolute right-3 top-2 min-w-5 rounded-full bg-magenta px-1.5 text-center text-[11px] font-bold leading-5 text-night">{badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
