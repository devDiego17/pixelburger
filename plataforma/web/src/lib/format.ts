export const cop = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });

export const playerTag = (n: number) => "#" + String(n).padStart(4, "0");

export const xpFmt = (n: number) => n.toLocaleString("es-CO");

export const STATUS_LABEL: Record<string, string> = {
  received: "Recibido",
  preparing: "En la plancha",
  on_the_way: "En camino",
  ready: "Listo para recoger",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia (Nequi / Bre-B)",
  card_on_delivery: "Datáfono al recibir",
};

export const PLUSH: Record<string, { name: string; rare?: boolean }> = {
  clasica: { name: "Clásica" },
  montanera: { name: "Montañera" },
  cheese: { name: "Cheese" },
  chorizo: { name: "Chorizo" },
  byte: { name: "Byte" },
  dorada: { name: "Dorada", rare: true },
};
