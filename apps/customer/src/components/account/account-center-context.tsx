"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi, Customer, CustomerAddress, CustomerAddressCreate, CustomerBonusActivity, Order, OrderDetail, useAuth } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { toast } from 'sonner';

interface ProfileFormState {
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  language_code: string;
  marketing_opt_in: boolean;
}

interface AddressFormState {
  label: string;
  city: string;
  street: string;
  house: string;
  entrance: string;
  floor: string;
  apartment: string;
  delivery_notes: string;
  is_default: boolean;
}

interface AccountCenterContextValue {
  isAuthenticated: boolean;
  logout: () => void;
  profile: Customer | null;
  orders: Order[];
  addresses: CustomerAddress[];
  bonusHistory: CustomerBonusActivity[];
  profileLoading: boolean;
  profileForm: ProfileFormState;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  profileSaving: boolean;
  profileSaveError: string | null;
  editingAddressId: string | null;
  addressDraft: AddressFormState;
  setAddressDraft: React.Dispatch<React.SetStateAction<AddressFormState>>;
  addressSaving: boolean;
  addressError: string | null;
  deletingAddressId: string | null;
  selectedOrder: OrderDetail | null;
  orderDetailLoading: boolean;
  setSelectedOrder: React.Dispatch<React.SetStateAction<OrderDetail | null>>;
  setOrderDetailLoading: React.Dispatch<React.SetStateAction<boolean>>;
  inviteCopied: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  customerDisplayName: string;
  profileInitial: string;
  refreshCustomerData: () => Promise<void>;
  handleAvatarFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSaveProfile: () => Promise<void>;
  startCreateAddress: () => void;
  startEditAddress: (address: CustomerAddress) => void;
  resetAddressEditor: () => void;
  handleSaveAddress: () => Promise<void>;
  handleDeleteAddress: (addressId: string) => Promise<void>;
  handleMakeDefaultAddress: (addressId: string) => Promise<void>;
  handleViewOrder: (orderId: string) => Promise<void>;
  handleCopyInvite: () => Promise<void>;
  goToBonusInCart: () => void;
}

const AccountCenterContext = createContext<AccountCenterContextValue | null>(null);
const ACCOUNT_CENTER_CACHE_KEY = 'sushimei.account-center-cache.v1';
const ACCOUNT_CENTER_CACHE_TTL_MS = 2 * 60 * 1000;

interface AccountCenterCacheSnapshot {
  userId: string;
  savedAt: number;
  profile: Customer | null;
  orders: Order[];
  addresses: CustomerAddress[];
  bonusHistory: CustomerBonusActivity[];
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const createEmptyAddressForm = (): AddressFormState => ({
  label: '',
  city: '',
  street: '',
  house: '',
  entrance: '',
  floor: '',
  apartment: '',
  delivery_notes: '',
  is_default: false,
});

const normalizeAddressPayload = (draft: AddressFormState): CustomerAddressCreate => ({
  label: draft.label.trim() || undefined,
  city: draft.city.trim() || undefined,
  street: draft.street.trim() || undefined,
  house: draft.house.trim() || undefined,
  entrance: draft.entrance.trim() || undefined,
  floor: draft.floor.trim() || undefined,
  apartment: draft.apartment.trim() || undefined,
  delivery_notes: draft.delivery_notes.trim() || undefined,
  is_default: draft.is_default,
});

const buildProfileForm = (profile: Customer | null): ProfileFormState => ({
  first_name: profile?.first_name || '',
  last_name: profile?.last_name || '',
  email: profile?.email || '',
  avatar_url: profile?.avatar_url || '',
  language_code: profile?.language_code || 'en',
  marketing_opt_in: profile?.marketing_opt_in || false,
});

export function AccountCenterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuth();
  const { setIsCartOpen } = useCart();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const accountDataRef = useRef<{
    profile: Customer | null;
    orders: Order[];
    addresses: CustomerAddress[];
    bonusHistory: CustomerBonusActivity[];
  }>({
    profile: null,
    orders: [],
    addresses: [],
    bonusHistory: [],
  });

  const [profile, setProfile] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [bonusHistory, setBonusHistory] = useState<CustomerBonusActivity[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    first_name: '',
    last_name: '',
    email: '',
    avatar_url: '',
    language_code: 'en',
    marketing_opt_in: false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState<AddressFormState>(createEmptyAddressForm);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const applySnapshot = useCallback((snapshot: Omit<AccountCenterCacheSnapshot, 'userId' | 'savedAt'>, syncProfileForm = true) => {
    accountDataRef.current = snapshot;
    setProfile(snapshot.profile);
    setOrders(snapshot.orders);
    setAddresses(snapshot.addresses);
    setBonusHistory(snapshot.bonusHistory);
    if (syncProfileForm) {
      setProfileForm(buildProfileForm(snapshot.profile));
    }
  }, []);

  const writeCache = useCallback((snapshot: Omit<AccountCenterCacheSnapshot, 'savedAt'>) => {
    if (typeof window === 'undefined') return;

    sessionStorage.setItem(ACCOUNT_CENTER_CACHE_KEY, JSON.stringify({
      ...snapshot,
      savedAt: Date.now(),
    }));
  }, []);

  const clearCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(ACCOUNT_CENTER_CACHE_KEY);
  }, []);

  const readCache = useCallback((userId: string) => {
    if (typeof window === 'undefined') return null;

    const raw = sessionStorage.getItem(ACCOUNT_CENTER_CACHE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AccountCenterCacheSnapshot;
      if (parsed.userId !== userId) return null;
      if (Date.now() - parsed.savedAt > ACCOUNT_CENTER_CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const refreshCustomerData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    const [profileResult, ordersResult, addressesResult, bonusResult] = await Promise.allSettled([
      customerApi.getProfile(),
      customerApi.getOrders({ limit: 20 }),
      customerApi.getAddresses(),
      customerApi.getBonusHistory(8),
    ]);

    const profileRes = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const ordersRes = ordersResult.status === 'fulfilled' ? ordersResult.value : null;
    const addressesRes = addressesResult.status === 'fulfilled' ? addressesResult.value : null;
    const bonusRes = bonusResult.status === 'fulfilled' ? bonusResult.value : null;

    const nextSnapshot = {
      profile: profileRes?.success && profileRes.data ? profileRes.data : accountDataRef.current.profile,
      orders: ordersRes?.success && ordersRes.data ? ordersRes.data : accountDataRef.current.orders,
      addresses: addressesRes?.success && addressesRes.data ? addressesRes.data : accountDataRef.current.addresses,
      bonusHistory: bonusRes?.success && bonusRes.data ? bonusRes.data : accountDataRef.current.bonusHistory,
    };

    applySnapshot(nextSnapshot);
    writeCache({
      userId: user.id,
      ...nextSnapshot,
    });
  }, [applySnapshot, isAuthenticated, user?.id, writeCache]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setProfile(null);
      setOrders([]);
      setAddresses([]);
      setBonusHistory([]);
      accountDataRef.current = { profile: null, orders: [], addresses: [], bonusHistory: [] };
      setProfileForm(buildProfileForm(null));
      clearCache();
      return;
    }

    const cachedSnapshot = readCache(user.id);
    if (cachedSnapshot) {
      applySnapshot(cachedSnapshot);
      setProfileLoading(false);
    } else {
      setProfileLoading(true);
    }

    refreshCustomerData().finally(() => setProfileLoading(false));
  }, [applySnapshot, clearCache, isAuthenticated, readCache, refreshCustomerData, user?.id]);

  const customerDisplayName = useMemo(() => {
    if (!profile) return '';
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return fullName || profile.phone;
  }, [profile]);

  const profileInitial = customerDisplayName?.charAt(0)?.toUpperCase() || '?';

  const startCreateAddress = () => {
    setEditingAddressId('new');
    setAddressDraft(createEmptyAddressForm());
    setAddressError(null);
  };

  const startEditAddress = (address: CustomerAddress) => {
    setEditingAddressId(address.id);
    setAddressDraft({
      label: address.label || '',
      city: address.city || '',
      street: address.street || '',
      house: address.house || '',
      entrance: address.entrance || '',
      floor: address.floor || '',
      apartment: address.apartment || '',
      delivery_notes: address.delivery_notes || '',
      is_default: address.is_default,
    });
    setAddressError(null);
  };

  const resetAddressEditor = () => {
    setEditingAddressId(null);
    setAddressDraft(createEmptyAddressForm());
    setAddressError(null);
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setProfileForm((current) => ({ ...current, avatar_url: dataUrl }));
      setProfileSaveError(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load image');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaveError(null);

    const response = await customerApi.updateProfile({
      first_name: profileForm.first_name.trim(),
      last_name: profileForm.last_name.trim() || undefined,
      email: profileForm.email.trim() || undefined,
      avatar_url: profileForm.avatar_url.trim() || undefined,
      language_code: profileForm.language_code,
      marketing_opt_in: profileForm.marketing_opt_in,
    });

    setProfileSaving(false);

    if (!response.success) {
      setProfileSaveError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to update profile');
      return;
    }

    toast.success('Profile updated');
    await refreshCustomerData();
  };

  const handleSaveAddress = async () => {
    setAddressSaving(true);
    setAddressError(null);

    const payload = normalizeAddressPayload(addressDraft);
    const response = editingAddressId === 'new'
      ? await customerApi.createAddress(payload)
      : await customerApi.updateAddress(editingAddressId!, payload);

    setAddressSaving(false);

    if (!response.success) {
      setAddressError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to save address');
      return;
    }

    toast.success(editingAddressId === 'new' ? 'Address added' : 'Address updated');
    resetAddressEditor();
    await refreshCustomerData();
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this saved address?')) return;

    setDeletingAddressId(addressId);
    const response = await customerApi.deleteAddress(addressId);
    setDeletingAddressId(null);

    if (!response.success) {
      toast.error(response.error?.message || 'Failed to delete address');
      return;
    }

    toast.success('Address deleted');
    if (editingAddressId === addressId) resetAddressEditor();
    await refreshCustomerData();
  };

  const handleMakeDefaultAddress = async (addressId: string) => {
    const response = await customerApi.updateAddress(addressId, { is_default: true });
    if (!response.success) {
      toast.error(response.error?.message || 'Failed to update default address');
      return;
    }

    toast.success('Default address updated');
    await refreshCustomerData();
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

  const handleCopyInvite = async () => {
    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=sushimei` : '/login?ref=sushimei';
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      toast.error('Failed to copy invite link');
    }
  };

  const goToBonusInCart = () => {
    router.push('/menu');
    setIsCartOpen(true);
  };

  const value: AccountCenterContextValue = {
    isAuthenticated,
    logout,
    profile,
    orders,
    addresses,
    bonusHistory,
    profileLoading,
    profileForm,
    setProfileForm,
    profileSaving,
    profileSaveError,
    editingAddressId,
    addressDraft,
    setAddressDraft,
    addressSaving,
    addressError,
    deletingAddressId,
    selectedOrder,
    orderDetailLoading,
    setSelectedOrder,
    setOrderDetailLoading,
    inviteCopied,
    avatarInputRef,
    customerDisplayName,
    profileInitial,
    refreshCustomerData,
    handleAvatarFileChange,
    handleSaveProfile,
    startCreateAddress,
    startEditAddress,
    resetAddressEditor,
    handleSaveAddress,
    handleDeleteAddress,
    handleMakeDefaultAddress,
    handleViewOrder,
    handleCopyInvite,
    goToBonusInCart,
  };

  return (
    <AccountCenterContext.Provider value={value}>
      {children}
    </AccountCenterContext.Provider>
  );
}

export function useAccountCenter() {
  const context = useContext(AccountCenterContext);
  if (!context) {
    throw new Error('useAccountCenter must be used within AccountCenterProvider');
  }
  return context;
}

export type { AddressFormState, ProfileFormState };
