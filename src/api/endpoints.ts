import { api } from './client';
import type {
  ApiItemResponse,
  ApiListResponse,
  DashboardSummary,
  Item,
  ItemSearchResult,
  LoginResponse,
  Order,
  Partner,
  Rate,
} from '../types/api';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export type SessionResponse = Pick<LoginResponse, 'user' | 'org' | 'role'>;

export async function fetchSession(): Promise<SessionResponse> {
  const { data } = await api.get<SessionResponse>('/auth/me');
  return data;
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<ApiItemResponse<DashboardSummary>>('/dashboard/summary');
  return data.data;
}

export async function fetchPartners(type?: 'customer' | 'vendor'): Promise<Partner[]> {
  const { data } = await api.get<ApiListResponse<Partner>>('/partners', {
    params: type ? { type } : undefined,
  });
  return data.data;
}

export async function fetchPartnerLocations(): Promise<string[]> {
  const { data } = await api.get<ApiListResponse<string>>('/partners/locations');
  return data.data;
}

export async function fetchPartner(id: string): Promise<Partner> {
  const { data } = await api.get<ApiItemResponse<Partner>>(`/partners/${id}`);
  return data.data;
}

export interface PartnerPayload {
  code: string;
  partnerType: 'customer' | 'vendor';
  name: string;
  foreignName?: string;
  groupName?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  currency?: string;
  gstin?: string;
  pan?: string;
}

export async function createPartner(payload: PartnerPayload): Promise<Partner> {
  const { data } = await api.post<ApiItemResponse<Partner>>('/partners', payload);
  return data.data;
}

export async function updatePartner(id: string, payload: Partial<PartnerPayload>): Promise<Partner> {
  const { data } = await api.patch<ApiItemResponse<Partner>>(`/partners/${id}`, payload);
  return data.data;
}

export async function deletePartner(id: string): Promise<void> {
  await api.delete(`/partners/${id}`);
}

export async function searchPartners(q: string, location?: string): Promise<Partner[]> {
  const { data } = await api.get<ApiListResponse<Partner>>('/partners/search', {
    params: {
      q,
      type: 'customer',
      ...(location ? { location } : {}),
    },
  });
  return data.data;
}

export async function searchItems(q: string, warehouse: string): Promise<ItemSearchResult[]> {
  const { data } = await api.get<ApiListResponse<ItemSearchResult>>('/items/search', {
    params: { q, warehouse },
  });
  return data.data;
}

export async function fetchItems(): Promise<Item[]> {
  const { data } = await api.get<ApiListResponse<Item>>('/items');
  return data.data;
}

export interface ItemPayload {
  code: string;
  name: string;
  hsn?: string;
  groupName?: string;
  isInventory?: boolean;
  isPurchase?: boolean;
  isSale?: boolean;
  defaultWholesale?: number;
  defaultMrp?: number;
}

export async function createItem(payload: ItemPayload): Promise<Item> {
  const { data } = await api.post<ApiItemResponse<Item>>('/items', payload);
  return data.data;
}

export async function fetchItem(id: string): Promise<Item> {
  const { data } = await api.get<ApiItemResponse<Item>>(`/items/${id}`);
  return data.data;
}

export async function updateItem(id: string, payload: Partial<ItemPayload>): Promise<Item> {
  const { data } = await api.patch<ApiItemResponse<Item>>(`/items/${id}`, payload);
  return data.data;
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`);
}

export interface RatePayload {
  itemId: string;
  wholesale: number;
  mrp: number;
  salesDescription?: string;
}

export async function upsertRates(partnerId: string, rates: RatePayload[]): Promise<Rate[]> {
  const { data } = await api.put<ApiListResponse<Rate>>(`/partners/${partnerId}/rates`, { rates });
  return data.data;
}

export async function fetchOrders(filters?: {
  status?: 'draft' | 'confirmed' | 'cancelled';
  today?: boolean;
}): Promise<Order[]> {
  const { data } = await api.get<ApiListResponse<Order>>('/orders', {
    params: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.today ? { today: 'true' } : {}),
    },
  });
  return data.data;
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data } = await api.get<ApiItemResponse<Order>>(`/orders/${id}`);
  return data.data;
}

export async function fetchRates(partnerId: string): Promise<Rate[]> {
  const { data } = await api.get<ApiListResponse<Rate>>(`/partners/${partnerId}/rates`);
  return data.data;
}

export interface OrderPayload {
  partnerId: string;
  orderDate?: string;
  deliveryDate?: string;
  status?: 'draft' | 'confirmed' | 'cancelled';
  gstRatePct?: number;
  metadata?: Record<string, unknown>;
  lines: {
    itemId: string;
    description?: string;
    qty: number;
    unitRate: number;
    discountPct?: number;
    metadata?: Record<string, unknown>;
  }[];
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
  const { data } = await api.post<ApiItemResponse<Order>>('/orders', payload);
  return data.data;
}

export async function updateOrder(id: string, payload: Partial<OrderPayload>): Promise<Order> {
  const { data } = await api.patch<ApiItemResponse<Order>>(`/orders/${id}`, payload);
  return data.data;
}

export async function deleteOrder(id: string): Promise<void> {
  await api.delete(`/orders/${id}`);
}
