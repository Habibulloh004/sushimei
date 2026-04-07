// API Configuration - uses environment variable or defaults based on environment
const getApiBaseUrl = (): string => {
  // Check for explicit environment variable first
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // In browser, check for window location to determine environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production: api.sushimei.uz
    if (hostname.includes('sushimei.uz')) {
      return 'https://api.sushimei.uz/api/v1';
    }

    // Development: localhost with port 8080
    return 'http://localhost:8080/api/v1';
  }

  // Server-side default
  return 'http://localhost:8080/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_page?: number;
    total_pages: number;
    sort_by?: string;
    sort_order?: string;
  };
  error?: {
    message: string;
    details?: string;
    detail?: string;
  };
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private normalizeMeta(meta: unknown): ApiResponse<unknown>['meta'] | undefined {
    if (!meta || typeof meta !== 'object') return undefined;

    const raw = meta as Record<string, unknown>;
    const page = Number(raw.page);
    const limit = Number(raw.limit);
    const total = Number(raw.total);
    const totalPages = Number(raw.total_pages ?? raw.total_page);

    if (![page, limit, total, totalPages].every(Number.isFinite)) {
      return undefined;
    }

    return {
      page,
      limit,
      total,
      total_pages: totalPages,
      total_page: totalPages,
      sort_by: typeof raw.sort_by === 'string' ? raw.sort_by : undefined,
      sort_order: typeof raw.sort_order === 'string' ? raw.sort_order : undefined,
    };
  }

  private clearAuthStorage() {
    this.setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
    }
  }

  private async parseJsonBody(response: Response): Promise<Record<string, unknown> | null> {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const response = await fetch(this.buildUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const payload = await this.parseJsonBody(response);
          if (!response.ok) {
            this.clearAuthStorage();
            return false;
          }

          const tokens = payload?.data as { access_token?: unknown; refresh_token?: unknown } | undefined;
          const nextAccessToken = typeof tokens?.access_token === 'string' ? tokens.access_token : null;
          const nextRefreshToken = typeof tokens?.refresh_token === 'string' ? tokens.refresh_token : null;
          if (!nextAccessToken || !nextRefreshToken) {
            this.clearAuthStorage();
            return false;
          }

          this.setAccessToken(nextAccessToken);
          localStorage.setItem('refreshToken', nextRefreshToken);
          return true;
        } catch {
          return false;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, allowRetry = true): Promise<ApiResponse<T>> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const data = await this.parseJsonBody(response);

      if (response.status === 401 && allowRetry && endpoint !== '/auth/refresh') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, false);
        }
      }

      if (!response.ok) {
        const envelopeError = data?.error as { message?: unknown; detail?: unknown; details?: unknown } | undefined;
        return {
          success: false,
          data: null as T,
          error: {
            message:
              (typeof envelopeError?.message === 'string' && envelopeError.message) ||
              (typeof data?.message === 'string' && data.message) ||
              'Request failed',
            details:
              (typeof envelopeError?.details === 'string' && envelopeError.details) ||
              (typeof envelopeError?.detail === 'string' && envelopeError.detail) ||
              (typeof data?.details === 'string' && data.details) ||
              undefined,
            detail:
              (typeof envelopeError?.detail === 'string' && envelopeError.detail) ||
              (typeof data?.detail === 'string' && data.detail) ||
              undefined,
          },
        };
      }

      return {
        success: true,
        data: (data?.data as T) ?? (null as T),
        meta: this.normalizeMeta(data?.meta),
      };
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Types
export interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name_i18n: Record<string, string>;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  product_count: number;
}

export interface Product {
  id: string;
  category_id: string;
  category_name: string;
  sku: string | null;
  slug: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  base_price: number;
  image_url: string | null;
  tags: string[];
  is_spicy: boolean;
  is_vegan: boolean;
  is_halal: boolean;
  allergens: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductDetail extends Product {
  gallery: string[];
  variants: ProductVariant[];
  modifier_groups: ModifierGroup[];
}

export interface ProductVariant {
  id: string;
  name_i18n: Record<string, string>;
  sku: string | null;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface ModifierGroup {
  id: string;
  name_i18n: Record<string, string>;
  min_select: number;
  max_select: number;
  required: boolean;
  sort_order: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name_i18n: Record<string, string>;
  price_delta: number;
  sort_order: number;
  is_active: boolean;
}

export interface Spot {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  timezone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_fee: number;
  minimum_order: number;
  pickup_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SpotDetail extends Spot {
  operating_hours: OperatingHour[];
  delivery_zones: DeliveryZone[];
}

export interface OperatingHour {
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  extra_fee: number;
  min_eta_minutes: number | null;
  max_eta_minutes: number | null;
  is_active: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  bonus_balance: number;
  marketing_opt_in: boolean;
  language_code: string;
  last_login_at: string | null;
  total_orders?: number;
  last_order_at?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  order_type: 'DELIVERY' | 'PICKUP' | 'WALK_IN';
  payment_type: 'CARD' | 'CASH';
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  spot_name: string;
  created_at: string;
}

export type OrderStatus =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface Employee {
  id: string;
  role_code: string;
  role_title: string;
  spot_id: string | null;
  spot_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  title_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  reward_type: 'DISCOUNT' | 'BONUS_POINTS' | 'BONUS_PRODUCT';
  applies_to: 'ORDER' | 'PRODUCT';
  discount_type: 'FIXED' | 'PERCENT';
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  bonus_points: number | null;
  bonus_product_id: string | null;
  bonus_product_name: string | null;
  bonus_product_quantity: number;
  category_ids: string[];
  product_ids: string[];
  spot_ids: string[];
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface BonusRule {
  id: string;
  is_active: boolean;
  earn_percent: number;
  spend_rate: number;
  min_order_to_earn: number;
  max_spend_percent: number;
  expires_in_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderDetailItem {
  id: string;
  product_id: string;
  product_name: Record<string, string>;
  unit_price: number;
  quantity: number;
  line_total: number;
  note: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  order_type: 'DELIVERY' | 'PICKUP' | 'WALK_IN';
  payment_type: 'CARD' | 'CASH';
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  spot_name: string;
  spot_id: string;
  notes: string;
  items: OrderDetailItem[];
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string | null;
  city: string | null;
  street: string | null;
  house: string | null;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  language_code?: string;
  marketing_opt_in?: boolean;
}

export interface CustomerAddressCreate {
  label?: string;
  city?: string;
  street?: string;
  house?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  delivery_notes?: string;
  is_default?: boolean;
}

export interface OrderDraftItem {
  product_id: string;
  quantity: number;
}

export interface OrderDraft {
  spot_id: string;
  order_type: 'DELIVERY' | 'PICKUP' | 'WALK_IN';
  payment_type: 'CARD' | 'CASH';
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Record<string, unknown>;
  promo_code?: string;
  bonus_points_to_spend?: number;
  notes?: string;
  items: OrderDraftItem[];
}

export interface PricingItem {
  product_id: string;
  product_name: Record<string, string>;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount_amount: number;
  is_bonus_product: boolean;
}

export interface AppliedPromo {
  id: string;
  code: string;
  reward_type: 'DISCOUNT' | 'BONUS_POINTS' | 'BONUS_PRODUCT';
  applies_to: 'ORDER' | 'PRODUCT';
  discount_amount: number;
  bonus_points: number;
  bonus_product_id: string | null;
  bonus_product_name: string | null;
  bonus_product_quantity: number;
}

export interface OrderPricing {
  items: PricingItem[];
  subtotal_amount: number;
  promo_discount_amount: number;
  bonus_spent_amount: number;
  bonus_points_spent: number;
  delivery_fee_amount: number;
  total_amount: number;
  bonus_earned_points: number;
  applied_promo?: AppliedPromo | null;
}

export interface CreatedOrder {
  order_id: string;
  order_number: string;
  pricing: OrderPricing;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  expires_in_sec?: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  search?: string;
  status?: string;
  spot_id?: string;
  payment_type?: 'CARD' | 'CASH';
  order_type?: 'DELIVERY' | 'PICKUP' | 'WALK_IN';
  category_id?: string;
  include_inactive?: boolean;
  date_from?: string;
  date_to?: string;
}

// Dashboard stats types
export interface DashboardStats {
  today_revenue: number;
  today_revenue_change: number;
  active_orders: number;
  active_orders_change: number;
  total_customers: number;
  customers_change: number;
  total_products: number;
  products_change: number;
}

export interface DashboardOverview extends DashboardStats {
  recent_orders: Order[];
  efficiency: EfficiencyMetrics;
  loyalty: LoyaltyStats;
}

export interface EfficiencyMetrics {
  avg_prep_time_minutes: number;
  avg_delivery_time_minutes: number;
  order_error_rate: number;
}

export interface LoyaltyStats {
  total_points_issued: number;
  total_points_used: number;
  total_points_remaining: number;
  year_over_year_change: number;
}

export interface CustomerRegisterResponse extends Partial<AuthTokens> {
  exists?: boolean;
}

// Public endpoints (no auth required)
export const publicApi = {
  getCategories: (includeInactive = false) =>
    api.get<Category[]>('/public/categories', { include_inactive: includeInactive }),

  getCategory: (id: string) =>
    api.get<Category>(`/public/categories/${id}`),

  getProducts: (params?: ListParams) =>
    api.get<Product[]>('/public/products', params as Record<string, string | number | boolean | undefined>),

  getProduct: (id: string) =>
    api.get<ProductDetail>(`/public/products/${id}`),

  getSpots: (includeInactive = false) =>
    api.get<Spot[]>('/public/spots', { include_inactive: includeInactive }),

  getSpot: (id: string) =>
    api.get<SpotDetail>(`/public/spots/${id}`),

  getModifiers: () =>
    api.get<ModifierGroup[]>('/public/modifiers'),

  getDietaryOptions: () =>
    api.get<string[]>('/public/dietary-options'),
};

// Auth endpoints
export const authApi = {
  requestCustomerOtp: (phone: string) =>
    api.post<{ message: string; otp_code?: string; debug?: { otp?: string } }>('/auth/customer/request-otp', { phone }),

  verifyCustomerOtp: (phone: string, code: string) =>
    api.post<AuthTokens>('/auth/customer/verify-otp', { phone, code }),

  customerLogin: (phone: string, password: string) =>
    api.post<AuthTokens>('/auth/customer/login', { phone, password }),

  customerRegister: (phone: string, password: string) =>
    api.post<CustomerRegisterResponse>('/auth/customer/register', { phone, password }),

  employeeLogin: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/employee/login', { email, password }),

  refreshToken: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }),
};

// Admin endpoints (requires auth)
export const adminApi = {
  // Orders
  getOrders: (params?: ListParams) =>
    api.get<Order[]>('/admin/orders', params as Record<string, string | number | boolean | undefined>),

  updateOrderStatus: (id: string, status: string, reason?: string) =>
    api.patch<{ updated: boolean }>(`/admin/orders/${id}/status`, { status, reason }),

  deleteOrder: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/orders/${id}`),

  // Customers
  getCustomers: (params?: ListParams) =>
    api.get<Customer[]>('/admin/customers', params as Record<string, string | number | boolean | undefined>),

  createCustomer: (data: {
    phone: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    status?: 'ACTIVE' | 'BLOCKED';
    language_code?: string;
    bonus_balance?: number;
    marketing_opt_in?: boolean;
  }) =>
    api.post<{ id: string }>('/admin/customers', data),

  updateCustomer: (id: string, data: Partial<{
    phone: string;
    first_name: string;
    last_name: string;
    email: string;
    status: 'ACTIVE' | 'BLOCKED';
    language_code: string;
    bonus_balance: number;
    marketing_opt_in: boolean;
  }>) =>
    api.put<{ updated: boolean }>(`/admin/customers/${id}`, data),

  deleteCustomer: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/customers/${id}`),

  // Categories
  createCategory: (data: { slug: string; name_i18n: Record<string, string>; parent_id?: string; image_url?: string }) =>
    api.post<{ id: string }>('/admin/categories', data),

  updateCategory: (id: string, data: Partial<Category>) =>
    api.put<{ updated: boolean }>(`/admin/categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/categories/${id}`),

  // Products
  getProducts: (params?: ListParams) =>
    api.get<Product[]>('/admin/products', params as Record<string, string | number | boolean | undefined>),

  createProduct: (data: Partial<Product>) =>
    api.post<{ id: string }>('/admin/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    api.put<{ updated: boolean }>(`/admin/products/${id}`, data),

  deleteProduct: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/products/${id}`),

  // Spots
  getSpots: (includeInactive = false) =>
    api.get<Spot[]>('/admin/spots', { include_inactive: includeInactive }),

  createSpot: (data: Partial<Spot>) =>
    api.post<{ id: string }>('/admin/spots', data),

  updateSpot: (id: string, data: Partial<Spot>) =>
    api.put<{ updated: boolean }>(`/admin/spots/${id}`, data),

  deleteSpot: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/spots/${id}`),

  // Employees
  getEmployees: (params?: ListParams) =>
    api.get<Employee[]>('/admin/employees', params as Record<string, string | number | boolean | undefined>),

  getEmployee: (id: string) =>
    api.get<Employee>(`/admin/employees/${id}`),

  createEmployee: (data: { role_code: string; email: string; password: string; first_name?: string; last_name?: string; phone?: string; spot_id?: string }) =>
    api.post<{ id: string }>('/admin/employees', data),

  updateEmployee: (id: string, data: Partial<Employee & { password?: string }>) =>
    api.put<{ updated: boolean }>(`/admin/employees/${id}`, data),

  deleteEmployee: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/employees/${id}`),

  // Promos
  getPromos: (params?: ListParams) =>
    api.get<PromoCode[]>('/admin/promos', params as Record<string, string | number | boolean | undefined>),

  getPromo: (id: string) =>
    api.get<PromoCode>(`/admin/promos/${id}`),

  createPromo: (data: Partial<PromoCode>) =>
    api.post<{ id: string }>('/admin/promos', data),

  updatePromo: (id: string, data: Partial<PromoCode>) =>
    api.put<{ updated: boolean }>(`/admin/promos/${id}`, data),

  deletePromo: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/promos/${id}`),

  // Bonus rules
  getBonusRules: () =>
    api.get<BonusRule[]>('/admin/bonus-rules'),

  createBonusRule: (data: Partial<BonusRule>) =>
    api.post<{ id: string }>('/admin/bonus-rules', data),

  updateBonusRule: (id: string, data: Partial<BonusRule>) =>
    api.put<{ updated: boolean }>(`/admin/bonus-rules/${id}`, data),

  deleteBonusRule: (id: string) =>
    api.delete<{ deleted: boolean }>(`/admin/bonus-rules/${id}`),

  // Dashboard stats
  getDashboardStats: () =>
    api.get<DashboardOverview>('/admin/stats/dashboard'),

  getEfficiencyMetrics: () =>
    api.get<EfficiencyMetrics>('/admin/stats/efficiency'),

  getLoyaltyStats: () =>
    api.get<LoyaltyStats>('/admin/stats/loyalty'),
};

// Order detail type (returned by GET /spot/orders/:id)
export interface OrderDetailItem {
  id: string;
  product_id: string;
  product_name: Record<string, string>;
  unit_price: number;
  quantity: number;
  line_total: number;
  note: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  status: OrderStatus;
  order_type: 'DELIVERY' | 'PICKUP' | 'WALK_IN';
  payment_type: 'CARD' | 'CASH';
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  spot_name: string;
  spot_id: string;
  notes: string;
  items: OrderDetailItem[];
  created_at: string;
}

// Spot operator endpoints
export const spotApi = {
  getOrders: (params?: ListParams) =>
    api.get<Order[]>('/spot/orders', params as Record<string, string | number | boolean | undefined>),

  getOrder: (id: string) =>
    api.get<OrderDetail>(`/spot/orders/${id}`),

  updateOrderStatus: (id: string, status: string, reason?: string) =>
    api.patch<{ updated: boolean }>(`/spot/orders/${id}/status`, { status, reason }),

  createOrder: (data: OrderDraft) =>
    api.post<CreatedOrder>('/spot/orders', data),
};

// Customer endpoints
export const customerApi = {
  getProfile: () =>
    api.get<Customer>('/customer/profile'),

  updateProfile: (data: CustomerProfileUpdate) =>
    api.put<{ updated: boolean }>('/customer/profile', data),

  getOrders: (params?: ListParams) =>
    api.get<Order[]>('/customer/orders', params as Record<string, string | number | boolean | undefined>),

  getOrder: (id: string) =>
    api.get<OrderDetail>(`/customer/orders/${id}`),

  previewOrder: (data: OrderDraft) =>
    api.post<OrderPricing>('/customer/orders/preview', data),

  createOrder: (data: OrderDraft) =>
    api.post<CreatedOrder>('/customer/orders', data),

  // Addresses
  getAddresses: () =>
    api.get<CustomerAddress[]>('/customer/addresses'),

  createAddress: (data: CustomerAddressCreate) =>
    api.post<{ id: string }>('/customer/addresses', data),

  updateAddress: (id: string, data: Partial<CustomerAddressCreate>) =>
    api.put<{ updated: boolean }>(`/customer/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete<{ deleted: boolean }>(`/customer/addresses/${id}`),
};

export default api;
