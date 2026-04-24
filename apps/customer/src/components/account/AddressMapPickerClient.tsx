"use client";

import dynamic from 'next/dynamic';

const AddressMapPickerClient = dynamic(() => import('./AddressMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-72 w-full items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm font-medium text-stone-400 dark:border-stone-800 dark:bg-stone-950">
      Loading map...
    </div>
  ),
});

export default AddressMapPickerClient;
