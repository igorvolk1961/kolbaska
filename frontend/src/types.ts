export type Role = "client" | "technologist" | "analyst" | "admin";

export interface User {
  id: number;
  email: string;
  role: Role;
  full_name: string;
  is_active: boolean;
  created_at?: string;
}

export interface Level {
  id: number;
  name: string;
  min_points: number;
  discount_pct: number;
  description: string;
  sort: number;
}

export interface Profile {
  id: number;
  points: number;
  currency_pref: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  level_id: number | null;
}

export interface Me {
  user: User;
  profile: Profile | null;
  level: Level | null;
  next_level: Level | null;
  points_to_next: number | null;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  section: "meat_shop" | "art_object";
  category_slug: string;
  description: string;
  composition: string;
  weight_g: number;
  price_base: number;
  dimensions: string;
  production_days: number;
  image: string;
  image_prompt: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  section: string;
  description: string;
  sort: number;
}

export interface GourmetOption {
  id: number;
  group_id: number;
  name: string;
  tooltip: string;
  unit: string;
  price_delta: number;
  effect_color: string;
  effect_taste: string;
  effect_form: string;
  emoji: string;
  sort: number;
  is_active: boolean;
}

export interface GourmetGroup {
  id: number;
  code: string;
  title: string;
  hint: string;
  selector_type: string;
  sort: number;
  options: GourmetOption[];
}

export interface PriceLine {
  name: string;
  price: number;
  group: string;
}

export interface PriceBreakdown {
  total: number;
  lines: PriceLine[];
  summary: string;
}

export interface CartItem {
  id: number;
  product_id: number | null;
  custom_config_id: number | null;
  name_snapshot: string;
  qty: number;
}

export interface Cart {
  items: CartItem[];
  total_base: number;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  custom_config_id: number | null;
  name_snapshot: string;
  qty: number;
  unit_price_base: number;
}

export interface StatusHistory {
  id: number;
  status: string;
  comment: string;
  changed_by: number | null;
  changed_at: string | null;
}

export interface Order {
  id: number;
  number: string;
  client_id: number;
  created_at: string | null;
  status: string;
  currency: string;
  total_base: number;
  total_display: number;
  discount_base: number;
  points_earned: number;
  paid: boolean;
  delivery_mode: string;
  items: OrderItem[];
  history: StatusHistory[];
}

export interface Promo {
  id: number;
  title: string;
  type: "discount" | "points_multiplier";
  scope: "product" | "category" | "all";
  target_id: number | null;
  category_slug: string;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  rate_to_base: number;
}

export interface BackgroundItem {
  name: string;
  url: string;
}

export interface AnalyticsOverview {
  summary: { orders: number; revenue: number; avg_check: number; items_sold: number };
  status_counts: { status: string; label: string; count: number }[];
  top_assortment: { name: string; qty: number; revenue: number }[];
  weekday: { label: string; count: number }[];
  season: { label: string; count: number }[];
  promo_effect: { during_avg: number; outside_avg: number; during_count: number; outside_count: number };
  timeline: { period: string; revenue: number }[];
}

export interface ClientRow {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  points: number;
  level: string | null;
  phone: string;
}
