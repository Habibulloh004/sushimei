"use client";

import dynamic from 'next/dynamic';

const AddressMapPickerClient = dynamic(() => import('./AddressMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-64 w-full items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-sm font-medium text-stone-400">
      Xarita yuklanmoqda...
    </div>
  ),
});

export default AddressMapPickerClient;
