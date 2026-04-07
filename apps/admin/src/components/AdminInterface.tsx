"use client";

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ShoppingBag, Users, Settings, BarChart3,
  Search, TrendingUp, TrendingDown, MoreVertical,
  Plus, Ticket, Gift, MapPin, Briefcase,
  Download, ChevronRight, X, Trash2, Edit2, Eye,
  LayoutGrid, List, CheckCircle2, Clock, UserPlus,
  RefreshCw, MoreHorizontal, ArrowUpRight, Loader2, ChevronDown, Check, Minus
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FilterBar } from './ui/FilterBar';
import { Pagination } from './ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from './ui/utils';
import {
  adminApi,
  publicApi,
  useAuth,
  type ApiResponse,
  type Customer,
  type Order,
  type OrderStatus,
  type Employee,
  type PromoCode,
  type BonusRule,
  type Spot,
  type Category,
  type Product,
  type DashboardOverview,
  type ListParams,
} from '@/lib/api';

type PaginationMeta = NonNullable<ApiResponse<unknown>['meta']>;

const DEFAULT_ORDERS_PAGE_SIZE = 10;
const DEFAULT_MENU_PRODUCTS_PAGE_SIZE = 12;
const MENU_PRODUCTS_PAGE_SIZE_OPTIONS = [8, 12, 16, 24] as const;
const ORDER_TYPES: ReadonlyArray<NonNullable<ListParams['order_type']>> = ['DELIVERY', 'PICKUP', 'WALK_IN'];
const ADMIN_VIEWS = [
  'dashboard',
  'orders',
  'customers',
  'promo',
  'bonus',
  'menu',
  'spots',
  'employees',
] as const;
const ADMIN_VIEW_STORAGE_KEY = 'admin.activeView';
const DEFAULT_ADMIN_VIEW = 'dashboard';

const isAdminView = (value: string | null): value is (typeof ADMIN_VIEWS)[number] =>
  value !== null && (ADMIN_VIEWS as readonly string[]).includes(value);

const getInitialAdminView = (): string => {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_VIEW;

  try {
    const params = new URL(window.location.href).searchParams;
    const viewFromUrl = params.get('view');
    if (isAdminView(viewFromUrl)) return viewFromUrl;
  } catch {
    // Fall back to local storage/default if URL parsing fails.
  }

  try {
    const viewFromStorage = window.localStorage.getItem(ADMIN_VIEW_STORAGE_KEY);
    if (isAdminView(viewFromStorage)) return viewFromStorage;
  } catch {
    // Ignore storage access issues and use default.
  }

  return DEFAULT_ADMIN_VIEW;
};
const ORDER_STATUS_DISPLAY_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  RECEIVED: { label: 'Received', variant: 'info' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  PREPARING: { label: 'In Kitchen', variant: 'warning' },
  READY: { label: 'Ready', variant: 'success' },
  ON_THE_WAY: { label: 'On Delivery', variant: 'info' },
  DELIVERED: { label: 'Delivered', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  REJECTED: { label: 'Rejected', variant: 'error' },
};
const ORDER_PROGRESS_STATUSES: ReadonlyArray<OrderStatus> = ['RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED'];
const ORDER_ALLOWED_TRANSITIONS: Record<OrderStatus, ReadonlyArray<OrderStatus>> = {
  RECEIVED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['ON_THE_WAY', 'COMPLETED'],
  ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const getCategoryDisplayName = (category: Pick<Category, 'name_i18n' | 'slug'>) =>
  category.name_i18n['en'] || category.name_i18n['ja'] || category.slug;

const getProductDisplayName = (product: Pick<Product, 'name_i18n' | 'sku' | 'id' | 'category_name'>) =>
  product.name_i18n['en'] || product.name_i18n['ja'] || product.sku || product.category_name || product.id;

const normalizePaginationMeta = (
  meta: PaginationMeta | undefined,
  fallback: PaginationMeta,
): PaginationMeta => {
  if (!meta) return fallback;

  const limit = Math.max(1, Number(meta.limit) || fallback.limit);
  const total = Math.max(0, Number(meta.total) || fallback.total);
  const totalPages = Math.max(1, Number(meta.total_pages ?? meta.total_page) || Math.ceil(total / limit) || fallback.total_pages);
  const page = Math.min(Math.max(1, Number(meta.page) || fallback.page), totalPages);

  return {
    ...meta,
    page,
    limit,
    total,
    total_pages: totalPages,
    total_page: totalPages,
  };
};

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};

const isDefined = <T,>(value: T | null): value is T => value !== null;
const CRUD_HEADER_ACTION_CLASS = 'h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest gap-2';
const CRUD_ICON_ACTION_CLASS = 'h-9 w-9 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800';
const CRUD_ICON_ACTION_GROUP_CLASS = 'flex justify-end gap-2';

type CrudHeaderButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: React.ComponentProps<typeof Button>['variant'];
  type?: React.ComponentProps<typeof Button>['type'];
};

const CrudHeaderButton = ({ icon: Icon, label, onClick, variant = 'default', type = 'button' }: CrudHeaderButtonProps) => (
  <Button type={type} variant={variant} size="sm" className={CRUD_HEADER_ACTION_CLASS} onClick={onClick}>
    <Icon className="w-4 h-4" /> {label}
  </Button>
);

type CrudIconButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
};

const CrudIconButton = ({
  icon: Icon,
  onClick,
  danger = false,
  disabled = false,
  className,
  iconClassName,
}: CrudIconButtonProps) => (
  <Button
    variant="ghost"
    size="icon"
    className={`${CRUD_ICON_ACTION_CLASS}${danger ? ' text-red-600' : ''}${className ? ` ${className}` : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    <Icon className={iconClassName || 'w-4 h-4'} />
  </Button>
);

type PromoMultiSelectOption = {
  value: string;
  label: string;
};

type AdminFormSelectOption = {
  value: string;
  label: string;
};

type AdminFormSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<AdminFormSelectOption>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

const AdminFormSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
}: AdminFormSelectProps) => {
  const hasEmptyOption = options.some((option) => option.value === '');
  const showPlaceholderOption = Boolean(placeholder) && !hasEmptyOption;

  return (
    <div className="space-y-2">
      <Label htmlFor={id ?? name}>{label}</Label>
      <select
        id={id ?? name}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full h-11 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60",
          value ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500",
        )}
      >
        {showPlaceholderOption && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={`${name}-${option.value || 'empty'}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

type PromoMultiSelectFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  options: ReadonlyArray<PromoMultiSelectOption>;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

const PromoMultiSelectField = ({
  label,
  name,
  placeholder,
  options,
  values,
  onChange,
  disabled = false,
}: PromoMultiSelectFieldProps) => {
  const selectedSet = useMemo(() => new Set(values), [values]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggleValue = useCallback((value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }, [onChange, values]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const summary = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length <= 2
      ? selectedOptions.map((option) => option.label).join(', ')
      : `${selectedOptions.length} selected`;

  return (
    <div ref={containerRef} className="space-y-2">
      <Label htmlFor={`${name}-multi-trigger`}>{label}</Label>
      {values.map((value) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} readOnly />
      ))}
      <div className="relative">
        <button
          id={`${name}-multi-trigger`}
          aria-expanded={isOpen}
          aria-controls={`${name}-multi-panel`}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-11 w-full items-center gap-3 rounded-xl border border-stone-200/90 bg-white/95 px-4 py-2.5 text-left shadow-[0_1px_2px_rgba(12,10,9,0.05)] transition-all duration-200 hover:border-stone-300 focus-visible:border-red-500/70 focus-visible:ring-4 focus-visible:ring-red-500/12 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900/95 dark:hover:border-stone-600"
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-base font-medium text-stone-900 dark:text-stone-100',
              selectedOptions.length === 0 && 'text-stone-400 dark:text-stone-500',
            )}
          >
            {summary}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-stone-500 transition-transform dark:text-stone-400', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div
            id={`${name}-multi-panel`}
            className="absolute left-0 isolate w-full min-w-[18rem] overflow-hidden rounded-xl border border-stone-200/90 bg-white p-0 shadow-xl shadow-stone-900/10 dark:border-stone-700 dark:bg-stone-950"
            style={{ top: 'calc(100% + 8px)', zIndex: 2200 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-950">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">{label}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {selectedOptions.length === 0
                    ? placeholder
                    : `${selectedOptions.length} item${selectedOptions.length === 1 ? '' : 's'} selected`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={selectedOptions.length === 0}
                className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:text-stone-300 dark:disabled:text-stone-600"
              >
                Clear
              </button>
            </div>
            <div className="overflow-y-auto bg-white p-2 dark:bg-stone-950" style={{ maxHeight: 200 }}>
              <div className="space-y-1">
                {options.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-stone-500 dark:text-stone-400">No options available.</div>
                ) : (
                  options.map((option) => {
                    const checked = selectedSet.has(option.value);

                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'relative flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-colors',
                          checked
                            ? 'border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/20'
                            : 'border-transparent bg-white hover:border-stone-200 hover:bg-stone-50 dark:border-transparent dark:bg-stone-950 dark:hover:border-stone-800 dark:hover:bg-stone-900/60',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleValue(option.value)}
                          className="hidden"
                          tabIndex={-1}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                            checked
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-stone-300 bg-white text-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-400',
                          )}
                        >
                          {checked ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
                          {option.label}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {!isOpen && selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.slice(0, 4).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleValue(option.value)}
              className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              <span className="max-w-[12rem] truncate">{option.label}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {selectedOptions.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              +{selectedOptions.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

type EditorSidebarProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
};

const EditorSidebar = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  panelClassName,
  bodyClassName,
}: EditorSidebarProps) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!isRendered) return;

    const backdropElement = backdropRef.current;
    const panelElement = panelRef.current;

    if (!backdropElement || !panelElement || prefersReducedMotion()) {
      if (!open) {
        setIsRendered(false);
      }
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);

    const timeline = gsap.timeline({
      onComplete: () => {
        if (!open) {
          setIsRendered(false);
        }
      },
    });

    if (open) {
      timeline
        .fromTo(backdropElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' })
        .fromTo(panelElement, { xPercent: 100 }, { xPercent: 0, duration: 0.24, ease: 'power3.out' }, 0);
    } else {
      timeline
        .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
        .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
    }

    return () => {
      timeline.kill();
    };
  }, [isRendered, open]);

  if (!isRendered) return null;

  return (
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 2000 }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col transform-gpu [will-change:transform] ${panelClassName ?? ''}`.trim()}
        style={{ zIndex: 2010 }}
      >
        <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start gap-4">
          <div>
            <h3 className="text-2xl font-black tracking-tighter">{title}</h3>
            <p className="text-stone-500 text-sm mt-1">{description}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className={`flex-1 min-h-0 overflow-y-auto p-8 ${bodyClassName ?? ''}`.trim()}>
          {children}
        </div>
        {footer ? (
          <div className="mt-auto p-8 border-t border-stone-100 dark:border-stone-800 flex gap-3">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
};

const SystemClock = memo(function SystemClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-4 border-r border-stone-100 dark:border-stone-800 pr-6 mr-2">
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">System Time</p>
        <p className="text-sm font-black tracking-tight flex items-center gap-2">
          {time.toLocaleTimeString('en-GB', { hour12: false })}
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        </p>
      </div>
    </div>
  );
});

export const AdminInterface = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState(getInitialAdminView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const detailBackdropRef = useRef<HTMLDivElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const customerSidebarBackdropRef = useRef<HTMLDivElement | null>(null);
  const customerSidebarPanelRef = useRef<HTMLDivElement | null>(null);
  const orderDetailBackdropRef = useRef<HTMLDivElement | null>(null);
  const orderDetailPanelRef = useRef<HTMLDivElement | null>(null);
  const employeeSidebarBackdropRef = useRef<HTMLDivElement | null>(null);
  const employeeSidebarPanelRef = useRef<HTMLDivElement | null>(null);
  const adminAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeViewRef = useRef<HTMLDivElement | null>(null);

  // Orders filters and pagination
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [orderSpotFilter, setOrderSpotFilter] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetailMode, setOrderDetailMode] = useState<'view' | 'edit'>('view');
  const [orderActionError, setOrderActionError] = useState<string | null>(null);
  const debouncedOrderSearch = useDebouncedValue(orderSearch, 250);

  // Customers filters and pagination
  const [customerPage, setCustomerPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('');
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 250);
  const [menuProductsPage, setMenuProductsPage] = useState(1);
  const [menuProductsPageSize, setMenuProductsPageSize] = useState(DEFAULT_MENU_PRODUCTS_PAGE_SIZE);

  const authScope = user?.id ?? 'anonymous';
  const isDashboardView = activeView === 'dashboard';
  const isOrdersView = activeView === 'orders';
  const isCustomersView = activeView === 'customers';
  const isPromoView = activeView === 'promo';
  const isBonusView = activeView === 'bonus';
  const isMenuView = activeView === 'menu';
  const isSpotsView = activeView === 'spots';
  const isEmployeesView = activeView === 'employees';

  // Modal states
  const [customerCreateError, setCustomerCreateError] = useState<string | null>(null);
  const [customerSidebarMode, setCustomerSidebarMode] = useState<'create' | 'edit' | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerStatusDraft, setCustomerStatusDraft] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [promoFormError, setPromoFormError] = useState<string | null>(null);
  const [promoRewardTypeDraft, setPromoRewardTypeDraft] = useState<PromoCode['reward_type']>('DISCOUNT');
  const [promoAppliesToDraft, setPromoAppliesToDraft] = useState<PromoCode['applies_to']>('ORDER');
  const [promoDiscountTypeDraft, setPromoDiscountTypeDraft] = useState<'FIXED' | 'PERCENT'>('PERCENT');
  const [promoBonusProductIdDraft, setPromoBonusProductIdDraft] = useState('');
  const [promoSpotIdsDraft, setPromoSpotIdsDraft] = useState<string[]>([]);
  const [promoCategoryIdsDraft, setPromoCategoryIdsDraft] = useState<string[]>([]);
  const [promoProductIdsDraft, setPromoProductIdsDraft] = useState<string[]>([]);
  const [isBonusRuleModalOpen, setIsBonusRuleModalOpen] = useState(false);
  const [editingBonusRule, setEditingBonusRule] = useState<BonusRule | null>(null);
  const [bonusRuleFormError, setBonusRuleFormError] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeSidebarMode, setEmployeeSidebarMode] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productCategoryDraft, setProductCategoryDraft] = useState('');
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryParentDraft, setCategoryParentDraft] = useState('');
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const [menuTab, setMenuTab] = useState<'categories' | 'products'>('categories');
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [adminAvatarDraft, setAdminAvatarDraft] = useState('');
  const [adminProfileError, setAdminProfileError] = useState<string | null>(null);
  const [adminProfileSuccess, setAdminProfileSuccess] = useState<string | null>(null);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);
  const [addAdminSuccess, setAddAdminSuccess] = useState<string | null>(null);

  const isCustomerSidebarOpen = customerSidebarMode !== null;
  const isEmployeeSidebarOpen = employeeSidebarMode !== null;

  const queryClient = useQueryClient();
  const shouldFetchDashboard = isDashboardView || isBonusView;
  const shouldFetchOrdersLedger = isOrdersView;
  const shouldFetchCustomers = isCustomersView || isCustomerSidebarOpen;
  const shouldFetchPromos = isPromoView || isPromoModalOpen;
  const shouldFetchBonusRules = isBonusView || isBonusRuleModalOpen;
  const shouldFetchEmployees = isEmployeesView || isEmployeeSidebarOpen;
  const shouldFetchSpots = isOrdersView || isSpotsView || isEmployeesView || isEmployeeSidebarOpen || isSpotModalOpen || isPromoModalOpen;
  const shouldFetchCategories = isMenuView || isCategoryModalOpen || isProductModalOpen || isPromoModalOpen;
  const shouldFetchProducts = isMenuView || isProductModalOpen || isPromoModalOpen;
  const shouldFetchMenuProducts = isMenuView && menuTab === 'products';

  const ordersQueryParams = useMemo<ListParams>(() => {
    const params: ListParams = {
      page: orderPage,
      limit: DEFAULT_ORDERS_PAGE_SIZE,
      sort_by: 'created_at',
      sort_order: 'DESC',
    };

    const searchValue = debouncedOrderSearch.trim();
    if (searchValue) params.search = searchValue;
    if (orderStatusFilter && orderStatusFilter !== 'All' && orderStatusFilter !== '') params.status = orderStatusFilter;
    if (orderSpotFilter && orderSpotFilter !== 'All' && orderSpotFilter !== '') params.spot_id = orderSpotFilter;
    if (orderTypeFilter && orderTypeFilter !== 'All' && orderTypeFilter !== '' && ORDER_TYPES.includes(orderTypeFilter as NonNullable<ListParams['order_type']>)) {
      params.order_type = orderTypeFilter as NonNullable<ListParams['order_type']>;
    }
    if (orderPaymentFilter && orderPaymentFilter !== 'All' && orderPaymentFilter !== '') {
      params.payment_type = orderPaymentFilter as 'CARD' | 'CASH';
    }
    if (orderDateFrom) params.date_from = orderDateFrom;
    if (orderDateTo) params.date_to = orderDateTo;

    return params;
  }, [orderPage, debouncedOrderSearch, orderStatusFilter, orderSpotFilter, orderTypeFilter, orderPaymentFilter, orderDateFrom, orderDateTo]);

  const customersQueryParams = useMemo<ListParams>(() => {
    const params: ListParams = {
      page: customerPage,
      limit: DEFAULT_ORDERS_PAGE_SIZE,
      sort_by: 'created_at',
      sort_order: 'DESC',
    };

    const searchValue = debouncedCustomerSearch.trim();
    if (searchValue) params.search = searchValue;
    if (customerStatusFilter && customerStatusFilter !== 'All') params.status = customerStatusFilter;

    return params;
  }, [customerPage, debouncedCustomerSearch, customerStatusFilter]);

  const menuProductsQueryParams = useMemo<ListParams>(() => ({
    page: menuProductsPage,
    limit: menuProductsPageSize,
    sort_by: 'created_at',
    sort_order: 'DESC',
  }), [menuProductsPage, menuProductsPageSize]);

  const ensureSuccess = <T,>(response: ApiResponse<T>, fallbackMessage: string): ApiResponse<T> => {
    if (!response.success) {
      const message = response.error?.message ?? fallbackMessage;
      const detail = response.error?.details ?? response.error?.detail;
      throw new Error(detail ? `${message}: ${detail}` : message);
    }
    return response;
  };

  const customersQuery = useQuery({
    queryKey: ['admin', authScope, 'customers', customersQueryParams],
    queryFn: async () => ensureSuccess(await adminApi.getCustomers(customersQueryParams), 'Failed to load customers'),
    placeholderData: keepPreviousData,
    enabled: shouldFetchCustomers,
  });

  const dashboardOverviewQuery = useQuery({
    queryKey: ['admin', authScope, 'dashboard-overview'],
    queryFn: async () => ensureSuccess(await adminApi.getDashboardStats(), 'Failed to load dashboard overview'),
    enabled: shouldFetchDashboard,
  });

  const ordersLedgerQuery = useQuery({
    queryKey: ['admin', authScope, 'orders-ledger', ordersQueryParams],
    queryFn: async () => ensureSuccess(await adminApi.getOrders(ordersQueryParams), 'Failed to load orders'),
    placeholderData: keepPreviousData,
    enabled: shouldFetchOrdersLedger,
  });

  const employeesQuery = useQuery({
    queryKey: ['admin', authScope, 'employees'],
    queryFn: async () => ensureSuccess(await adminApi.getEmployees({ limit: 50 }), 'Failed to load employees'),
    enabled: shouldFetchEmployees,
  });

  const promosQuery = useQuery({
    queryKey: ['admin', authScope, 'promos'],
    queryFn: async () => ensureSuccess(await adminApi.getPromos({ limit: 50 }), 'Failed to load promo codes'),
    enabled: shouldFetchPromos,
  });

  const bonusRulesQuery = useQuery({
    queryKey: ['admin', authScope, 'bonus-rules'],
    queryFn: async () => ensureSuccess(await adminApi.getBonusRules(), 'Failed to load bonus rules'),
    enabled: shouldFetchBonusRules,
  });

  const spotsQuery = useQuery({
    queryKey: ['admin', authScope, 'spots'],
    queryFn: async () => ensureSuccess(await adminApi.getSpots(true), 'Failed to load branches'),
    enabled: shouldFetchSpots,
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'public-categories'],
    queryFn: async () => ensureSuccess(await publicApi.getCategories(true), 'Failed to load categories'),
    enabled: shouldFetchCategories,
  });

  const productsQuery = useQuery({
    queryKey: ['admin', authScope, 'products'],
    queryFn: async () => ensureSuccess(await adminApi.getProducts({ limit: 100 }), 'Failed to load products'),
    enabled: shouldFetchProducts,
  });

  const menuProductsQuery = useQuery({
    queryKey: ['admin', authScope, 'menu-products', menuProductsQueryParams],
    queryFn: async () => ensureSuccess(await adminApi.getProducts(menuProductsQueryParams), 'Failed to load products'),
    placeholderData: keepPreviousData,
    enabled: shouldFetchMenuProducts,
  });

  const adminProfileQuery = useQuery({
    queryKey: ['admin', authScope, 'employee-profile', user?.id],
    queryFn: async () => ensureSuccess(await adminApi.getEmployee(user?.id || ''), 'Failed to load admin profile'),
    enabled: Boolean(user?.id),
  });

  const customers: Customer[] = customersQuery.data?.data || [];
  const dashboardOverview: DashboardOverview | null = dashboardOverviewQuery.data?.data || null;
  const dashboardOrders: Order[] = dashboardOverview?.recent_orders || [];
  const orders: Order[] = ordersLedgerQuery.data?.data || [];
  const employees: Employee[] = employeesQuery.data?.data || [];
  const promos: PromoCode[] = promosQuery.data?.data || [];
  const bonusRules: BonusRule[] = bonusRulesQuery.data?.data || [];
  const spots: Spot[] = spotsQuery.data?.data || [];
  const categories: Category[] = categoriesQuery.data?.data || [];
  const products: Product[] = productsQuery.data?.data || [];
  const productsTotalCount = Math.max(Number(productsQuery.data?.meta?.total) || 0, products.length);
  const menuProducts: Product[] = menuProductsQuery.data?.data || [];
  const adminProfile: Employee | null = adminProfileQuery.data?.data || null;
  const currentUserLabel = (user?.firstName || user?.lastName)
    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
    : user?.email || 'Admin User';
  const currentUserInitial = (user?.firstName || user?.email || 'A').slice(0, 1).toUpperCase();
  const efficiencyMetrics = dashboardOverview?.efficiency ?? null;
  const loyaltyStats = dashboardOverview?.loyalty ?? null;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(Math.max(menuProductsQuery.data?.meta?.total ?? 0, 1) / menuProductsPageSize));
    if (menuProductsPage > totalPages) {
      setMenuProductsPage(totalPages);
    }
  }, [menuProductsQuery.data?.meta?.total, menuProductsPage, menuProductsPageSize]);

  useEffect(() => {
    const avatarUrl = adminProfile?.avatar_url?.trim() || '';
    setAdminAvatar(avatarUrl || null);
    setAdminAvatarDraft(avatarUrl);
  }, [adminProfile?.avatar_url]);

  const customersMeta = normalizePaginationMeta(customersQuery.data?.meta, {
    page: customerPage,
    limit: DEFAULT_ORDERS_PAGE_SIZE,
    total: customers.length,
    total_pages: Math.max(1, Math.ceil(Math.max(customers.length, 1) / DEFAULT_ORDERS_PAGE_SIZE)),
  });
  const ordersMeta = normalizePaginationMeta(ordersLedgerQuery.data?.meta, {
    page: orderPage,
    limit: DEFAULT_ORDERS_PAGE_SIZE,
    total: orders.length,
    total_pages: Math.max(1, Math.ceil(Math.max(orders.length, 1) / DEFAULT_ORDERS_PAGE_SIZE)),
  });
  const menuProductsMeta = normalizePaginationMeta(menuProductsQuery.data?.meta, {
    page: menuProductsPage,
    limit: menuProductsPageSize,
    total: menuProducts.length,
    total_pages: Math.max(1, Math.ceil(Math.max(menuProducts.length, 1) / menuProductsPageSize)),
  });

  const allQueries = [
    shouldFetchDashboard ? dashboardOverviewQuery : null,
    shouldFetchOrdersLedger ? ordersLedgerQuery : null,
    shouldFetchCustomers ? customersQuery : null,
    shouldFetchEmployees ? employeesQuery : null,
    shouldFetchPromos ? promosQuery : null,
    shouldFetchBonusRules ? bonusRulesQuery : null,
    shouldFetchSpots ? spotsQuery : null,
    shouldFetchCategories ? categoriesQuery : null,
    shouldFetchProducts ? productsQuery : null,
    shouldFetchMenuProducts ? menuProductsQuery : null,
  ].filter(isDefined);

  const loading = allQueries.some((query) => query.isPending);
  const error = allQueries.find((query) => query.isError)?.error;
  const errorMessage = error instanceof Error ? error.message : null;

  // Customer mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (data: {
      phone: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      status?: 'ACTIVE' | 'BLOCKED';
      language_code?: string;
      bonus_balance?: number;
      marketing_opt_in?: boolean;
    }) => ensureSuccess(await adminApi.createCustomer(data), 'Failed to create customer'),
    onMutate: () => {
      setCustomerCreateError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'customers'] });
      setCustomerCreateError(null);
      setCustomerSidebarMode(null);
      setEditingCustomer(null);
    },
    onError: (error) => {
      setCustomerCreateError(error instanceof Error ? error.message : 'Failed to create customer');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: Partial<{
        phone: string;
        first_name: string;
        last_name: string;
        email: string;
        status: 'ACTIVE' | 'BLOCKED';
        language_code: string;
        bonus_balance: number;
        marketing_opt_in: boolean;
      }>;
    }) => ensureSuccess(await adminApi.updateCustomer(id, data), 'Failed to update customer'),
    onMutate: () => {
      setCustomerCreateError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'customers'] });
      setCustomerCreateError(null);
      setCustomerSidebarMode(null);
      setEditingCustomer(null);
    },
    onError: (error) => {
      setCustomerCreateError(error instanceof Error ? error.message : 'Failed to update customer');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => ensureSuccess(await adminApi.deleteCustomer(id), 'Failed to delete customer'),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'customers'] });
      if (selectedDetailId === id) setSelectedDetailId(null);
      if (editingCustomer?.id === id) {
        setEditingCustomer(null);
        setCustomerSidebarMode(null);
      }
    },
  });

  // Promo mutations
  const deletePromoMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePromo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'promos'] });
    },
  });

  const createPromoMutation = useMutation({
    mutationFn: async (data: Partial<PromoCode>) =>
      ensureSuccess(await adminApi.createPromo(data), 'Failed to create promo code'),
    onMutate: () => {
      setPromoFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'promos'] });
      setPromoFormError(null);
      setIsPromoModalOpen(false);
      setEditingPromo(null);
    },
    onError: (error) => {
      setPromoFormError(error instanceof Error ? error.message : 'Failed to create promo code');
    },
  });

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromoCode> }) =>
      ensureSuccess(await adminApi.updatePromo(id, data), 'Failed to update promo code'),
    onMutate: () => {
      setPromoFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'promos'] });
      setPromoFormError(null);
      setIsPromoModalOpen(false);
      setEditingPromo(null);
    },
    onError: (error) => {
      setPromoFormError(error instanceof Error ? error.message : 'Failed to update promo code');
    },
  });

  // Bonus rules mutations
  const createBonusRuleMutation = useMutation({
    mutationFn: async (data: Partial<BonusRule>) =>
      ensureSuccess(await adminApi.createBonusRule(data), 'Failed to create bonus rule'),
    onMutate: () => {
      setBonusRuleFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'bonus-rules'] });
      setBonusRuleFormError(null);
      setIsBonusRuleModalOpen(false);
      setEditingBonusRule(null);
    },
    onError: (error) => {
      setBonusRuleFormError(error instanceof Error ? error.message : 'Failed to create bonus rule');
    },
  });

  const updateBonusRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BonusRule> }) =>
      ensureSuccess(await adminApi.updateBonusRule(id, data), 'Failed to update bonus rule'),
    onMutate: () => {
      setBonusRuleFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'bonus-rules'] });
      setBonusRuleFormError(null);
      setIsBonusRuleModalOpen(false);
      setEditingBonusRule(null);
    },
    onError: (error) => {
      setBonusRuleFormError(error instanceof Error ? error.message : 'Failed to update bonus rule');
    },
  });

  const deleteBonusRuleMutation = useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await adminApi.deleteBonusRule(id), 'Failed to delete bonus rule'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'bonus-rules'] });
    },
  });

  // Employee mutations
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployee(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employees'] });
      if (selectedEmployeeId === id) {
        setEmployeeSidebarMode(null);
        setSelectedEmployeeId(null);
        setEditingEmployee(null);
        setEmployeeFormError(null);
      }
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: { role_code: string; email: string; password: string; first_name?: string; last_name?: string; phone?: string; spot_id?: string }) => adminApi.createEmployee(data),
    onMutate: () => {
      setEmployeeFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employees'] });
      setEmployeeFormError(null);
      setEmployeeSidebarMode(null);
      setSelectedEmployeeId(null);
      setEditingEmployee(null);
    },
    onError: (error) => {
      setEmployeeFormError(error instanceof Error ? error.message : 'Failed to save employee');
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee & { password?: string }> }) => adminApi.updateEmployee(id, data),
    onMutate: () => {
      setEmployeeFormError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employees'] });
      setEmployeeFormError(null);
      setEmployeeSidebarMode(null);
      setEditingEmployee(null);
    },
    onError: (error) => {
      setEmployeeFormError(error instanceof Error ? error.message : 'Failed to update employee');
    },
  });

  const updateAdminProfileMutation = useMutation({
    mutationFn: async (data: Partial<Employee & { password?: string }>) => {
      if (!user?.id) {
        throw new Error('Admin profile is unavailable');
      }
      return ensureSuccess(await adminApi.updateEmployee(user.id, data), 'Failed to update admin profile');
    },
    onMutate: () => {
      setAdminProfileError(null);
      setAdminProfileSuccess(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employee-profile', user?.id] });
      setAdminProfileSuccess('Admin profile updated successfully. Use updated credentials on next login.');
    },
    onError: (error) => {
      setAdminProfileError(error instanceof Error ? error.message : 'Failed to update admin profile');
    },
  });

  const createAdminFromProfileMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; first_name?: string; last_name?: string; phone?: string }) =>
      ensureSuccess(await adminApi.createEmployee({ role_code: 'ADMIN', ...data }), 'Failed to create admin account'),
    onMutate: () => {
      setAddAdminError(null);
      setAddAdminSuccess(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'employees'] });
      setAddAdminSuccess('New admin account created.');
    },
    onError: (error) => {
      setAddAdminError(error instanceof Error ? error.message : 'Failed to create admin account');
    },
  });

  // Spot mutations
  const deleteSpotMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSpot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'spots'] });
    },
  });

  const createSpotMutation = useMutation({
    mutationFn: (data: Partial<Spot>) => adminApi.createSpot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'spots'] });
      setIsSpotModalOpen(false);
      setEditingSpot(null);
    },
  });

  const updateSpotMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Spot> }) => adminApi.updateSpot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'spots'] });
      setIsSpotModalOpen(false);
      setEditingSpot(null);
    },
  });

  // Product mutations
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'dashboard-overview'] });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (data: Partial<Product>) => adminApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'dashboard-overview'] });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductImagePreview(null);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => adminApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'dashboard-overview'] });
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductImagePreview(null);
    },
  });

  // Category mutations
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'public-categories'] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { slug: string; name_i18n: Record<string, string>; parent_id?: string; image_url?: string }) => adminApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'public-categories'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryImagePreview(null);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => adminApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'public-categories'] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryImagePreview(null);
    },
  });

  // Order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      ensureSuccess(await adminApi.updateOrderStatus(id, status, reason), 'Failed to update order status'),
    onMutate: () => {
      setOrderActionError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'orders-ledger'] });
    },
    onError: (error) => {
      setOrderActionError(error instanceof Error ? error.message : 'Failed to update order status');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) =>
      ensureSuccess(await adminApi.deleteOrder(id), 'Failed to delete order'),
    onMutate: () => {
      setOrderActionError(null);
    },
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', authScope, 'orders-ledger'] });
      if (selectedOrderId === id) {
        setSelectedOrderId(null);
        setOrderDetailMode('view');
      }
    },
    onError: (error) => {
      setOrderActionError(error instanceof Error ? error.message : 'Failed to delete order');
    },
  });

  useEffect(() => {
    if (orderPage > ordersMeta.total_pages) {
      setOrderPage(ordersMeta.total_pages);
    }
  }, [orderPage, ordersMeta.total_pages]);

  useEffect(() => {
    if (customerPage > customersMeta.total_pages) {
      setCustomerPage(customersMeta.total_pages);
    }
  }, [customerPage, customersMeta.total_pages]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');

    const applyViewport = (matches: boolean) => {
      setIsDesktop(matches);
      setIsSidebarOpen(matches);
    };

    applyViewport(media.matches);

    const handler = (e: MediaQueryListEvent) => applyViewport(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAdminView(activeView)) return;

    try {
      window.localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, activeView);
    } catch {
      // Ignore storage write errors (private mode, etc.).
    }

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('view') !== activeView) {
        url.searchParams.set('view', activeView);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch {
      // Ignore URL update failures.
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const viewFromUrl = new URL(window.location.href).searchParams.get('view');
      if (isAdminView(viewFromUrl) && viewFromUrl !== activeView) {
        setActiveView(viewFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'orders' && selectedOrderId) {
      setSelectedOrderId(null);
      setOrderDetailMode('view');
      setOrderActionError(null);
    }
  }, [activeView, selectedOrderId]);

  useEffect(() => {
    if (activeView !== 'customers') {
      if (selectedDetailId) setSelectedDetailId(null);
      if (customerSidebarMode) {
        setCustomerSidebarMode(null);
        setEditingCustomer(null);
        setCustomerCreateError(null);
      }
    }
  }, [activeView, selectedDetailId, customerSidebarMode]);

  useEffect(() => {
    if (activeView !== 'employees') {
      if (employeeSidebarMode) {
        setEmployeeSidebarMode(null);
        setSelectedEmployeeId(null);
        setEditingEmployee(null);
        setEmployeeFormError(null);
      }
    }
  }, [activeView, employeeSidebarMode]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedDetailId) ?? null,
    [customers, selectedDetailId],
  );
  const selectedCustomerName = useMemo(
    () => {
      if (!selectedCustomer) return '';
      if (selectedCustomer.first_name || selectedCustomer.last_name) {
        return `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim();
      }
      return selectedCustomer.phone;
    },
    [selectedCustomer],
  );
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const canOverrideOrderTransitions = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOrderDetailEditable = orderDetailMode === 'edit';
  const canTransitionOrderStatus = useCallback((current: OrderStatus, next: OrderStatus) => {
    if (current === next) return false;
    if (canOverrideOrderTransitions) return true;
    return ORDER_ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
  }, [canOverrideOrderTransitions]);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const openAdminProfileSidebar = useCallback(() => {
    setAdminProfileError(null);
    setAdminProfileSuccess(null);
    setAddAdminError(null);
    setAddAdminSuccess(null);
    setIsAdminProfileOpen(true);
  }, []);

  const closeAdminProfileSidebar = useCallback(() => {
    setIsAdminProfileOpen(false);
    setAdminProfileError(null);
    setAdminProfileSuccess(null);
    setAddAdminError(null);
    setAddAdminSuccess(null);
  }, []);

  const handleAdminAvatarFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAdminProfileError('Only image files are supported for avatar.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setAdminAvatar(dataUrl);
      setAdminAvatarDraft('');
      updateAdminProfileMutation.mutate(
        { avatar_url: dataUrl },
        {
          onSuccess: () => {
            setAdminProfileError(null);
            setAdminProfileSuccess('Avatar saved to database.');
          },
        },
      );
    } catch {
      setAdminProfileError('Failed to read avatar image file.');
    }
  }, [updateAdminProfileMutation]);

  const handleAdminAvatarPaste = useCallback(async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedFile = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (pastedFile) {
      event.preventDefault();
      await handleAdminAvatarFile(pastedFile);
      return;
    }

    const pastedText = event.clipboardData.getData('text/plain').trim();
    if (pastedText.startsWith('http://') || pastedText.startsWith('https://') || pastedText.startsWith('data:image/')) {
      setAdminAvatar(pastedText);
      setAdminAvatarDraft(pastedText);
      updateAdminProfileMutation.mutate(
        { avatar_url: pastedText },
        {
          onSuccess: () => {
            setAdminProfileError(null);
            setAdminProfileSuccess('Avatar saved to database.');
          },
        },
      );
    }
  }, [handleAdminAvatarFile, updateAdminProfileMutation]);

  const applyAdminAvatarFromDraft = useCallback(() => {
    const candidate = adminAvatarDraft.trim();
    if (!candidate) {
      setAdminProfileError('Paste or enter a valid image URL first.');
      return;
    }
    if (!(candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('data:image/'))) {
      setAdminProfileError('Avatar must be an image URL or pasted image.');
      return;
    }

    setAdminAvatar(candidate);
    updateAdminProfileMutation.mutate(
      { avatar_url: candidate },
      {
        onSuccess: () => {
          setAdminProfileError(null);
          setAdminProfileSuccess('Avatar saved to database.');
        },
      },
    );
  }, [adminAvatarDraft, updateAdminProfileMutation]);

  const handleAdminProfileSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      setAdminProfileError('Admin profile is unavailable.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get('first_name') || '').trim();
    const lastName = String(formData.get('last_name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const password = String(formData.get('new_password') || '').trim();
    const confirmPassword = String(formData.get('confirm_password') || '').trim();

    if (!email) {
      setAdminProfileError('Login email is required.');
      return;
    }
    if (password && password.length < 6) {
      setAdminProfileError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAdminProfileError('New password and confirmation do not match.');
      return;
    }

    const payload: Partial<Employee & { password?: string }> = {
      email,
      avatar_url: adminAvatar?.trim() || '',
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined,
    };
    if (password) payload.password = password;

    updateAdminProfileMutation.mutate(payload);
  }, [adminAvatar, updateAdminProfileMutation, user?.id]);

  const handleCreateAdminSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = String(formData.get('first_name') || '').trim();
    const lastName = String(formData.get('last_name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email) {
      setAddAdminError('Admin email is required.');
      return;
    }
    if (password.length < 6) {
      setAddAdminError('Admin password must be at least 6 characters.');
      return;
    }

    createAdminFromProfileMutation.mutate(
      {
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: phone || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
        },
      },
    );
  }, [createAdminFromProfileMutation]);

  const openCustomerCreateSidebar = useCallback(() => {
    setSelectedDetailId(null);
    setEditingCustomer(null);
    setCustomerCreateError(null);
    setCustomerStatusDraft('ACTIVE');
    setCustomerSidebarMode('create');
  }, []);

  const openCustomerEditSidebar = useCallback((customer: Customer) => {
    const openEditor = () => {
      setSelectedDetailId(null);
      setEditingCustomer(customer);
      setCustomerCreateError(null);
      setCustomerSidebarMode('edit');
    };

    if (!selectedDetailId || prefersReducedMotion()) {
      openEditor();
      return;
    }

    const backdropElement = detailBackdropRef.current;
    const panelElement = detailPanelRef.current;
    if (!backdropElement || !panelElement) {
      openEditor();
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);
    gsap
      .timeline({ onComplete: openEditor })
      .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
      .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [selectedDetailId]);

  const closeCustomerEditor = useCallback(() => {
    const close = () => {
      setCustomerSidebarMode(null);
      setEditingCustomer(null);
      setCustomerCreateError(null);
      setCustomerStatusDraft('ACTIVE');
    };

    if (!isCustomerSidebarOpen || prefersReducedMotion()) {
      close();
      return;
    }

    const backdropElement = customerSidebarBackdropRef.current;
    const panelElement = customerSidebarPanelRef.current;
    if (!backdropElement || !panelElement) {
      close();
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);
    gsap
      .timeline({ onComplete: close })
      .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
      .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [isCustomerSidebarOpen]);

  const openEmployeeCreateSidebar = useCallback(() => {
    setSelectedEmployeeId(null);
    setEditingEmployee(null);
    setEmployeeFormError(null);
    setEmployeeSidebarMode('create');
  }, []);

  const openEmployeeEditSidebar = useCallback((employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setEditingEmployee(employee);
    setEmployeeFormError(null);
    setEmployeeSidebarMode('edit');
  }, []);

  const openEmployeeDetailSidebar = useCallback((employeeId: string) => {
    setEditingEmployee(null);
    setSelectedEmployeeId(employeeId);
    setEmployeeSidebarMode('detail');
  }, []);

  const closeEmployeeSidebar = useCallback(() => {
    const close = () => {
      setEmployeeSidebarMode(null);
      setSelectedEmployeeId(null);
      setEditingEmployee(null);
      setEmployeeFormError(null);
    };

    if (!isEmployeeSidebarOpen || prefersReducedMotion()) {
      close();
      return;
    }

    const backdropElement = employeeSidebarBackdropRef.current;
    const panelElement = employeeSidebarPanelRef.current;
    if (!backdropElement || !panelElement) {
      close();
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);
    gsap
      .timeline({ onComplete: close })
      .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
      .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [isEmployeeSidebarOpen]);

  const closePromoEditor = useCallback(() => {
    setIsPromoModalOpen(false);
    setEditingPromo(null);
    setPromoFormError(null);
    setPromoRewardTypeDraft('DISCOUNT');
    setPromoAppliesToDraft('ORDER');
    setPromoDiscountTypeDraft('PERCENT');
    setPromoBonusProductIdDraft('');
    setPromoSpotIdsDraft([]);
    setPromoCategoryIdsDraft([]);
    setPromoProductIdsDraft([]);
  }, []);

  const closeBonusRuleEditor = useCallback(() => {
    setIsBonusRuleModalOpen(false);
    setEditingBonusRule(null);
    setBonusRuleFormError(null);
  }, []);

  const closeSpotEditor = useCallback(() => {
    setIsSpotModalOpen(false);
    setEditingSpot(null);
  }, []);

  const closeProductEditor = useCallback(() => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductCategoryDraft('');
    setProductImagePreview(null);
  }, []);

  const closeCategoryEditor = useCallback(() => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryParentDraft('');
    setCategoryImagePreview(null);
  }, []);

  useEffect(() => {
    if (!customerSidebarMode) return;

    setCustomerStatusDraft(editingCustomer?.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE');
  }, [customerSidebarMode, editingCustomer]);

  useEffect(() => {
    if (!isPromoModalOpen) return;

    setPromoRewardTypeDraft(editingPromo?.reward_type ?? 'DISCOUNT');
    setPromoAppliesToDraft(editingPromo?.applies_to ?? 'ORDER');
    setPromoDiscountTypeDraft(editingPromo?.discount_type ?? 'PERCENT');
    setPromoBonusProductIdDraft(editingPromo?.bonus_product_id ?? '');
    setPromoSpotIdsDraft(editingPromo?.spot_ids ?? []);
    setPromoCategoryIdsDraft(editingPromo?.category_ids ?? []);
    setPromoProductIdsDraft(editingPromo?.product_ids ?? []);
  }, [editingPromo, isPromoModalOpen]);

  useEffect(() => {
    if (!isProductModalOpen) return;

    setProductCategoryDraft(editingProduct?.category_id ?? '');
  }, [editingProduct, isProductModalOpen]);

  useEffect(() => {
    if (!isCategoryModalOpen) return;

    setCategoryParentDraft(editingCategory?.parent_id ?? '');
  }, [editingCategory, isCategoryModalOpen]);

  useEffect(() => {
    const categoryIds = new Set(categories.map((category) => category.id));
    const rootIds = categories
      .filter((category) => !category.parent_id || !categoryIds.has(category.parent_id))
      .map((category) => category.id);

    setExpandedCategoryIds((current) => {
      const next = current.filter((id) => categoryIds.has(id));
      for (const rootId of rootIds) {
        if (!next.includes(rootId)) next.push(rootId);
      }

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [categories]);

  const closeCustomerDetail = useCallback(() => {
    if (!selectedDetailId) return;

    if (prefersReducedMotion()) {
      setSelectedDetailId(null);
      return;
    }

    const backdropElement = detailBackdropRef.current;
    const panelElement = detailPanelRef.current;
    if (!backdropElement || !panelElement) {
      setSelectedDetailId(null);
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);
    gsap
      .timeline({ onComplete: () => setSelectedDetailId(null) })
      .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
      .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [selectedDetailId]);

  const closeOrderDetail = useCallback(() => {
    if (!selectedOrderId) return;

    if (prefersReducedMotion()) {
      setSelectedOrderId(null);
      setOrderDetailMode('view');
      setOrderActionError(null);
      return;
    }

    const backdropElement = orderDetailBackdropRef.current;
    const panelElement = orderDetailPanelRef.current;
    if (!backdropElement || !panelElement) {
      setSelectedOrderId(null);
      setOrderDetailMode('view');
      setOrderActionError(null);
      return;
    }

    gsap.killTweensOf([backdropElement, panelElement]);
    gsap
      .timeline({
        onComplete: () => {
          setSelectedOrderId(null);
          setOrderDetailMode('view');
          setOrderActionError(null);
        },
      })
      .to(panelElement, { xPercent: 100, duration: 0.2, ease: 'power2.in' })
      .to(backdropElement, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0);
  }, [selectedOrderId]);

  useLayoutEffect(() => {
    if (!selectedCustomer) return;

    const backdropElement = detailBackdropRef.current;
    const panelElement = detailPanelRef.current;
    if (!backdropElement || !panelElement || prefersReducedMotion()) return;

    gsap.killTweensOf([backdropElement, panelElement]);
    const timeline = gsap.timeline();
    timeline
      .fromTo(backdropElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' })
      .fromTo(panelElement, { xPercent: 100 }, { xPercent: 0, duration: 0.24, ease: 'power3.out' }, 0);

    return () => {
      timeline.kill();
    };
  }, [selectedCustomer]);

  useLayoutEffect(() => {
    if (!selectedOrderId) return;

    const backdropElement = orderDetailBackdropRef.current;
    const panelElement = orderDetailPanelRef.current;
    if (!backdropElement || !panelElement || prefersReducedMotion()) return;

    gsap.killTweensOf([backdropElement, panelElement]);
    const timeline = gsap.timeline();
    timeline
      .fromTo(backdropElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' })
      .fromTo(panelElement, { xPercent: 100 }, { xPercent: 0, duration: 0.24, ease: 'power3.out' }, 0);

    return () => {
      timeline.kill();
    };
  }, [selectedOrderId]);

  useLayoutEffect(() => {
    if (!isCustomerSidebarOpen) return;

    const backdropElement = customerSidebarBackdropRef.current;
    const panelElement = customerSidebarPanelRef.current;
    if (!backdropElement || !panelElement || prefersReducedMotion()) return;

    gsap.killTweensOf([backdropElement, panelElement]);
    const timeline = gsap.timeline();
    timeline
      .fromTo(backdropElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' })
      .fromTo(panelElement, { xPercent: 100 }, { xPercent: 0, duration: 0.24, ease: 'power3.out' }, 0);

    return () => {
      timeline.kill();
    };
  }, [isCustomerSidebarOpen]);

  useLayoutEffect(() => {
    if (!isEmployeeSidebarOpen) return;

    const backdropElement = employeeSidebarBackdropRef.current;
    const panelElement = employeeSidebarPanelRef.current;
    if (!backdropElement || !panelElement || prefersReducedMotion()) return;

    gsap.killTweensOf([backdropElement, panelElement]);
    const timeline = gsap.timeline();
    timeline
      .fromTo(backdropElement, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: 'power1.out' })
      .fromTo(panelElement, { xPercent: 100 }, { xPercent: 0, duration: 0.24, ease: 'power3.out' }, 0);

    return () => {
      timeline.kill();
    };
  }, [isEmployeeSidebarOpen]);

  useLayoutEffect(() => {
    const viewElement = activeViewRef.current;
    if (!viewElement || prefersReducedMotion()) return;

    const animation = gsap.fromTo(
      viewElement,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.24, ease: 'power2.out', clearProps: 'opacity,visibility' },
    );

    return () => {
      animation.kill();
    };
  }, [activeView]);

  // Helper functions
  const getCustomerName = (customer: Customer) => {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.phone;
  };

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    }
    return employee.email;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatPoints = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return `${Math.round(value)}`;
  };

  const formatTrend = (value: number, asPercent = false) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const sign = safeValue >= 0 ? '+' : '-';
    const abs = Math.abs(safeValue);

    if (abs >= 1000) {
      return `${sign}${(abs / 1000).toFixed(1)}k${asPercent ? '%' : ''}`;
    }
    if (asPercent) {
      return `${sign}${abs.toFixed(1)}%`;
    }
    return `${sign}${Math.round(abs)}`;
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateString);
  };

  const getOrderStatusDisplay = (status: string) => {
    return ORDER_STATUS_DISPLAY_MAP[status] || { label: status, variant: 'neutral' as const };
  };

  const getPromoStatusDisplay = (promo: PromoCode) => {
    if (!promo.is_active) return { label: 'Inactive', variant: 'neutral' as const };
    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) return { label: 'Upcoming', variant: 'warning' as const };
    if (promo.valid_to && new Date(promo.valid_to) < now) return { label: 'Expired', variant: 'error' as const };
    return { label: 'Active', variant: 'success' as const };
  };

  const getPromoValueDisplay = (promo: PromoCode) => {
    if (promo.reward_type === 'BONUS_POINTS') {
      return `${promo.bonus_points ?? 0} pts`;
    }
    if (promo.reward_type === 'BONUS_PRODUCT') {
      return `${promo.bonus_product_quantity}x ${promo.bonus_product_name ?? 'Bonus Product'}`;
    }
    return promo.discount_type === 'PERCENT'
      ? `${promo.discount_value}%`
      : formatPrice(promo.discount_value);
  };

  const getPromoScopeLabel = (promo: PromoCode) => {
    if (promo.reward_type === 'BONUS_POINTS') return 'Bonus Points';
    if (promo.reward_type === 'BONUS_PRODUCT') return 'Bonus Product';
    return promo.applies_to === 'PRODUCT' ? 'Product Discount' : 'Order Discount';
  };

  const confirmDelete = useCallback((entity: string, name: string) => {
    return window.confirm(`Delete ${entity} "${name}"?`);
  }, []);

  // Calculate stats from backend with minimal fallback values
  const stats = useMemo(
    () => [
      {
        label: 'Daily Revenue',
        value: formatPrice(dashboardOverview?.today_revenue ?? 0),
        trend: formatTrend(dashboardOverview?.today_revenue_change ?? 0, true),
        isUp: (dashboardOverview?.today_revenue_change ?? 0) >= 0,
      },
      {
        label: 'Active Orders',
        value: String(dashboardOverview?.active_orders ?? 0),
        trend: formatTrend(dashboardOverview?.active_orders_change ?? 0),
        isUp: (dashboardOverview?.active_orders_change ?? 0) >= 0,
      },
      {
        label: 'Total Customers',
        value: String(dashboardOverview?.total_customers ?? 0),
        trend: formatTrend(dashboardOverview?.customers_change ?? 0, true),
        isUp: (dashboardOverview?.customers_change ?? 0) >= 0,
      },
      {
        label: 'Total Products',
        value: String(dashboardOverview?.total_products ?? 0),
        trend: formatTrend(dashboardOverview?.products_change ?? 0),
        isUp: (dashboardOverview?.products_change ?? 0) >= 0,
      },
    ],
    [dashboardOverview],
  );

  const totalPointsIssued = loyaltyStats?.total_points_issued ?? 0;
  const totalPointsUsed = loyaltyStats?.total_points_used ?? 0;
  const totalPointsRemaining = loyaltyStats?.total_points_remaining ?? Math.max(totalPointsIssued - totalPointsUsed, 0);
  const loyaltyUsagePercent = totalPointsIssued > 0 ? Math.min((totalPointsUsed / totalPointsIssued) * 100, 100) : 0;

  const efficiencyItems = useMemo(
    () => [
      {
        label: 'Avg. Prep Time',
        value: efficiencyMetrics ? `${efficiencyMetrics.avg_prep_time_minutes.toFixed(1)} min` : '--',
        color: 'bg-emerald-500',
        percent: efficiencyMetrics ? Math.min((efficiencyMetrics.avg_prep_time_minutes / 30) * 100, 100) : 0,
      },
      {
        label: 'Delivery Latency',
        value: efficiencyMetrics ? `${efficiencyMetrics.avg_delivery_time_minutes.toFixed(1)} min` : '--',
        color: 'bg-amber-500',
        percent: efficiencyMetrics ? Math.min((efficiencyMetrics.avg_delivery_time_minutes / 60) * 100, 100) : 0,
      },
      {
        label: 'Order Error Rate',
        value: efficiencyMetrics ? `${efficiencyMetrics.order_error_rate.toFixed(1)}%` : '--',
        color: 'bg-red-500',
        percent: efficiencyMetrics ? Math.min(efficiencyMetrics.order_error_rate * 20, 100) : 0,
      },
    ],
    [efficiencyMetrics],
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Command Center</h2>
          <p className="text-stone-500 font-medium">Real-time overview of your sushi empire</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="h-11 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest gap-2">
            <Download className="w-3.5 h-3.5" /> Export Report
          </Button>
          <Button size="sm" className="h-11 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => setActiveView('promo')}>
            <Plus className="w-4 h-4" /> New Promotion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] transform group-hover:scale-110 transition-transform">
               <TrendingUp className="w-16 h-16" />
            </div>
            <p className="text-stone-400 text-xs font-black uppercase tracking-[0.2em]">{stat.label}</p>
            <div className="mt-4 space-y-3">
              <h4 className="text-3xl font-black tracking-tight leading-none">{stat.value}</h4>
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${stat.isUp ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                {stat.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-stone-100 dark:border-stone-800/50 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black tracking-tight">Recent Live Orders</h3>
              <p className="text-xs text-stone-500 font-medium mt-1">Direct from branches across Tokyo</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest p-0 text-red-600" onClick={() => setActiveView('orders')}>View Full Ledger <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.2em] text-stone-400 bg-stone-50/50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800/50">
                  <th className="px-8 py-5 font-black">Order Ref</th>
                  <th className="px-8 py-5 font-black">Customer</th>
                  <th className="px-8 py-5 font-black">Branch</th>
                  <th className="px-8 py-5 font-black">Status</th>
                  <th className="px-8 py-5 font-black text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/50">
                {dashboardOrders.slice(0, 5).map((order) => {
                  const statusDisplay = getOrderStatusDisplay(order.status);
                  return (
                    <tr key={order.id} className="group hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all">
                      <td className="px-8 py-6">
                         <span className="font-mono text-xs font-bold px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-stone-600 dark:text-stone-400 border border-stone-200/50 dark:border-stone-700/50 whitespace-nowrap">
                           #{order.order_number}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-stone-900 dark:text-stone-100">{order.customer_name}</div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{order.order_type}</div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-stone-400" />
                            <span className="text-sm font-bold">{order.spot_name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <Badge variant={statusDisplay.variant}>
                          {statusDisplay.label}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-right text-sm font-black tracking-tight">{formatPrice(order.total_amount)}</td>
                    </tr>
                  );
                })}
                {dashboardOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-stone-400">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-stone-950 text-white rounded-[2rem] p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20">
                 <Gift className="w-16 h-16 text-red-600" />
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Loyalty Program</p>
                 <h3 className="text-2xl font-black tracking-tight">Points Distribution</h3>
              </div>
              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <p className="text-4xl font-black tabular-nums">{formatPoints(totalPointsIssued)} <span className="text-sm text-stone-600 font-bold ml-1">PTS</span></p>
                    <p className={`text-xs font-bold ${(loyaltyStats?.year_over_year_change ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {(loyaltyStats?.year_over_year_change ?? 0) >= 0 ? '+' : ''}{(loyaltyStats?.year_over_year_change ?? 0).toFixed(0)}% vs LY
                    </p>
                 </div>
                 <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                      style={{ width: `${loyaltyUsagePercent}%` }}
                    />
                 </div>
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-500">
                    <span>Used: {formatPoints(totalPointsUsed)}</span>
                    <span>Remaining: {formatPoints(totalPointsRemaining)}</span>
                 </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl border-stone-700 bg-stone-900/40 text-stone-100 text-xs hover:bg-stone-800 hover:text-white transition-colors"
                onClick={() => setActiveView('bonus')}
              >
                Manage Bonus Rules
              </Button>
           </div>

           <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-8 space-y-6">
              <h3 className="text-lg font-black tracking-tight">Efficiency Metrics</h3>
              <div className="space-y-6">
                 {efficiencyItems.map(m => (
                   <div key={m.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-stone-400">{m.label}</span>
                         <span className="text-stone-900 dark:text-stone-100">{m.value}</span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                         <div className={`h-full ${m.color}`} style={{ width: `${m.percent}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Customer Ledger</h2>
          <p className="text-stone-500 font-medium">Manage your {customersMeta.total || customers.length} total patrons</p>
        </div>
        <CrudHeaderButton
          type="button"
          icon={UserPlus}
          label="Add Customer"
          onClick={openCustomerCreateSidebar}
        />
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden">
        <FilterBar
          onSearch={(value) => {
            setCustomerSearch(value);
            setCustomerPage(1);
          }}
          onFilterChange={(label, value) => {
            if (label === 'Status') {
              setCustomerStatusFilter(value === 'Active' ? 'ACTIVE' : value === 'Blocked' ? 'BLOCKED' : '');
            }
            setCustomerPage(1);
          }}
          filters={[
            { label: 'Status', options: ['All', 'Active', 'Blocked'] },
          ]}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-stone-400 bg-stone-50/50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800/50">
                <th className="px-8 py-5 font-black">Customer</th>
                <th className="px-8 py-5 font-black">Contact</th>
                <th className="px-8 py-5 font-black">Activity</th>
                <th className="px-8 py-5 font-black">Status</th>
                <th className="px-8 py-5 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/50">
              {customers.map((c) => {
                const customerName = getCustomerName(c);
                const isVip = c.bonus_balance >= 5000;
                return (
                  <tr key={c.id} className="group hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all cursor-pointer" onClick={() => setSelectedDetailId(c.id)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-black text-stone-400">
                            {customerName[0]?.toUpperCase() || '?'}
                         </div>
                         <div>
                            <div className="text-sm font-black text-stone-900 dark:text-stone-100">{customerName}</div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">Joined {formatDate(c.created_at)}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-stone-700 dark:text-stone-300">{c.phone}</div>
                      {c.email && <div className="text-[10px] text-stone-400">{c.email}</div>}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                         <div className="text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Bonus</p>
                            <p className="text-sm font-black text-red-600">{Math.floor(c.bonus_balance)}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={isVip ? 'info' : c.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {isVip ? 'VIP' : c.status === 'ACTIVE' ? 'Active' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={CRUD_ICON_ACTION_GROUP_CLASS}>
                        <CrudIconButton
                          icon={Eye}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailId(c.id);
                          }}
                        />
                        <CrudIconButton
                          icon={Edit2}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerEditSidebar(c);
                          }}
                        />
                        <CrudIconButton
                          icon={Trash2}
                          danger
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDelete('customer', customerName)) {
                              deleteCustomerMutation.mutate(c.id);
                            }
                          }}
                          disabled={deleteCustomerMutation.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-stone-400">
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={customersMeta.page}
          totalPages={customersMeta.total_pages}
          onPageChange={(page) => {
            if (page >= 1 && page <= customersMeta.total_pages) {
              setCustomerPage(page);
            }
          }}
          totalItems={customersMeta.total}
          pageSize={customersMeta.limit}
        />
      </div>

    </div>
  );

  const renderPromoCodes = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Promotions</h2>
          <p className="text-stone-500 font-medium">Drive growth with strategic discounts ({promos.length} total)</p>
        </div>
         <CrudHeaderButton
          icon={Ticket}
          label="Create Promo"
          onClick={() => {
            setPromoFormError(null);
            setEditingPromo(null);
            setPromoRewardTypeDraft('DISCOUNT');
            setPromoAppliesToDraft('ORDER');
            setPromoDiscountTypeDraft('PERCENT');
            setPromoBonusProductIdDraft('');
            setPromoSpotIdsDraft([]);
            setPromoCategoryIdsDraft([]);
            setPromoProductIdsDraft([]);
            setIsPromoModalOpen(true);
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {promos.map(promo => {
           const statusDisplay = getPromoStatusDisplay(promo);
           const discountDisplay = getPromoValueDisplay(promo);
           const usageDisplay = promo.total_usage_limit
             ? `${promo.usage_count}/${promo.total_usage_limit}`
             : `${promo.usage_count}/∞`;

           return (
             <div key={promo.id} className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-8">
                   <div className="px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl font-mono text-lg font-black tracking-tighter border border-stone-200 dark:border-stone-700">
                      {promo.code}
                   </div>
                   <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
                </div>
                <div className="space-y-6">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{getPromoScopeLabel(promo)}</p>
                      <p className="text-3xl font-black tracking-tight">{discountDisplay}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Usage</p>
                         <p className="text-sm font-bold">{usageDisplay}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Min. Order</p>
                         <p className="text-sm font-bold">{promo.min_order_amount ? formatPrice(promo.min_order_amount) : 'None'}</p>
                      </div>
                   </div>
                   {(promo.product_ids.length > 0 || promo.category_ids.length > 0 || promo.spot_ids.length > 0) && (
                     <div className="flex flex-wrap gap-2">
                       {promo.product_ids.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Products: {promo.product_ids.length}</span>}
                       {promo.category_ids.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Categories: {promo.category_ids.length}</span>}
                       {promo.spot_ids.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Branches: {promo.spot_ids.length}</span>}
                     </div>
                   )}
                   <div className="pt-6 border-t border-stone-50 dark:border-stone-800 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                        Exp: {promo.valid_to ? formatDate(promo.valid_to) : 'Never'}
                      </span>
                      <div className="flex gap-2">
                         <CrudIconButton
                           icon={Edit2}
                           onClick={() => {
                           setPromoFormError(null);
                           setEditingPromo(promo);
                           setPromoRewardTypeDraft(promo.reward_type);
                           setPromoAppliesToDraft(promo.applies_to);
                           setPromoDiscountTypeDraft(promo.discount_type ?? 'PERCENT');
                           setPromoBonusProductIdDraft(promo.bonus_product_id ?? '');
                           setPromoSpotIdsDraft(promo.spot_ids ?? []);
                           setPromoCategoryIdsDraft(promo.category_ids ?? []);
                           setPromoProductIdsDraft(promo.product_ids ?? []);
                           setIsPromoModalOpen(true);
                         }}
                       />
                         <CrudIconButton
                           icon={Trash2}
                           danger
                           onClick={() => {
                             if (confirmDelete('promo code', promo.code)) {
                               deletePromoMutation.mutate(promo.id);
                             }
                           }}
                           disabled={deletePromoMutation.isPending}
                         />
                      </div>
                   </div>
                </div>
             </div>
           );
         })}
         {promos.length === 0 && (
           <div className="col-span-3 bg-white dark:bg-stone-900 p-12 rounded-[2.5rem] border border-stone-200/50 dark:border-stone-800/50 text-center">
              <p className="text-stone-400">No promo codes found</p>
           </div>
         )}
      </div>
    </div>
  );

  const renderBonusRules = () => {
    const issuedPoints = loyaltyStats?.total_points_issued ?? 0;
    const usedPoints = loyaltyStats?.total_points_used ?? 0;
    const remainingPoints = loyaltyStats?.total_points_remaining ?? Math.max(issuedPoints - usedPoints, 0);
    const utilizationPercent = issuedPoints > 0 ? Math.min((usedPoints / issuedPoints) * 100, 100) : 0;
    const yoyChange = loyaltyStats?.year_over_year_change ?? 0;

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">Bonus Rules</h2>
            <p className="text-stone-500 font-medium">Configure loyalty mechanics and manage redemption policy</p>
          </div>
          <CrudHeaderButton
            icon={Plus}
            label="Add Rule"
            onClick={() => {
              setBonusRuleFormError(null);
              setEditingBonusRule(null);
              setIsBonusRuleModalOpen(true);
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Issued Points</p>
            <p className="text-3xl font-black tracking-tight mt-2">{formatPoints(issuedPoints)}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Used Points</p>
            <p className="text-3xl font-black tracking-tight mt-2">{formatPoints(usedPoints)}</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Remaining</p>
            <p className="text-3xl font-black tracking-tight mt-2">{formatPoints(remainingPoints)}</p>
            <p className={`text-xs font-bold mt-2 ${yoyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}% vs LY
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight">Points Utilization</h3>
            <span className="text-sm font-black">{utilizationPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600" style={{ width: `${utilizationPercent}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 p-6 space-y-4">
          <h3 className="text-lg font-black tracking-tight">Configured Rules</h3>
          <div className="space-y-3">
            {bonusRules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.is_active ? 'success' : 'neutral'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                        Created {formatDate(rule.created_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Earn %</p>
                        <p className="text-sm font-black">{rule.earn_percent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Spend Rate</p>
                        <p className="text-sm font-black">{rule.spend_rate}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Min Order</p>
                        <p className="text-sm font-black">{formatPrice(rule.min_order_to_earn)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Max Spend %</p>
                        <p className="text-sm font-black">{rule.max_spend_percent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Expires</p>
                        <p className="text-sm font-black">{rule.expires_in_days ? `${rule.expires_in_days} days` : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CrudIconButton
                      icon={Edit2}
                      onClick={() => {
                        setBonusRuleFormError(null);
                        setEditingBonusRule(rule);
                        setIsBonusRuleModalOpen(true);
                      }}
                    />
                    <CrudIconButton
                      icon={Trash2}
                      danger
                      onClick={() => {
                        if (confirmDelete('bonus rule', rule.id)) {
                          deleteBonusRuleMutation.mutate(rule.id);
                        }
                      }}
                      disabled={deleteBonusRuleMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
            {bonusRules.length === 0 && (
              <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-stone-400">
                No bonus rules found. Create your first rule.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Export orders to CSV
  const handleExportOrders = () => {
    if (orders.length === 0) {
      alert('No orders to export');
      return;
    }

    const headers = ['Order Number', 'Customer Name', 'Customer Phone', 'Branch', 'Type', 'Status', 'Payment', 'Amount', 'Date'];
    const csvData = orders.map(order => [
      order.order_number,
      order.customer_name,
      order.customer_phone,
      order.spot_name,
      order.order_type,
      order.status,
      order.payment_type,
      order.total_amount.toFixed(2),
      new Date(order.created_at).toLocaleString()
    ]);

    const csvContent = [headers, ...csvData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render orders view
  const renderOrders = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Order Ledger</h2>
          <p className="text-stone-500 font-medium">Manage {ordersMeta.total || orders.length} orders across all branches</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest gap-2"
          onClick={handleExportOrders}
        >
          <Download className="w-4 h-4" /> Export Orders
        </Button>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="px-6 py-4 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
            <div className="h-11 shrink-0 inline-flex items-center gap-2.5 px-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl group">
              <Search className="w-4 h-4 text-stone-400 group-focus-within:text-red-500 transition-colors" />
              <input
                type="text"
                placeholder="Search orders..."
                className="bg-transparent border-none outline-none text-sm font-semibold placeholder:text-stone-400 focus:outline-none"
                size={18}
                style={{
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  background: 'transparent',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
                value={orderSearch}
                onChange={(e) => {
                  setOrderSearch(e.target.value);
                  setOrderPage(1);
                }}
              />
            </div>

              <Select
                value={orderStatusFilter || undefined}
                onValueChange={(value) => {
                  setOrderStatusFilter(value === 'All' ? '' : value);
                  setOrderPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[190px] shrink-0 rounded-2xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-4 text-xs font-black uppercase tracking-[0.15em] text-stone-700 dark:text-stone-200 shadow-none">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="min-w-[240px] rounded-2xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="ON_THE_WAY">On The Way</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={orderTypeFilter || undefined}
                onValueChange={(value) => {
                  setOrderTypeFilter(value === 'All' ? '' : value);
                  setOrderPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[150px] shrink-0 rounded-2xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-4 text-xs font-black uppercase tracking-[0.15em] text-stone-700 dark:text-stone-200 shadow-none">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="min-w-[210px] rounded-2xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="DELIVERY">Delivery</SelectItem>
                  <SelectItem value="PICKUP">Pickup</SelectItem>
                  <SelectItem value="WALK_IN">Walk In</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={orderSpotFilter || undefined}
                onValueChange={(value) => {
                  setOrderSpotFilter(value === 'All' ? '' : value);
                  setOrderPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[180px] shrink-0 rounded-2xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-4 text-xs font-black uppercase tracking-[0.15em] text-stone-700 dark:text-stone-200 shadow-none">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent className="min-w-[230px] rounded-2xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                  <SelectItem value="All">All Branches</SelectItem>
                  {spots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={orderPaymentFilter || undefined}
                onValueChange={(value) => {
                  setOrderPaymentFilter(value === 'All' ? '' : value);
                  setOrderPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[160px] shrink-0 rounded-2xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-4 text-xs font-black uppercase tracking-[0.15em] text-stone-700 dark:text-stone-200 shadow-none">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent className="min-w-[210px] rounded-2xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                  <SelectItem value="All">All Payments</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>

              <input
                type="date"
                className="h-11 w-auto shrink-0 px-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-black tracking-wide text-stone-600 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 cursor-pointer"
                value={orderDateFrom}
                onChange={(e) => {
                  setOrderDateFrom(e.target.value);
                  setOrderPage(1);
                }}
              />
              <input
                type="date"
                className="h-11 w-auto shrink-0 px-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-black tracking-wide text-stone-600 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 cursor-pointer"
                value={orderDateTo}
                onChange={(e) => {
                  setOrderDateTo(e.target.value);
                  setOrderPage(1);
                }}
              />
          </div>
        </div>

        {/* Active Filters Display */}
        {((orderStatusFilter && orderStatusFilter !== 'All') || (orderTypeFilter && orderTypeFilter !== 'All') || (orderSpotFilter && orderSpotFilter !== 'All') || (orderPaymentFilter && orderPaymentFilter !== 'All') || orderDateFrom || orderDateTo) && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-stone-50/50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800">
            {orderStatusFilter && orderStatusFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                {orderStatusFilter}
                <button onClick={() => setOrderStatusFilter('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            {orderTypeFilter && orderTypeFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                {orderTypeFilter}
                <button onClick={() => setOrderTypeFilter('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            {orderSpotFilter && orderSpotFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                {spots.find(s => s.id === orderSpotFilter)?.name || orderSpotFilter}
                <button onClick={() => setOrderSpotFilter('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            {orderPaymentFilter && orderPaymentFilter !== 'All' && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                {orderPaymentFilter}
                <button onClick={() => setOrderPaymentFilter('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            {orderDateFrom && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                From: {orderDateFrom}
                <button onClick={() => setOrderDateFrom('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            {orderDateTo && (
              <span className="px-2 py-0.5 bg-white dark:bg-stone-800 rounded text-[10px] font-medium flex items-center gap-1 border border-stone-200 dark:border-stone-700">
                To: {orderDateTo}
                <button onClick={() => setOrderDateTo('')} className="text-stone-400 hover:text-red-500 ml-1">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setOrderStatusFilter('');
                setOrderTypeFilter('');
                setOrderSpotFilter('');
                setOrderPaymentFilter('');
                setOrderDateFrom('');
                setOrderDateTo('');
                setOrderPage(1);
              }}
              className="text-[10px] font-medium text-red-600 hover:underline ml-2"
            >
              Clear
            </button>
          </div>
        )}
        {orderActionError && (
          <div className="mx-6 my-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {orderActionError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-stone-400 bg-stone-50/50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800/50">
                <th className="px-8 py-5 font-black">Order Ref</th>
                <th className="px-8 py-5 font-black">Customer</th>
                <th className="px-8 py-5 font-black">Branch</th>
                <th className="px-8 py-5 font-black">Type</th>
                <th className="px-8 py-5 font-black">Payment</th>
                <th className="px-8 py-5 font-black">Status</th>
                <th className="px-8 py-5 font-black">Date</th>
                <th className="px-8 py-5 font-black text-right">Amount</th>
                <th className="px-8 py-5 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/50">
              {ordersLedgerQuery.isFetching && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center text-stone-400">Loading orders...</td>
                </tr>
              )}
              {orders.map((order) => {
                const statusDisplay = getOrderStatusDisplay(order.status);
                return (
                  <tr
                    key={order.id}
                    className="group hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all cursor-pointer"
                    onClick={() => {
                      setOrderActionError(null);
                      setOrderDetailMode('view');
                      setSelectedOrderId(order.id);
                    }}
                  >
                    <td className="px-8 py-6">
                       <span className="font-mono text-xs font-bold px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-stone-600 dark:text-stone-400 border border-stone-200/50 dark:border-stone-700/50 whitespace-nowrap">
                         #{order.order_number}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-stone-900 dark:text-stone-100">{order.customer_name || 'Guest'}</div>
                      <div className="text-[10px] text-stone-400 font-medium">{order.customer_phone}</div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-sm font-bold">{order.spot_name}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{order.order_type}</span>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={order.payment_type === 'CARD' ? 'info' : 'neutral'}>{order.payment_type}</Badge>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs text-stone-500">{getTimeAgo(order.created_at)}</div>
                    </td>
                    <td className="px-8 py-6 text-right text-sm font-black tracking-tight">{formatPrice(order.total_amount)}</td>
                    <td className="px-8 py-6 text-right">
                      <div className={CRUD_ICON_ACTION_GROUP_CLASS}>
                        <CrudIconButton
                          icon={Eye}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderActionError(null);
                            setOrderDetailMode('view');
                            setSelectedOrderId(order.id);
                          }}
                        />
                        <CrudIconButton
                          icon={Edit2}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderActionError(null);
                            setOrderDetailMode('edit');
                            setSelectedOrderId(order.id);
                          }}
                        />
                        <CrudIconButton
                          icon={Trash2}
                          danger
                          disabled={deleteOrderMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDelete('order', `#${order.order_number}`)) {
                              deleteOrderMutation.mutate(order.id);
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!ordersLedgerQuery.isFetching && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center text-stone-400">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={ordersMeta.page}
          totalPages={ordersMeta.total_pages}
          onPageChange={(page) => {
            if (page >= 1 && page <= ordersMeta.total_pages) {
              setOrderPage(page);
            }
          }}
          totalItems={ordersMeta.total}
          pageSize={ordersMeta.limit}
        />
      </div>

    </div>
  );

  // Render employees view
  const renderEmployees = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Human Resources</h2>
          <p className="text-stone-500 font-medium">Manage your {employees.length} team members</p>
        </div>
        <CrudHeaderButton
          icon={UserPlus}
          label="Add Employee"
          onClick={openEmployeeCreateSidebar}
        />
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.2em] text-stone-400 bg-stone-50/50 dark:bg-stone-950/50 border-b border-stone-100 dark:border-stone-800/50">
                <th className="px-8 py-5 font-black">Employee</th>
                <th className="px-8 py-5 font-black">Role</th>
                <th className="px-8 py-5 font-black">Branch</th>
                <th className="px-8 py-5 font-black">Status</th>
                <th className="px-8 py-5 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/50">
              {employees.map((emp) => {
                const empName = getEmployeeName(emp);
                return (
                  <tr key={emp.id} className="group hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-black text-stone-400">
                            {empName[0]?.toUpperCase() || '?'}
                         </div>
                         <div>
                            <div className="text-sm font-black text-stone-900 dark:text-stone-100">{empName}</div>
                            <div className="text-[10px] text-stone-400 font-medium">{emp.email}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold">{emp.role_title}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-sm font-medium">{emp.spot_name || 'Headquarters'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <Badge variant={emp.status === 'ACTIVE' ? 'success' : emp.status === 'INACTIVE' ? 'neutral' : 'warning'}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={CRUD_ICON_ACTION_GROUP_CLASS}>
                        <CrudIconButton
                          icon={Eye}
                          onClick={() => {
                            openEmployeeDetailSidebar(emp.id);
                          }}
                        />
                        <CrudIconButton
                          icon={Edit2}
                          onClick={() => {
                            openEmployeeEditSidebar(emp);
                          }}
                        />
                        <CrudIconButton
                          icon={Trash2}
                          danger
                          onClick={() => {
                            if (confirmDelete('employee', empName)) {
                              deleteEmployeeMutation.mutate(emp.id);
                            }
                          }}
                          disabled={deleteEmployeeMutation.isPending}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-stone-400">No employees found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render spots view
  const renderSpots = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Branch Network</h2>
          <p className="text-stone-500 font-medium">Manage your {spots.length} locations</p>
        </div>
        <CrudHeaderButton
          icon={Plus}
          label="Add Branch"
          onClick={() => {
            setEditingSpot(null);
            setIsSpotModalOpen(true);
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {spots.map((spot) => (
          <div key={spot.id} className="bg-white dark:bg-stone-900 p-8 rounded-[2.5rem] border border-stone-200/50 dark:border-stone-800/50 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="text-xl font-black tracking-tight">{spot.name}</h3>
                  <p className="text-xs text-stone-400 font-mono">{spot.code}</p>
               </div>
               <Badge variant={spot.is_active ? 'success' : 'neutral'}>{spot.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="space-y-4">
               {spot.address_line1 && (
                 <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                    <div className="text-sm text-stone-600 dark:text-stone-400">
                       {spot.address_line1}
                       {spot.city && <>, {spot.city}</>}
                    </div>
                 </div>
               )}
               {spot.phone && (
                 <div className="text-sm text-stone-500">{spot.phone}</div>
               )}
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-50 dark:border-stone-800">
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Delivery Fee</p>
                     <p className="text-sm font-bold">{formatPrice(spot.delivery_fee)}</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Min. Order</p>
                     <p className="text-sm font-bold">{formatPrice(spot.minimum_order)}</p>
                  </div>
               </div>
            </div>
            <div className="mt-6 pt-6 border-t border-stone-50 dark:border-stone-800 flex justify-end gap-2">
               <CrudIconButton
                 icon={Edit2}
                 onClick={() => {
                   setEditingSpot(spot);
                   setIsSpotModalOpen(true);
                 }}
               />
               <CrudIconButton
                 icon={Trash2}
                 danger
                 onClick={() => {
                   if (confirmDelete('branch', spot.name)) {
                     deleteSpotMutation.mutate(spot.id);
                   }
                 }}
                 disabled={deleteSpotMutation.isPending}
               />
            </div>
          </div>
        ))}
        {spots.length === 0 && (
          <div className="col-span-3 bg-white dark:bg-stone-900 p-12 rounded-[2.5rem] border border-stone-200/50 dark:border-stone-800/50 text-center">
             <p className="text-stone-400">No branches found</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render menu view
  const renderMenu = () => {
    const paginatedProducts = menuProducts;
    const sortedCategories = [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aName = getCategoryDisplayName(a);
      const bName = getCategoryDisplayName(b);
      return aName.localeCompare(bName);
    });

    const categoryPreviewById = new Map<string, string>();
    for (const product of products) {
      if (product.image_url && !categoryPreviewById.has(product.category_id)) {
        categoryPreviewById.set(product.category_id, product.image_url);
      }
    }

    const categoriesById = new Map<string, Category>(sortedCategories.map((category) => [category.id, category]));
    const childrenByParent = new Map<string, Category[]>();
    const rootCategories: Category[] = [];

    for (const category of sortedCategories) {
      const parentId = category.parent_id;
      if (parentId && categoriesById.has(parentId)) {
        const siblings = childrenByParent.get(parentId) || [];
        siblings.push(category);
        childrenByParent.set(parentId, siblings);
      } else {
        rootCategories.push(category);
      }
    }

    const expandedCategorySet = new Set(expandedCategoryIds);
    const toggleCategoryExpansion = (categoryId: string) => {
      setExpandedCategoryIds((current) =>
        current.includes(categoryId)
          ? current.filter((id) => id !== categoryId)
          : [...current, categoryId],
      );
    };

    const renderCategoryTree = (nodes: Category[], depth: number): React.ReactNode =>
      nodes.map((category) => {
        const categoryName = getCategoryDisplayName(category);
        const preview = category.image_url || categoryPreviewById.get(category.id) || null;
        const childCategories = childrenByParent.get(category.id) || [];
        const subCategoryCount = childCategories.length;
        const parentCategory = category.parent_id ? categoriesById.get(category.parent_id) : null;
        const isExpanded = expandedCategorySet.has(category.id);
        const hasChildren = childCategories.length > 0;

        return (
          <div key={category.id} className="space-y-3">
            <div
              className="group flex items-center justify-between rounded-[1.6rem] bg-white/95 p-3 shadow-[0_8px_24px_rgba(28,25,23,0.05)] ring-1 ring-stone-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(28,25,23,0.08)] dark:bg-stone-950/95 dark:ring-stone-800/80"
              style={{ marginLeft: `${depth * 18}px` }}
            >
              <div className="min-w-0 flex items-center gap-5">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpansion(category.id)}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-stone-500 transition-all duration-200",
                      isExpanded
                        ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
                        : "bg-stone-100/90 text-stone-500 hover:bg-stone-200/80 hover:text-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100",
                    )}
                    aria-label={isExpanded ? `Collapse ${categoryName}` : `Expand ${categoryName}`}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100/80 text-stone-300 dark:bg-stone-900 dark:text-stone-600">
                    <Minus className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 shadow-sm ring-1 ring-stone-200/70 dark:ring-stone-700/70">
                  {preview ? (
                    <ImageWithFallback src={preview} className="w-full h-full object-cover" alt={categoryName} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 text-stone-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-base font-black tracking-tight truncate text-stone-900 dark:text-stone-50">{categoryName}</p>
                    {hasChildren && (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                        {subCategoryCount} {subCategoryCount === 1 ? 'child' : 'children'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-stone-500">
                    {parentCategory ? `Parent: ${getCategoryDisplayName(parentCategory)}` : 'Top-level category'}
                    {' • '}
                    {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-3 flex-nowrap">
                <Badge variant={category.is_active ? 'success' : 'neutral'} className="rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em]">
                  {category.is_active ? 'On' : 'Off'}
                </Badge>
                <div className="flex items-center gap-1 rounded-2xl bg-stone-100/90 p-1 dark:bg-stone-900">
                  <CrudIconButton
                    icon={Edit2}
                    className="rounded-xl"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryImagePreview(category.image_url || null);
                      setIsCategoryModalOpen(true);
                    }}
                  />
                  <CrudIconButton
                    icon={Trash2}
                    danger
                    className="rounded-xl"
                    onClick={() => {
                      if (confirmDelete('category', categoryName)) {
                        deleteCategoryMutation.mutate(category.id);
                      }
                    }}
                    disabled={deleteCategoryMutation.isPending}
                  />
                </div>
              </div>
            </div>
            {hasChildren && isExpanded ? (
              <div className="ml-5 border-l border-dashed border-stone-200/80 pl-4 dark:border-stone-700/70">
                {renderCategoryTree(childCategories, depth + 1)}
              </div>
            ) : null}
          </div>
        );
      });

    const categoryTreeRoots = [...rootCategories];
    for (const category of sortedCategories) {
      if (!categoryTreeRoots.some((item) => item.id === category.id) && !categoriesById.has(category.parent_id || '')) {
        categoryTreeRoots.push(category);
      }
    }

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-stone-950 dark:text-stone-50">Menu Architecture</h2>
        </div>

        <Tabs value={menuTab} onValueChange={(value) => setMenuTab(value as 'categories' | 'products')} className="space-y-5">
          <TabsList className="grid h-14 w-full grid-cols-2 !rounded-[1.6rem] overflow-hidden border border-stone-200/70 bg-stone-100 p-1 dark:border-stone-800 dark:bg-stone-900">
            <TabsTrigger
              value="categories"
              className={cn(
                "h-full w-full rounded-[1.2rem] px-5 text-sm font-black tracking-[0.12em] uppercase transition-all duration-200",
                menuTab === 'categories'
                  ? "bg-red-600 text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)]"
                  : "text-stone-500 hover:bg-stone-200/80 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Categories
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold text-inherit", menuTab === 'categories' ? "bg-white/20" : "bg-white/70 dark:bg-stone-800")}>{categories.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className={cn(
                "h-full w-full rounded-[1.2rem] px-5 text-sm font-black tracking-[0.12em] uppercase transition-all duration-200",
                menuTab === 'products'
                  ? "bg-red-600 text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)]"
                  : "text-stone-500 hover:bg-stone-200/80 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200",
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              Products
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold text-inherit", menuTab === 'products' ? "bg-white/20" : "bg-white/70 dark:bg-stone-800")}>{productsTotalCount}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <section className="bg-white dark:bg-stone-900 rounded-[1.9rem] p-6 space-y-5 shadow-[0_18px_40px_rgba(28,25,23,0.05)] ring-1 ring-stone-200/60 dark:ring-stone-800/60">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-400">Categories</h3>
                <CrudHeaderButton
                  variant="outline"
                  icon={Plus}
                  label="Add Category"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryImagePreview(null);
                    setIsCategoryModalOpen(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                {categoryTreeRoots.length > 0 ? (
                  renderCategoryTree(categoryTreeRoots, 0)
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 px-4 py-8 text-center text-sm text-stone-400">
                    No categories found
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="products">
            <section className="bg-white dark:bg-stone-900 rounded-[1.9rem] p-6 space-y-5 shadow-[0_18px_40px_rgba(28,25,23,0.05)] ring-1 ring-stone-200/60 dark:ring-stone-800/60">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-400">Products</h3>
                <CrudHeaderButton
                  icon={Plus}
                  label="Add Product"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductImagePreview(null);
                    setIsProductModalOpen(true);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Limit</span>
                  <Select
                    value={String(menuProductsPageSize)}
                    onValueChange={(value) => {
                      const parsed = Number(value);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setMenuProductsPageSize(parsed);
                        setMenuProductsPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[90px] rounded-xl bg-white dark:bg-stone-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MENU_PRODUCTS_PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginatedProducts.map((product) => {
                  const productName = getProductDisplayName(product);
                  const fallbackCategory = categoriesById.get(product.category_id);
                  const productCategoryName = product.category_name || (fallbackCategory ? getCategoryDisplayName(fallbackCategory) : 'Uncategorized');

                  return (
                    <div key={product.id} className="min-w-0 rounded-2xl border border-stone-200/60 dark:border-stone-800/70 bg-stone-50/60 dark:bg-stone-900/50 p-3 transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-5">
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 border border-stone-200/60 dark:border-stone-700/60">
                          {product.image_url ? (
                            <ImageWithFallback src={product.image_url} className="w-full h-full object-cover" alt={productName} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-stone-400">No Img</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-black leading-tight break-words">{productName}</p>
                            <Badge variant={product.is_active ? 'success' : 'neutral'} className="text-[8px] shrink-0">{product.is_active ? 'On' : 'Off'}</Badge>
                          </div>
                          <p className="text-[11px] text-stone-500 truncate">Category: {productCategoryName}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {product.sku && (
                              <span className="px-1.5 py-0.5 rounded-md bg-stone-200/70 text-stone-700 text-[9px] font-bold uppercase tracking-wide dark:bg-stone-800 dark:text-stone-200">
                                SKU {product.sku}
                              </span>
                            )}
                            {product.is_spicy && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[9px] font-bold uppercase tracking-wide">Spicy</span>
                            )}
                            {product.is_vegan && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wide">Vegan</span>
                            )}
                            {product.is_halal && (
                              <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[9px] font-bold uppercase tracking-wide">Halal</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
                        <p className="text-base font-black tracking-tight">{formatPrice(product.base_price)}</p>
                        <div className="flex gap-1 shrink-0">
                          <CrudIconButton
                            icon={Edit2}
                            onClick={() => {
                              setEditingProduct(product);
                              setProductImagePreview(product.image_url || null);
                              setIsProductModalOpen(true);
                            }}
                          />
                          <CrudIconButton
                            icon={Trash2}
                            danger
                            onClick={() => {
                              if (confirmDelete('product', productName)) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            disabled={deleteProductMutation.isPending}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {menuProductsMeta.total === 0 && (
                <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center text-stone-400">
                  No products found
                </div>
              )}
              {menuProductsMeta.total > 0 && (
                <Pagination
                  currentPage={menuProductsMeta.page}
                  totalPages={menuProductsMeta.total_pages}
                  onPageChange={(page) => {
                    if (page >= 1 && page <= menuProductsMeta.total_pages) {
                      setMenuProductsPage(page);
                    }
                  }}
                  totalItems={menuProductsMeta.total}
                  pageSize={menuProductsMeta.limit}
                  className="rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/40"
                />
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const categoryParentOptions = (() => {
    const sorted = [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aName = getCategoryDisplayName(a);
      const bName = getCategoryDisplayName(b);
      return aName.localeCompare(bName);
    });

    const byId = new Map<string, Category>(sorted.map((item) => [item.id, item]));
    const children = new Map<string, Category[]>();
    const roots: Category[] = [];

    for (const category of sorted) {
      const parentId = category.parent_id;
      if (parentId && byId.has(parentId)) {
        const items = children.get(parentId) || [];
        items.push(category);
        children.set(parentId, items);
      } else {
        roots.push(category);
      }
    }

    const disallowedIds = new Set<string>();
    if (editingCategory) {
      const stack: string[] = [editingCategory.id];
      while (stack.length > 0) {
        const currentId = stack.pop();
        if (!currentId || disallowedIds.has(currentId)) continue;
        disallowedIds.add(currentId);
        for (const child of children.get(currentId) || []) {
          stack.push(child.id);
        }
      }
    }

    const result: Array<{ id: string; name: string; depth: number; parentLabel: string; productCount: number }> = [];
    const visited = new Set<string>();
    const walk = (nodes: Category[], depth: number) => {
      for (const node of nodes) {
        if (visited.has(node.id) || disallowedIds.has(node.id)) continue;
        visited.add(node.id);
        const parentCategory = node.parent_id ? byId.get(node.parent_id) : undefined;
        result.push({
          id: node.id,
          name: getCategoryDisplayName(node),
          depth,
          parentLabel: parentCategory ? `Parent: ${getCategoryDisplayName(parentCategory)}` : 'Top-level category',
          productCount: node.product_count,
        });
        walk(children.get(node.id) || [], depth + 1);
      }
    };

    walk(roots, 0);
    for (const category of sorted) {
      if (!visited.has(category.id) && !disallowedIds.has(category.id)) {
        result.push({
          id: category.id,
          name: getCategoryDisplayName(category),
          depth: 0,
          parentLabel: 'Top-level category',
          productCount: category.product_count,
        });
      }
    }

    return result;
  })();

  const categorySelectOptions = (() => {
    const sorted = [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aName = getCategoryDisplayName(a);
      const bName = getCategoryDisplayName(b);
      return aName.localeCompare(bName);
    });

    const byId = new Map<string, Category>(sorted.map((item) => [item.id, item]));
    const children = new Map<string, Category[]>();
    const roots: Category[] = [];

    for (const category of sorted) {
      const parentId = category.parent_id;
      if (parentId && byId.has(parentId)) {
        const items = children.get(parentId) || [];
        items.push(category);
        children.set(parentId, items);
      } else {
        roots.push(category);
      }
    }

    const result: Array<{ id: string; name: string; depth: number; parentLabel: string; productCount: number }> = [];
    const visited = new Set<string>();
    const walk = (nodes: Category[], depth: number) => {
      for (const node of nodes) {
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        const parentCategory = node.parent_id ? byId.get(node.parent_id) : undefined;
        result.push({
          id: node.id,
          name: getCategoryDisplayName(node),
          depth,
          parentLabel: parentCategory ? `Parent: ${getCategoryDisplayName(parentCategory)}` : 'Top-level category',
          productCount: node.product_count,
        });
        walk(children.get(node.id) || [], depth + 1);
      }
    };

    walk(roots, 0);
    for (const category of sorted) {
      if (!visited.has(category.id)) {
        result.push({
          id: category.id,
          name: getCategoryDisplayName(category),
          depth: 0,
          parentLabel: 'Top-level category',
          productCount: category.product_count,
        });
      }
    }

    return result;
  })();

  return (
    <div className="h-screen bg-stone-50 dark:bg-stone-950 flex text-stone-900 dark:text-stone-100 overflow-x-hidden">
      {!isDesktop && isSidebarOpen && (
        <button
          className="fixed inset-0 z-10 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`${isDesktop ? 'relative' : 'fixed inset-y-0 left-0'} z-50 h-screen transition-all duration-300 bg-white border-r border-stone-200 flex flex-col overflow-hidden`}
        style={{ width: isSidebarOpen ? 288 : (isDesktop ? 84 : 0), height: '100vh' }}
      >
        <div className="p-5 h-20 flex items-center shrink-0">
          {isSidebarOpen ? (
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <BrandIcon size={44} />
              SUSHI MEI
            </h1>
          ) : (
            <span className="mx-auto">
              <BrandIcon size={42} />
            </span>
          )}
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'orders', icon: ShoppingBag, label: 'Live Orders' },
            { id: 'customers', icon: Users, label: 'Customers' },
            { id: 'promo', icon: Ticket, label: 'Promo Codes' },
            { id: 'bonus', icon: Gift, label: 'Bonus Rules' },
            { id: 'menu', icon: LayoutGrid, label: 'Menu Mgmt' },
            { id: 'spots', icon: MapPin, label: 'Spots/Branches' },
            { id: 'employees', icon: Briefcase, label: 'Employees' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                if (!isDesktop) setIsSidebarOpen(false);
              }}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all group ${
                activeView === item.id 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
              style={{
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                width: isSidebarOpen ? '100%' : 56,
                marginLeft: isSidebarOpen ? 0 : 'auto',
                marginRight: isSidebarOpen ? 0 : 'auto',
                paddingLeft: isSidebarOpen ? 16 : 0,
                paddingRight: isSidebarOpen ? 16 : 0,
              }}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeView === item.id ? 'text-white' : 'text-stone-400'}`} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto shrink-0">
          <button
            className="h-12 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 hover:text-red-600 transition-colors"
            onClick={logout}
            style={{
              width: isSidebarOpen ? '100%' : 56,
              marginLeft: isSidebarOpen ? 0 : 'auto',
              marginRight: isSidebarOpen ? 0 : 'auto',
            }}
          >
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-stone-200/50 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 border border-stone-100 dark:border-stone-800" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
               <LayoutGrid className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <SystemClock />
            {loading && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-stone-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                Syncing
              </div>
            )}
            <div className="flex items-center gap-4 pl-2 cursor-pointer group" onClick={openAdminProfileSidebar}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black tracking-tight group-hover:text-red-600 transition-colors">
                  {currentUserLabel}
                </p>
                <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest mt-0.5">
                  {user?.role ? user.role.replace(/_/g, ' ') : 'ADMIN'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-[1.2rem] bg-stone-100 dark:bg-stone-800 overflow-hidden border-2 border-transparent group-hover:border-red-600/30 transition-all shadow-sm flex items-center justify-center text-stone-600 dark:text-stone-300 font-black">
                {adminAvatar ? (
                  <ImageWithFallback src={adminAvatar} alt={currentUserLabel} className="h-full w-full object-cover" />
                ) : (
                  currentUserInitial
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide bg-stone-50/50 dark:bg-stone-950/50">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <span>Network issue: {errorMessage}</span>
              <Button type="button" variant="outline" className="h-9 rounded-xl border-red-300/70 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/15" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </div>
          )}
          <div key={activeView} ref={activeViewRef}>
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'orders' && renderOrders()}
            {activeView === 'customers' && renderCustomers()}
            {activeView === 'promo' && renderPromoCodes()}
            {activeView === 'bonus' && renderBonusRules()}
            {activeView === 'menu' && renderMenu()}
            {activeView === 'spots' && renderSpots()}
            {activeView === 'employees' && renderEmployees()}
          </div>
        </div>
      </main>

      {isAdminProfileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2100 }}
            onClick={closeAdminProfileSidebar}
          />
          <aside
            className="fixed top-0 right-0 h-full w-full md:w-[640px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col"
            style={{ zIndex: 2110 }}
          >
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-tighter">Admin Profile</h3>
                <p className="text-sm text-stone-500 mt-1">Manage avatar, login credentials, and admin access.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-2xl h-11 w-11" onClick={closeAdminProfileSidebar}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-stone-400">Avatar</h4>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-[1.2rem] overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/60 shrink-0 flex items-center justify-center text-xl font-black text-stone-500">
                    {adminAvatar ? (
                      <ImageWithFallback src={adminAvatar} alt={currentUserLabel} className="h-full w-full object-cover" />
                    ) : (
                      currentUserInitial
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={adminAvatarDraft}
                        onChange={(event) => setAdminAvatarDraft(event.target.value)}
                        onPaste={handleAdminAvatarPaste}
                        placeholder="Paste image URL or paste image from clipboard"
                      />
                      <Button type="button" variant="outline" className="rounded-xl" onClick={applyAdminAvatarFromDraft}>
                        Save
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={adminAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleAdminAvatarFile(file);
                          }
                          event.currentTarget.value = '';
                        }}
                      />
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => adminAvatarInputRef.current?.click()}>
                        Upload Avatar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => {
                          setAdminAvatar(null);
                          setAdminAvatarDraft('');
                          updateAdminProfileMutation.mutate(
                            { avatar_url: '' },
                            {
                              onSuccess: () => {
                                setAdminProfileError(null);
                                setAdminProfileSuccess('Avatar removed from database.');
                              },
                            },
                          );
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-stone-400">Login & Password</h4>
                {adminProfileQuery.isPending && (
                  <p className="text-sm text-stone-500">Loading admin profile...</p>
                )}
                <form
                  key={adminProfile ? `${adminProfile.id}:${adminProfile.email}:${adminProfile.first_name ?? ''}:${adminProfile.last_name ?? ''}:${adminProfile.phone ?? ''}` : `user:${user?.id ?? 'anonymous'}`}
                  className="space-y-4"
                  onSubmit={handleAdminProfileSubmit}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_first_name">First Name</Label>
                      <Input id="admin_profile_first_name" name="first_name" defaultValue={adminProfile?.first_name ?? user?.firstName ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_last_name">Last Name</Label>
                      <Input id="admin_profile_last_name" name="last_name" defaultValue={adminProfile?.last_name ?? user?.lastName ?? ''} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_email">Login Email</Label>
                      <Input id="admin_profile_email" name="email" type="email" defaultValue={adminProfile?.email ?? user?.email ?? ''} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_phone">Phone</Label>
                      <Input id="admin_profile_phone" name="phone" defaultValue={adminProfile?.phone ?? ''} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_new_password">New Password</Label>
                      <Input id="admin_profile_new_password" name="new_password" type="password" placeholder="Leave blank to keep current" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_profile_confirm_password">Confirm Password</Label>
                      <Input id="admin_profile_confirm_password" name="confirm_password" type="password" placeholder="Repeat new password" />
                    </div>
                  </div>
                  {adminProfileError && (
                    <p className="text-sm font-semibold text-red-600">{adminProfileError}</p>
                  )}
                  {adminProfileSuccess && (
                    <p className="text-sm font-semibold text-emerald-600">{adminProfileSuccess}</p>
                  )}
                  <Button type="submit" className="h-12 rounded-2xl px-6" disabled={updateAdminProfileMutation.isPending}>
                    {updateAdminProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </form>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-stone-400">Add Another Admin</h4>
                <form className="space-y-4" onSubmit={handleCreateAdminSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_admin_first_name">First Name</Label>
                      <Input id="new_admin_first_name" name="first_name" placeholder="Aiko" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_admin_last_name">Last Name</Label>
                      <Input id="new_admin_last_name" name="last_name" placeholder="Tanaka" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_admin_email">Admin Email</Label>
                      <Input id="new_admin_email" name="email" type="email" placeholder="admin@sushimei.uz" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_admin_phone">Phone</Label>
                      <Input id="new_admin_phone" name="phone" placeholder="+998..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_admin_password">Password</Label>
                    <Input id="new_admin_password" name="password" type="password" placeholder="At least 6 characters" required />
                  </div>
                  {addAdminError && (
                    <p className="text-sm font-semibold text-red-600">{addAdminError}</p>
                  )}
                  {addAdminSuccess && (
                    <p className="text-sm font-semibold text-emerald-600">{addAdminSuccess}</p>
                  )}
                  <Button type="submit" className="h-12 rounded-2xl px-6" disabled={createAdminFromProfileMutation.isPending}>
                    {createAdminFromProfileMutation.isPending ? 'Creating...' : 'Create Admin'}
                  </Button>
                </form>
              </section>
            </div>
          </aside>
        </>
      )}

      {/* Customer Create/Edit Sidebar */}
      {isCustomerSidebarOpen && (
        <>
          <div
            ref={customerSidebarBackdropRef}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2000 }}
            onClick={closeCustomerEditor}
          />
          <div
            ref={customerSidebarPanelRef}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col transform-gpu [will-change:transform]"
            style={{ zIndex: 2010 }}
          >
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black tracking-tighter">
                  {customerSidebarMode === 'edit' ? 'Edit Customer' : 'Add Customer'}
                </h3>
                <p className="text-stone-500 text-sm mt-1">
                  {customerSidebarMode === 'edit' ? 'Update customer profile details.' : 'Create a new customer profile for manual onboarding.'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={closeCustomerEditor}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form
              id="customer-sidebar-form"
              className="admin-editor-form flex-1 min-h-0 overflow-y-auto p-8 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                const rawStatus = String(formData.get('status') || 'ACTIVE');
                const rawBonus = parseInt(String(formData.get('bonus_balance') || '0'), 10);
                const phone = String(formData.get('phone') || '').trim();
                const languageCode = customerSidebarMode === 'edit' ? editingCustomer?.language_code ?? 'en' : 'en';
                const marketingOptIn = customerSidebarMode === 'edit' ? editingCustomer?.marketing_opt_in ?? false : false;

                if (!phone) {
                  setCustomerCreateError('Phone is required');
                  return;
                }

                const data = {
                  phone,
                  first_name: String(formData.get('first_name') || '').trim() || undefined,
                  last_name: String(formData.get('last_name') || '').trim() || undefined,
                  email: String(formData.get('email') || '').trim() || undefined,
                  status: (rawStatus === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE') as 'ACTIVE' | 'BLOCKED',
                  language_code: languageCode,
                  bonus_balance: Number.isNaN(rawBonus) ? 0 : Math.max(rawBonus, 0),
                  marketing_opt_in: marketingOptIn,
                };

                if (customerSidebarMode === 'edit' && editingCustomer) {
                  updateCustomerMutation.mutate({ id: editingCustomer.id, data });
                  return;
                }

                createCustomerMutation.mutate(data);
              }}
            >
              {customerCreateError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {customerCreateError}
                </div>
              )}
              <section className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Basic Info</h4>
                  <p className="text-xs text-stone-500">Core profile information used for identity and communication.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_customer_first_name">First Name</Label>
                    <Input id="sidebar_customer_first_name" name="first_name" defaultValue={editingCustomer?.first_name ?? ''} placeholder="Akiko" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_customer_last_name">Last Name</Label>
                    <Input id="sidebar_customer_last_name" name="last_name" defaultValue={editingCustomer?.last_name ?? ''} placeholder="Nakamura" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_customer_phone">Phone</Label>
                    <Input id="sidebar_customer_phone" name="phone" defaultValue={editingCustomer?.phone ?? ''} placeholder="+81-90-0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_customer_email">Email</Label>
                    <Input id="sidebar_customer_email" name="email" type="email" defaultValue={editingCustomer?.email ?? ''} placeholder="guest@example.com" />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200/70 dark:border-stone-800 p-5 space-y-4 bg-stone-50/60 dark:bg-stone-900/40">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Account</h4>
                  <p className="text-xs text-stone-500">Controls account availability and loyalty balance.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <AdminFormSelect
                      id="sidebar_customer_status"
                      label="Status"
                      name="status"
                      value={customerStatusDraft}
                      onChange={(value) => setCustomerStatusDraft((value === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE'))}
                      options={[
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'BLOCKED', label: 'Blocked' },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_customer_bonus_balance">Bonus Balance</Label>
                    <Input
                      id="sidebar_customer_bonus_balance"
                      name="bonus_balance"
                      type="number"
                      min="0"
                      defaultValue={editingCustomer ? Math.floor(editingCustomer.bonus_balance) : 0}
                    />
                  </div>
                </div>
              </section>
            </form>
            <div className="mt-auto p-8 border-t border-stone-100 dark:border-stone-800 flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeCustomerEditor}>Cancel</Button>
              <Button
                type="submit"
                form="customer-sidebar-form"
                className="flex-1 h-12 rounded-2xl"
                disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
              >
                {(createCustomerMutation.isPending || updateCustomerMutation.isPending)
                  ? 'Saving...'
                  : customerSidebarMode === 'edit' ? 'Update Customer' : 'Create Customer'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Employee Sidebar */}
      {isEmployeeSidebarOpen && (
        <>
          <div
            ref={employeeSidebarBackdropRef}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2000 }}
            onClick={closeEmployeeSidebar}
          />
          <div
            ref={employeeSidebarPanelRef}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col transform-gpu [will-change:transform]"
            style={{ zIndex: 2010 }}
          >
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black tracking-tighter">
                  {employeeSidebarMode === 'detail' ? 'Employee Detail' : employeeSidebarMode === 'edit' ? 'Edit Employee' : 'Add Employee'}
                </h3>
                <p className="text-stone-500 text-sm mt-1">
                  {employeeSidebarMode === 'detail'
                    ? 'Review employee profile and account status.'
                    : employeeSidebarMode === 'edit'
                      ? 'Update employee details and access.'
                      : 'Create a new employee profile.'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={closeEmployeeSidebar}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {employeeSidebarMode === 'detail' && selectedEmployee ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-8">
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-lg font-black">{getEmployeeName(selectedEmployee)}</p>
                    <p className="text-sm text-stone-500">{selectedEmployee.email}</p>
                    {selectedEmployee.phone && <p className="text-sm text-stone-500">{selectedEmployee.phone}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Role</p>
                      <p className="text-sm font-bold">{selectedEmployee.role_title}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Status</p>
                      <p className="text-sm font-bold">{selectedEmployee.status}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Branch</p>
                      <p className="text-sm font-bold">{selectedEmployee.spot_name || 'Headquarters'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-auto p-8 border-t border-stone-100 dark:border-stone-800">
                  <Button className="w-full h-12 rounded-2xl" onClick={() => openEmployeeEditSidebar(selectedEmployee)}>
                    Edit Employee
                  </Button>
                </div>
              </>
            ) : (
              <>
              <form
                id="employee-sidebar-form"
                className="admin-editor-form flex-1 min-h-0 overflow-y-auto p-8 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    email: String(formData.get('email') || '').trim(),
                    password: String(formData.get('password') || '').trim() || undefined,
                    first_name: String(formData.get('first_name') || '').trim() || undefined,
                    last_name: String(formData.get('last_name') || '').trim() || undefined,
                    phone: String(formData.get('phone') || '').trim() || undefined,
                    role_code: String(formData.get('role_code') || 'operator'),
                    spot_id: String(formData.get('spot_id') || '').trim() || undefined,
                  };

                  if (!data.email) {
                    setEmployeeFormError('Email is required');
                    return;
                  }
                  if (employeeSidebarMode === 'create' && !data.password) {
                    setEmployeeFormError('Password is required for new employees');
                    return;
                  }

                  setEmployeeFormError(null);

                  if (employeeSidebarMode === 'edit' && editingEmployee) {
                    const { password, ...updateData } = data;
                    updateEmployeeMutation.mutate({ id: editingEmployee.id, data: password ? data : updateData });
                    return;
                  }

                  createEmployeeMutation.mutate(data as { role_code: string; email: string; password: string });
                }}
              >
                {employeeFormError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {employeeFormError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_employee_first_name">First Name</Label>
                    <Input id="sidebar_employee_first_name" name="first_name" defaultValue={editingEmployee?.first_name ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_employee_last_name">Last Name</Label>
                    <Input id="sidebar_employee_last_name" name="last_name" defaultValue={editingEmployee?.last_name ?? ''} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebar_employee_email">Email</Label>
                  <Input id="sidebar_employee_email" name="email" type="email" defaultValue={editingEmployee?.email ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebar_employee_password">{employeeSidebarMode === 'edit' ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
                  <Input id="sidebar_employee_password" name="password" type="password" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_employee_phone">Phone</Label>
                    <Input id="sidebar_employee_phone" name="phone" defaultValue={editingEmployee?.phone ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_employee_role_code">Role</Label>
                    <select
                      id="sidebar_employee_role_code"
                      name="role_code"
                      defaultValue={editingEmployee?.role_code || 'operator'}
                      className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sidebar_employee_spot_id">Branch</Label>
                  <select
                    id="sidebar_employee_spot_id"
                    name="spot_id"
                    defaultValue={editingEmployee?.spot_id ?? ''}
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950"
                  >
                    <option value="">Headquarters (No Branch)</option>
                    {spots.map((spot) => (
                      <option key={spot.id} value={spot.id}>{spot.name}</option>
                    ))}
                  </select>
                </div>
              </form>
              <div className="mt-auto p-8 border-t border-stone-100 dark:border-stone-800 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeEmployeeSidebar}>Cancel</Button>
                <Button
                  type="submit"
                  form="employee-sidebar-form"
                  className="flex-1 h-12 rounded-2xl"
                  disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                >
                  {(createEmployeeMutation.isPending || updateEmployeeMutation.isPending)
                    ? 'Saving...'
                    : employeeSidebarMode === 'edit' ? 'Update Employee' : 'Create Employee'}
                </Button>
              </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Customer Detail Panel */}
      {selectedCustomer && !isCustomerSidebarOpen && (
        <>
          <div
            ref={detailBackdropRef}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2000 }}
            onClick={closeCustomerDetail}
          />
          <div
            ref={detailPanelRef}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col transform-gpu [will-change:transform]"
            style={{ zIndex: 2010 }}
          >
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-black text-stone-500">
                  {(selectedCustomerName[0]?.toUpperCase() || '?')}
                </div>
                <div>
                  {selectedCustomer.bonus_balance >= 5000 && (
                    <Badge variant="info" className="mb-2">VIP Member</Badge>
                  )}
                  <h3 className="text-2xl font-black tracking-tighter">{selectedCustomerName}</h3>
                  <p className="text-stone-500 text-sm">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && <p className="text-stone-400 text-sm">{selectedCustomer.email}</p>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={closeCustomerDetail}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Status</p>
                  <p className="text-3xl font-black tracking-tight leading-none">{selectedCustomer.status}</p>
                </div>
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Bonus</p>
                  <p className="text-3xl font-black tracking-tight leading-none text-red-600">{Math.floor(selectedCustomer.bonus_balance)}</p>
                </div>
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Language</p>
                  <p className="text-3xl font-black tracking-tight leading-none">{(selectedCustomer.language_code || 'en').toUpperCase()}</p>
                </div>
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Marketing</p>
                  <p className="text-3xl font-black tracking-tight leading-none">
                    {selectedCustomer.marketing_opt_in ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">First Name</p>
                    <p className="text-sm font-bold">{selectedCustomer.first_name || '-'}</p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Last Name</p>
                    <p className="text-sm font-bold">{selectedCustomer.last_name || '-'}</p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Phone</p>
                    <p className="text-sm font-bold">{selectedCustomer.phone}</p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Email</p>
                    <p className="text-sm font-bold break-all">{selectedCustomer.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Account Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Joined</p>
                    <p className="text-sm font-bold">{formatDate(selectedCustomer.created_at)}</p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Last Login</p>
                    <p className="text-sm font-bold">
                      {selectedCustomer.last_login_at ? formatDate(selectedCustomer.last_login_at) : 'Never'}
                    </p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Total Orders</p>
                    <p className="text-sm font-bold">{selectedCustomer.total_orders ?? 0}</p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Last Order</p>
                    <p className="text-sm font-bold">
                      {selectedCustomer.last_order_at ? formatDate(selectedCustomer.last_order_at) : 'No orders yet'}
                    </p>
                  </div>
                  <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Customer ID</p>
                    <p className="text-xs font-mono font-bold break-all">{selectedCustomer.id}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto p-8 border-t border-stone-100 dark:border-stone-800">
              <Button
                className="w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-widest"
                onClick={() => openCustomerEditSidebar(selectedCustomer)}
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Order Detail Panel */}
      {selectedOrder && (
        <>
          <div
            ref={orderDetailBackdropRef}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 2000 }}
            onClick={closeOrderDetail}
          />
          <div
            ref={orderDetailPanelRef}
            className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-stone-950 shadow-2xl flex flex-col transform-gpu [will-change:transform]"
            style={{ zIndex: 2010 }}
          >
            <div className="p-8 border-b border-stone-100 dark:border-stone-800 flex justify-between items-start">
              <div>
                <Badge variant={getOrderStatusDisplay(selectedOrder.status).variant} className="mb-2">
                  {getOrderStatusDisplay(selectedOrder.status).label}
                </Badge>
                <h3 className="text-2xl font-black tracking-tighter">Order #{selectedOrder.order_number}</h3>
                <p className="text-stone-500 text-sm">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={closeOrderDetail}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Customer Information</h4>
                <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-2xl space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-black text-stone-500">
                      {(selectedOrder.customer_name || 'G')[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-black">{selectedOrder.customer_name || 'Guest Customer'}</p>
                      <p className="text-sm text-stone-500">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Order Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Order Type</p>
                    <p className="text-sm font-bold">{selectedOrder.order_type}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Payment</p>
                    <p className="text-sm font-bold">{selectedOrder.payment_type}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Branch</p>
                    <p className="text-sm font-bold">{selectedOrder.spot_name}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Total Amount</p>
                    <p className="text-lg font-black text-red-600">{formatPrice(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">
                  {isOrderDetailEditable ? 'Update Status' : 'Status (Read Only)'}
                </h4>
                {!isOrderDetailEditable && (
                  <div className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                    Open with Edit action to change order status.
                  </div>
                )}
                {orderActionError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {orderActionError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {ORDER_PROGRESS_STATUSES.map((status) => (
                    <Button
                      key={status}
                      variant={selectedOrder.status === status ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl text-[10px] font-bold"
                      disabled={!isOrderDetailEditable || updateOrderStatusMutation.isPending || !canTransitionOrderStatus(selectedOrder.status, status)}
                      onClick={() => {
                        if (!isOrderDetailEditable) return;
                        if (!canTransitionOrderStatus(selectedOrder.status, status)) return;
                        updateOrderStatusMutation.mutate({ id: selectedOrder.id, status });
                      }}
                    >
                      {getOrderStatusDisplay(status).label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!isOrderDetailEditable || updateOrderStatusMutation.isPending || !canTransitionOrderStatus(selectedOrder.status, 'CANCELLED')}
                    onClick={() => {
                      if (!isOrderDetailEditable) return;
                      if (!canTransitionOrderStatus(selectedOrder.status, 'CANCELLED')) return;
                      const reason = window.prompt('Enter cancellation reason:');
                      if (reason) {
                        updateOrderStatusMutation.mutate({ id: selectedOrder.id, status: 'CANCELLED', reason });
                      }
                    }}
                  >
                    Cancel Order
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!isOrderDetailEditable || updateOrderStatusMutation.isPending || !canTransitionOrderStatus(selectedOrder.status, 'REJECTED')}
                    onClick={() => {
                      if (!isOrderDetailEditable) return;
                      if (!canTransitionOrderStatus(selectedOrder.status, 'REJECTED')) return;
                      const reason = window.prompt('Enter rejection reason:');
                      if (reason) {
                        updateOrderStatusMutation.mutate({ id: selectedOrder.id, status: 'REJECTED', reason });
                      }
                    }}
                  >
                    Reject Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Promo Code Sidebar */}
      <EditorSidebar
        open={isPromoModalOpen}
        onClose={closePromoEditor}
        title={editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
        description={editingPromo ? 'Update the promo code details below.' : 'Fill in the details to create a new promo code.'}
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closePromoEditor}>Cancel</Button>
            <Button
              type="submit"
              form="promo-sidebar-form"
              className="flex-1 h-12 rounded-2xl"
              disabled={createPromoMutation.isPending || updatePromoMutation.isPending}
            >
              {(createPromoMutation.isPending || updatePromoMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <form
          id="promo-sidebar-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const code = String(formData.get('code') || '').trim().toUpperCase();
            const title = String(formData.get('title') || '').trim();
            const description = String(formData.get('description') || '').trim();
            const rewardType = String(formData.get('reward_type') || 'DISCOUNT') as PromoCode['reward_type'];
            const appliesTo = String(formData.get('applies_to') || 'ORDER') as PromoCode['applies_to'];
            const discountValueRaw = String(formData.get('discount_value') || '').trim();
            const discountValue = discountValueRaw === '' ? 0 : parseFloat(discountValueRaw);
            const minOrderAmountRaw = String(formData.get('min_order_amount') || '').trim();
            const maxDiscountAmountRaw = String(formData.get('max_discount_amount') || '').trim();
            const totalUsageLimitRaw = String(formData.get('total_usage_limit') || '').trim();
            const perUserUsageLimitRaw = String(formData.get('per_user_usage_limit') || '').trim();
            const validFromRaw = String(formData.get('valid_from') || '').trim();
            const validToRaw = String(formData.get('valid_to') || '').trim();
            const bonusPointsRaw = String(formData.get('bonus_points') || '').trim();
            const bonusProductID = String(formData.get('bonus_product_id') || '').trim();
            const bonusProductQuantityRaw = String(formData.get('bonus_product_quantity') || '').trim();
            const categoryIDs = formData.getAll('category_ids').map(String).filter(Boolean);
            const productIDs = formData.getAll('product_ids').map(String).filter(Boolean);
            const spotIDs = formData.getAll('spot_ids').map(String).filter(Boolean);

            if (!code) {
              setPromoFormError('Promo code is required');
              return;
            }

            if (!title) {
              setPromoFormError('Promo title is required');
              return;
            }

            const parsedMinOrderAmount = minOrderAmountRaw === '' ? null : Number.parseFloat(minOrderAmountRaw);
            if (parsedMinOrderAmount !== null && (!Number.isFinite(parsedMinOrderAmount) || parsedMinOrderAmount < 0)) {
              setPromoFormError('Min. order amount must be a valid non-negative number');
              return;
            }
            const parsedMaxDiscountAmount = maxDiscountAmountRaw === '' ? null : Number.parseFloat(maxDiscountAmountRaw);
            if (parsedMaxDiscountAmount !== null && (!Number.isFinite(parsedMaxDiscountAmount) || parsedMaxDiscountAmount < 0)) {
              setPromoFormError('Max discount amount must be a valid non-negative number');
              return;
            }

            const parsedTotalUsageLimit = totalUsageLimitRaw === '' ? null : Number.parseInt(totalUsageLimitRaw, 10);
            if (parsedTotalUsageLimit !== null && (!Number.isInteger(parsedTotalUsageLimit) || parsedTotalUsageLimit <= 0)) {
              setPromoFormError('Usage limit must be a valid positive integer');
              return;
            }
            const parsedPerUserUsageLimit = perUserUsageLimitRaw === '' ? null : Number.parseInt(perUserUsageLimitRaw, 10);
            if (parsedPerUserUsageLimit !== null && (!Number.isInteger(parsedPerUserUsageLimit) || parsedPerUserUsageLimit <= 0)) {
              setPromoFormError('Per-user limit must be a valid positive integer');
              return;
            }
            const parsedBonusPoints = bonusPointsRaw === '' ? null : Number.parseInt(bonusPointsRaw, 10);
            if (parsedBonusPoints !== null && (!Number.isInteger(parsedBonusPoints) || parsedBonusPoints <= 0)) {
              setPromoFormError('Bonus points must be a valid positive integer');
              return;
            }
            const parsedBonusProductQuantity = bonusProductQuantityRaw === '' ? 1 : Number.parseInt(bonusProductQuantityRaw, 10);
            if (!Number.isInteger(parsedBonusProductQuantity) || parsedBonusProductQuantity <= 0) {
              setPromoFormError('Bonus product quantity must be a valid positive integer');
              return;
            }

            if (rewardType === 'DISCOUNT') {
              if (!Number.isFinite(discountValue) || discountValue <= 0) {
                setPromoFormError('Discount value must be greater than 0');
                return;
              }
              if (appliesTo === 'PRODUCT' && categoryIDs.length === 0 && productIDs.length === 0) {
                setPromoFormError('Product discount requires at least one target product or category');
                return;
              }
            }
            if (rewardType === 'BONUS_POINTS' && parsedBonusPoints === null) {
              setPromoFormError('Bonus points reward requires bonus points value');
              return;
            }
            if (rewardType === 'BONUS_PRODUCT' && !bonusProductID) {
              setPromoFormError('Bonus product reward requires a selected product');
              return;
            }

            const data: Partial<PromoCode> = {
              code,
              title_i18n: { en: title },
              description_i18n: description ? { en: description } : {},
              reward_type: rewardType,
              applies_to: rewardType === 'DISCOUNT' ? appliesTo : 'ORDER',
              discount_type: formData.get('discount_type') as 'FIXED' | 'PERCENT',
              discount_value: discountValue,
              min_order_amount: parsedMinOrderAmount,
              max_discount_amount: parsedMaxDiscountAmount,
              bonus_points: parsedBonusPoints,
              bonus_product_id: bonusProductID || null,
              bonus_product_quantity: parsedBonusProductQuantity,
              category_ids: categoryIDs,
              product_ids: productIDs,
              spot_ids: spotIDs,
              total_usage_limit: parsedTotalUsageLimit,
              per_user_usage_limit: parsedPerUserUsageLimit,
              valid_from: validFromRaw ? `${validFromRaw}T00:00:00Z` : null,
              valid_to: validToRaw ? `${validToRaw}T23:59:59Z` : null,
              is_active: formData.get('is_active') === 'on',
            };

            if (editingPromo) {
              updatePromoMutation.mutate({ id: editingPromo.id, data });
            } else {
              createPromoMutation.mutate(data);
            }
          }}
          className="admin-editor-form space-y-6"
        >
          {promoFormError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {promoFormError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo_title">Title</Label>
              <Input
                id="promo_title"
                name="title"
                defaultValue={editingPromo?.title_i18n?.en ?? ''}
                required
                placeholder="Summer Discount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" defaultValue={editingPromo?.code} required placeholder="SUMMER20" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="promo_description">Description</Label>
            <Input
              id="promo_description"
              name="description"
              defaultValue={editingPromo?.description_i18n?.en ?? ''}
              placeholder="Optional campaign description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormSelect
              id="reward_type"
              label="Reward Type"
              name="reward_type"
              value={promoRewardTypeDraft}
              onChange={(value) => setPromoRewardTypeDraft(value as PromoCode['reward_type'])}
              options={[
                { value: 'DISCOUNT', label: 'Discount' },
                { value: 'BONUS_POINTS', label: 'Bonus Points' },
                { value: 'BONUS_PRODUCT', label: 'Bonus Product' },
              ]}
              placeholder="Select reward type"
            />
            <AdminFormSelect
              id="applies_to"
              label="Applies To"
              name="applies_to"
              value={promoAppliesToDraft}
              onChange={(value) => setPromoAppliesToDraft(value as PromoCode['applies_to'])}
              options={[
                { value: 'ORDER', label: 'Whole Order' },
                { value: 'PRODUCT', label: 'Selected Products' },
              ]}
              placeholder="Select scope"
              disabled={promoRewardTypeDraft !== 'DISCOUNT'}
            />
          </div>
          {promoRewardTypeDraft === 'DISCOUNT' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormSelect
                  id="discount_type"
                  label="Discount Type"
                  name="discount_type"
                  value={promoDiscountTypeDraft}
                  onChange={(value) => setPromoDiscountTypeDraft(value as 'FIXED' | 'PERCENT')}
                  options={[
                    { value: 'PERCENT', label: 'Percentage' },
                    { value: 'FIXED', label: 'Fixed Amount' },
                  ]}
                  placeholder="Select discount type"
                />
                <div className="space-y-2">
                  <Label htmlFor="discount_value">Discount Value</Label>
                  <Input id="discount_value" name="discount_value" type="number" step="0.01" defaultValue={editingPromo?.discount_value} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_discount_amount">Max Discount Amount</Label>
                  <Input id="max_discount_amount" name="max_discount_amount" type="number" step="0.01" defaultValue={editingPromo?.max_discount_amount ?? ''} placeholder="Optional cap" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_order_amount">Min. Order Amount</Label>
                  <Input id="min_order_amount" name="min_order_amount" type="number" step="0.01" defaultValue={editingPromo?.min_order_amount ?? ''} />
                </div>
              </div>
            </>
          )}
          {promoRewardTypeDraft === 'BONUS_POINTS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bonus_points">Bonus Points</Label>
                <Input id="bonus_points" name="bonus_points" type="number" min="1" defaultValue={editingPromo?.bonus_points ?? ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_order_amount">Min. Order Amount</Label>
                <Input id="min_order_amount" name="min_order_amount" type="number" step="0.01" defaultValue={editingPromo?.min_order_amount ?? ''} />
              </div>
            </div>
          )}
          {promoRewardTypeDraft === 'BONUS_PRODUCT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminFormSelect
                id="bonus_product_id"
                label="Bonus Product"
                name="bonus_product_id"
                value={promoBonusProductIdDraft}
                onChange={setPromoBonusProductIdDraft}
                options={products.map((product) => ({
                  value: product.id,
                  label: product.name_i18n['en'] || product.category_name,
                }))}
                placeholder="Select product"
              />
              <div className="space-y-2">
                <Label htmlFor="bonus_product_quantity">Bonus Quantity</Label>
                <Input id="bonus_product_quantity" name="bonus_product_quantity" type="number" min="1" defaultValue={editingPromo?.bonus_product_quantity ?? 1} required />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_usage_limit">Usage Limit</Label>
              <Input id="total_usage_limit" name="total_usage_limit" type="number" defaultValue={editingPromo?.total_usage_limit ?? ''} placeholder="Unlimited" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="per_user_usage_limit">Per-User Limit</Label>
              <Input id="per_user_usage_limit" name="per_user_usage_limit" type="number" defaultValue={editingPromo?.per_user_usage_limit ?? ''} placeholder="Unlimited" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From</Label>
              <Input id="valid_from" name="valid_from" type="date" defaultValue={editingPromo?.valid_from?.split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_to">Valid To</Label>
              <Input id="valid_to" name="valid_to" type="date" defaultValue={editingPromo?.valid_to?.split('T')[0]} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PromoMultiSelectField
              label="Branches"
              name="spot_ids"
              placeholder="Choose branches"
              options={spots.map((spot) => ({ value: spot.id, label: spot.name }))}
              values={promoSpotIdsDraft}
              onChange={setPromoSpotIdsDraft}
            />
            <PromoMultiSelectField
              label="Target Categories"
              name="category_ids"
              placeholder="Choose categories"
              options={categories.map((category) => ({
                value: category.id,
                label: category.name_i18n['en'] || category.slug,
              }))}
              values={promoCategoryIdsDraft}
              onChange={setPromoCategoryIdsDraft}
            />
          </div>
          <PromoMultiSelectField
            label="Target Products"
            name="product_ids"
            placeholder="Choose products"
            options={products.map((product) => ({
              value: product.id,
              label: product.name_i18n['en'] || product.category_name,
            }))}
            values={promoProductIdsDraft}
            onChange={setPromoProductIdsDraft}
          />
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-4">
            <input type="checkbox" id="is_active" name="is_active" defaultChecked={editingPromo?.is_active ?? true} className="h-4 w-4" />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </form>
      </EditorSidebar>

      {/* Bonus Rule Sidebar */}
      <EditorSidebar
        open={isBonusRuleModalOpen}
        onClose={closeBonusRuleEditor}
        title={editingBonusRule ? 'Edit Bonus Rule' : 'Add Bonus Rule'}
        description="Configure loyalty earning and redemption behavior."
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeBonusRuleEditor}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="bonus-rule-sidebar-form"
              className="flex-1 h-12 rounded-2xl"
              disabled={createBonusRuleMutation.isPending || updateBonusRuleMutation.isPending}
            >
              {(createBonusRuleMutation.isPending || updateBonusRuleMutation.isPending) ? 'Saving...' : 'Save Rule'}
            </Button>
          </>
        }
      >
        <form
          id="bonus-rule-sidebar-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            const earnPercent = Number.parseFloat(String(formData.get('earn_percent') || '0'));
            const spendRate = Number.parseFloat(String(formData.get('spend_rate') || '0'));
            const minOrderToEarn = Number.parseFloat(String(formData.get('min_order_to_earn') || '0'));
            const maxSpendPercent = Number.parseFloat(String(formData.get('max_spend_percent') || '0'));
            const expiresInDaysRaw = String(formData.get('expires_in_days') || '').trim();
            const expiresInDays = expiresInDaysRaw === '' ? null : Number.parseInt(expiresInDaysRaw, 10);

            if (!Number.isFinite(earnPercent) || earnPercent < 0 || earnPercent > 100) {
              setBonusRuleFormError('Earn percent must be between 0 and 100');
              return;
            }
            if (!Number.isFinite(spendRate) || spendRate <= 0) {
              setBonusRuleFormError('Spend rate must be greater than 0');
              return;
            }
            if (!Number.isFinite(minOrderToEarn) || minOrderToEarn < 0) {
              setBonusRuleFormError('Min order to earn must be non-negative');
              return;
            }
            if (!Number.isFinite(maxSpendPercent) || maxSpendPercent <= 0 || maxSpendPercent > 100) {
              setBonusRuleFormError('Max spend percent must be between 0 and 100');
              return;
            }
            if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays <= 0)) {
              setBonusRuleFormError('Expires in days must be a positive integer');
              return;
            }

            const data: Partial<BonusRule> = {
              is_active: formData.get('is_active') === 'on',
              earn_percent: earnPercent,
              spend_rate: spendRate,
              min_order_to_earn: minOrderToEarn,
              max_spend_percent: maxSpendPercent,
              expires_in_days: expiresInDays,
            };

            if (editingBonusRule) {
              updateBonusRuleMutation.mutate({ id: editingBonusRule.id, data });
            } else {
              createBonusRuleMutation.mutate(data);
            }
          }}
          className="admin-editor-form space-y-6"
        >
          {bonusRuleFormError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {bonusRuleFormError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bonus_rule_earn_percent">Earn Percent</Label>
              <Input
                id="bonus_rule_earn_percent"
                name="earn_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={editingBonusRule?.earn_percent ?? 1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_rule_spend_rate">Spend Rate</Label>
              <Input
                id="bonus_rule_spend_rate"
                name="spend_rate"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={editingBonusRule?.spend_rate ?? 1}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bonus_rule_min_order_to_earn">Min Order To Earn</Label>
              <Input
                id="bonus_rule_min_order_to_earn"
                name="min_order_to_earn"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editingBonusRule?.min_order_to_earn ?? 0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_rule_max_spend_percent">Max Spend Percent</Label>
              <Input
                id="bonus_rule_max_spend_percent"
                name="max_spend_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={editingBonusRule?.max_spend_percent ?? 50}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bonus_rule_expires_in_days">Expires In Days</Label>
              <Input
                id="bonus_rule_expires_in_days"
                name="expires_in_days"
                type="number"
                min="1"
                defaultValue={editingBonusRule?.expires_in_days ?? ''}
                placeholder="Never expires"
              />
            </div>
            <div className="flex h-11 items-center gap-3 rounded-xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 sm:self-end">
              <input
                type="checkbox"
                id="bonus_rule_is_active"
                name="is_active"
                defaultChecked={editingBonusRule?.is_active ?? true}
                className="h-4 w-4"
              />
              <Label htmlFor="bonus_rule_is_active">Active</Label>
            </div>
          </div>
        </form>
      </EditorSidebar>

      {/* Spot/Branch Sidebar */}
      <EditorSidebar
        open={isSpotModalOpen}
        onClose={closeSpotEditor}
        title={editingSpot ? 'Edit Branch' : 'Add Branch'}
        description={editingSpot ? 'Update the branch details below.' : 'Fill in the details to add a new branch.'}
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeSpotEditor}>Cancel</Button>
            <Button
              type="submit"
              form="spot-sidebar-form"
              className="flex-1 h-12 rounded-2xl"
              disabled={createSpotMutation.isPending || updateSpotMutation.isPending}
            >
              {(createSpotMutation.isPending || updateSpotMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <form
          id="spot-sidebar-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              name: formData.get('name') as string,
              code: formData.get('code') as string,
              phone: formData.get('phone') as string || null,
              address_line1: formData.get('address_line1') as string || null,
              city: formData.get('city') as string || null,
              delivery_fee: parseFloat(formData.get('delivery_fee') as string) || 0,
              minimum_order: parseFloat(formData.get('minimum_order') as string) || 0,
              is_active: formData.get('is_active') === 'on',
            };
            if (editingSpot) {
              updateSpotMutation.mutate({ id: editingSpot.id, data });
            } else {
              createSpotMutation.mutate(data);
            }
          }}
          className="admin-editor-form space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spot_name">Name</Label>
              <Input id="spot_name" name="name" defaultValue={editingSpot?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spot_code">Code</Label>
              <Input id="spot_code" name="code" defaultValue={editingSpot?.code} required placeholder="TOKYO-01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spot_phone">Phone</Label>
            <Input id="spot_phone" name="phone" defaultValue={editingSpot?.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line1">Address</Label>
            <Input id="address_line1" name="address_line1" defaultValue={editingSpot?.address_line1 ?? ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={editingSpot?.city ?? ''} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-4 sm:self-end">
              <input type="checkbox" id="spot_is_active" name="is_active" defaultChecked={editingSpot?.is_active ?? true} className="h-4 w-4" />
              <Label htmlFor="spot_is_active">Active</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_fee">Delivery Fee</Label>
              <Input id="delivery_fee" name="delivery_fee" type="number" step="0.01" defaultValue={editingSpot?.delivery_fee ?? 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum_order">Minimum Order</Label>
              <Input id="minimum_order" name="minimum_order" type="number" step="0.01" defaultValue={editingSpot?.minimum_order ?? 0} />
            </div>
          </div>
        </form>
      </EditorSidebar>

      {/* Product Sidebar */}
      <EditorSidebar
        open={isProductModalOpen}
        onClose={closeProductEditor}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        description={editingProduct ? 'Update the product details below.' : 'Fill in the details to add a new product.'}
        panelClassName="md:w-[640px]"
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeProductEditor}>Cancel</Button>
            <Button
              type="submit"
              form="product-sidebar-form"
              className="flex-1 h-12 rounded-2xl"
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
            >
              {(createProductMutation.isPending || updateProductMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <form
          id="product-sidebar-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const selectedCategoryId = String(formData.get('category_id') || '').trim();
            const uploadedImage = formData.get('image_file');
            const imageURLInput = String(formData.get('image_url') || '').trim();
            let resolvedImageURL: string | undefined;

            if (!selectedCategoryId) {
              alert('Select a category for this product');
              return;
            }

            if (uploadedImage instanceof File && uploadedImage.size > 0) {
              try {
                resolvedImageURL = await fileToDataUrl(uploadedImage);
              } catch {
                alert('Failed to process selected product image');
                return;
              }
            } else if (imageURLInput) {
              resolvedImageURL = imageURLInput;
            }

            const data: Partial<Product> = {
              name_i18n: { en: formData.get('name_en') as string },
              description_i18n: { en: formData.get('description_en') as string || '' },
              category_id: selectedCategoryId,
              base_price: parseFloat(formData.get('base_price') as string) || 0,
              sku: formData.get('sku') as string || null,
              image_url: resolvedImageURL,
              is_spicy: formData.get('is_spicy') === 'on',
              is_vegan: formData.get('is_vegan') === 'on',
              is_halal: formData.get('is_halal') === 'on',
              is_active: formData.get('is_active') === 'on',
            };
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, data });
            } else {
              createProductMutation.mutate(data);
            }
          }}
          className="admin-editor-form space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name_en">Name (English)</Label>
            <Input id="name_en" name="name_en" defaultValue={editingProduct?.name_i18n['en'] ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description_en">Description (English)</Label>
            <Input id="description_en" name="description_en" defaultValue={editingProduct?.description_i18n['en'] ?? ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormSelect
              id="product-category-select"
              label="Category"
              name="category_id"
              value={productCategoryDraft}
              onChange={setProductCategoryDraft}
              options={categorySelectOptions.map((cat) => ({
                value: cat.id,
                label: `${cat.depth > 0 ? `${'— '.repeat(cat.depth)}` : ''}${cat.name} • ${cat.productCount} ${cat.productCount === 1 ? 'product' : 'products'}`,
              }))}
              placeholder="Select category"
            />
            <div className="space-y-2">
              <Label htmlFor="base_price">Price</Label>
              <Input id="base_price" name="base_price" type="number" step="0.01" defaultValue={editingProduct?.base_price ?? ''} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={editingProduct?.sku ?? ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_image_url">Image URL (Optional)</Label>
              <Input
                id="product_image_url"
                name="image_url"
                defaultValue={editingProduct?.image_url ?? ''}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_image_file">Upload Image</Label>
              <Input
                id="product_image_file"
                name="image_file"
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    setProductImagePreview(editingProduct?.image_url || null);
                    return;
                  }
                  try {
                    setProductImagePreview(await fileToDataUrl(file));
                  } catch {
                    setProductImagePreview(null);
                  }
                }}
              />
            </div>
          </div>
          {(productImagePreview || editingProduct?.image_url) && (
            <div className="space-y-2">
              <Label>Image Preview</Label>
              <div className="h-28 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
                <ImageWithFallback
                  src={productImagePreview || editingProduct?.image_url || ''}
                  className="w-full h-full object-cover"
                  alt={editingProduct?.name_i18n['en'] || 'Product image preview'}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-3">
              <input type="checkbox" id="is_spicy" name="is_spicy" defaultChecked={editingProduct?.is_spicy} className="h-4 w-4" />
              <span className="text-sm font-medium">Spicy</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-3">
              <input type="checkbox" id="is_vegan" name="is_vegan" defaultChecked={editingProduct?.is_vegan} className="h-4 w-4" />
              <span className="text-sm font-medium">Vegan</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-3">
              <input type="checkbox" id="is_halal" name="is_halal" defaultChecked={editingProduct?.is_halal} className="h-4 w-4" />
              <span className="text-sm font-medium">Halal</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-3">
              <input type="checkbox" id="product_is_active" name="is_active" defaultChecked={editingProduct?.is_active ?? true} className="h-4 w-4" />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>
        </form>
      </EditorSidebar>

      {/* Category Sidebar */}
      <EditorSidebar
        open={isCategoryModalOpen}
        onClose={closeCategoryEditor}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        description={editingCategory ? 'Update the category details below.' : 'Fill in the details to add a new category.'}
        footer={
          <>
            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={closeCategoryEditor}>Cancel</Button>
            <Button
              type="submit"
              form="category-sidebar-form"
              className="flex-1 h-12 rounded-2xl"
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <form
          id="category-sidebar-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const uploadedImage = formData.get('category_image_file');
            const imageURLInput = String(formData.get('category_image_url') || '').trim();
            const parentIDRaw = String(formData.get('parent_id') || '').trim();
            let resolvedImageURL: string | undefined;

            if (uploadedImage instanceof File && uploadedImage.size > 0) {
              try {
                resolvedImageURL = await fileToDataUrl(uploadedImage);
              } catch {
                alert('Failed to process selected category image');
                return;
              }
            } else if (imageURLInput) {
              resolvedImageURL = imageURLInput;
            }

            const data = {
              name_i18n: { en: formData.get('cat_name_en') as string },
              slug: formData.get('slug') as string,
              parent_id: editingCategory ? (parentIDRaw || '') : (parentIDRaw || undefined),
              image_url: resolvedImageURL,
              is_active: formData.get('cat_is_active') === 'on',
            };
            if (editingCategory) {
              updateCategoryMutation.mutate({ id: editingCategory.id, data });
            } else {
              createCategoryMutation.mutate(data);
            }
          }}
          className="admin-editor-form space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="cat_name_en">Name (English)</Label>
            <Input id="cat_name_en" name="cat_name_en" defaultValue={editingCategory?.name_i18n['en'] ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={editingCategory?.slug ?? ''} required placeholder="sushi-rolls" />
          </div>
          <AdminFormSelect
            id="category-parent-select"
            label="Parent Category"
            name="parent_id"
            value={categoryParentDraft}
            onChange={setCategoryParentDraft}
            options={[
              { value: '', label: 'Top-level Category' },
              ...categoryParentOptions.map((option) => ({
                value: option.id,
                label: `${option.depth > 0 ? `${'— '.repeat(option.depth)}` : ''}${option.name} • ${option.parentLabel}`,
              })),
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_image_url">Image URL (Optional)</Label>
              <Input
                id="category_image_url"
                name="category_image_url"
                defaultValue={editingCategory?.image_url ?? ''}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_image_file">Upload Image</Label>
              <Input
                id="category_image_file"
                name="category_image_file"
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    setCategoryImagePreview(editingCategory?.image_url || null);
                    return;
                  }
                  try {
                    setCategoryImagePreview(await fileToDataUrl(file));
                  } catch {
                    setCategoryImagePreview(null);
                  }
                }}
              />
            </div>
          </div>
          {(categoryImagePreview || editingCategory?.image_url) && (
            <div className="space-y-2">
              <Label>Image Preview</Label>
              <div className="h-24 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
                <ImageWithFallback
                  src={categoryImagePreview || editingCategory?.image_url || ''}
                  className="w-full h-full object-cover"
                  alt={editingCategory?.name_i18n['en'] || 'Category image preview'}
                />
              </div>
            </div>
          )}
          <label className="flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/40 px-4 py-4">
            <input type="checkbox" id="cat_is_active" name="cat_is_active" defaultChecked={editingCategory?.is_active ?? true} className="h-4 w-4" />
            <span className="text-sm font-medium">Active</span>
          </label>
        </form>
      </EditorSidebar>

    </div>
  );
};

const LogOut = ({ className }: { className?: string }) => <div className={className}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>;

const BrandIcon = ({ size = 40 }: { size?: number }) => (
  <img
    src="/brand/sushimei-logo.png"
    alt="Sushi Mei logo"
    className="shrink-0 object-contain"
    style={{ width: size, height: size }}
  />
);
