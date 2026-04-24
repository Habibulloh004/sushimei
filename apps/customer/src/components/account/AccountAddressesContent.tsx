"use client";

import React, { useState } from 'react';
import { Check, MapPin, MapPinHouse, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Switch } from '../ui/switch';
import { useAccountCenter } from './account-center-context';
import { formatAddressLines } from './account-utils';
import AddressMapPickerClient from './AddressMapPickerClient';
import type { ReverseGeocodeResult } from './AddressMapPicker';

export function AccountAddressesContent() {
  const {
    addresses,
    editingAddressId,
    addressDraft,
    setAddressDraft,
    addressSaving,
    addressError,
    deletingAddressId,
    startCreateAddress,
    startEditAddress,
    resetAddressEditor,
    handleSaveAddress,
    handleDeleteAddress,
    handleMakeDefaultAddress,
  } = useAccountCenter();

  const [isMapOpen, setIsMapOpen] = useState(false);
  const hasLocation = addressDraft.latitude != null && addressDraft.longitude != null;

  return (
    <section className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:rounded-[2.25rem] sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400 sm:text-[11px]">Addresses</p>
          <h2 className="mt-2 text-2xl font-black tracking-tighter sm:text-3xl">Delivery locations</h2>
          <p className="mt-2 text-xs text-stone-500 sm:mt-3 sm:text-sm">Keep your most-used addresses here so checkout is faster and cleaner.</p>
        </div>
        <Button className="h-11 rounded-2xl px-5 sm:h-12 sm:px-6" onClick={startCreateAddress}>
          <Plus className="h-4 w-4" />
          Add Address
        </Button>
      </div>

      {(editingAddressId || addresses.length === 0) ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-200 p-4 dark:border-stone-800 sm:mt-8 sm:rounded-[2rem] sm:p-6">
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left transition hover:border-red-300 hover:bg-red-50/40 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/10 text-red-600">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Pick on map</p>
                {hasLocation ? (
                  <p className="mt-0.5 truncate text-sm font-bold text-stone-800 dark:text-stone-100">
                    {addressDraft.latitude!.toFixed(5)}, {addressDraft.longitude!.toFixed(5)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-stone-500">Tap to choose location</p>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs font-black uppercase tracking-widest text-red-600">
              {hasLocation ? 'Change' : 'Open'}
            </span>
          </button>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Label</span>
              <input value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="Home, Office, Parents" />
            </label>
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">City</span>
              <input value={addressDraft.city} onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="Tashkent" />
            </label>
            <label className="space-y-1.5 sm:space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Street</span>
              <input value={addressDraft.street} onChange={(event) => setAddressDraft((current) => ({ ...current, street: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="Street and landmark" />
            </label>
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">House</span>
              <input value={addressDraft.house} onChange={(event) => setAddressDraft((current) => ({ ...current, house: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="12A" />
            </label>
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Apartment</span>
              <input value={addressDraft.apartment} onChange={(event) => setAddressDraft((current) => ({ ...current, apartment: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="45" />
            </label>
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Entrance</span>
              <input value={addressDraft.entrance} onChange={(event) => setAddressDraft((current) => ({ ...current, entrance: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="2" />
            </label>
            <label className="space-y-1.5 sm:space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Floor</span>
              <input value={addressDraft.floor} onChange={(event) => setAddressDraft((current) => ({ ...current, floor: event.target.value }))} className="w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:rounded-2xl sm:px-4 sm:py-3" placeholder="5" />
            </label>
            <label className="space-y-1.5 sm:space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Delivery Notes</span>
              <textarea value={addressDraft.delivery_notes} onChange={(event) => setAddressDraft((current) => ({ ...current, delivery_notes: event.target.value }))} className="min-h-[96px] w-full rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800 sm:min-h-[112px] sm:rounded-2xl sm:px-4 sm:py-3" placeholder="Door code, floor note, how to find the address" />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-xs font-medium text-stone-600 sm:text-sm">
              <Switch
                checked={addressDraft.is_default}
                onCheckedChange={(checked) => setAddressDraft((current) => ({ ...current, is_default: checked }))}
              />
              Set as default address
            </label>
            <div className="flex gap-2 sm:gap-3">
              {editingAddressId ? (
                <Button variant="outline" className="h-11 flex-1 rounded-2xl px-4 sm:h-12 sm:flex-initial sm:px-5" onClick={resetAddressEditor}>
                  Cancel
                </Button>
              ) : null}
              <Button className="h-11 flex-1 rounded-2xl px-5 sm:h-12 sm:flex-initial sm:px-6" onClick={handleSaveAddress} isLoading={addressSaving}>
                Save Address
              </Button>
            </div>
          </div>

          {addressError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 sm:text-sm">
              {addressError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950 sm:rounded-[1.75rem] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="text-base font-black tracking-tight sm:text-lg">{address.label || 'Saved address'}</p>
                  {address.is_default ? <Badge variant="success">Default</Badge> : null}
                </div>
                <p className="mt-1.5 text-xs text-stone-500 sm:mt-2 sm:text-sm">{formatAddressLines(address)}</p>
                {address.delivery_notes ? <p className="mt-1.5 text-xs text-stone-400 sm:mt-2 sm:text-sm">{address.delivery_notes}</p> : null}
              </div>
              <MapPinHouse className="h-5 w-5 text-red-600 shrink-0" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
              <Button variant="outline" className="h-10 rounded-2xl px-3.5 text-xs sm:h-11 sm:px-4 sm:text-sm" onClick={() => startEditAddress(address)}>
                Edit
              </Button>
              {!address.is_default ? (
                <Button variant="outline" className="h-10 rounded-2xl px-3.5 text-xs sm:h-11 sm:px-4 sm:text-sm" onClick={() => handleMakeDefaultAddress(address.id)}>
                  Make Default
                </Button>
              ) : null}
              <Button
                variant="destructive"
                className="h-10 rounded-2xl px-3.5 text-xs sm:h-11 sm:px-4 sm:text-sm"
                onClick={() => handleDeleteAddress(address.id)}
                isLoading={deletingAddressId === address.id}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={isMapOpen} onOpenChange={setIsMapOpen}>
        <SheetContent side="bottom" className="h-[85vh] w-full max-w-none rounded-t-[2rem] p-0 sm:max-w-none">
          <SheetHeader className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
            <SheetTitle className="text-lg font-black tracking-tight">Pick on map</SheetTitle>
            <SheetDescription className="text-xs text-stone-500 sm:text-sm">
              Tap, drag the pin, or use your location. City and street will auto-fill.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 min-h-0 flex-col gap-3 px-5 py-4">
            <div className="flex-1 min-h-0">
              <AddressMapPickerClient
                latitude={addressDraft.latitude}
                longitude={addressDraft.longitude}
                onChange={(lat: number, lng: number, geocoded?: ReverseGeocodeResult) => {
                  setAddressDraft((current) => ({
                    ...current,
                    latitude: lat,
                    longitude: lng,
                    ...(geocoded
                      ? {
                          city: geocoded.city && !current.city ? geocoded.city : current.city,
                          street: geocoded.street && !current.street ? geocoded.street : current.street,
                          house: geocoded.house && !current.house ? geocoded.house : current.house,
                        }
                      : {}),
                  }));
                }}
              />
            </div>
            {hasLocation ? (
              <div className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-950">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Pinned</p>
                <p className="mt-1 text-sm font-bold text-stone-800 dark:text-stone-100">
                  {addressDraft.latitude!.toFixed(5)}, {addressDraft.longitude!.toFixed(5)}
                </p>
                {addressDraft.city || addressDraft.street ? (
                  <p className="mt-1 text-xs text-stone-500">
                    {[addressDraft.street, addressDraft.house, addressDraft.city].filter(Boolean).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="border-t border-stone-100 p-4 dark:border-stone-800">
            <Button
              className="h-12 w-full rounded-2xl"
              onClick={() => setIsMapOpen(false)}
              disabled={!hasLocation}
            >
              <Check className="h-4 w-4" />
              {hasLocation ? 'Confirm location' : 'Pick a point on the map'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
