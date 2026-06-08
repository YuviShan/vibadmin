import { api } from './client';
import type {
  ApiItemResponse,
  ApiListResponse,
  DashboardSummary,
  Item,
  ItemDetail,
  ItemGroupMaster,
  ItemSearchResult,
  LoginResponse,
  Order,
  Partner,
  Rate,
  TerritoryMaster,
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
  code?: string;
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

export interface WarehouseStockPayload {
  warehouseCode: string;
  qty: number;
}

export interface ItemPayload {
  code?: string;
  name: string;
  salesName?: string;
  hsn?: string;
  groupName?: string;
  subgroup?: string;
  uom?: 'Nos' | 'Set' | 'Dozen';
  uomConversion?: number;
  isInventory?: boolean;
  isPurchase?: boolean;
  isActive?: boolean;
  warehouseStock?: WarehouseStockPayload[];
}

export async function createItem(payload: ItemPayload): Promise<ItemDetail> {
  const { data } = await api.post<ApiItemResponse<ItemDetail>>('/items', payload);
  return data.data;
}

export async function fetchItem(id: string): Promise<ItemDetail> {
  const { data } = await api.get<ApiItemResponse<ItemDetail>>(`/items/${id}`);
  return data.data;
}

export async function updateItem(id: string, payload: Partial<ItemPayload>): Promise<ItemDetail> {
  const { data } = await api.patch<ApiItemResponse<ItemDetail>>(`/items/${id}`, payload);
  return data.data;
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`);
}

export async function fetchItemGroupsMaster(): Promise<ItemGroupMaster[]> {
  const { data } = await api.get<ApiListResponse<ItemGroupMaster>>('/masters/item-groups');
  return data.data;
}

export async function createItemGroupMaster(name: string): Promise<ItemGroupMaster> {
  const { data } = await api.post<ApiItemResponse<ItemGroupMaster>>('/masters/item-groups', { name });
  return data.data;
}

export async function createItemSubgroupMaster(
  groupId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const { data } = await api.post<ApiItemResponse<{ id: string; name: string }>>(
    `/masters/item-groups/${groupId}/subgroups`,
    { name },
  );
  return data.data;
}

export async function fetchTerritoriesMaster(): Promise<TerritoryMaster[]> {
  const { data } = await api.get<ApiListResponse<TerritoryMaster>>('/masters/territories');
  return data.data;
}

export async function createTerritoryMaster(
  stateCode: string,
  branchName: string,
): Promise<TerritoryMaster> {
  const { data } = await api.post<ApiItemResponse<TerritoryMaster>>('/masters/territories', {
    stateCode,
    branchName,
  });
  return data.data;
}

export async function fetchItemGroupNames(): Promise<string[]> {
  const { data } = await api.get<ApiListResponse<string>>('/masters/item-group-names');
  return data.data;
}

export async function fetchSubgroupNames(groupName: string): Promise<string[]> {
  const { data } = await api.get<ApiListResponse<string>>('/masters/subgroup-names', {
    params: { groupName },
  });
  return data.data;
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
