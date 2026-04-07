"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Search, User, Clock, CheckCircle2,
  MapPin, Plus, Minus, ArrowRight, ChevronRight, Star,
  X, Filter, Home, LayoutGrid, Heart, History, LogOut,
  CreditCard, Truck, Store, Gift, ChevronDown, Bell, Settings,
  Menu as MenuIcon, Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Badge } from './ui/badge';
import { publicApi, customerApi, Category, Product, Spot, Order, OrderDetail, ModifierGroup, Customer, CustomerAddress, OrderDraft, OrderPricing, useAuth } from '@/lib/api';

// Helper to get localized name
const getName = (i18n: Record<string, string> | undefined, lang = 'en'): string => {
  if (!i18n) return '';
  return i18n[lang] || i18n['en'] || Object.values(i18n)[0] || '';
};

const sanitizeUiText = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const profanityPatterns = [
    /\bfuck(?:er|ers|ing|ed)?\b/gi,
    /\bshit(?:ty|ting|ted)?\b/gi,
    /\bbitch(?:es)?\b/gi,
    /\basshole(?:s)?\b/gi,
  ];

  return profanityPatterns.reduce((text, pattern) => text.replace(pattern, '***'), normalized);
};

const getSafeName = (i18n: Record<string, string> | undefined, lang = 'en'): string =>
  sanitizeUiText(getName(i18n, lang));

const getSafeDescription = (i18n: Record<string, string> | undefined, lang = 'en'): string =>
  sanitizeUiText(getName(i18n, lang));

// Format price (assuming yen, displayed as dollars for UI consistency)
const formatPrice = (price: number): string => {
  return `$${(price / 100).toFixed(2)}`;
};

const PRODUCTS_PAGE_LIMIT = 100;
const PRODUCT_CARD_ADD_BUTTON_CLASS_NAME =
  'h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40';

async function fetchAllPublicProducts(): Promise<Product[]> {
  const allProducts: Product[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await publicApi.getProducts({ page, limit: PRODUCTS_PAGE_LIMIT });
    if (!response.success) {
      throw new Error(
        response.error?.details ||
        response.error?.detail ||
        response.error?.message ||
        `Failed to fetch menu page ${page}`
      );
    }

    if (response.data) {
      allProducts.push(...response.data);
    }

    const nextTotalPages = response.meta?.total_pages || response.meta?.total_page || 1;
    totalPages = Math.max(1, nextTotalPages);

    if (!response.data || response.data.length === 0) {
      break;
    }

    page += 1;
  }

  return allProducts;
}

type CartItem = Product & {
  quantity: number;
};

export const CustomerInterface = () => {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'account'>('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [selectedItemQty, setSelectedItemQty] = useState(1);
  const [isCheckoutFlow, setIsCheckoutFlow] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CARD'>('CASH');
  const [selectedSpotId, setSelectedSpotId] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [bonusPointsInput, setBonusPointsInput] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutPreview, setCheckoutPreview] = useState<OrderPricing | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [profile, setProfile] = useState<Customer | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  // API data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [dietaryOptions, setDietaryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [categoriesRes, allProducts, spotsRes, modifiersRes, dietaryRes] = await Promise.all([
          publicApi.getCategories(),
          fetchAllPublicProducts(),
          publicApi.getSpots(),
          publicApi.getModifiers(),
          publicApi.getDietaryOptions(),
        ]);

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        setProducts(allProducts);
        if (spotsRes.success && spotsRes.data) {
          setSpots(spotsRes.data);
          const defaultSpot = spotsRes.data.find((spot) => spot.is_active) || spotsRes.data[0];
          if (defaultSpot) {
            setSelectedSpotId(defaultSpot.id);
          }
        }
        if (modifiersRes.success && modifiersRes.data) {
          setModifiers(modifiersRes.data);
        }
        if (dietaryRes.success && dietaryRes.data) {
          setDietaryOptions(dietaryRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data. Please try again.');
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setOrders([]);
      setBonusPointsInput('');
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }

    const fetchCustomerData = async () => {
      setProfileLoading(true);
      try {
        const [profileRes, ordersRes, addressesRes] = await Promise.all([
          customerApi.getProfile(),
          customerApi.getOrders({ limit: 20 }),
          customerApi.getAddresses(),
        ]);

        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        }
        if (ordersRes.success && ordersRes.data) {
          setOrders(ordersRes.data);
        }
        if (addressesRes.success && addressesRes.data) {
          setAddresses(addressesRes.data);
        }
      } finally {
        setProfileLoading(false);
      }
    };

    fetchCustomerData();
  }, [isAuthenticated]);

  // Transform categories for UI
  const categoryList = [
    { id: 'all', name: 'All Menu', slug: 'all' },
    ...categories.map(cat => ({
      id: cat.id,
      name: getName(cat.name_i18n),
      slug: cat.slug,
    })),
  ];

  const matchesDietaryOption = (product: Product, option: string): boolean => {
    const normalized = option.trim().toLowerCase();
    const productTags = (product.tags || []).map((tag) => tag.trim().toLowerCase());

    if (normalized.includes('vegan')) return product.is_vegan || productTags.includes('vegan');
    if (normalized.includes('halal')) return product.is_halal || productTags.includes('halal');
    if (normalized.includes('spicy')) return product.is_spicy || productTags.includes('spicy');
    if (normalized.includes('vegetarian')) return productTags.includes('vegetarian') || productTags.includes('vegan') || product.is_vegan;

    return productTags.includes(normalized);
  };

  const filteredProducts = useMemo(() => {
    const categoryFiltered = selectedCategory === 'all'
      ? products
      : products.filter((product) => product.category_id === selectedCategory);

    const dietaryFiltered = selectedDietary.length === 0
      ? categoryFiltered
      : categoryFiltered.filter((product) => selectedDietary.every((option) => matchesDietaryOption(product, option)));

    const sorted = [...dietaryFiltered];
    switch (sortOption) {
      case 'price_asc':
        sorted.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.base_price - a.base_price);
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        sorted.sort((a, b) => a.sort_order - b.sort_order);
        break;
    }

    return sorted;
  }, [products, selectedCategory, selectedDietary, sortOption]);

  const toggleDietaryFilter = (option: string) => {
    setSelectedDietary((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  };

  const addToCart = (item: Product, quantity = 1) => {
    const normalizedQuantity = Math.max(1, quantity);

    setCart((currentCart) => {
      const existing = currentCart.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return currentCart.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + normalizedQuantity } : cartItem);
      }
      return [...currentCart, { ...item, quantity: normalizedQuantity }];
    });
    setCheckoutSuccess(null);
    setSelectedItem(null);
    setSelectedItemQty(1);
  };

  const updateCartQuantity = (productId: string, nextQuantity: number) => {
    setCart((currentCart) => {
      if (nextQuantity <= 0) {
        return currentCart.filter((item) => item.id !== productId);
      }
      return currentCart.map((item) => item.id === productId ? { ...item, quantity: nextQuantity } : item);
    });
    setCheckoutSuccess(null);
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
    setCheckoutSuccess(null);
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.base_price * item.quantity), 0);
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) || null;
  const customerDisplayName = profile?.first_name || profile?.last_name
    ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    : user?.firstName || user?.lastName
      ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      : '';
  const recentOrders = orders.slice(0, 3);

  const buildOrderDraft = (): OrderDraft | null => {
    if (cart.length === 0 || !selectedSpotId) return null;

    const parsedBonusPoints = bonusPointsInput.trim() === '' ? undefined : Number.parseInt(bonusPointsInput.trim(), 10);

    return {
      spot_id: selectedSpotId,
      order_type: deliveryType === 'delivery' ? 'DELIVERY' : 'PICKUP',
      payment_type: paymentType,
      customer_name: customerDisplayName || undefined,
      customer_phone: profile?.phone || user?.phone || undefined,
      delivery_address: deliveryType === 'delivery' && deliveryAddress.trim()
        ? { line1: deliveryAddress.trim() }
        : undefined,
      promo_code: promoCodeInput.trim() ? promoCodeInput.trim().toUpperCase() : undefined,
      bonus_points_to_spend: Number.isInteger(parsedBonusPoints) && parsedBonusPoints && parsedBonusPoints > 0 ? parsedBonusPoints : undefined,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };
  };

  const handleCopyInvite = async () => {
    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=sushimei` : '/login?ref=sushimei';

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setInviteCopied(false);
    }
  };

  const refreshCustomerData = async () => {
    if (!isAuthenticated) return;

    const [profileRes, ordersRes, addressesRes] = await Promise.all([
      customerApi.getProfile(),
      customerApi.getOrders({ limit: 20 }),
      customerApi.getAddresses(),
    ]);

    if (profileRes.success && profileRes.data) {
      setProfile(profileRes.data);
    }
    if (ordersRes.success && ordersRes.data) {
      setOrders(ordersRes.data);
    }
    if (addressesRes.success && addressesRes.data) {
      setAddresses(addressesRes.data);
    }
  };

  const handleStartEditProfile = () => {
    setEditFirstName(profile?.first_name || '');
    setEditLastName(profile?.last_name || '');
    setEditEmail(profile?.email || '');
    setProfileSaveError(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaveError(null);

    const response = await customerApi.updateProfile({
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      email: editEmail.trim() || undefined,
    });

    setProfileSaving(false);

    if (response.success) {
      setIsEditingProfile(false);
      await refreshCustomerData();
    } else {
      setProfileSaveError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to update profile');
    }
  };

  const handleViewOrder = async (orderId: string) => {
    setOrderDetailLoading(true);
    setSelectedOrder(null);

    const response = await customerApi.getOrder(orderId);
    setOrderDetailLoading(false);

    if (response.success && response.data) {
      setSelectedOrder(response.data);
    }
  };

  useEffect(() => {
    if (!isCheckoutFlow || !isAuthenticated) {
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }

    const draft = buildOrderDraft();
    if (!draft) {
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }

    const parsedBonusPoints = bonusPointsInput.trim() === '' ? 0 : Number.parseInt(bonusPointsInput.trim(), 10);
    if (bonusPointsInput.trim() !== '' && (!Number.isInteger(parsedBonusPoints) || parsedBonusPoints < 0)) {
      setCheckoutPreview(null);
      setCheckoutError('Bonus points to spend must be a valid non-negative integer');
      return;
    }

    if (draft.order_type === 'DELIVERY' && !deliveryAddress.trim()) {
      setCheckoutPreview(null);
      setCheckoutError('Delivery address is required for delivery orders');
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const response = await customerApi.previewOrder(draft);
      if (response.success && response.data) {
        setCheckoutPreview(response.data);
      } else {
        setCheckoutPreview(null);
        setCheckoutError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to preview order');
      }

      setCheckoutLoading(false);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isCheckoutFlow, isAuthenticated, cart, selectedSpotId, deliveryType, paymentType, promoCodeInput, bonusPointsInput, deliveryAddress, customerDisplayName, profile?.phone, user?.phone]);

  useEffect(() => {
    if (selectedItem) {
      setSelectedItemQty(1);
    }
  }, [selectedItem]);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const draft = buildOrderDraft();
    if (!draft) {
      setCheckoutError('Add products to the cart before placing an order');
      return;
    }
    if (draft.order_type === 'DELIVERY' && !deliveryAddress.trim()) {
      setCheckoutError('Delivery address is required for delivery orders');
      return;
    }

    setPlacingOrder(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    const response = await customerApi.createOrder(draft);
    setPlacingOrder(false);

    if (!response.success || !response.data) {
      setCheckoutError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to place order');
      return;
    }

    setCheckoutPreview(response.data.pricing);
    setCheckoutSuccess(`Order ${response.data.order_number} created successfully`);
    setCart([]);
    setPromoCodeInput('');
    setBonusPointsInput('');
    setDeliveryAddress('');
    setIsCheckoutFlow(false);
    setIsCartOpen(false);
    setActiveTab('account');
    await refreshCustomerData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto" />
          <p className="text-stone-500 font-medium">Loading delicious content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans pb-24 md:pb-0 overflow-x-hidden">
      {/* Desktop Header */}
      <nav className="sticky top-0 z-50 bg-white/70 dark:bg-stone-950/70 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-900/50 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <img
                src="/brand/sushimei-logo.png"
                alt="Sushi Mei logo"
                className="w-11 h-11 object-contain rounded-full border border-stone-200/70 bg-white p-0.5"
              />
              SUSHI MEI
            </h1>
            <div className="hidden lg:flex items-center gap-10">
              {[{ id: 'home', label: 'Home' }, { id: 'menu', label: 'Menu' }, { id: 'account', label: 'Account' }].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as 'home' | 'menu' | 'account')}
                  className={`text-sm font-black tracking-[0.14em] transition-all hover:text-red-600 cursor-pointer ${activeTab === item.id ? 'text-red-600' : 'text-stone-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => {
              setActiveTab('menu');
              setSelectedCategory('all');
            }}>
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-[9px] font-black text-white flex items-center justify-center rounded-full ring-4 ring-white dark:ring-stone-950">
                  {cartItemCount}
                </span>
              )}
            </Button>
            <Button variant="secondary" size="sm" className="hidden md:flex rounded-xl" asChild>
              <Link href={isAuthenticated ? '#' : '/login'} onClick={(event) => {
                if (isAuthenticated) {
                  event.preventDefault();
                  setActiveTab('account');
                }
              }}>
                {isAuthenticated ? 'Account' : 'Sign In'}
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-6 h-20 bg-white dark:bg-stone-950 sticky top-0 z-50 border-b border-stone-100 dark:border-stone-900/50">
        <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
          <img
            src="/brand/sushimei-logo.png"
            alt="Sushi Mei logo"
            className="w-8 h-8 object-contain rounded-full border border-stone-200/70 bg-white p-0.5"
          />
          SUSHI MEI
        </h1>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-[9px] font-black text-white flex items-center justify-center rounded-full ring-2 ring-white dark:ring-stone-950">
                  {cartItemCount}
                </span>
              )}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setActiveTab('account')}>
              <Bell className="w-5 h-5" />
           </Button>
        </div>
      </div>

      <main>
        {error && (
          <div className="max-w-7xl mx-auto px-6 md:px-12 pt-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-16 md:space-y-32">
            {/* Hero Section */}
            <section className="relative h-[85vh] flex items-center overflow-hidden">
              <div className="absolute inset-0 z-0">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1696454593555-6c5c1f3b8dcb"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
              </div>
              <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-2xl space-y-8"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-px w-12 bg-red-600" />
                    <span className="text-xs font-black tracking-[0.4em] text-red-500 uppercase">Artisanal Dining</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]">
                    Pure Taste. <br />
                    <span className="text-stone-400 italic font-serif font-light">Elevated.</span>
                  </h2>
                  <p className="text-xl text-stone-300 leading-relaxed max-w-lg font-medium opacity-80">
                    Experience the precision of Tokyo's finest sushi, masterfully prepared with seasonal ingredients flown in daily.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-6 pt-4">
                    <Button size="lg" onClick={() => setActiveTab('menu')} className="rounded-full shadow-2xl h-16">
                      Order Now <ArrowRight className="ml-3 w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm h-16" onClick={() => setActiveTab('menu')}>
                      Signature Menu
                    </Button>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Popular Categories Mobile */}
            <section className="px-6 md:hidden">
               <h3 className="text-2xl font-black mb-6 tracking-tight">Browse Menu</h3>
               <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                 {categoryList.map(cat => (
                   <button
                    key={cat.id}
                    className="flex-none px-6 py-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 text-xs font-black uppercase tracking-widest shadow-sm"
                    onClick={() => { setActiveTab('menu'); setSelectedCategory(cat.id); }}
                   >
                     {cat.name}
                   </button>
                 ))}
               </div>
            </section>

            {/* Featured Section */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
                <div className="space-y-4">
                  <div className="text-[10px] font-black tracking-[0.3em] text-red-600 uppercase">Seasonal Specials</div>
                  <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Chef's Selection</h3>
                </div>
                <Button variant="ghost" className="group text-stone-400 hover:text-red-600 p-0" onClick={() => setActiveTab('menu')}>
                  View All Selections <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                {products.slice(0, 8).map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={`item-${item.id}`}
                    whileHover={{ y: -12 }}
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="aspect-[3/4] overflow-hidden relative rounded-[2rem] bg-stone-100 dark:bg-stone-900 shadow-lg group-hover:shadow-3xl transition-all duration-500">
                      <ImageWithFallback
                        src={item.image_url || 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600'}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                        {item.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-white uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                        {item.is_spicy && (
                          <span className="px-3 py-1.5 bg-red-600/80 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-wider">
                            Spicy
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="space-y-1">
                          <p className="text-white text-lg font-black tracking-tight line-clamp-2 max-w-[11rem]">{getSafeName(item.name_i18n)}</p>
                          <p className="text-stone-300 text-sm font-bold">{formatPrice(item.base_price)}</p>
                        </div>
                        <div className={PRODUCT_CARD_ADD_BUTTON_CLASS_NAME}>
                          <Plus className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Promo Banner */}
            <section className="max-w-7xl mx-auto px-6 md:px-12">
               <div className="relative rounded-[3rem] overflow-hidden bg-stone-900 p-8 md:p-20 text-white flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="absolute inset-0 opacity-20">
                     <ImageWithFallback src="https://images.unsplash.com/photo-1766415605422-06d022bd22bf" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="relative z-10 space-y-6 max-w-xl text-center md:text-left">
                     <Badge variant="error">Limited Time</Badge>
                     <h3 className="text-4xl md:text-6xl font-black tracking-tighter">Get 20% off your first order</h3>
                     <p className="text-stone-400 font-medium">Use code <span className="text-white font-black">WELCOME20</span> at checkout. Valid for delivery and pickup.</p>
                     <Button size="lg" className="rounded-full h-14" onClick={() => setActiveTab('menu')}>Explore Menu</Button>
                  </div>
                  <div className="relative z-10 hidden lg:block">
                     <div className="w-80 h-80 rounded-full border-2 border-dashed border-stone-700 flex items-center justify-center p-8">
                        <div className="w-full h-full rounded-full bg-red-600 flex flex-col items-center justify-center text-center p-6 shadow-2xl shadow-red-600/40">
                           <Gift className="w-12 h-12 mb-2" />
                           <p className="text-sm font-black uppercase tracking-widest">Bonus Program</p>
                           <p className="text-[10px] font-bold text-red-200 mt-2">Earn 5% cashback on every order</p>
                        </div>
                     </div>
                  </div>
               </div>
            </section>

            {/* Branches Selector */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 pb-32">
               <div className="text-center space-y-4 mb-16">
                  <h3 className="text-4xl font-black tracking-tighter">Our Locations</h3>
                  <p className="text-stone-500 font-medium">Find a Sushi Mei branch near you for the freshest experience.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {spots.map(spot => (
                    <div key={spot.id} className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all">
                       <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center">
                             <MapPin className="w-6 h-6 text-stone-900 dark:text-white" />
                          </div>
                          <Badge variant={spot.is_active ? 'success' : 'warning'}>{spot.is_active ? 'Open' : 'Closed'}</Badge>
                       </div>
                       <h4 className="text-xl font-black tracking-tight mb-2">{spot.name}</h4>
                       <p className="text-sm text-stone-500 mb-6">{spot.address_line1}, {spot.city}</p>
                       <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800">
                          <span className="text-xs font-black uppercase tracking-widest text-stone-400">
                            Min. Order: {formatPrice(spot.minimum_order)}
                          </span>
                          <Button variant="ghost" size="sm" className="p-0 text-red-600" asChild>
                            <Link href={`/address?branch=${spot.id}`}>
                              Get Directions <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                          </Button>
                       </div>
                    </div>
                  ))}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-32">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Desktop Filters */}
              <aside className="w-full lg:w-72 space-y-10 hidden lg:block">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Categories</h4>
                  <div className="flex flex-col gap-2">
                    {categoryList.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center justify-between px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'
                        }`}
                      >
                        {cat.name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-stone-100 dark:bg-stone-800'}`}>
                          {cat.id === 'all' ? products.length : products.filter(m => m.category_id === cat.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {dietaryOptions.length > 0 && (
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Dietary</h4>
                     <div className="space-y-3">
                        {dietaryOptions.map(opt => {
                          const checked = selectedDietary.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDietaryFilter(opt)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${
                                checked
                                  ? 'border-red-600 bg-red-600 text-white'
                                  : 'border-stone-200 dark:border-stone-800 group-hover:border-red-500'
                              }`}>
                                {checked && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                                checked
                                  ? 'text-red-600'
                                  : 'text-stone-500 group-hover:text-stone-900 dark:group-hover:text-white'
                              }`}>{opt}</span>
                            </label>
                          );
                        })}
                        {selectedDietary.length > 0 && (
                          <button
                            onClick={() => setSelectedDietary([])}
                            className="mt-2 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-red-600 transition-colors"
                          >
                            Clear Filters
                          </button>
                        )}
                     </div>
                  </div>
                )}
              </aside>

              {/* Mobile Categories Scroll */}
              <div className="lg:hidden flex gap-3 overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
                 {categoryList.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-red-600 text-white border-red-600 shadow-lg'
                          : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-500'
                      }`}
                    >
                      {cat.name}
                    </button>
                 ))}
              </div>

              {/* Menu Grid */}
              <div className="flex-1 space-y-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter capitalize">
                      {selectedCategory === 'all' ? 'All Items' : categoryList.find(c => c.id === selectedCategory)?.name || 'Menu'}
                    </h2>
                    <p className="text-stone-500 text-sm font-medium mt-1">Showing {filteredProducts.length} artisanal creations</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-stone-900 p-2 rounded-2xl border border-stone-100 dark:border-stone-800">
                     <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 pl-4">Sort by</span>
                     <select
                        value={sortOption}
                        onChange={(event) => setSortOption(event.target.value as 'recommended' | 'price_asc' | 'price_desc' | 'newest')}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                     >
                        <option value="recommended">Recommended</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="newest">Newest Arrivals</option>
                     </select>
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-stone-500 font-medium">
                      {selectedDietary.length > 0
                        ? `No products match these filters: ${selectedDietary.join(', ')}.`
                        : 'No products found in this category.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredProducts.map(item => (
                      <div key={item.id} className="bg-white dark:bg-stone-900 p-5 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 hover:shadow-2xl hover:shadow-stone-200/50 dark:hover:shadow-black/50 transition-all group">
                         <div className="aspect-[4/3] rounded-[1.8rem] overflow-hidden relative mb-6">
                            <ImageWithFallback src={item.image_url || 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-4 left-4 flex gap-2">
                               {item.tags?.slice(0, 2).map(t => <span key={t} className="px-2.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-[9px] font-black text-white uppercase tracking-wider">{t}</span>)}
                               {item.is_spicy && <span className="px-2.5 py-1.5 bg-red-600/80 backdrop-blur-md rounded-xl text-[9px] font-black text-white uppercase tracking-wider">Spicy</span>}
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-start">
                               <h4 className="text-xl font-black tracking-tight group-hover:text-red-600 transition-colors line-clamp-2 min-h-[3.5rem]">{getSafeName(item.name_i18n)}</h4>
                               <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-black">4.9</span>
                                </div>
                            </div>
                            <p className="text-xs text-stone-500 line-clamp-2 font-medium leading-relaxed">{getSafeDescription(item.description_i18n)}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-stone-50 dark:border-stone-800">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Price</span>
                                  <span className="text-xl font-black tracking-tight">{formatPrice(item.base_price)}</span>
                               </div>
                               <Button
                                 className={`${PRODUCT_CARD_ADD_BUTTON_CLASS_NAME} p-0 hover:bg-red-600 hover:shadow-xl active:shadow-xl group-active:scale-95`}
                                 onClick={() => setSelectedItem(item)}
                               >
                                  <Plus className="w-6 h-6" />
                               </Button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="max-w-4xl mx-auto px-6 pt-12 pb-32 space-y-12">
             <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-stone-900 p-10 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-sm">
                <div className="w-32 h-32 rounded-full border-4 border-stone-100 dark:border-stone-800 overflow-hidden relative group">
                   <ImageWithFallback src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Plus className="text-white w-8 h-8" />
                   </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-4">
                   <div>
                      <h2 className="text-4xl font-black tracking-tighter">
                        {isAuthenticated ? (customerDisplayName || profile?.phone || user?.phone || 'Customer') : 'Guest User'}
                      </h2>
                      <p className="text-stone-500 font-medium">
                        {isAuthenticated ? (profile?.email || profile?.phone || 'Loyalty member') : 'Sign in to access your account'}
                      </p>
                   </div>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="px-6 py-3 bg-red-600 text-white rounded-2xl text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Bonus Balance</p>
                         <p className="text-xl font-black tracking-tight">{profileLoading ? '...' : `${profile?.bonus_balance || 0} pts`}</p>
                      </div>
                      <div className="px-6 py-3 bg-stone-100 dark:bg-stone-800 rounded-2xl text-center">
                         <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Total Orders</p>
                         <p className="text-xl font-black tracking-tight">{profileLoading ? '...' : (profile?.total_orders || 0)}</p>
                      </div>
                   </div>
                </div>
                {isAuthenticated && (
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl" onClick={handleStartEditProfile}>
                     <Settings className="w-5 h-5" />
                  </Button>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                      <History className="w-5 h-5 text-red-600" /> Recent Orders
                   </h3>
                   <div className="space-y-4">
                      {recentOrders.length === 0 ? (
                        <div className="p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-100 dark:border-stone-800 text-center">
                          <p className="text-stone-500 font-medium">
                            {isAuthenticated ? 'No orders yet. Start ordering!' : 'Sign in to view your order history.'}
                          </p>
                        </div>
                      ) : (
                        recentOrders.map((order) => (
                          <button
                            key={order.id}
                            className="w-full text-left p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-100 dark:border-stone-800 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => handleViewOrder(order.id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{order.order_number}</p>
                                <h4 className="text-lg font-black tracking-tight mt-2">{formatPrice(order.total_amount)}</h4>
                                <p className="text-sm text-stone-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'error' : 'neutral'}>
                                {order.status.replaceAll('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-bold text-stone-400 mt-3 flex items-center gap-1">
                              Tap to view details <ChevronRight className="w-3 h-3" />
                            </p>
                          </button>
                        ))
                      )}
                   </div>
                   <Button variant="outline" className="w-full h-14 rounded-2xl" onClick={() => {
                     setActiveTab('menu');
                     setSelectedCategory('all');
                     setIsCartOpen(false);
                   }}>
                     Start New Order
                   </Button>
                </div>

                <div className="space-y-6">
                   <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-red-600" /> Saved Addresses
                   </h3>
                   <div className="space-y-4">
                      <div className="p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-100 dark:border-stone-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3">Phone</p>
                        <p className="font-black text-lg tracking-tight">{profile?.phone || user?.phone || 'Not available'}</p>
                      </div>
                      {addresses.length > 0 ? (
                        addresses.map((addr) => (
                          <div key={addr.id} className="p-5 bg-white dark:bg-stone-900 rounded-[1.5rem] border border-stone-100 dark:border-stone-800">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black tracking-tight">{addr.label || 'Address'}</p>
                                <p className="text-sm text-stone-500 mt-1">
                                  {[addr.street, addr.house, addr.apartment ? `apt. ${addr.apartment}` : '', addr.city].filter(Boolean).join(', ')}
                                </p>
                              </div>
                              {addr.is_default && <Badge variant="success">Default</Badge>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 bg-white dark:bg-stone-900 rounded-[2rem] border border-dashed border-stone-200 dark:border-stone-800 text-center">
                          <p className="text-stone-500 font-medium text-sm">
                            {isAuthenticated ? 'No saved addresses. Add one during checkout!' : 'Sign in to manage addresses.'}
                          </p>
                        </div>
                      )}
                   </div>
                   <Button variant="outline" className="w-full h-14 rounded-2xl border-dashed border-2" onClick={() => {
                     setActiveTab('menu');
                     setIsCartOpen(true);
                   }}>
                     Use Promo And Bonuses
                   </Button>
                </div>
             </div>

             <div className="bg-stone-900 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 text-center md:text-left">
                   <h3 className="text-3xl font-black tracking-tighter">Invite your friends</h3>
                   <p className="text-stone-400 font-medium">Both of you get 500 bonus points on their first order.</p>
                </div>
                <Button className="h-16 px-10 rounded-full text-lg shadow-2xl" onClick={handleCopyInvite}>
                  {inviteCopied ? 'Copied!' : 'Copy Invite Link'}
                </Button>
             </div>

             <div className="flex justify-center pt-8">
                {isAuthenticated ? (
                  <Button variant="ghost" className="text-red-600 font-black tracking-widest text-xs uppercase flex items-center gap-2" onClick={logout}>
                    <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600 font-black tracking-widest text-xs uppercase flex items-center gap-2" asChild>
                    <Link href="/login">
                      <LogOut className="w-4 h-4" /> Sign In
                    </Link>
                  </Button>
                )}
             </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-stone-950/80 backdrop-blur-2xl border-t border-stone-100 dark:border-stone-900/50 px-6 py-4 flex items-center justify-between z-[60]">
         {[
           { id: 'home', icon: Home, label: 'Home' },
           { id: 'menu', icon: LayoutGrid, label: 'Menu' },
           { id: 'account', icon: User, label: 'Profile' },
         ].map(item => (
           <button
            key={item.id}
            onClick={() => setActiveTab(item.id as 'home' | 'menu' | 'account')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-red-600' : 'text-stone-400'}`}
           >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-red-600/10' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
           </button>
         ))}
      </nav>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-stone-950 z-[110] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-stone-100 dark:border-stone-900/50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Your Order</h3>
                  <p className="text-xs text-stone-500 font-medium">{cartItemCount} items selected</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12" onClick={() => setIsCartOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center border border-dashed border-stone-200 dark:border-stone-800">
                      <ShoppingBag className="w-10 h-10 text-stone-300" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black tracking-tight">Cart is empty</p>
                      <p className="text-sm text-stone-500 max-w-[200px] font-medium leading-relaxed">Delicious sushi is just a few clicks away.</p>
                    </div>
                    <Button onClick={() => { setIsCartOpen(false); setActiveTab('menu'); }} className="h-14 px-8 rounded-2xl">
                      Browse Menu
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-6 group">
                        <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden shrink-0 border border-stone-100 dark:border-stone-800">
                          <ImageWithFallback src={item.image_url || 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-black text-lg tracking-tight leading-none line-clamp-2">{getSafeName(item.name_i18n)}</h4>
                            <button
                              className="text-stone-300 hover:text-red-500 transition-colors"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">{item.category_name}</p>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4 bg-stone-100 dark:bg-stone-900 rounded-xl px-3 py-1.5 border border-stone-200/50 dark:border-stone-800/50">
                              <button className="text-stone-400 hover:text-red-600" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                              <button className="text-stone-400 hover:text-red-600" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></button>
                            </div>
                            <span className="font-black text-lg tracking-tight">{formatPrice(item.base_price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {modifiers.length > 0 && (
                      <div className="p-6 bg-stone-100 dark:bg-stone-900 rounded-[2rem] border border-dashed border-stone-200 dark:border-stone-800 space-y-4">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Order Add-ons</h5>
                         <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {modifiers.flatMap(group => group.options).slice(0, 6).map(opt => (
                              <button key={opt.id} className="flex-none px-4 py-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                 + {getName(opt.name_i18n)} {opt.price_delta > 0 && `(${formatPrice(opt.price_delta)})`}
                              </button>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {cartItemCount > 0 && (
                <div className="p-8 border-t border-stone-200/50 dark:border-stone-800/50 bg-stone-50/30 dark:bg-stone-900/30 space-y-6">
                  {!isCheckoutFlow ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                          <span>Subtotal</span>
                          <span className="text-stone-900 dark:text-stone-100">{formatPrice(totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                          <span>Delivery</span>
                          <span className="text-emerald-500">Complementary</span>
                        </div>
                        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
                           <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
                           <span className="text-3xl font-black tracking-tighter">{formatPrice(totalPrice)}</span>
                        </div>
                      </div>
                      <Button className="w-full h-16 rounded-[20px] text-lg shadow-2xl" onClick={() => {
                        if (!isAuthenticated) {
                          router.push('/login');
                          return;
                        }
                        setCheckoutSuccess(null);
                        setIsCheckoutFlow(true);
                      }}>
                        {isAuthenticated ? 'Proceed to Checkout' : 'Sign In To Checkout'}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                       <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Secure Checkout</h4>
                          <div className="flex bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 mb-6">
                             <button
                                onClick={() => setDeliveryType('delivery')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'delivery' ? 'bg-white dark:bg-stone-800 shadow-md text-red-600' : 'text-stone-500'}`}
                             >
                                <Truck className="w-3.5 h-3.5" /> Delivery
                             </button>
                             <button
                                onClick={() => setDeliveryType('pickup')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryType === 'pickup' ? 'bg-white dark:bg-stone-800 shadow-md text-red-600' : 'text-stone-500'}`}
                             >
                                <Store className="w-3.5 h-3.5" /> Pickup
                             </button>
                          </div>
                          <div className="space-y-3">
                             <div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Branch</p>
                                <select
                                  value={selectedSpotId}
                                  onChange={(event) => setSelectedSpotId(event.target.value)}
                                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black tracking-tight"
                                >
                                  {spots.filter((spot) => spot.is_active).map((spot) => (
                                    <option key={spot.id} value={spot.id}>
                                      {spot.name}
                                    </option>
                                  ))}
                                </select>
                             </div>
                             {deliveryType === 'delivery' && (
                               <div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Delivery Address</p>
                                  <textarea
                                    value={deliveryAddress}
                                    onChange={(event) => setDeliveryAddress(event.target.value)}
                                    rows={3}
                                    placeholder="Street, building, apartment, delivery note"
                                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-medium resize-none"
                                  />
                               </div>
                             )}
                             <div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Payment Method</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentType('CASH')}
                                    className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'CASH' ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20' : 'border-stone-200 dark:border-stone-800 text-stone-500'}`}
                                  >
                                    Cash
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentType('CARD')}
                                    className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'CARD' ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20' : 'border-stone-200 dark:border-stone-800 text-stone-500'}`}
                                  >
                                    Card
                                  </button>
                                </div>
                                <p className="text-sm font-black tracking-tight flex items-center gap-3">
                                   <CreditCard className="w-4 h-4 text-stone-400" /> {paymentType === 'CASH' ? 'Cash on Delivery / Pickup' : 'Card'}
                                </p>
                             </div>
                             <div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Promo Code</p>
                                <input
                                  value={promoCodeInput}
                                  onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                                  placeholder="Enter promo code"
                                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black tracking-[0.12em] uppercase"
                                />
                             </div>
                             <div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Bonus Spend</p>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                    Balance {profile?.bonus_balance || 0}
                                  </span>
                                </div>
                                <input
                                  value={bonusPointsInput}
                                  onChange={(event) => setBonusPointsInput(event.target.value.replace(/[^\d]/g, ''))}
                                  placeholder="0"
                                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black"
                                />
                             </div>
                             {checkoutError && (
                               <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                                  {checkoutError}
                               </div>
                             )}
                             {checkoutSuccess && (
                               <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                                  {checkoutSuccess}
                               </div>
                             )}
                             <div className="rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-5 space-y-3">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                                  <span>Subtotal</span>
                                  <span className="text-stone-900 dark:text-stone-100">{formatPrice(checkoutPreview?.subtotal_amount ?? totalPrice)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                                  <span>Promo Discount</span>
                                  <span className="text-emerald-600">{formatPrice(checkoutPreview?.promo_discount_amount ?? 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                                  <span>Bonus Spent</span>
                                  <span className="text-emerald-600">{formatPrice(checkoutPreview?.bonus_spent_amount ?? 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                                  <span>Delivery Fee</span>
                                  <span className="text-stone-900 dark:text-stone-100">{formatPrice(checkoutPreview?.delivery_fee_amount ?? (deliveryType === 'delivery' ? (selectedSpot?.delivery_fee || 0) : 0))}</span>
                                </div>
                                {checkoutPreview?.applied_promo && (
                                  <div className="rounded-xl bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                                    Promo {checkoutPreview.applied_promo.code}: {checkoutPreview.applied_promo.reward_type === 'BONUS_PRODUCT'
                                      ? `${checkoutPreview.applied_promo.bonus_product_name || 'Bonus item'} x${checkoutPreview.applied_promo.bonus_product_quantity}`
                                      : checkoutPreview.applied_promo.reward_type === 'BONUS_POINTS'
                                        ? `${checkoutPreview.applied_promo.bonus_points} bonus points`
                                        : `${formatPrice(checkoutPreview.applied_promo.discount_amount)} off`}
                                  </div>
                                )}
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                                  <span>Bonus Earned</span>
                                  <span className="text-stone-900 dark:text-stone-100">{checkoutPreview?.bonus_earned_points ?? 0} pts</span>
                                </div>
                                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
                                  <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
                                  <span className="text-3xl font-black tracking-tighter">
                                    {formatPrice(checkoutPreview?.total_amount ?? totalPrice)}
                                  </span>
                                </div>
                             </div>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <Button variant="outline" className="h-16 w-16 p-0 rounded-[20px]" onClick={() => setIsCheckoutFlow(false)}>
                             <ChevronRight className="w-6 h-6 rotate-180" />
                          </Button>
                          <Button className="flex-1 h-16 rounded-[20px] shadow-2xl shadow-red-600/20" disabled={checkoutLoading || placingOrder} onClick={handlePlaceOrder}>
                             {placingOrder ? 'Placing Order...' : checkoutLoading ? 'Refreshing...' : `Confirm & Pay • ${formatPrice(checkoutPreview?.total_amount ?? totalPrice)}`}
                          </Button>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditingProfile(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-950 rounded-[2rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tighter">Edit Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {profileSaveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{profileSaveError}</div>
              )}

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">First Name</span>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Your first name"
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-medium"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Last Name</span>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Your last name"
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-medium"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Email</span>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-medium"
                  />
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 h-14 rounded-2xl shadow-xl" disabled={profileSaving} onClick={handleSaveProfile}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {(selectedOrder || orderDetailLoading) && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setSelectedOrder(null); }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-stone-950 rounded-[2rem] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-8 border-b border-stone-100 dark:border-stone-900/50 flex items-center justify-between shrink-0">
                <h3 className="text-2xl font-black tracking-tighter">Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {orderDetailLoading && !selectedOrder ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
              ) : selectedOrder ? (
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{selectedOrder.order_number}</p>
                      <p className="text-sm text-stone-500 mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED' ? 'success' : selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'REJECTED' ? 'error' : 'neutral'}>
                      {selectedOrder.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Type</p>
                      <p className="text-sm font-black mt-1">{selectedOrder.order_type.replaceAll('_', ' ')}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Payment</p>
                      <p className="text-sm font-black mt-1">{selectedOrder.payment_type}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Branch</p>
                      <p className="text-sm font-black mt-1">{selectedOrder.spot_name}</p>
                    </div>
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Total</p>
                      <p className="text-sm font-black mt-1">{formatPrice(selectedOrder.total_amount)}</p>
                    </div>
                  </div>

                  {selectedOrder.notes && (
                    <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Notes</p>
                      <p className="text-sm text-stone-600 dark:text-stone-300">{selectedOrder.notes}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Items</h4>
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm tracking-tight truncate">{getName(item.product_name)}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{formatPrice(item.unit_price)} x {item.quantity}</p>
                        </div>
                        <span className="font-black text-sm tracking-tight shrink-0">{formatPrice(item.line_total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
                    <span className="text-2xl font-black tracking-tighter">{formatPrice(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-4xl bg-white dark:bg-stone-950 rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl h-auto max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-stone-100/95 dark:bg-stone-900/90 hover:bg-stone-200 dark:hover:bg-stone-800 backdrop-blur-md rounded-2xl flex items-center justify-center text-stone-700 dark:text-stone-100 transition-all shadow-lg border border-stone-200/70 dark:border-stone-800"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full md:w-[46%] shrink-0 self-start aspect-[4/3] md:aspect-[5/6] overflow-hidden relative">
                <ImageWithFallback src={selectedItem.image_url || 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600'} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:hidden" />
              </div>

              <div className="w-full md:flex-1 min-w-0 min-h-0 p-8 md:p-14 flex flex-col overflow-y-auto scrollbar-hide">
                <div className="space-y-6 flex-1">
                  <div className="flex flex-wrap gap-2">
                     <Badge variant="info">{selectedItem.category_name}</Badge>
                     {selectedItem.is_spicy && <Badge variant="error">Spicy</Badge>}
                     {selectedItem.is_vegan && <Badge variant="success">Vegan</Badge>}
                     {selectedItem.is_halal && <Badge variant="neutral">Halal</Badge>}
                  </div>
                  <div>
                     <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight break-words mb-3">{getSafeName(selectedItem.name_i18n)}</h3>
                     <div className="flex items-center gap-3 text-xs font-semibold text-stone-400">
                        <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9 (124)
                        </span>
                        <span className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 px-3 py-1.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" /> 15-20 min
                        </span>
                     </div>
                  </div>

                  <p className="text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
                    {getSafeDescription(selectedItem.description_i18n)}
                  </p>

                  <div className="space-y-8 pt-4">
                    <div className="space-y-3">
                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Ingredients & Allergens</h5>
                       <div className="text-xs font-bold text-stone-500 bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                          {selectedItem.allergens?.length > 0 ? (
                            <span>Contains: <span className="text-stone-700 dark:text-stone-300">{selectedItem.allergens.join(', ')}</span></span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Contains no common allergens</span>
                          )}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 mt-10 border-t border-stone-100 dark:border-stone-900 flex flex-col sm:flex-row items-center gap-5">
                  <div className="flex items-center bg-stone-100 dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/50 dark:border-stone-800/50">
                    <button
                      className="w-14 h-14 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setSelectedItemQty((prev) => Math.max(1, prev - 1))}
                      disabled={selectedItemQty <= 1}
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-2xl font-black w-10 text-center tabular-nums select-none">{selectedItemQty}</span>
                    <button className="w-14 h-14 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors" onClick={() => setSelectedItemQty((prev) => prev + 1)}>
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <Button className="w-full h-16 rounded-[24px] text-lg shadow-2xl shadow-red-600/20" onClick={() => addToCart(selectedItem, selectedItemQty)}>
                    Add to Cart &middot; {formatPrice(selectedItem.base_price * selectedItemQty)}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
