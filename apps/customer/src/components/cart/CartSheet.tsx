"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ShoppingBag, Plus, Minus, X, ChevronRight,
  Truck, Store, CreditCard, MapPin, CheckCircle2,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { EmptyState } from '../shared/EmptyState';
import { useCart } from '@/lib/cart-context';
import { CheckoutProvider, useCheckout } from '@/lib/checkout-context';
import { useAuth, customerApi, type CustomerAddress } from '@/lib/api';
import { Spot, ModifierGroup } from '@/lib/api';
import AddressMapPickerClient from '../account/AddressMapPickerClient';
import { getCartItemKey, getCartItemUnitPrice } from '@/lib/types';
import { getSafeName } from '@/lib/helpers';
import { formatPrice } from '@/lib/format';

interface CartSheetProps {
  spots: Spot[];
  modifiers: ModifierGroup[];
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function CartSheet({ spots, modifiers }: CartSheetProps) {
  const { cart, isCartOpen, setIsCartOpen, cartItemCount, totalPrice } = useCart();
  const [isCheckoutFlow, setIsCheckoutFlow] = useState(false);

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => { setIsCartOpen(open); if (!open) setIsCheckoutFlow(false); }}>
      <SheetContent
        side="right"
        className="w-full md:w-[480px] sm:max-w-[480px] p-0 flex flex-col gap-0 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 [&>button:first-of-type]:hidden"
      >
        <SheetTitle className="sr-only">{isCheckoutFlow ? 'Checkout' : 'Your Order'}</SheetTitle>

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-stone-100 dark:border-stone-900/50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-2xl font-black tracking-tighter">{isCheckoutFlow ? 'Checkout' : 'Your Order'}</h3>
            <p className="text-xs text-stone-500 font-medium mt-1">{cartItemCount} items selected</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12" onClick={() => { setIsCartOpen(false); setIsCheckoutFlow(false); }}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              icon={ShoppingBag}
              title="Cart is empty"
              description="Delicious sushi is just a few clicks away."
              actionLabel="Browse Menu"
              onAction={() => { setIsCartOpen(false); }}
            />
          </div>
        ) : isCheckoutFlow ? (
          <CheckoutProvider spots={spots}>
            <CheckoutContent spots={spots} onBack={() => setIsCheckoutFlow(false)} />
          </CheckoutProvider>
        ) : (
          <CartBrowseContent onCheckout={() => setIsCheckoutFlow(true)} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartBrowseContent({ onCheckout }: { onCheckout: () => void }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, updateQuantity, removeFromCart, totalPrice, setIsCartOpen } = useCart();

  return (
    <>
      <motion.div
        className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {cart.map((item) => {
          const key = getCartItemKey(item);
          const unitPrice = getCartItemUnitPrice(item);
          return (
            <motion.div key={key} className="flex gap-5 group" variants={itemVariants}>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] overflow-hidden shrink-0 border border-stone-100 dark:border-stone-800">
                <ImageWithFallback src={item.product.image_url || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-black text-base md:text-lg tracking-tight leading-tight line-clamp-2">{getSafeName(item.product.name_i18n)}</h4>
                  <button className="text-stone-300 hover:text-red-500 transition-colors shrink-0" onClick={() => removeFromCart(key)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {item.variant && (
                  <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">{item.variant.name}</p>
                )}
                {item.modifiers.length > 0 && (
                  <p className="text-[10px] text-stone-400 font-medium truncate">
                    + {item.modifiers.map(m => m.optionName).join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3 bg-stone-100 dark:bg-stone-900 rounded-xl px-2.5 py-1 border border-stone-200/50 dark:border-stone-800/50">
                    <button className="text-stone-400 hover:text-red-600 p-0.5" onClick={() => updateQuantity(key, item.quantity - 1)}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                    <button className="text-stone-400 hover:text-red-600 p-0.5" onClick={() => updateQuantity(key, item.quantity + 1)}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-black text-base md:text-lg tracking-tight">{formatPrice(unitPrice * item.quantity)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer */}
      <motion.div
        className="p-6 md:p-8 border-t border-stone-200/50 dark:border-stone-800/50 bg-stone-50/30 dark:bg-stone-900/30 space-y-5 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      >
        <div className="space-y-2.5">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Subtotal</span>
            <span className="text-stone-900 dark:text-stone-100">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Delivery</span>
            <span className="text-emerald-500">Complementary</span>
          </div>
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
            <span className="text-xs font-black uppercase tracking-widest">Total</span>
            <span className="text-2xl md:text-3xl font-black tracking-tighter">{formatPrice(totalPrice)}</span>
          </div>
        </div>
        <Button className="w-full h-14 md:h-16 rounded-2xl text-base shadow-2xl shadow-red-600/20" onClick={() => {
          if (!isAuthenticated) {
            setIsCartOpen(false);
            router.push('/login');
            return;
          }
          onCheckout();
        }}>
          {isAuthenticated ? 'Proceed to Checkout' : 'Sign In To Checkout'}
        </Button>
      </motion.div>
    </>
  );
}

function formatSavedAddress(addr: CustomerAddress): string {
  const parts: string[] = [];
  if (addr.city) parts.push(addr.city);
  const streetHouse = [addr.street, addr.house].filter(Boolean).join(' ');
  if (streetHouse) parts.push(streetHouse);
  const extras: string[] = [];
  if (addr.entrance) extras.push(`entr. ${addr.entrance}`);
  if (addr.floor) extras.push(`fl. ${addr.floor}`);
  if (addr.apartment) extras.push(`apt. ${addr.apartment}`);
  if (extras.length) parts.push(extras.join(', '));
  if (addr.delivery_notes) parts.push(addr.delivery_notes);
  return parts.filter(Boolean).join(', ');
}

function CheckoutContent({ spots, onBack }: { spots: Spot[]; onBack: () => void }) {
  const router = useRouter();
  const { totalPrice, setIsCartOpen } = useCart();
  const { isAuthenticated } = useAuth();
  const {
    deliveryType, setDeliveryType,
    paymentType, setPaymentType,
    selectedSpotId, setSelectedSpotId,
    promoCodeInput, setPromoCodeInput,
    bonusPointsInput, setBonusPointsInput,
    deliveryAddress, setDeliveryAddress,
    deliveryCoords, setDeliveryCoords,
    checkoutPreview, checkoutError, checkoutSuccess,
    checkoutLoading, placingOrder,
    handlePlaceOrder,
  } = useCheckout();

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [customCity, setCustomCity] = useState('');
  const [customStreet, setCustomStreet] = useState('');
  const [customHouse, setCustomHouse] = useState('');
  const [customEntrance, setCustomEntrance] = useState('');
  const [customFloor, setCustomFloor] = useState('');
  const [customApartment, setCustomApartment] = useState('');

  const selectedSpot = spots.find((s) => s.id === selectedSpotId) || null;

  useEffect(() => {
    if (!isAuthenticated || deliveryType !== 'delivery') return;
    let cancelled = false;
    setAddressesLoading(true);
    customerApi.getAddresses().then(res => {
      if (cancelled) return;
      if (res.success && res.data) {
        setSavedAddresses(res.data);
        // Auto-select default address if user hasn't picked one yet
        if (!selectedAddressId && !useCustomAddress && res.data.length > 0) {
          const def = res.data.find(a => a.is_default) || res.data[0];
          pickSavedAddress(def);
        }
      }
    }).finally(() => {
      if (!cancelled) setAddressesLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, deliveryType]);

  const pickSavedAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    setUseCustomAddress(false);
    setDeliveryAddress(formatSavedAddress(addr));
    if (addr.latitude != null && addr.longitude != null) {
      setDeliveryCoords({
        latitude: addr.latitude,
        longitude: addr.longitude,
        city: addr.city || undefined,
        street: addr.street || undefined,
        house: addr.house || undefined,
        entrance: addr.entrance || undefined,
        floor: addr.floor || undefined,
        apartment: addr.apartment || undefined,
        delivery_notes: addr.delivery_notes || undefined,
      });
    } else {
      setDeliveryCoords(null);
    }
  };

  const pickCustomAddress = () => {
    setSelectedAddressId(null);
    setUseCustomAddress(true);
    setDeliveryCoords(null);
  };

  // When custom fields change, sync deliveryAddress text and coords
  useEffect(() => {
    if (!useCustomAddress) return;
    const parts: string[] = [];
    if (customCity) parts.push(customCity);
    const streetHouse = [customStreet, customHouse].filter(Boolean).join(' ');
    if (streetHouse) parts.push(streetHouse);
    const extras: string[] = [];
    if (customEntrance) extras.push(`entr. ${customEntrance}`);
    if (customFloor) extras.push(`fl. ${customFloor}`);
    if (customApartment) extras.push(`apt. ${customApartment}`);
    if (extras.length) parts.push(extras.join(', '));
    const text = parts.filter(Boolean).join(', ');
    if (text) setDeliveryAddress(text);

    if (customLat != null && customLng != null) {
      setDeliveryCoords({
        latitude: customLat,
        longitude: customLng,
        city: customCity || undefined,
        street: customStreet || undefined,
        house: customHouse || undefined,
        entrance: customEntrance || undefined,
        floor: customFloor || undefined,
        apartment: customApartment || undefined,
      });
    } else {
      setDeliveryCoords(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCustomAddress, customLat, customLng, customCity, customStreet, customHouse, customEntrance, customFloor, customApartment]);

  const handleMapChange = (lat: number, lng: number, geocoded?: { city?: string; street?: string; house?: string }) => {
    setCustomLat(lat);
    setCustomLng(lng);
    if (geocoded) {
      if (geocoded.city && !customCity) setCustomCity(geocoded.city);
      if (geocoded.street && !customStreet) setCustomStreet(geocoded.street);
      if (geocoded.house && !customHouse) setCustomHouse(geocoded.house);
    }
  };

  return (
    <>
      <motion.div
        className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {/* Delivery/Pickup toggle */}
        <motion.div className="flex bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800" variants={itemVariants}>
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
        </motion.div>

        {/* Branch */}
        <motion.div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3" variants={itemVariants}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Branch</p>
          <select
            value={selectedSpotId}
            onChange={(e) => setSelectedSpotId(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black tracking-tight"
          >
            {spots.filter((s) => s.is_active).map((spot) => (
              <option key={spot.id} value={spot.id}>{spot.name}</option>
            ))}
          </select>
        </motion.div>

        {/* Delivery address */}
        {deliveryType === 'delivery' && (
          <motion.div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3" variants={itemVariants}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Delivery Address</p>
              <button
                type="button"
                onClick={() => { setIsCartOpen(false); router.push('/account?tab=addresses'); }}
                className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700"
              >
                + Add new
              </button>
            </div>

            {addressesLoading ? (
              <p className="text-xs text-stone-500">Loading saved addresses...</p>
            ) : savedAddresses.length === 0 && !useCustomAddress ? (
              <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 px-4 py-4 space-y-2">
                <p className="text-xs text-stone-500">No saved addresses yet.</p>
                <button
                  type="button"
                  onClick={pickCustomAddress}
                  className="text-[11px] font-black uppercase tracking-widest text-red-600"
                >
                  Enter address manually
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedAddresses.map(addr => {
                  const picked = selectedAddressId === addr.id;
                  const hasCoords = addr.latitude != null && addr.longitude != null;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => pickSavedAddress(addr)}
                      className={`w-full text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition ${
                        picked
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${picked ? 'text-red-600' : 'text-stone-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black tracking-tight truncate">
                            {addr.label || 'Address'}
                          </p>
                          {addr.is_default && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Default</span>
                          )}
                          {!hasCoords && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">No GPS</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 wrap-break-word">
                          {formatSavedAddress(addr) || '—'}
                        </p>
                      </div>
                      {picked && <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={pickCustomAddress}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                    useCustomAddress
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20'
                      : 'border-dashed border-stone-300 dark:border-stone-700 text-stone-500 hover:border-stone-400'
                  }`}
                >
                  Use a different address
                </button>
              </div>
            )}

            {(useCustomAddress || savedAddresses.length === 0) && (
              <div className="space-y-3">
                <div className="h-64 w-full">
                  <AddressMapPickerClient
                    latitude={customLat}
                    longitude={customLng}
                    onChange={handleMapChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="City"
                    className="col-span-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customStreet}
                    onChange={(e) => setCustomStreet(e.target.value)}
                    placeholder="Street"
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customHouse}
                    onChange={(e) => setCustomHouse(e.target.value)}
                    placeholder="House"
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customEntrance}
                    onChange={(e) => setCustomEntrance(e.target.value)}
                    placeholder="Entrance"
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customFloor}
                    onChange={(e) => setCustomFloor(e.target.value)}
                    placeholder="Floor"
                    className="rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={customApartment}
                    onChange={(e) => setCustomApartment(e.target.value)}
                    placeholder="Apartment"
                    className="col-span-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-3 py-2 text-sm"
                  />
                </div>

                {customLat != null && customLng != null ? (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    ✓ Koordinata saqlandi ({customLat.toFixed(5)}, {customLng.toFixed(5)}) — kuryer to'g'ri marshrut ko'radi.
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-600 font-medium">
                    Xaritadan manzilni bosing — kuryer Yandex Maps orqali marshrutni ko'radi.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Payment */}
        <motion.div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3" variants={itemVariants}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setPaymentType('CASH')}
              className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'CASH' ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20' : 'border-stone-200 dark:border-stone-800 text-stone-500'}`}
            >Cash</button>
            <button type="button" onClick={() => setPaymentType('CARD')}
              className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${paymentType === 'CARD' ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-950/20' : 'border-stone-200 dark:border-stone-800 text-stone-500'}`}
            >Card</button>
          </div>
          <p className="text-sm font-black tracking-tight flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-stone-400" /> {paymentType === 'CASH' ? 'Cash on Delivery / Pickup' : 'Card'}
          </p>
        </motion.div>

        {/* Promo */}
        <motion.div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3" variants={itemVariants}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Promo Code</p>
          <input value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} placeholder="Enter promo code"
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black tracking-[0.12em] uppercase" />
        </motion.div>

        {/* Bonus */}
        <motion.div className="p-5 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3" variants={itemVariants}>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Bonus Spend</p>
          <input value={bonusPointsInput} onChange={(e) => setBonusPointsInput(e.target.value.replace(/[^\d]/g, ''))} placeholder="0"
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent px-4 py-3 text-sm font-black" />
        </motion.div>

        {checkoutError && <motion.div variants={itemVariants} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{checkoutError}</motion.div>}
        {checkoutSuccess && <motion.div variants={itemVariants} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">{checkoutSuccess}</motion.div>}

        {/* Price breakdown */}
        <motion.div className="rounded-[1.5rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm p-5 space-y-3" variants={itemVariants}>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Subtotal</span><span className="text-stone-900 dark:text-stone-100">{formatPrice(checkoutPreview?.subtotal_amount ?? totalPrice)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Promo Discount</span><span className="text-emerald-600">{formatPrice(checkoutPreview?.promo_discount_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Bonus Spent</span><span className="text-emerald-600">{formatPrice(checkoutPreview?.bonus_spent_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
            <span>Delivery Fee</span><span className="text-stone-900 dark:text-stone-100">{formatPrice(checkoutPreview?.delivery_fee_amount ?? (deliveryType === 'delivery' ? (selectedSpot?.delivery_fee || 0) : 0))}</span>
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
            <span>Bonus Earned</span><span className="text-stone-900 dark:text-stone-100">{checkoutPreview?.bonus_earned_points ?? 0} pts</span>
          </div>
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
            <span className="text-xs font-black uppercase tracking-widest">Total</span>
            <span className="text-2xl md:text-3xl font-black tracking-tighter">{formatPrice(checkoutPreview?.total_amount ?? totalPrice)}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="p-6 md:p-8 border-t border-stone-200/50 dark:border-stone-800/50 bg-stone-50/30 dark:bg-stone-900/30 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      >
        <div className="flex gap-3">
          <Button variant="outline" className="h-14 md:h-16 w-14 md:w-16 p-0 rounded-2xl" onClick={onBack}>
            <ChevronRight className="w-6 h-6 rotate-180" />
          </Button>
          <Button className="flex-1 h-14 md:h-16 rounded-2xl shadow-2xl shadow-red-600/20" disabled={checkoutLoading || placingOrder} onClick={handlePlaceOrder}>
            {placingOrder ? 'Placing Order...' : checkoutLoading ? 'Refreshing...' : `Confirm & Pay • ${formatPrice(checkoutPreview?.total_amount ?? totalPrice)}`}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
