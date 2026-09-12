import { api } from "./client";
import type {
  AnalyticsOverview,
  Cart,
  Category,
  ClientRow,
  CurrencyRate,
  GourmetGroup,
  Me,
  Order,
  PriceBreakdown,
  Product,
  Promo,
  User,
} from "../types";

export const authApi = {
  register: (payload: { email: string; password: string; full_name: string }) =>
    api.post<{ access_token: string; role: string; full_name: string; email: string }>(
      "/api/auth/register",
      payload,
    ),
  login: (payload: { email: string; password: string }) =>
    api.post<{ access_token: string; role: string; full_name: string; email: string }>(
      "/api/auth/login",
      payload,
    ),
  me: () => api.get<Me>("/api/auth/me"),
  updateMe: (payload: Partial<{ full_name: string; phone: string; address: string; currency_pref: string }>) =>
    api.patch<Me>("/api/auth/me", payload),
  levels: () => api.get("/api/auth/levels"),
};

export const catalogApi = {
  products: (params?: { section?: string; category?: string; search?: string; include_inactive?: boolean }) =>
    api.get<Product[]>("/api/catalog/products", { params }),
  product: (id: number) => api.get<Product>(`/api/catalog/products/${id}`),
  categories: (section?: string) => api.get<Category[]>("/api/catalog/categories", { params: { section } }),
  currency: () => api.get<CurrencyRate[]>("/api/catalog/currency"),
  saveProduct: (payload: Partial<Product>, id?: number) =>
    id ? api.put<Product>(`/api/catalog/products/${id}`, payload) : api.post<Product>("/api/catalog/products", payload),
};

export const gourmetApi = {
  groups: () => api.get<GourmetGroup[]>("/api/gourmet/groups"),
  price: (payload: {
    type_option_id: number;
    technology_option_id: number;
    raw_material_option_id: number;
    form_option_id: number;
    additive_option_ids: number[];
    spice_option_ids: number[];
  }) => api.post<PriceBreakdown>("/api/gourmet/price", payload),
  saveConfig: (payload: {
    type_option_id: number;
    technology_option_id: number;
    raw_material_option_id: number;
    form_option_id: number;
    additive_option_ids: number[];
    spice_option_ids: number[];
  }) => api.post<{ id: number; price_base: number; summary: string }>("/api/gourmet/configs", payload),
  updateOption: (id: number, payload: Record<string, unknown>) =>
    api.put(`/api/gourmet/options/${id}`, payload),
};

export const cartApi = {
  get: () => api.get<Cart>("/api/cart"),
  add: (payload: { product_id?: number; custom_config_id?: number; qty?: number }) =>
    api.post<Cart>("/api/cart/items", payload),
  update: (itemId: number, qty: number) => api.patch<Cart>(`/api/cart/items/${itemId}`, null, { params: { qty } }),
  remove: (itemId: number) => api.delete<Cart>(`/api/cart/items/${itemId}`),
  clear: () => api.delete<Cart>("/api/cart"),
};

export const ordersApi = {
  list: (params?: { status?: string; mine?: boolean }) => api.get<Order[]>("/api/orders", { params }),
  get: (id: number) => api.get<Order>(`/api/orders/${id}`),
  checkout: (payload: { currency: string; delivery_mode: string }) =>
    api.post<Order>("/api/orders/checkout", payload),
  pay: (id: number) => api.post<Order>(`/api/orders/${id}/pay`),
  setStatus: (id: number, status: string, comment = "") =>
    api.patch<Order>(`/api/orders/${id}/status`, { status, comment }),
  exportUrl: (id: number, format: "md" | "json") => `/api/orders/${id}/export?format=${format}`,
};

export const promosApi = {
  list: () => api.get<Promo[]>("/api/promos"),
  public: () => api.get<Promo[]>("/api/promos/public"),
  create: (payload: Partial<Promo>) => api.post<Promo>("/api/promos", payload),
  update: (id: number, payload: Partial<Promo>) => api.put<Promo>(`/api/promos/${id}`, payload),
  remove: (id: number) => api.delete(`/api/promos/${id}`),
};

export const analyticsApi = {
  overview: (days = 90) => api.get<AnalyticsOverview>("/api/analytics/overview", { params: { days } }),
};

export const adminApi = {
  users: () => api.get<User[]>("/api/admin/users"),
  createUser: (payload: { email: string; password: string; full_name: string; role: string }) =>
    api.post<User>("/api/admin/users", payload),
  updateUser: (id: number, payload: Partial<{ full_name: string; role: string; is_active: boolean; password: string }>) =>
    api.patch<User>(`/api/admin/users/${id}`, payload),
  clients: () => api.get<ClientRow[]>("/api/admin/clients"),
  adjustPoints: (id: number, points_delta: number) =>
    api.post<User>(`/api/admin/clients/${id}/points`, { points_delta }),
};

export const assistantApi = {
  quickReplies: () => api.get<string[]>("/api/assistant/quick-replies"),
  chat: (session_id: string, message: string) =>
    api.post<{ session_id: string; reply: string }>("/api/assistant/chat", { session_id, message }),
  history: (sessionId: string) => api.get<{ role: string; text: string }[]>(`/api/assistant/history/${sessionId}`),
};

export const metaApi = {
  statuses: () => api.get<{ code: string; label: string }[]>("/api/meta/statuses"),
};
