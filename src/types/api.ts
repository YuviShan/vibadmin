export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthOrg {
  id: string;
  name: string;
  code: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  org: AuthOrg;
  role: string;
}

export interface Partner {
  id: string;
  org_id: string;
  code: string;
  partner_type: 'customer' | 'vendor';
  name: string;
  foreign_name: string | null;
  group_id: string | null;
  group_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  currency: string | null;
  gstin: string | null;
  pan: string | null;
}

export interface Item {
  id: string;
  org_id: string;
  code: string;
  code_pattern: string | null;
  name: string;
  hsn: string | null;
  group_id: string | null;
  group_name: string | null;
  is_inventory: boolean;
  is_purchase: boolean;
  is_sale: boolean;
  default_wholesale: string;
  default_mrp: string;
}

export interface ItemSearchResult extends Item {
  qty_on_hand: string;
}

export interface Rate {
  id: string;
  partner_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  sales_description: string | null;
  wholesale: string;
  mrp: string;
}

export interface OrderLine {
  id: string;
  line_no: number;
  item_id: string;
  item_code: string;
  item_name: string;
  description: string | null;
  qty: string;
  unit_rate: string;
  line_amount: string;
  metadata?: Record<string, unknown>;
}

export interface Order {
  id: string;
  org_id: string;
  order_no: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  partner_id: string;
  partner_code: string;
  partner_name: string;
  order_date: string;
  delivery_date: string | null;
  subtotal: string;
  gst_rate_pct: string;
  gst_amount: string;
  total: string;
  metadata?: Record<string, unknown>;
  lines?: OrderLine[];
}

export interface DashboardSummary {
  todaysSales: number;
  ordersToday: number;
  pendingOrders: number;
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
