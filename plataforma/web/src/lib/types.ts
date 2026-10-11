export type Level = { level: number; name: string; min_xp: number; reward: string };

export type Summary = {
  player_no: number;
  display_name: string;
  alias: string;
  whatsapp: string | null;
  barrio: string | null;
  consent_marketing: boolean;
  role: "customer" | "staff" | "admin";
  qr_token: string;
  xp: number;
  fichas: number;
  level: Level | null;
  next_level: Level | null;
  rank: number | null;
  pending_rewards: Level[];
  game_xp_today: number;
  album: Record<string, number>;
};

export type PublicConfig = {
  campaign: { name: string; prize: string; starts_at: string; ends_at: string } | null;
  game: { xp_by_prize: Record<string, number>; daily_xp_cap: number; album_bonus: number };
  xp: Record<string, number>;
  store: { open: boolean; whatsapp?: string; hours?: string } | null;
  levels: Level[];
  zones: { barrio: string; fee: number }[];
};

export type MenuItem = { id: number; slug: string; name: string; description: string; price: number; is_burger: boolean; sort: number };

export type OrderStatus = "received" | "preparing" | "on_the_way" | "ready" | "delivered" | "cancelled";

export type Order = {
  id: string;
  order_no: number;
  user_id: string;
  status: OrderStatus;
  fulfillment: "delivery" | "pickup";
  barrio: string | null;
  address: string | null;
  address_ref: string | null;
  payment_method: "cash" | "transfer" | "card_on_delivery";
  cash_change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
  order_items?: { name: string; unit_price: number; qty: number }[];
};

export type RankRow = { rank: number; alias: string; xp: number };
