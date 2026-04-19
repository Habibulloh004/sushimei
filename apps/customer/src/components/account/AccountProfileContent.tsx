"use client";

import React from 'react';
import { Camera, Globe, Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { useAccountCenter } from './account-center-context';
import { getAccountAvatarSrc } from './account-utils';
import { AccountGeneratedAvatar } from './AccountGeneratedAvatar';

export function AccountProfileContent() {
  const {
    profile,
    profileForm,
    setProfileForm,
    profileSaving,
    profileSaveError,
    avatarInputRef,
    handleAvatarFileChange,
    handleSaveProfile,
  } = useAccountCenter();
  const avatarSeed = profile?.phone || profile?.email || profileForm.first_name || profileForm.last_name || 'customer';

  return (
    <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Profile Settings</p>
          <h2 className="mt-2 text-3xl font-black tracking-tighter">Personal details</h2>
          <p className="mt-3 text-sm text-stone-500">Update your public-facing account information, contact details, language, and marketing preferences.</p>
        </div>
        <Button className="h-12 rounded-2xl px-6" onClick={handleSaveProfile} isLoading={profileSaving}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {profileSaveError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {profileSaveError}
        </div>
      ) : null}

      <div className="mt-8 rounded-[2rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            {getAccountAvatarSrc(profileForm.avatar_url || profile?.avatar_url) ? (
              <img
                src={getAccountAvatarSrc(profileForm.avatar_url || profile?.avatar_url)}
                alt="Profile avatar"
                className="h-24 w-24 rounded-[2rem] object-cover border border-stone-200 dark:border-stone-800"
              />
            ) : (
              <AccountGeneratedAvatar
                seed={avatarSeed}
                size={96}
                square
                className="h-24 w-24 rounded-[2rem] border border-stone-200 dark:border-stone-800"
              />
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white bg-white text-stone-700 shadow-lg transition hover:text-red-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={avatarInputRef as React.RefObject<HTMLInputElement>}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-black tracking-tight">Profile photo</p>
            <p className="text-sm text-stone-500">Upload a square image or paste an image URL below.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">First Name</span>
          <input
            value={profileForm.first_name}
            onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))}
            className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800"
            placeholder="Your first name"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Last Name</span>
          <input
            value={profileForm.last_name}
            onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))}
            className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800"
            placeholder="Your last name"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Email</span>
          <input
            type="email"
            value={profileForm.email}
            onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800"
            placeholder="you@example.com"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Phone</span>
          <input
            value={profile?.phone || ''}
            disabled
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm font-medium text-stone-500 outline-none dark:border-stone-800 dark:bg-stone-950"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Language</span>
          <select
            value={profileForm.language_code}
            onChange={(event) => setProfileForm((current) => ({ ...current, language_code: event.target.value }))}
            className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
            <option value="uz">Uzbek</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Avatar URL</span>
          <input
            value={profileForm.avatar_url}
            onChange={(event) => setProfileForm((current) => ({ ...current, avatar_url: event.target.value }))}
            className="w-full rounded-2xl border border-stone-200 bg-transparent px-4 py-3.5 text-sm font-medium outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-stone-800"
            placeholder="Paste image URL"
          />
        </label>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-stone-100 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black tracking-tight">Marketing notifications</p>
              <p className="mt-1 text-sm text-stone-500">Get promo alerts, new menu drops, and loyalty offers.</p>
            </div>
            <Switch
              checked={profileForm.marketing_opt_in}
              onCheckedChange={(checked) => setProfileForm((current) => ({ ...current, marketing_opt_in: checked }))}
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-stone-100 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-black tracking-tight">Account locale</p>
              <p className="mt-1 text-sm text-stone-500">Preferred language for menus, orders, and account messages.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
