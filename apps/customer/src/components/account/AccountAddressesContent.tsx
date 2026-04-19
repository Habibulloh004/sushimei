"use client";

import React from 'react';
import { MapPinHouse, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { useAccountCenter } from './account-center-context';
import { formatAddressLines } from './account-utils';

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

  return (
    <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Addresses</p>
          <h2 className="mt-2 text-3xl font-black tracking-tighter">Delivery locations</h2>
          <p className="mt-3 text-sm text-stone-500">Keep your most-used addresses here so checkout is faster and cleaner.</p>
        </div>
        <Button className="h-12 rounded-2xl px-6" onClick={startCreateAddress}>
          <Plus className="h-4 w-4" />
          Add Address
        </Button>
      </div>

      {(editingAddressId || addresses.length === 0) ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-stone-200 p-6 dark:border-stone-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Label</span>
              <input value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="Home, Office, Parents" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">City</span>
              <input value={addressDraft.city} onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="Tashkent" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Street</span>
              <input value={addressDraft.street} onChange={(event) => setAddressDraft((current) => ({ ...current, street: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="Street and landmark" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">House</span>
              <input value={addressDraft.house} onChange={(event) => setAddressDraft((current) => ({ ...current, house: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="12A" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Apartment</span>
              <input value={addressDraft.apartment} onChange={(event) => setAddressDraft((current) => ({ ...current, apartment: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="45" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Entrance</span>
              <input value={addressDraft.entrance} onChange={(event) => setAddressDraft((current) => ({ ...current, entrance: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="2" />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Floor</span>
              <input value={addressDraft.floor} onChange={(event) => setAddressDraft((current) => ({ ...current, floor: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="5" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Delivery Notes</span>
              <textarea value={addressDraft.delivery_notes} onChange={(event) => setAddressDraft((current) => ({ ...current, delivery_notes: event.target.value }))} className="min-h-[112px] w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800" placeholder="Door code, floor note, how to find the address" />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium text-stone-600">
              <Switch
                checked={addressDraft.is_default}
                onCheckedChange={(checked) => setAddressDraft((current) => ({ ...current, is_default: checked }))}
              />
              Set as default address
            </label>
            <div className="flex gap-3">
              {editingAddressId ? (
                <Button variant="outline" className="h-12 rounded-2xl px-5" onClick={resetAddressEditor}>
                  Cancel
                </Button>
              ) : null}
              <Button className="h-12 rounded-2xl px-6" onClick={handleSaveAddress} isLoading={addressSaving}>
                Save Address
              </Button>
            </div>
          </div>

          {addressError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {addressError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-black tracking-tight">{address.label || 'Saved address'}</p>
                  {address.is_default ? <Badge variant="success">Default</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-stone-500">{formatAddressLines(address)}</p>
                {address.delivery_notes ? <p className="mt-2 text-sm text-stone-400">{address.delivery_notes}</p> : null}
              </div>
              <MapPinHouse className="h-5 w-5 text-red-600 shrink-0" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" className="h-11 rounded-2xl px-4" onClick={() => startEditAddress(address)}>
                Edit
              </Button>
              {!address.is_default ? (
                <Button variant="outline" className="h-11 rounded-2xl px-4" onClick={() => handleMakeDefaultAddress(address.id)}>
                  Make Default
                </Button>
              ) : null}
              <Button
                variant="destructive"
                className="h-11 rounded-2xl px-4"
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
    </section>
  );
}
