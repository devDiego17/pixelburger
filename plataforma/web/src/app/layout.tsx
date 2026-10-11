import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Rubik, Silkscreen } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const silkscreen = Silkscreen({ variable: "--font-silkscreen", weight: ["400", "700"], subsets: ["latin"] });
const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Pixel Burger", template: "%s · Pixel Burger" },
  description: "Pide tu hamburguesa, juega la garra, suma XP y gana en la Misión Pixel.",
  applicationName: "Pixel Burger",
  appleWebApp: { capable: true, title: "Pixel Burger", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#15131F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Leer el nonce hace que cada página se genere por solicitud: Next.js lo aplica a sus scripts y la CSP los permite.
  await headers();
  return (
    <html lang="es-CO" className={`${silkscreen.variable} ${rubik.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>
          <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
            {children}
          </main>
          <BottomNav />
        </AppProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
