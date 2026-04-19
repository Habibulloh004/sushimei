import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCategories, getAllProducts, getDietaryOptions } from '@/lib/api-server';
import { MenuContent } from '@/components/menu/MenuContent';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Menu',
  description: 'Browse our full menu of artisanal sushi, rolls, and Japanese cuisine. Order online for delivery or pickup.',
};

export default async function MenuPage() {
  const [categories, products, dietaryOptions] = await Promise.all([
    getCategories(),
    getAllProducts(),
    getDietaryOptions(),
  ]);

  return (
    <Suspense>
      <MenuContent
        categories={categories}
        products={products}
        dietaryOptions={dietaryOptions}
      />
    </Suspense>
  );
}
